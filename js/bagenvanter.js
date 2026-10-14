// ===== BAĞIMSIZ RAPORLAMA › ENVANTER =====
// Veri Yükleme ile içeri alınan Stok Envanter Raporu'nu (parti) ana ekrandaki Stok Envanter ile AYNI düzende gösterir:
//  • DETAY: stok bazında Devir/Alım/+Transfer/−Transfer/Alış İade/Satış/Ödenmez/İkram/Hasar/Atık[/Diğer], KALAN, Sayım, Fark — her alan Miktar | Tutar.
//  • GRUP: stok grupları KÜMÜLATİF toplamla (üst grup = altındaki tüm gruplar + stoklar); farklı birimler toplanamayacağı için sadece TUTAR.
//  • Kalan, Sayım ve hareketler dosyadan olduğu gibi gelir. FARK = Kalan − Sayım (sayım fazlaysa eksi); sayım yapılmamış stokta sayım 0 kabul edilir.
//  • Sayılarda sadece iki renk: normal ve NEGATİF için kırmızı. Veri ana sistemin stok kayıtlarından bağımsızdır.
let _beVeri=null,_beSonSatirlar=[],_beSonKolonlar=[],_beSonGorunum='detay';
const _beKolonlar=()=>ENVY_ALANLAR.filter(a=>a.k!=='kalan'&&a.k!=='sayim');
const _beF3=v=>(+v).toLocaleString('tr-TR',{maximumFractionDigits:3});
const _beF2=v=>(+v).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const _beM=v=>Math.abs(v)<0.0005?'':_beF3(v);
const _beT=v=>Math.abs(v)<0.005?'':_beF2(v);
const _beKr=(v,esik)=>v<-(esik||0.0005)?'color:#c62828;':'';
const _beBosM=()=>({devir:0,giris:0,alisIade:0,trfArti:0,trfEksi:0,satis:0,odenmez:0,ikram:0,hasar:0,atik:0,diger:0});
// Veritabanı satırı → ekran nesnesi
function bagEnvanterSatirHazirla(r){
  const m=_beBosM(),t=_beBosM();
  _beKolonlar().forEach(a=>{m[a.k]=+r[a.db+'_m']||0;t[a.k]=+r[a.db+'_t']||0;});
  const sayimVar=(r.sayim_m!==null&&r.sayim_m!==undefined)||(r.sayim_t!==null&&r.sayim_t!==undefined);
  const sayimM=+r.sayim_m||0,sayimT=+r.sayim_t||0,kalanM=+r.kalan_m||0,kalanT=+r.kalan_t||0;
  const hareket=Object.keys(m).some(k=>Math.abs(m[k])>=0.0005||Math.abs(t[k])>=0.005)||Math.abs(kalanM)>=0.0005||Math.abs(kalanT)>=0.005;
  return {m,t,kalanM,kalanT,sayimM,sayimT,sayimVar,farkM:kalanM-sayimM,farkT:kalanT-sayimT,hareket};
}
// Kümülatif grup toplamı: stoğun tüm üst grupları toplanır (ana ekrandaki envanterle aynı kural)
function bagEnvanterGruplar(tum,maxSeviye){
  const byId=new Map(stoklar.map(s=>[s.id,s]));
  const gMap=new Map();
  tum.forEach(r=>{
    let p=r.stok.ust_id,koruma=0;
    while(p&&koruma++<10){
      const g=byId.get(p);if(!g)break;
      let a=gMap.get(p);
      if(!a){a={grup:g,m:_beBosM(),t:_beBosM(),kalanM:0,kalanT:0,sayimM:0,sayimT:0,farkM:0,farkT:0,sayimVar:false,hareket:false};gMap.set(p,a);}
      Object.keys(a.m).forEach(k=>{a.m[k]+=r.o.m[k];a.t[k]+=r.o.t[k];});
      a.kalanM+=r.o.kalanM;a.kalanT+=r.o.kalanT;
      if(r.o.sayimVar){a.sayimVar=true;a.sayimM+=r.o.sayimM;a.sayimT+=r.o.sayimT;}
      a.hareket=a.hareket||r.o.hareket;
      p=g.ust_id;
    }
  });
  gMap.forEach(a=>{a.farkM=a.kalanM-a.sayimM;a.farkT=a.kalanT-a.sayimT;});
  return [...gMap.values()].filter(a=>(a.grup.seviye||1)<=maxSeviye).sort((a,b)=>(a.grup.kod||'').localeCompare(b.grup.kod||'','tr',{numeric:true}));
}
window.bagEnvanterPartileriYukle=async function(){
  const sel=document.getElementById('be-rapor');if(!sel)return;
  const secili=sel.value;
  const {data}=await sb.from('aktarim_partileri').select('id,ad,bas,bit,depo_ad').eq('isyeri_id',aktifIsyeri.id).eq('tur','envanter').eq('silindi',false).order('bit',{ascending:false});
  sel.innerHTML='<option value="">Rapor seçin</option>'+(data||[]).map(p=>`<option value="${p.id}">${_logEsc(p.ad||'')} · ${_logEsc(p.depo_ad||'Tüm depolar')} · ${_aktTr(p.bas)} – ${_aktTr(p.bit)}</option>`).join('');
  if(secili&&(data||[]).some(p=>p.id===secili))sel.value=secili;
  else if(data&&data.length){sel.value=data[0].id;await bagEnvanterSec();}   // en yeni rapor otomatik açılır
  else{_beVeri=null;bagEnvanterCiz();}
};
window.bagEnvanterAc=function(){bagEnvanterPartileriYukle();};
window.bagEnvanterSec=async function(){
  const id=document.getElementById('be-rapor').value;
  if(!id){_beVeri=null;bagEnvanterCiz();return;}
  const tb=document.getElementById('be-tb');if(tb)tb.innerHTML='<tr><td class="bos" colspan="30">Yükleniyor...</td></tr>';
  let rows;
  try{rows=await sbSayfali(()=>sb.from('v_aktarim_envanter').select('*').eq('parti_id',id).order('id'));}
  catch(e){if(tb)tb.innerHTML=`<tr><td class="bos" colspan="30">Okunamadı: ${_logEsc(e.message)}</td></tr>`;return;}
  const opt=document.getElementById('be-rapor').selectedOptions[0];
  const harita={};rows.forEach(r=>{harita[r.stok_id]=bagEnvanterSatirHazirla(r);});
  _beVeri={id,ad:rows[0]?.parti_ad||opt?.textContent||'',bas:rows[0]?.bas||'',bit:rows[0]?.bit||'',depo:rows[0]?.depo_ad||'',satir:harita};
  bagEnvanterCiz();
};
// Sütun filtresi/sıralaması için sütun tanımları (envtablo.js); ana ekrandakiyle aynı mantık
function _beKolonTanim(grupMu,kolonlar){
  const r3=v=>Math.round(v*1000)/1000,r2=v=>Math.round(v*100)/100,d=[];
  if(!grupMu){
    d.push({id:'kod',ad:'Kod',tip:'metin',deger:r=>r.stok.kod||''},{id:'stok',ad:'Stok',tip:'metin',deger:r=>r.stok.ad||''},
      {id:'birim',ad:'Birim',tip:'metin',deger:r=>birimler.find(b=>b.id===r.stok.birim_id)?.kisaltma||''});
    kolonlar.forEach(c=>{d.push({id:c.k+'_m',ad:c.ad+' Miktar',tip:'sayi',deger:r=>r3(r.o.m[c.k])},{id:c.k+'_t',ad:c.ad+' Tutar',tip:'sayi',deger:r=>r2(r.o.t[c.k])});});
    d.push({id:'kalan_m',ad:'KALAN Miktar',tip:'sayi',deger:r=>r3(r.o.kalanM)},{id:'kalan_t',ad:'KALAN Tutar',tip:'sayi',deger:r=>r2(r.o.kalanT)},
      {id:'sayim_m',ad:'Sayım Miktar',tip:'sayi',deger:r=>r.o.sayimVar?r3(r.o.sayimM):null,bosMu:v=>v===null},{id:'sayim_t',ad:'Sayım Tutar',tip:'sayi',deger:r=>r.o.sayimVar?r2(r.o.sayimT):null,bosMu:v=>v===null},
      {id:'fark_m',ad:'Fark Miktar',tip:'sayi',deger:r=>r3(r.o.farkM)},{id:'fark_t',ad:'Fark Tutar',tip:'sayi',deger:r=>r2(r.o.farkT)});
  }else{
    d.push({id:'kod',ad:'Kod',tip:'metin',deger:a=>a.grup.kod||''},{id:'stok',ad:'Stok Grubu',tip:'metin',deger:a=>a.grup.ad||''});
    kolonlar.forEach(c=>d.push({id:c.k+'_t',ad:c.ad,tip:'sayi',deger:a=>r2(a.t[c.k])}));
    d.push({id:'kalan_t',ad:'KALAN',tip:'sayi',deger:a=>r2(a.kalanT)},{id:'sayim_t',ad:'Sayım',tip:'sayi',deger:a=>a.sayimVar?r2(a.sayimT):null,bosMu:v=>v===null},{id:'fark_t',ad:'Fark',tip:'sayi',deger:a=>r2(a.farkT)});
  }
  return d;
}
window.bagEnvanterCiz=function(){
  const thEl=document.getElementById('be-th'),tbEl=document.getElementById('be-tb'),oz=document.getElementById('be-ozet');
  if(!thEl||!tbEl)return;
  if(!_beVeri){thEl.innerHTML='';tbEl.innerHTML='<tr><td class="bos" colspan="30">Henüz envanter raporu yüklenmedi. Veri Yükleme sekmesinden yükleyin.</td></tr>';if(oz)oz.textContent='';_beSonSatirlar=[];return;}
  const gorunum=document.getElementById('be-gorunum').value; // detay | grup1 | grup2 | grup3
  const grupMu=gorunum!=='detay',maxSeviye=grupMu?parseInt(gorunum.replace('grup',''),10):0;
  const ara=(document.getElementById('be-ara').value||'').trim().toLocaleLowerCase('tr');
  const gizle=document.getElementById('be-gizle').checked;
  const stokHarita=new Map(stoklar.filter(s=>s.tip==='stok').map(s=>[s.id,s]));
  const tum=Object.entries(_beVeri.satir).filter(([id])=>stokHarita.has(id)).map(([id,o])=>({stok:stokHarita.get(id),o}));
  let satirlar;
  if(!grupMu){
    satirlar=tum.filter(r=>{
      if(ara&&!(r.stok.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(r.stok.kod||'').toLowerCase().includes(ara))return false;
      return !(gizle&&!r.o.hareket&&!r.o.sayimVar);
    }).sort((a,b)=>(a.stok.kod||'').localeCompare(b.stok.kod||'','tr',{numeric:true}));
  }else{
    satirlar=bagEnvanterGruplar(tum,maxSeviye).filter(a=>{
      if(ara&&!(a.grup.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(a.grup.kod||'').toLowerCase().includes(ara))return false;
      return !(gizle&&!a.hareket&&!a.sayimVar);
    });
  }
  const digerVar=tum.some(r=>Math.abs(r.o.m.diger)>=0.0005||Math.abs(r.o.t.diger)>=0.005);
  const kolonlar=_beKolonlar().filter(c=>c.k!=='diger'||digerVar);
  _beSonKolonlar=kolonlar;
  // Sütun filtresi + tıklayınca sıralama (envtablo.js). TOPLAM ve Excel çıktısı GÖRÜNEN satırlara göredir.
  const ET=window.EnvTablo,gk=grupMu?'grup':'detay';
  if(ET){
    ET.kaydet('be',{barId:'be-filtre-bar',yenile:bagEnvanterCiz});
    ET.kolonlar('be',gk,_beKolonTanim(grupMu,kolonlar));
    satirlar=ET.isle('be',gk,satirlar,grupMu?{id:a=>a.grup.id,ust:a=>a.grup.ust_id}:null);
  }
  _beSonSatirlar=satirlar;_beSonGorunum=gorunum;
  const grup=(ad,vurgu)=>`<th colspan="2" class="${vurgu?'be-v':''}" style="text-align:center">${ad}</th>`;
  const hc=(id,etiket,o)=>ET?ET.th('be',gk,id,etiket,o):`<th class="${(o&&o.sinif)||''}"${o&&o.rowspan?` rowspan="${o.rowspan}"`:''} style="${(o&&o.stil)||''}">${etiket}</th>`;
  const alt=(k,vurgu)=>{const o={sinif:vurgu?'be-v':'',stil:'text-align:right;font-size:10px;font-weight:500'};return hc(k+'_m','Miktar',o)+hc(k+'_t','Tutar',o);};
  const tek=(k,ad,vurgu)=>hc(k+'_t',ad,{sinif:vurgu?'be-v':'',stil:'text-align:center'});
  if(!grupMu){
    thEl.innerHTML=`<tr>${hc('kod','Kod',{rowspan:2,sinif:'be-k1'})}${hc('stok','Stok',{rowspan:2,sinif:'be-k2'})}${hc('birim','Birim',{rowspan:2})}`+kolonlar.map(c=>grup(c.ad)).join('')+grup('KALAN',true)+grup('Sayım')+grup('Fark')+`</tr><tr>${kolonlar.map(c=>alt(c.k)).join('')}${alt('kalan',true)}${alt('sayim')}${alt('fark')}</tr>`;
  }else{
    thEl.innerHTML=`<tr>${hc('kod','Kod',{sinif:'be-k1'})}${hc('stok','Stok Grubu',{sinif:'be-k2'})}`+kolonlar.map(c=>tek(c.k,c.ad)).join('')+tek('kalan','KALAN',true)+tek('sayim','Sayım')+tek('fark','Fark')+`</tr>`;
  }
  const tops={};kolonlar.forEach(c=>tops[c.k]=0);let tKalanT=0,tSayimT=0,tFarkT=0;
  const farkM_=v=>Math.abs(v)<0.0005?'0':_beF3(v),farkT_=v=>Math.abs(v)<0.005?'0,00':_beF2(v);
  const hucre=(m,t,mv,tv,sinif)=>`<td class="${sinif||''}" style="text-align:right;${_beKr(mv)}">${m}</td><td class="${sinif||''}" style="text-align:right;${_beKr(tv,0.005)}">${t}</td>`;
  const topSev=grupMu&&satirlar.length?Math.min(...satirlar.map(a=>a.grup.seviye||1)):1; // grup toplamı: görünen EN ÜST seviyedeki satırlar
  let govde;
  if(!grupMu){
    govde=satirlar.map(r=>{
      const {stok,o}=r;const tb=birimler.find(b=>b.id===stok.birim_id);
      kolonlar.forEach(c=>tops[c.k]+=o.t[c.k]);tKalanT+=o.kalanT;tSayimT+=o.sayimT;tFarkT+=o.farkT;
      return `<tr><td class="be-k1">${_logEsc(stok.kod||'')}</td><td class="be-k2">${_logEsc(stok.ad)}</td><td style="text-align:center">${_logEsc(tb?.kisaltma||'')}</td>
        ${kolonlar.map(c=>hucre(_beM(o.m[c.k]),_beT(o.t[c.k]),o.m[c.k],o.t[c.k])).join('')}
        ${hucre(`<strong>${_beF3(o.kalanM)}</strong>`,`<strong>${_beF2(o.kalanT)}</strong>`,o.kalanM,o.kalanT,'be-v')}
        ${hucre(o.sayimVar?_beF3(o.sayimM):'',o.sayimVar?_beF2(o.sayimT):'',o.sayimM,o.sayimT)}
        ${hucre(farkM_(o.farkM),farkT_(o.farkT),o.farkM,o.farkT)}</tr>`;
    }).join('');
  }else{
    govde=satirlar.map(a=>{
      const sev=a.grup.seviye||1;
      if(sev===topSev){kolonlar.forEach(c=>tops[c.k]+=a.t[c.k]);tKalanT+=a.kalanT;tSayimT+=a.sayimT;tFarkT+=a.farkT;}
      const kalin=sev===1?'font-weight:700;':sev===2?'font-weight:600;':'';
      const tc=(v,stil)=>`<td style="text-align:right;${stil||''}">${v}</td>`;
      return `<tr style="${kalin}${sev===1?'background:var(--krem2);':''}"><td class="be-k1">${_logEsc(a.grup.kod||'')}</td><td class="be-k2" style="padding-left:${7+(sev-1)*16}px">${_logEsc(a.grup.ad)}</td>
        ${kolonlar.map(c=>tc(_beT(a.t[c.k]))).join('')}
        <td class="be-v" style="text-align:right;${_beKr(a.kalanT,0.005)}"><strong>${_beF2(a.kalanT)}</strong></td>
        ${tc(a.sayimVar?_beF2(a.sayimT):'',_beKr(a.sayimT,0.005))}${tc(farkT_(a.farkT),_beKr(a.farkT,0.005))}</tr>`;
    }).join('');
  }
  const toplamSutun=grupMu?(2+kolonlar.length+3):(3+kolonlar.length*2+6);
  tbEl.innerHTML=govde||`<tr><td colspan="${toplamSutun}" class="bos">${grupMu?'Bu seçimde stok grubu bulunamadı':'Bu raporda gösterilecek stok yok'}</td></tr>`;
  if(satirlar.length){
    const bl='<td></td>';
    tbEl.innerHTML+=grupMu
      ?`<tr style="background:var(--krem2);font-weight:700"><td class="be-k1"></td><td class="be-k2">TOPLAM</td>${kolonlar.map(c=>`<td style="text-align:right">${_beT(tops[c.k])}</td>`).join('')}
        <td style="text-align:right;${_beKr(tKalanT,0.005)}">${_beF2(tKalanT)}</td><td style="text-align:right;${_beKr(tSayimT,0.005)}">${_beT(tSayimT)}</td><td style="text-align:right;${_beKr(tFarkT,0.005)}">${_beF2(tFarkT)}</td></tr>`
      :`<tr style="background:var(--krem2);font-weight:700"><td class="be-k1"></td><td class="be-k2">TOPLAM (tutar)</td><td></td>${kolonlar.map(c=>`${bl}<td style="text-align:right">${_beT(tops[c.k])}</td>`).join('')}
        ${bl}<td style="text-align:right;${_beKr(tKalanT,0.005)}">${_beF2(tKalanT)}</td>${bl}<td style="text-align:right;${_beKr(tSayimT,0.005)}">${_beT(tSayimT)}</td>${bl}<td style="text-align:right;${_beKr(tFarkT,0.005)}">${_beF2(tFarkT)}</td></tr>`;
  }
  if(oz)oz.textContent=`${satirlar.length} ${grupMu?'grup':'stok kalemi'} · ${_beVeri.depo||'Tüm depolar'} · ${_aktTr(_beVeri.bas)} – ${_aktTr(_beVeri.bit)}`+(ET&&ET.filtreSayisi('be',gk)?` · ${ET.filtreSayisi('be',gk)} filtre`:'');
};
// Ana ekrandaki Stok Envanter (Detay/Grup) Excel çıktısıyla AYNI sütunlar: Detay çıktısı tekrar yüklenebilir
window.bagEnvanterExcel=function(){
  if(!_beSonSatirlar.length){bil('İndirilecek veri yok (önce bir envanter raporu seçin).','err');return;}
  if(typeof XLSX==='undefined'){bil('Excel kütüphanesi yüklenemedi, sayfayı yenileyin.','err');return;}
  const grupMu=_beSonGorunum!=='detay';
  const data=_beSonSatirlar.map(r=>{
    let satir;
    if(!grupMu){
      const {stok,o}=r;const tb=birimler.find(b=>b.id===stok.birim_id);
      satir={'Kod':stok.kod||'','Stok':stok.ad,'Birim':tb?.kisaltma||''};
      _beSonKolonlar.forEach(c=>{satir[c.ad+' Miktar']=+(+o.m[c.k]).toFixed(3);satir[c.ad+' Tutar']=+o.t[c.k].toFixed(2);});
      satir['KALAN Miktar']=+o.kalanM.toFixed(3);satir['KALAN Tutar']=+o.kalanT.toFixed(2);
      satir['Sayım Miktar']=o.sayimVar?+o.sayimM.toFixed(3):'';satir['Sayım Tutar']=o.sayimVar?+o.sayimT.toFixed(2):'';
      satir['Fark Miktar']=+o.farkM.toFixed(3);satir['Fark Tutar']=+o.farkT.toFixed(2);
    }else{
      satir={'Seviye':r.grup.seviye||1,'Grup Kodu':r.grup.kod||'','Stok Grubu':r.grup.ad};
      _beSonKolonlar.forEach(c=>{satir[c.ad]=+r.t[c.k].toFixed(2);});
      satir['KALAN']=+r.kalanT.toFixed(2);satir['Sayım']=r.sayimVar?+r.sayimT.toFixed(2):'';satir['Fark']=+r.farkT.toFixed(2);
    }
    return satir;
  });
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),grupMu?'Envanter (Grup)':'Envanter (Detay)');
  XLSX.writeFile(wb,`bagimsiz_envanter_${grupMu?'grup':'detay'}_${_beVeri.bas}_${_beVeri.bit}.xlsx`);
};
