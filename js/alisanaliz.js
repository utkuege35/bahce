// ===== ALIŞ FİYAT ANALİZİ =====
// Veri Aktarımı ile içeri alınan ALIM hareketlerinden stok bazında fiyat değişimini çıkarır (dashboard + tablo + Excel).
// Kaynak: v_aktarim_alimlari (silinmiş partiler gelmez). Fiyatlar stoğun TEMEL birimi başına, KDV hariçtir.
//  • İlk/Son fiyat: aralıktaki ilk ve son ALIM GÜNÜNÜN ağırlıklı ortalama fiyatı (aynı gün birden çok alım varsa tutar/miktar).
//  • Değişim %: (Son / İlk − 1) × 100; en az iki farklı alım günü gerekir.
//  • Fiyat Farkı Etkisi: aralıkta fiilen ödenen − tüm miktar ilk fiyattan alınsaydı ödenecek tutar (fiyat artışının maliyete etkisi).
//  • Ağırlıklı Değişim: stokların değişimleri, alım tutarlarıyla ağırlıklandırılarak ortalanır.
let _aaVeri=null,_aaGrafik={};
const _aaF=(n,o)=>(+n).toLocaleString('tr-TR',o||{minimumFractionDigits:2,maximumFractionDigits:2});
const _aaPara=n=>'₺'+_aaF(n);
const _aaYuzde=v=>v===null||v===undefined?'—':(v<0?'-':'')+'%'+_aaF(Math.abs(v));
const _aaKr=(v,e)=>v!==null&&v!==undefined&&v<-(e||0.005)?'color:#c62828;':'';
const _aaTr=t=>t?t.split('-').reverse().join('.'):'';
const _AA_AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

// Saf hesap: ham alım satırlarından stok bazlı analiz üretir (test edilebilir)
function alisAnalizHesapla(rows){
  const stokHarita=new Map(stoklar.map(s=>[s.id,s]));
  const kok=s=>{let g=s,k=0;while(g&&g.ust_id&&k++<10){const u=stokHarita.get(g.ust_id);if(!u)break;g=u;}return g;}; // en üst (ana) grup
  const gruplu={};
  rows.forEach(r=>{
    const m=+r.miktar,t=+r.tutar;if(!(m>0&&t>0))return; // bedelsiz/geçersiz satırlar fiyat analizine girmez
    (gruplu[r.stok_id]=gruplu[r.stok_id]||[]).push({tarih:r.tarih,miktar:m,tutar:t,fiyat:+r.birim_fiyat>0?+r.birim_fiyat:t/m});
  });
  const liste=[];
  for(const [sid,alimlar] of Object.entries(gruplu)){
    const st=stokHarita.get(sid);
    alimlar.sort((a,b)=>a.tarih<b.tarih?-1:a.tarih>b.tarih?1:0);
    const gun=new Map();
    alimlar.forEach(a=>{const g=gun.get(a.tarih)||{m:0,t:0};g.m+=a.miktar;g.t+=a.tutar;gun.set(a.tarih,g);});
    const gunler=[...gun.entries()].map(([tarih,g])=>({tarih,fiyat:g.t/g.m,miktar:g.m,tutar:g.t}));
    const topM=alimlar.reduce((x,a)=>x+a.miktar,0),topT=alimlar.reduce((x,a)=>x+a.tutar,0);
    const ilk=gunler[0],son=gunler[gunler.length-1];
    const degisim=gunler.length>1&&ilk.fiyat>0?(son.fiyat/ilk.fiyat-1)*100:null;
    liste.push({stokId:sid,kod:st?.kod||'',ad:st?.ad||'(silinmiş stok)',birim:(typeof birimAd==='function'?birimAd(st?.birim_id):'')||'',grup:st?(kok(st)?.ad||''):'',
      alimSayisi:alimlar.length,toplamMiktar:topM,toplamTutar:topT,ort:topT/topM,
      min:Math.min(...alimlar.map(a=>a.fiyat)),max:Math.max(...alimlar.map(a=>a.fiyat)),
      ilkTarih:ilk.tarih,ilkFiyat:ilk.fiyat,sonTarih:son.tarih,sonFiyat:son.fiyat,
      degisim,etki:degisim===null?null:topT-ilk.fiyat*topM,gunler});
  }
  const degisimli=liste.filter(s=>s.degisim!==null);
  const tutarDegisimli=degisimli.reduce((x,s)=>x+s.toplamTutar,0);
  const kpi={
    toplamTutar:liste.reduce((x,s)=>x+s.toplamTutar,0),
    stokSayisi:liste.length,
    agirlikliDegisim:tutarDegisimli>0?degisimli.reduce((x,s)=>x+s.degisim*s.toplamTutar,0)/tutarDegisimli:null,
    artan:degisimli.filter(s=>s.degisim>0.005).length,
    azalan:degisimli.filter(s=>s.degisim<-0.005).length,
    sabit:degisimli.filter(s=>Math.abs(s.degisim)<=0.005).length,
    hesaplanamayan:liste.length-degisimli.length, // tek alım günü olduğu için değişimi hesaplanamayan stoklar
    etki:degisimli.reduce((x,s)=>x+s.etki,0)
  };
  // Ana grup bazında (alım tutarıyla ağırlıklı) değişim
  const gm=new Map();
  degisimli.forEach(s=>{const g=gm.get(s.grup||'(Grupsuz)')||{tutar:0,agirlik:0};g.tutar+=s.toplamTutar;g.agirlik+=s.degisim*s.toplamTutar;gm.set(s.grup||'(Grupsuz)',g);});
  const gruplar=[...gm.entries()].map(([ad,g])=>({ad,tutar:g.tutar,degisim:g.agirlik/g.tutar})).sort((a,b)=>b.degisim-a.degisim);
  return {stoklar:liste,kpi,gruplar};
}

