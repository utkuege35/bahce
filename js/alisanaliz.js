// ===== ALIŞ FİYAT ANALİZİ =====
// Veri Yükleme ile içeri alınan ALIM hareketlerinden stok ve GRUP bazında fiyat değişimini çıkarır (dashboard + tablolar + Excel).
// Kaynak: v_aktarim_alimlari (silinmiş partiler gelmez). Fiyatlar stoğun TEMEL birimi başına, KDV hariçtir.
//  • İlk/Son fiyat: aralıktaki ilk ve son ALIM GÜNÜNÜN ağırlıklı ortalama fiyatı (aynı gün birden çok alım varsa tutar/miktar).
//  • Değişim %: (Son / İlk − 1) × 100; en az iki farklı alım günü gerekir.
//  • Fiyat Farkı Etkisi: aralıkta fiilen ödenen − tüm miktar ilk fiyattan alınsaydı ödenecek tutar.
//  • Grup değişimi: grubundaki stokların değişimleri, alım tutarlarıyla ağırlıklandırılarak ortalanır.
//  • Grup fiyat endeksi (aylık, ilk ay = 100): ardışık iki ayda ORTAK alınan stokların aylık ağırlıklı fiyat değişimi, önceki ayın
//    harcamasıyla ağırlıklandırılır ve zincirlenir; ortak stok yoksa o ay değişim 0 kabul edilir.
//  • Grup düzeyi: Ana Grup / Alt Grup / Alt Grup 2 (stok kartı hiyerarşisi); varsayılan, grupların ilk kez birden fazlaya ayrıldığı düzeydir.
let _aaVeri=null,_aaGrafik={},_aaSeviye=0,_aaGrupFiltre='',_aaRenkHarita={},_aaGrupAdlari=[];
const _AA_PALET=['#4e9bd4','#52b788','#e9a23b','#b57edc','#e76f6f','#2ec4b6','#f08a4b','#a3be5c','#d96aa7','#6c8cd5','#e0c341','#8d99ae'];
const _AA_SEVIYE_AD=['Ana Grup','Alt Grup','Alt Grup 2'];
const _aaSeviyeAd=i=>_AA_SEVIYE_AD[i]||('Seviye '+(i+1));
const _aaF=(n,o)=>(+n).toLocaleString('tr-TR',o||{minimumFractionDigits:2,maximumFractionDigits:2});
const _aaPara=n=>'₺'+_aaF(n);
const _aaYuzde=v=>v===null||v===undefined?'—':(v<0?'-':'')+'%'+_aaF(Math.abs(v));
const _aaKr=(v,e)=>v!==null&&v!==undefined&&v<-(e||0.005)?'color:#c62828;':'';
const _aaTr=t=>t?t.split('-').reverse().join('.'):'';
const _AA_AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const _aaAyEtiket=ay=>{const [y,m]=ay.split('-');return `${_AA_AYLAR[+m-1]} ${y}`;};
const _aaRenkOf=ad=>_aaRenkHarita[ad]||'#8d99ae';
function _aaRenkAta(adlar){_aaRenkHarita={};[...new Set(adlar)].sort((a,b)=>a.localeCompare(b,'tr')).forEach((ad,i)=>{_aaRenkHarita[ad]=_AA_PALET[i%_AA_PALET.length];});}