// ----- Filtreler -----
async function _aaPartileriDoldur(){
  const sel=document.getElementById('aa-parti');if(!sel)return;
  const secili=sel.value;
  const {data}=await sb.from('aktarim_partileri').select('id,ad,bas,bit').eq('isyeri_id',aktifIsyeri.id).eq('tur','alim').eq('silindi',false).order('bas');
  sel.innerHTML='<option value="">Tüm partiler</option>'+(data||[]).map(p=>`<option value="${p.id}">${_logEsc(p.ad||'')} (${_aaTr(p.bas)} – ${_aaTr(p.bit)})</option>`).join('');
  sel.value=secili;
}
function _aaYilAyDoldur(){
  const yil=document.getElementById('aa-yil'),ay=document.getElementById('aa-ay');if(!yil||!ay)return;
  if(yil.options.length<=1){const bu=new Date().getFullYear();for(let y=bu;y>=bu-6;y--){const o=document.createElement('option');o.value=String(y);o.textContent=String(y);yil.appendChild(o);}}
  if(ay.options.length<=1){_AA_AYLAR.forEach((ad,i)=>{const o=document.createElement('option');o.value=String(i+1).padStart(2,'0');o.textContent=ad;ay.appendChild(o);});}
}
// Yıl seçilip ay boş bırakılırsa tüm yıl; ikisi de boşsa tarih filtresi yok (tüm veri)
window.aaYilAySec=function(){
  const yil=document.getElementById('aa-yil'),ay=document.getElementById('aa-ay');
  if(ay.value&&!yil.value)yil.value=String(new Date().getFullYear());
  if(!yil.value)return;
  const y=+yil.value;
  if(!ay.value){document.getElementById('aa-bas').value=`${y}-01-01`;document.getElementById('aa-bit').value=`${y}-12-31`;return;}
  const m=+ay.value,son=new Date(y,m,0).getDate();
  document.getElementById('aa-bas').value=`${y}-${ay.value}-01`;
  document.getElementById('aa-bit').value=`${y}-${ay.value}-${String(son).padStart(2,'0')}`;
};
window.aaTarihElle=function(){document.getElementById('aa-yil').value='';document.getElementById('aa-ay').value='';};
window.alisAnalizAc=function(){_aaYilAyDoldur();_aaPartileriDoldur();};

// ----- Rapor -----
async function alisAnalizVeriGetir(bas,bit,parti){
  return sbSayfali(()=>{
    let q=sb.from('v_aktarim_alimlari').select('id,stok_id,tarih,miktar,birim_fiyat,tutar,tedarikci,belge_no,parti_ad').eq('isyeri_id',aktifIsyeri.id);
    if(bas)q=q.gte('tarih',bas);if(bit)q=q.lte('tarih',bit);if(parti)q=q.eq('parti_id',parti);
    return q.order('tarih').order('id');
  });
}
window.alisAnalizRaporla=async function(){
  const bas=document.getElementById('aa-bas').value,bit=document.getElementById('aa-bit').value,parti=document.getElementById('aa-parti').value;
  if(bas&&bit&&bas>bit){bil('Başlangıç tarihi bitiş tarihinden sonra olamaz!','err');return;}
  const kutu=document.getElementById('aa-icerik');kutu.innerHTML='<div class="bos">Hesaplanıyor...</div>';
  let rows;
  try{rows=await alisAnalizVeriGetir(bas,bit,parti);}
  catch(e){kutu.innerHTML=`<div class="bos">Veri okunamadı: ${_logEsc(e.message)}</div>`;return;}
  const sonuc=alisAnalizHesapla(rows);
  if(!sonuc.stoklar.length){_aaVeri=null;kutu.innerHTML='<div class="bos">Seçilen filtrelerde alım verisi yok.</div>';return;}
  _aaVeri={rows,sonuc,bas,bit,parti,partiAd:parti?document.getElementById('aa-parti').selectedOptions[0]?.textContent:'Tüm partiler'};
  alisAnalizCiz();
};
function _aaKart(baslik,deger,renk){
  return `<div style="background:var(--beyaz);border:1px solid var(--border);border-radius:10px;padding:.7rem .9rem"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--yazi3);margin-bottom:4px">${baslik}</div><div style="font-size:18px;font-weight:600;font-family:'Lora',serif;${renk||''}">${deger}</div></div>`;
}
function alisAnalizCiz(){
  const {sonuc}=_aaVeri;const k=sonuc.kpi;
  const kutu=document.getElementById('aa-icerik');
  const enIyiTrend=[...sonuc.stoklar].sort((a,b)=>b.toplamTutar-a.toplamTutar);
  kutu.innerHTML=`
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:1rem">
    ${_aaKart('Toplam Alım Tutarı',_aaPara(k.toplamTutar))}
    ${_aaKart('Alım Yapılan Stok',k.stokSayisi)}
    ${_aaKart('Ağırlıklı Fiyat Değişimi',_aaYuzde(k.agirlikliDegisim),_aaKr(k.agirlikliDegisim))}
    ${_aaKart('Fiyatı Artan · Azalan · Sabit',`${k.artan} · ${k.azalan} · ${k.sabit}`)}
    ${_aaKart('Fiyat Farkı Etkisi',_aaPara(k.etki),_aaKr(k.etki))}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1rem;margin-bottom:1rem">
    <div class="card" style="margin:0"><div class="card-title">Fiyatı En Çok Artan 10 Stok</div><div style="height:280px"><canvas id="aa-c1"></canvas></div></div>
    <div class="card" style="margin:0"><div class="card-title">Ana Grup Bazında Fiyat Değişimi</div><div style="height:280px"><canvas id="aa-c2"></canvas></div></div>
  </div>
  <div class="card"><div class="card-title">Fiyat Trendi
    <select id="aa-trend-sec" onchange="aaTrendCiz(this.value)" style="font-size:12px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--beyaz);max-width:320px">
      ${enIyiTrend.map(s=>`<option value="${s.stokId}">${_logEsc(s.ad)} [${_logEsc(s.kod)}]</option>`).join('')}
    </select></div><div style="height:260px"><canvas id="aa-c3"></canvas></div></div>
  <div class="card">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:.6rem">
      <input type="text" id="aa-ara" oninput="aaTabloCiz()" placeholder="🔍 Stok / kod ara..." style="font-size:12px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;min-width:190px">
      <select id="aa-sirala" onchange="aaTabloCiz()" style="font-size:12px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--beyaz)">
        <option value="degisim">Sırala: Değişim %</option><option value="etki">Sırala: Fiyat Farkı Etkisi</option><option value="tutar">Sırala: Alım Tutarı</option><option value="kod">Sırala: Stok Kodu</option>
      </select>
      <div id="aa-ozet" style="margin-left:auto;font-size:12px;color:var(--yazi3)"></div>
    </div>
    <div class="tw" style="max-height:60vh;overflow:auto"><table id="aa-tablo" style="font-size:12px"><thead id="aa-th"></thead><tbody id="aa-tb"></tbody></table></div>
  </div>`;
  aaGrafikleriCiz();aaTabloCiz();aaTrendCiz(enIyiTrend[0].stokId);
}
function _aaRenk(ad){return (getComputedStyle(document.documentElement).getPropertyValue(ad)||'').trim();}
function _aaGrafigiYenile(id,config){
  if(_aaGrafik[id]){_aaGrafik[id].destroy();delete _aaGrafik[id];}
  const el=document.getElementById(id);if(!el||typeof Chart==='undefined')return;
  _aaGrafik[id]=new Chart(el,config);
}
function aaGrafikleriCiz(){
  const {sonuc}=_aaVeri;
  const yazi=_aaRenk('--yazi2')||'#888',cizgi=_aaRenk('--border')||'#444',vurgu=_aaRenk('--yesil')||'#52b788';
  const ortak={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}};
  const top=sonuc.stoklar.filter(s=>s.degisim!==null&&s.degisim>0).sort((a,b)=>b.degisim-a.degisim).slice(0,10);
  _aaGrafigiYenile('aa-c1',{type:'bar',data:{labels:top.map(s=>s.ad),datasets:[{data:top.map(s=>Math.round(s.degisim*100)/100),backgroundColor:vurgu,borderRadius:3}]},
    options:{...ortak,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+_aaYuzde(c.raw)}}},
      scales:{x:{ticks:{color:yazi,callback:v=>'%'+v},grid:{color:cizgi}},y:{ticks:{color:yazi,font:{size:10}},grid:{display:false}}}}});
  const g=sonuc.gruplar;
  _aaGrafigiYenile('aa-c2',{type:'bar',data:{labels:g.map(x=>x.ad),datasets:[{data:g.map(x=>Math.round(x.degisim*100)/100),backgroundColor:g.map(x=>x.degisim<0?'#c62828':vurgu),borderRadius:3}]},
    options:{...ortak,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+_aaYuzde(c.raw)+' · alım '+_aaPara(g[c.dataIndex].tutar)}}},
      scales:{x:{ticks:{color:yazi,font:{size:10}},grid:{display:false}},y:{ticks:{color:yazi,callback:v=>'%'+v},grid:{color:cizgi}}}}});
}
window.aaTrendCiz=function(stokId){
  const s=_aaVeri.sonuc.stoklar.find(x=>x.stokId===stokId);if(!s)return;
  const sel=document.getElementById('aa-trend-sec');if(sel)sel.value=stokId;
  const yazi=_aaRenk('--yazi2')||'#888',cizgi=_aaRenk('--border')||'#444',vurgu=_aaRenk('--yesil')||'#52b788';
  _aaGrafigiYenile('aa-c3',{type:'line',data:{labels:s.gunler.map(x=>_aaTr(x.tarih)),datasets:[{label:s.ad,data:s.gunler.map(x=>Math.round(x.fiyat*10000)/10000),borderColor:vurgu,backgroundColor:vurgu,tension:.25,pointRadius:3}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${_aaPara(c.raw)} / ${s.birim||'birim'}`}}},
      scales:{x:{ticks:{color:yazi,font:{size:10}},grid:{display:false}},y:{ticks:{color:yazi,callback:v=>'₺'+v},grid:{color:cizgi}}}}});
};
window.aaTabloCiz=function(){
  if(!_aaVeri)return;
  const ara=(document.getElementById('aa-ara')?.value||'').trim().toLocaleLowerCase('tr');
  const sirala=document.getElementById('aa-sirala')?.value||'degisim';
  let liste=_aaVeri.sonuc.stoklar.filter(s=>!ara||s.ad.toLocaleLowerCase('tr').includes(ara)||String(s.kod).toLowerCase().includes(ara));
  const null_sonda=(a,b,f)=>{const x=f(a),y=f(b);if(x===null&&y===null)return 0;if(x===null)return 1;if(y===null)return -1;return y-x;};
  liste=liste.slice().sort((a,b)=>sirala==='kod'?String(a.kod).localeCompare(String(b.kod),'tr',{numeric:true}):sirala==='tutar'?b.toplamTutar-a.toplamTutar:null_sonda(a,b,s=>sirala==='etki'?s.etki:s.degisim));
  document.getElementById('aa-th').innerHTML=`<tr><th>Kod</th><th>Stok</th><th>Birim</th><th style="text-align:right">Alım</th><th style="text-align:right">Toplam Miktar</th><th style="text-align:right">Toplam Tutar</th><th style="text-align:right">İlk Fiyat</th><th style="text-align:right">Son Fiyat</th><th style="text-align:right">Ort. Fiyat</th><th style="text-align:right">Min</th><th style="text-align:right">Maks</th><th style="text-align:right">Değişim</th><th style="text-align:right">Fiyat Farkı Etkisi</th></tr>`;
  const f3=n=>_aaF(n,{maximumFractionDigits:3});
  document.getElementById('aa-tb').innerHTML=liste.map(s=>`<tr onclick="aaTrendSec('${s.stokId}')" style="cursor:pointer" title="Fiyat trendini göster">
    <td style="white-space:nowrap">${_logEsc(s.kod)}</td><td>${_logEsc(s.ad)}</td><td>${_logEsc(s.birim)}</td>
    <td style="text-align:right">${s.alimSayisi}</td><td style="text-align:right">${f3(s.toplamMiktar)}</td><td style="text-align:right">${_aaPara(s.toplamTutar)}</td>
    <td style="text-align:right" title="${_aaTr(s.ilkTarih)}">${_aaPara(s.ilkFiyat)}</td><td style="text-align:right" title="${_aaTr(s.sonTarih)}">${_aaPara(s.sonFiyat)}</td>
    <td style="text-align:right">${_aaPara(s.ort)}</td><td style="text-align:right">${_aaPara(s.min)}</td><td style="text-align:right">${_aaPara(s.max)}</td>
    <td style="text-align:right;${_aaKr(s.degisim)}">${_aaYuzde(s.degisim)}</td><td style="text-align:right;${_aaKr(s.etki)}">${s.etki===null?'—':_aaPara(s.etki)}</td></tr>`).join('')||'<tr><td colspan="13" class="bos">Sonuç yok</td></tr>';
  const oz=document.getElementById('aa-ozet');if(oz)oz.textContent=`${liste.length} stok`;
};
window.aaTrendSec=function(id){aaTrendCiz(id);document.getElementById('aa-c3')?.scrollIntoView&&document.getElementById('aa-c3').scrollIntoView({block:'center',behavior:'smooth'});};

// ----- Excel -----
window.alisAnalizExcel=function(){
  if(!_aaVeri){bil('Önce filtreleri seçip Raporla\'ya basın.','err');return;}
  if(typeof XLSX==='undefined'){bil('Excel kütüphanesi yüklenemedi, sayfayı yenileyin.','err');return;}
  const {sonuc,rows,bas,bit,partiAd}=_aaVeri;const k=sonuc.kpi;
  const ozet=[['Alış Fiyat Analizi'],['Parti',partiAd||'Tüm partiler'],['Dönem',(bas||bit)?`${_aaTr(bas)||'…'} – ${_aaTr(bit)||'…'}`:'Tüm veri'],[],
    ['Toplam Alım Tutarı',+k.toplamTutar.toFixed(2)],['Alım Yapılan Stok',k.stokSayisi],['Ağırlıklı Fiyat Değişimi (%)',k.agirlikliDegisim===null?'':+k.agirlikliDegisim.toFixed(2)],
    ['Fiyatı Artan Stok',k.artan],['Fiyatı Azalan Stok',k.azalan],['Fiyatı Sabit Stok',k.sabit],['Değişimi Hesaplanamayan (tek alım günü)',k.hesaplanamayan],['Fiyat Farkı Etkisi',+k.etki.toFixed(2)],[],
    ['Ana Grup','Alım Tutarı','Ağırlıklı Değişim (%)'],...sonuc.gruplar.map(g=>[g.ad,+g.tutar.toFixed(2),+g.degisim.toFixed(2)])];
  const stokSatirlari=[...sonuc.stoklar].sort((a,b)=>(b.degisim??-1e9)-(a.degisim??-1e9)).map(s=>({'Kod':s.kod,'Stok':s.ad,'Ana Grup':s.grup,'Birim':s.birim,'Alım Sayısı':s.alimSayisi,'Toplam Miktar':+s.toplamMiktar.toFixed(3),'Toplam Tutar':+s.toplamTutar.toFixed(2),
    'İlk Alım Tarihi':_aaTr(s.ilkTarih),'İlk Fiyat':+s.ilkFiyat.toFixed(4),'Son Alım Tarihi':_aaTr(s.sonTarih),'Son Fiyat':+s.sonFiyat.toFixed(4),'Ort. Fiyat':+s.ort.toFixed(4),'Min Fiyat':+s.min.toFixed(4),'Maks Fiyat':+s.max.toFixed(4),
    'Değişim (%)':s.degisim===null?'':+s.degisim.toFixed(2),'Fiyat Farkı Etkisi':s.etki===null?'':+s.etki.toFixed(2)}));
  const stokAd=new Map(stoklar.map(s=>[s.id,s]));
  const detay=rows.map(r=>({'Tarih':_aaTr(r.tarih),'Stok Kodu':stokAd.get(r.stok_id)?.kod||'','Stok':stokAd.get(r.stok_id)?.ad||'','Miktar':+(+r.miktar).toFixed(3),'Birim Fiyat':r.birim_fiyat===null?'':+(+r.birim_fiyat).toFixed(4),'Tutar':+(+r.tutar).toFixed(2),'Tedarikçi':r.tedarikci||'','Belge No':r.belge_no||'','Parti':r.parti_ad||''}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(ozet),'Özet');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(stokSatirlari),'Stok Analizi');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(detay),'Alım Detay');
  XLSX.writeFile(wb,`alis_fiyat_analizi_${bas||'tum'}_${bit||'veri'}.xlsx`);
};