// ---------- Saf hesaplar (test edilebilir) ----------
function alisGrupAdi(s,seviye){const z=s.zincir||[];return z.length?(z[seviye]||z[z.length-1]):'(Grupsuz)';}
function alisVarsayilanSeviye(liste){
  const maks=Math.max(0,...liste.map(s=>(s.zincir||[]).length));
  for(let sv=0;sv<maks;sv++){if(new Set(liste.map(s=>alisGrupAdi(s,sv))).size>1)return sv;}
  return 0;
}
// Stok bazlı analiz: ham alım satırlarından stok listesi, özet kartlar ve (varsayılan düzeyde) grup değişimi üretir
function alisAnalizHesapla(rows){
  const stokHarita=new Map(stoklar.map(s=>[s.id,s]));
  // Stoğun grup zinciri: kökten doğrudan üst gruba doğru grup adları (ör. [YİYECEKLER, ETLER, DANA VE KUZU ETLERİ])
  const zincir=s=>{const z=[];let g=s,k=0;while(g&&g.ust_id&&k++<10){const u=stokHarita.get(g.ust_id);if(!u)break;z.unshift(u.ad);g=u;}return z;};
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
    liste.push({stokId:sid,kod:st?.kod||'',ad:st?.ad||'(silinmiş stok)',birim:(typeof birimAd==='function'?birimAd(st?.birim_id):'')||'',zincir:st?zincir(st):[],grup:'',
      alimSayisi:alimlar.length,toplamMiktar:topM,toplamTutar:topT,ort:topT/topM,
      min:Math.min(...alimlar.map(a=>a.fiyat)),max:Math.max(...alimlar.map(a=>a.fiyat)),
      ilkTarih:ilk.tarih,ilkFiyat:ilk.fiyat,sonTarih:son.tarih,sonFiyat:son.fiyat,
      degisim,etki:degisim===null?null:topT-ilk.fiyat*topM,gunler});
  }
  const varsayilanSeviye=alisVarsayilanSeviye(liste);
  liste.forEach(s=>{s.grup=alisGrupAdi(s,varsayilanSeviye);});
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
  const seviyeSayisi=Math.max(1,...liste.map(s=>s.zincir.length));
  return {stoklar:liste,kpi,gruplar:alisGrupHesapla(liste,varsayilanSeviye).filter(g=>g.degisim!==null),varsayilanSeviye,seviyeSayisi};
}
// Seçilen grup düzeyinde grup özeti (alım payı, ağırlıklı değişim, etki); değişimi en yüksek olan başta
function alisGrupHesapla(liste,seviye){
  const m=new Map();
  liste.forEach(s=>{
    const ad=alisGrupAdi(s,seviye);
    const g=m.get(ad)||{ad,stokSayisi:0,tutar:0,agirlik:0,agirlikTutar:0,etki:0,artan:0,azalan:0};
    g.stokSayisi++;g.tutar+=s.toplamTutar;
    if(s.degisim!==null){g.agirlik+=s.degisim*s.toplamTutar;g.agirlikTutar+=s.toplamTutar;g.etki+=s.etki;if(s.degisim>0.005)g.artan++;else if(s.degisim<-0.005)g.azalan++;}
    m.set(ad,g);
  });
  const toplam=[...m.values()].reduce((x,g)=>x+g.tutar,0);
  return [...m.values()].map(g=>({ad:g.ad,stokSayisi:g.stokSayisi,tutar:g.tutar,pay:toplam>0?g.tutar/toplam*100:0,degisim:g.agirlikTutar>0?g.agirlik/g.agirlikTutar:null,etki:g.etki,artan:g.artan,azalan:g.azalan}))
    .sort((a,b)=>(b.degisim===null?-1e9:b.degisim)-(a.degisim===null?-1e9:a.degisim));
}
// Aylık grup fiyat endeksi (ilk ay = 100): ardışık iki ayda ORTAK alınan stokların fiyat değişimi, önceki ay harcamasıyla ağırlıklı, zincirlenir
function alisGrupEndeksi(rows,liste,seviye){
  const grupAd=new Map(liste.map(s=>[s.stokId,alisGrupAdi(s,seviye)]));
  const aylik=new Map(),aySet=new Set();
  rows.forEach(r=>{
    const m=+r.miktar,t=+r.tutar;if(!(m>0&&t>0)||!grupAd.has(r.stok_id))return;
    const ay=String(r.tarih).slice(0,7);aySet.add(ay);
    const sm=aylik.get(r.stok_id)||new Map();const a=sm.get(ay)||{m:0,t:0};a.m+=m;a.t+=t;sm.set(ay,a);aylik.set(r.stok_id,sm);
  });
  const aylar=[...aySet].sort();
  const gruplar=new Map();grupAd.forEach((g,sid)=>{if(!gruplar.has(g))gruplar.set(g,[]);gruplar.get(g).push(sid);});
  const seriler=[...gruplar.entries()].map(([ad,sids])=>{
    const deger=[100];
    for(let i=1;i<aylar.length;i++){
      let ws=0,wr=0;
      sids.forEach(sid=>{const sm=aylik.get(sid);if(!sm)return;const o=sm.get(aylar[i-1]),b=sm.get(aylar[i]);if(!o||!b)return;ws+=o.t;wr+=o.t*((b.t/b.m)/(o.t/o.m));});
      deger.push(deger[i-1]*(ws>0?wr/ws:1));
    }
    return {ad,degerler:deger};
  });
  return {aylar,seriler};
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
  _aaSeviye=sonuc.varsayilanSeviye;_aaGrupFiltre='';
  alisAnalizCiz();
};
function _aaKart(baslik,deger,renk,alt){
  return `<div style="background:${renk}1f;border:1px solid ${renk}55;border-left:4px solid ${renk};border-radius:10px;padding:.7rem .9rem">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--yazi3);margin-bottom:4px">${baslik}</div>
    <div style="font-size:18px;font-weight:600;font-family:'Lora',serif">${deger}</div>${alt?`<div style="font-size:11px;color:var(--yazi2);margin-top:2px">${alt}</div>`:''}</div>`;
}
function _aaListe(){return _aaVeri.sonuc.stoklar.filter(s=>!_aaGrupFiltre||alisGrupAdi(s,_aaSeviye)===_aaGrupFiltre);}
function _aaNokta(renk,baslik){return `<span ${baslik?`title="${_logEsc(baslik)}" `:''}style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${renk};margin-right:6px;flex-shrink:0"></span>`;}
function alisAnalizCiz(){
  const {sonuc}=_aaVeri;const k=sonuc.kpi;
  const grupTum=alisGrupHesapla(sonuc.stoklar,_aaSeviye);
  _aaGrupAdlari=grupTum.map(g=>g.ad);_aaRenkAta(_aaGrupAdlari);
  const enArtan=grupTum.find(g=>g.degisim!==null);
  const kutu=document.getElementById('aa-icerik');
  const seviyeSecenek=Array.from({length:sonuc.seviyeSayisi},(_,i)=>`<option value="${i}"${i===_aaSeviye?' selected':''}>${_aaSeviyeAd(i)}</option>`).join('');
  kutu.innerHTML=`
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:1rem">
    ${_aaKart('Toplam Alım Tutarı',_aaPara(k.toplamTutar),'#4e9bd4')}
    ${_aaKart('Alım Yapılan Stok',k.stokSayisi,'#2ec4b6',`${grupTum.length} grup`)}
    ${_aaKart('Ağırlıklı Fiyat Değişimi',`<span style="${_aaKr(k.agirlikliDegisim)}">${_aaYuzde(k.agirlikliDegisim)}</span>`,'#e9a23b')}
    ${_aaKart('Fiyatı Artan · Azalan · Sabit',`${k.artan} · ${k.azalan} · ${k.sabit}`,'#b57edc')}
    ${_aaKart('Fiyat Farkı Etkisi',`<span style="${_aaKr(k.etki)}">${_aaPara(k.etki)}</span>`,'#52b788')}
    ${_aaKart('Fiyatı En Çok Artan Grup',enArtan?`<span style="${_aaKr(enArtan.degisim)}">${_aaYuzde(enArtan.degisim)}</span>`:'—','#e76f6f',enArtan?_logEsc(enArtan.ad):'')}
  </div>
  <div id="aa-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:1rem"></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1rem;margin-bottom:1rem">
    <div class="card" style="margin:0"><div class="card-title">Fiyatı En Çok Artan 10 Stok</div><div style="height:300px"><canvas id="aa-c1"></canvas></div></div>
    <div class="card" style="margin:0"><div class="card-title">Grup Bazında Fiyat Değişimi
      <select id="aa-seviye" onchange="aaSeviyeDegis(this.value)" style="font-size:12px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--beyaz)${sonuc.seviyeSayisi>1?'':';display:none'}">${seviyeSecenek}</select></div>
      <div style="height:300px"><canvas id="aa-c2"></canvas></div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1rem;margin-bottom:1rem">
    <div class="card" style="margin:0"><div class="card-title">Gruplara Göre Alım Dağılımı</div><div style="height:300px"><canvas id="aa-c4"></canvas></div></div>
    <div class="card" style="margin:0"><div class="card-title">Grup Fiyat Endeksi (aylık, ilk ay = 100)</div><div style="height:300px"><canvas id="aa-c5"></canvas></div><div id="aa-c5-bos" class="bos" style="display:none">Endeks için en az iki ayın verisi gerekir.</div></div>
  </div>
  <div class="card"><div class="card-title">Fiyat Trendi
    <select id="aa-trend-sec" onchange="aaTrendCiz(this.value)" style="font-size:12px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;background:var(--beyaz);max-width:320px"></select></div>
    <div style="height:260px"><canvas id="aa-c3"></canvas></div></div>
  <div class="card"><div class="card-title">Gruplara Göre Özet</div>
    <div class="tw"><table style="font-size:12px"><thead><tr><th>Grup</th><th style="text-align:right">Stok</th><th style="text-align:right">Alım Tutarı</th><th style="text-align:right">Pay</th><th style="text-align:right">Ağırlıklı Değişim</th><th style="text-align:right">Fiyat Farkı Etkisi</th><th style="text-align:right">Artan</th><th style="text-align:right">Azalan</th></tr></thead><tbody id="aa-grup-tb"></tbody></table></div></div>
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
  aaFiltreUygula();
}
// Seçili grup filtresine göre tüm parçaları yeniden çizer
function aaFiltreUygula(){
  aaChipsCiz();aaGrafikleriCiz();aaGrupTabloCiz();aaTabloCiz();
  const liste=_aaListe().slice().sort((a,b)=>b.toplamTutar-a.toplamTutar);
  const sel=document.getElementById('aa-trend-sec');
  const onceki=sel.value;
  sel.innerHTML=liste.map(s=>`<option value="${s.stokId}">${_logEsc(s.ad)} [${_logEsc(s.kod)}]</option>`).join('');
  if(liste.length)aaTrendCiz(liste.some(s=>s.stokId===onceki)?onceki:liste[0].stokId);
  else _aaGrafigiYenile('aa-c3',null);
}
function aaChipsCiz(){
  const kutu=document.getElementById('aa-chips');if(!kutu)return;
  const g=alisGrupHesapla(_aaVeri.sonuc.stoklar,_aaSeviye);
  const chip=(ad,renk,secili,yazi,i)=>`<button type="button" onclick="${i<0?'aaGrupSecI(-1)':`aaGrupSecI(${i})`}" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;padding:5px 11px;border-radius:16px;border:1px solid ${renk};${secili?`background:${renk};color:#fff;font-weight:600`:`background:${renk}22;color:var(--yazi1)`}">${secili?'':_aaNokta(renk).replace('margin-right:6px','margin-right:0')}${yazi}</button>`;
  kutu.innerHTML=chip('Tümü','#8d99ae',!_aaGrupFiltre,'Tüm gruplar',-1)+g.map(x=>chip(x.ad,_aaRenkOf(x.ad),x.ad===_aaGrupFiltre,`${_logEsc(x.ad)}${x.degisim===null?'':` · ${_aaYuzde(x.degisim)}`}`,_aaGrupAdlari.indexOf(x.ad))).join('');
}
window.aaGrupSecI=function(i){
  const ad=i<0?'':_aaGrupAdlari[i];
  _aaGrupFiltre=(!ad||ad===_aaGrupFiltre)?'':ad; // aynı gruba tekrar tıklamak filtreyi kaldırır
  aaFiltreUygula();
};
window.aaSeviyeDegis=function(v){_aaSeviye=+v;_aaGrupFiltre='';alisAnalizCiz();};
function _aaRenk(ad){return (getComputedStyle(document.documentElement).getPropertyValue(ad)||'').trim();}
function _aaGrafigiYenile(id,config){
  if(_aaGrafik[id]){_aaGrafik[id].destroy();delete _aaGrafik[id];}
  const el=document.getElementById(id);if(!el||!config||typeof Chart==='undefined')return;
  _aaGrafik[id]=new Chart(el,config);
}
function aaGrafikleriCiz(){
  const {sonuc,rows}=_aaVeri;
  const yazi=_aaRenk('--yazi2')||'#888',cizgi=_aaRenk('--border')||'#444',zemin=_aaRenk('--beyaz')||'#1b2330';
  const grup=alisGrupHesapla(sonuc.stoklar,_aaSeviye);
  const sec=ad=>!_aaGrupFiltre||ad===_aaGrupFiltre;      // seçili grup dışındakiler soluklaşır
  const soluk=(renk,ad)=>sec(ad)?renk:renk+'44';
  // 1) fiyatı en çok artan 10 stok (seçili gruba göre); çubuk rengi = stoğun grubu
  const top=_aaListe().filter(s=>s.degisim!==null&&s.degisim>0).sort((a,b)=>b.degisim-a.degisim).slice(0,10);
  _aaGrafigiYenile('aa-c1',{type:'bar',data:{labels:top.map(s=>s.ad),datasets:[{data:top.map(s=>Math.round(s.degisim*100)/100),backgroundColor:top.map(s=>_aaRenkOf(alisGrupAdi(s,_aaSeviye))),borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+_aaYuzde(c.raw)+' · '+alisGrupAdi(top[c.dataIndex],_aaSeviye)}}},
      scales:{x:{ticks:{color:yazi,callback:v=>'%'+v},grid:{color:cizgi}},y:{ticks:{color:yazi,font:{size:10}},grid:{display:false}}}}});
  // 2) grup bazında ağırlıklı fiyat değişimi; her grup kendi renginde, çubuğa tıklayınca o gruba filtrelenir
  const g2=grup.filter(x=>x.degisim!==null);
  _aaGrafigiYenile('aa-c2',{type:'bar',data:{labels:g2.map(x=>x.ad),datasets:[{data:g2.map(x=>Math.round(x.degisim*100)/100),backgroundColor:g2.map(x=>soluk(_aaRenkOf(x.ad),x.ad)),borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,onClick:(e,el)=>{if(el&&el.length)aaGrupSecI(_aaGrupAdlari.indexOf(g2[el[0].index].ad));},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+_aaYuzde(c.raw)+' · alım '+_aaPara(g2[c.dataIndex].tutar)}}},
      scales:{x:{ticks:{color:yazi,font:{size:10}},grid:{display:false}},y:{ticks:{color:yazi,callback:v=>'%'+v},grid:{color:cizgi}}}}});
  // 4) alım tutarının gruplara dağılımı
  const g4=grup.filter(x=>x.tutar>0);
  _aaGrafigiYenile('aa-c4',{type:'doughnut',data:{labels:g4.map(x=>x.ad),datasets:[{data:g4.map(x=>Math.round(x.tutar*100)/100),backgroundColor:g4.map(x=>soluk(_aaRenkOf(x.ad),x.ad)),borderColor:zemin,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'55%',onClick:(e,el)=>{if(el&&el.length)aaGrupSecI(_aaGrupAdlari.indexOf(g4[el[0].index].ad));},
      plugins:{legend:{position:'right',labels:{color:yazi,font:{size:10},boxWidth:10,padding:6}},tooltip:{callbacks:{label:c=>` ${c.label}: ${_aaPara(c.raw)} (%${_aaF(g4[c.dataIndex].pay,{maximumFractionDigits:1})})`}}}}});
  // 5) aylık grup fiyat endeksi (ilk ay = 100)
  const en=alisGrupEndeksi(rows,sonuc.stoklar,_aaSeviye);
  const bos=document.getElementById('aa-c5-bos'),cv=document.getElementById('aa-c5');
  if(en.aylar.length<2){if(bos)bos.style.display='';if(cv)cv.parentElement.style.display='none';_aaGrafigiYenile('aa-c5',null);}
  else{
    if(bos)bos.style.display='none';if(cv)cv.parentElement.style.display='';
    _aaGrafigiYenile('aa-c5',{type:'line',data:{labels:en.aylar.map(_aaAyEtiket),datasets:en.seriler.map(s=>({label:s.ad,data:s.degerler.map(v=>Math.round(v*100)/100),borderColor:soluk(_aaRenkOf(s.ad),s.ad),backgroundColor:soluk(_aaRenkOf(s.ad),s.ad),tension:.25,pointRadius:3,borderWidth:sec(s.ad)?2.5:1.5}))},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:yazi,font:{size:10},boxWidth:10,padding:6}},tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${_aaF(c.raw,{minimumFractionDigits:1,maximumFractionDigits:1})}`}}},
        scales:{x:{ticks:{color:yazi,font:{size:10}},grid:{display:false}},y:{ticks:{color:yazi},grid:{color:cizgi}}}}});
  }
}
window.aaTrendCiz=function(stokId){
  const s=_aaVeri.sonuc.stoklar.find(x=>x.stokId===stokId);if(!s)return;
  const sel=document.getElementById('aa-trend-sec');if(sel)sel.value=stokId;
  const yazi=_aaRenk('--yazi2')||'#888',cizgi=_aaRenk('--border')||'#444';
  const renk=_aaRenkOf(alisGrupAdi(s,_aaSeviye));
  _aaGrafigiYenile('aa-c3',{type:'line',data:{labels:s.gunler.map(x=>_aaTr(x.tarih)),datasets:[{label:s.ad,data:s.gunler.map(x=>Math.round(x.fiyat*10000)/10000),borderColor:renk,backgroundColor:renk+'33',fill:true,tension:.25,pointRadius:3,pointBackgroundColor:renk}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${_aaPara(c.raw)} / ${s.birim||'birim'}`}}},
      scales:{x:{ticks:{color:yazi,font:{size:10}},grid:{display:false}},y:{ticks:{color:yazi,callback:v=>'₺'+v},grid:{color:cizgi}}}}});
};
function aaGrupTabloCiz(){
  const g=alisGrupHesapla(_aaVeri.sonuc.stoklar,_aaSeviye);
  document.getElementById('aa-grup-tb').innerHTML=g.map(x=>{const renk=_aaRenkOf(x.ad);const i=_aaGrupAdlari.indexOf(x.ad);
    return `<tr onclick="aaGrupSecI(${i})" style="cursor:pointer;${x.ad===_aaGrupFiltre?`background:${renk}26;`:''}" title="Bu gruba filtrele"><td><span style="display:inline-flex;align-items:center">${_aaNokta(renk)}${_logEsc(x.ad)}</span></td>
    <td style="text-align:right">${x.stokSayisi}</td><td style="text-align:right">${_aaPara(x.tutar)}</td><td style="text-align:right">%${_aaF(x.pay,{minimumFractionDigits:1,maximumFractionDigits:1})}</td>
    <td style="text-align:right;${_aaKr(x.degisim)}">${_aaYuzde(x.degisim)}</td><td style="text-align:right;${_aaKr(x.etki)}">${x.degisim===null?'—':_aaPara(x.etki)}</td><td style="text-align:right">${x.artan}</td><td style="text-align:right">${x.azalan}</td></tr>`;}).join('');
}
window.aaTabloCiz=function(){
  if(!_aaVeri)return;
  const ara=(document.getElementById('aa-ara')?.value||'').trim().toLocaleLowerCase('tr');
  const sirala=document.getElementById('aa-sirala')?.value||'degisim';
  let liste=_aaListe().filter(s=>!ara||s.ad.toLocaleLowerCase('tr').includes(ara)||String(s.kod).toLowerCase().includes(ara));
  const null_sonda=(a,b,f)=>{const x=f(a),y=f(b);if(x===null&&y===null)return 0;if(x===null)return 1;if(y===null)return -1;return y-x;};
  liste=liste.slice().sort((a,b)=>sirala==='kod'?String(a.kod).localeCompare(String(b.kod),'tr',{numeric:true}):sirala==='tutar'?b.toplamTutar-a.toplamTutar:null_sonda(a,b,s=>sirala==='etki'?s.etki:s.degisim));
  document.getElementById('aa-th').innerHTML=`<tr><th>Kod</th><th>Stok</th><th>Birim</th><th style="text-align:right">Alım</th><th style="text-align:right">Toplam Miktar</th><th style="text-align:right">Toplam Tutar</th><th style="text-align:right">İlk Fiyat</th><th style="text-align:right">Son Fiyat</th><th style="text-align:right">Ort. Fiyat</th><th style="text-align:right">Min</th><th style="text-align:right">Maks</th><th style="text-align:right">Değişim</th><th style="text-align:right">Fiyat Farkı Etkisi</th></tr>`;
  const f3=n=>_aaF(n,{maximumFractionDigits:3});
  document.getElementById('aa-tb').innerHTML=liste.map(s=>{const gad=alisGrupAdi(s,_aaSeviye);return `<tr onclick="aaTrendSec('${s.stokId}')" style="cursor:pointer" title="Fiyat trendini göster">
    <td style="white-space:nowrap">${_logEsc(s.kod)}</td><td><span style="display:inline-flex;align-items:center">${_aaNokta(_aaRenkOf(gad),gad)}${_logEsc(s.ad)}</span></td><td>${_logEsc(s.birim)}</td>
    <td style="text-align:right">${s.alimSayisi}</td><td style="text-align:right">${f3(s.toplamMiktar)}</td><td style="text-align:right">${_aaPara(s.toplamTutar)}</td>
    <td style="text-align:right" title="${_aaTr(s.ilkTarih)}">${_aaPara(s.ilkFiyat)}</td><td style="text-align:right" title="${_aaTr(s.sonTarih)}">${_aaPara(s.sonFiyat)}</td>
    <td style="text-align:right">${_aaPara(s.ort)}</td><td style="text-align:right">${_aaPara(s.min)}</td><td style="text-align:right">${_aaPara(s.max)}</td>
    <td style="text-align:right;${_aaKr(s.degisim)}">${_aaYuzde(s.degisim)}</td><td style="text-align:right;${_aaKr(s.etki)}">${s.etki===null?'—':_aaPara(s.etki)}</td></tr>`;}).join('')||'<tr><td colspan="13" class="bos">Sonuç yok</td></tr>';
  const oz=document.getElementById('aa-ozet');if(oz)oz.textContent=`${liste.length} stok${_aaGrupFiltre?' · '+_aaGrupFiltre:''}`;
};
window.aaTrendSec=function(id){aaTrendCiz(id);document.getElementById('aa-c3')?.scrollIntoView&&document.getElementById('aa-c3').scrollIntoView({block:'center',behavior:'smooth'});};

// ----- Excel -----
window.alisAnalizExcel=function(){
  if(!_aaVeri){bil('Önce filtreleri seçip Raporla\'ya basın.','err');return;}
  if(typeof XLSX==='undefined'){bil('Excel kütüphanesi yüklenemedi, sayfayı yenileyin.','err');return;}
  const {sonuc,rows,bas,bit,partiAd}=_aaVeri;const k=sonuc.kpi;
  const grup=alisGrupHesapla(sonuc.stoklar,_aaSeviye);
  const ozet=[['Alış Fiyat Analizi'],['Parti',partiAd||'Tüm partiler'],['Dönem',(bas||bit)?`${_aaTr(bas)||'…'} – ${_aaTr(bit)||'…'}`:'Tüm veri'],['Grup düzeyi',_aaSeviyeAd(_aaSeviye)],[],
    ['Toplam Alım Tutarı',+k.toplamTutar.toFixed(2)],['Alım Yapılan Stok',k.stokSayisi],['Ağırlıklı Fiyat Değişimi (%)',k.agirlikliDegisim===null?'':+k.agirlikliDegisim.toFixed(2)],
    ['Fiyatı Artan Stok',k.artan],['Fiyatı Azalan Stok',k.azalan],['Fiyatı Sabit Stok',k.sabit],['Değişimi Hesaplanamayan (tek alım günü)',k.hesaplanamayan],['Fiyat Farkı Etkisi',+k.etki.toFixed(2)]];
  const grupSatirlari=grup.map(g=>({'Grup':g.ad,'Stok Sayısı':g.stokSayisi,'Alım Tutarı':+g.tutar.toFixed(2),'Pay (%)':+g.pay.toFixed(2),'Ağırlıklı Değişim (%)':g.degisim===null?'':+g.degisim.toFixed(2),'Fiyat Farkı Etkisi':g.degisim===null?'':+g.etki.toFixed(2),'Fiyatı Artan':g.artan,'Fiyatı Azalan':g.azalan}));
  const en=alisGrupEndeksi(rows,sonuc.stoklar,_aaSeviye);
  const endeks=[['Grup',...en.aylar.map(_aaAyEtiket)],...en.seriler.map(s=>[s.ad,...s.degerler.map(v=>+v.toFixed(2))])];
  const stokSatirlari=[...sonuc.stoklar].sort((a,b)=>(b.degisim??-1e9)-(a.degisim??-1e9)).map(s=>({'Kod':s.kod,'Stok':s.ad,'Grup':alisGrupAdi(s,_aaSeviye),'Birim':s.birim,'Alım Sayısı':s.alimSayisi,'Toplam Miktar':+s.toplamMiktar.toFixed(3),'Toplam Tutar':+s.toplamTutar.toFixed(2),
    'İlk Alım Tarihi':_aaTr(s.ilkTarih),'İlk Fiyat':+s.ilkFiyat.toFixed(4),'Son Alım Tarihi':_aaTr(s.sonTarih),'Son Fiyat':+s.sonFiyat.toFixed(4),'Ort. Fiyat':+s.ort.toFixed(4),'Min Fiyat':+s.min.toFixed(4),'Maks Fiyat':+s.max.toFixed(4),
    'Değişim (%)':s.degisim===null?'':+s.degisim.toFixed(2),'Fiyat Farkı Etkisi':s.etki===null?'':+s.etki.toFixed(2)}));
  const stokAd=new Map(stoklar.map(s=>[s.id,s]));
  const detay=rows.map(r=>({'Tarih':_aaTr(r.tarih),'Stok Kodu':stokAd.get(r.stok_id)?.kod||'','Stok':stokAd.get(r.stok_id)?.ad||'','Miktar':+(+r.miktar).toFixed(3),'Birim Fiyat':r.birim_fiyat===null?'':+(+r.birim_fiyat).toFixed(4),'Tutar':+(+r.tutar).toFixed(2),'Tedarikçi':r.tedarikci||'','Belge No':r.belge_no||'','Parti':r.parti_ad||''}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(ozet),'Özet');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(grupSatirlari),'Grup Analizi');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(endeks),'Grup Endeksi');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(stokSatirlari),'Stok Analizi');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(detay),'Alım Detay');
  XLSX.writeFile(wb,`alis_fiyat_analizi_${bas||'tum'}_${bit||'veri'}.xlsx`);
};
