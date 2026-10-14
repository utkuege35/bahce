// ===== BAĞIMSIZ RAPORLAMA › VERİ YÜKLEME: ENVANTER RAPORU =====
// Kaynak sistemin Stok Envanter Raporu'nu (stok bazında Devir/Alım/Transfer/Satış/.../Kalan/Sayım; her alan Miktar + Tutar) bir "parti" olarak yükler.
// • Ana sistemin stok kayıtlarını ETKİLEMEZ; aktarim_partileri + aktarim_envanter_satirlari tablolarında saklanır.
// • Şablon, uygulamadaki Stok Envanter (Detay) Excel çıktısıyla AYNI düzendedir: oradan alınan bir Excel doğrudan yüklenebilir.
// • Sütunlar BAŞLIK ADINA göre bulunur (sırası önemli değil). Hem tek satırlı başlık ("Devir Miktar", "Devir Tutar") hem de
//   iki satırlı başlık (üstte "Devir", altta "Miktar | Tutar") desteklenir.
// • Stoklar sistemde önceden tanımlı olmalıdır; STOK KODU ile eşleştirilir. Hata varsa hiçbir satır yüklenmez.
// • KALAN sütunu yoksa Devir + Alım + Transfer(+) − Transfer(−) − Alış İade − Satış − Ödenmez − İkram − Hasar − Atık − Diğer ile hesaplanır.
//   SAYIM boşsa o stokta sayım yapılmamış sayılır. FARK sütunu okunmaz; uygulama Kalan − Sayım olarak kendisi hesaplar.
// • Miktarlar stok kartındaki temel birim cinsinden kabul edilir. Dönem ve DEPO (tekli ya da çoklu seçim) yüklemede belirlenir.
const ENVY_ALANLAR=[
  {k:'devir',  db:'devir',   ad:'Devir',       alias:['devir','acilis','acilisstogu','devirstok']},
  {k:'giris',  db:'alim',    ad:'Alım',        alias:['alim','giris','alimlar','satinalma']},
  {k:'trfArti',db:'trf_arti',ad:'+ Transfer',  alias:['artitransfer','transferarti','transfergiris','transfergirisi']},
  {k:'trfEksi',db:'trf_eksi',ad:'− Transfer',  alias:['eksitransfer','transfereksi','transfercikis','transfercikisi']},
  {k:'alisIade',db:'alis_iade',ad:'Alış İade',alias:['alisiade','alisiadesi','alisiadeleri','alimiade','satinalmaiade','tedarikciyeiade','iadealis','iade']},
  {k:'satis',  db:'satis',   ad:'Satış',       alias:['satis','satislar']},
  {k:'odenmez',db:'odenmez', ad:'Ödenmez',     alias:['odenmez','odenmeyen']},
  {k:'ikram',  db:'ikram',   ad:'İkram',       alias:['ikram','ikramlar']},
  {k:'hasar',  db:'hasar',   ad:'Hasar',       alias:['hasar','fire']},
  {k:'atik',   db:'atik',    ad:'Atık',        alias:['atik']},
  {k:'diger',  db:'diger',   ad:'Diğer Çıkış', alias:['digercikis','diger']},
  {k:'kalan',  db:'kalan',   ad:'KALAN',       alias:['kalan','kalanstok','kalanbakiye','bakiye']},
  {k:'sayim',  db:'sayim',   ad:'Sayım',       alias:['sayim','sayimstok']}
];
const ENVY_YOKSAY=['fark','farkmiktar','farktutar']; // okunmaz (Kalan − Sayım olarak yeniden hesaplanır)
const _envyAlanHarita=(()=>{const h=new Map();ENVY_ALANLAR.forEach(a=>a.alias.forEach(x=>h.set(x,a)));return h;})();
let _aktEnvOnizleme=null;
// ----- Depo seçimi (tekli ya da çoklu; ana ekrandaki Stok Envanter'in depo seçicisiyle aynı mantık) -----
let _aktEnvDepolar=new Set();
const _aktEnvTumDepolar=()=>(typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar).slice().sort((x,y)=>String(x.ad||'').localeCompare(String(y.ad||''),'tr'));
function _aktEnvSecilenAdlar(){const t=_aktEnvTumDepolar();return t.filter(d=>_aktEnvDepolar.has(d.id)).map(d=>d.ad);}
function aktarimEnvDepoMetni(){
  const hepsi=_aktEnvTumDepolar(),n=_aktEnvDepolar.size;
  if(!n)return '— Depo seçin —';
  if(n===hepsi.length&&n>1)return `Tüm depolar (${n})`;
  const adlar=_aktEnvSecilenAdlar();
  return n<=2?adlar.join(', '):`${n} depo seçili`;
}
// Raporda ve listede görünecek ad: hepsi (birden çok depo) seçiliyse "Tüm depolar", değilse adlar virgülle
function aktarimEnvDepoBilgi(){
  const hepsi=_aktEnvTumDepolar(),adlar=_aktEnvSecilenAdlar();
  return {idler:hepsi.filter(d=>_aktEnvDepolar.has(d.id)).map(d=>d.id),ad:(adlar.length===hepsi.length&&adlar.length>1)?'Tüm depolar':adlar.join(', ')};
}
window.aktarimEnvDepoCiz=function(){
  const hepsi=_aktEnvTumDepolar();
  const btn=document.getElementById('aktenv-depo-btn');if(btn)btn.textContent=aktarimEnvDepoMetni()+' ▾';
  const hepsiEl=document.getElementById('aktenv-depo-hepsi');if(hepsiEl)hepsiEl.checked=hepsi.length>0&&_aktEnvDepolar.size===hepsi.length;
  const liste=document.getElementById('aktenv-depo-liste');if(!liste)return;
  liste.innerHTML=hepsi.length?hepsi.map(d=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;font-size:12px"><input type="checkbox" value="${d.id}" ${_aktEnvDepolar.has(d.id)?'checked':''} onchange="aktarimEnvDepoSec('${d.id}',this.checked)"> ${_logEsc(d.ad)}</label>`).join(''):'<div style="font-size:12px;color:var(--yazi3);padding:6px">Bu işyerinde depo tanımlı değil.</div>';
};
window.aktarimEnvDepoPanel=function(ev){ev.stopPropagation();const p=document.getElementById('aktenv-depo-panel');p.style.display=p.style.display==='none'?'block':'none';};
window.aktarimEnvDepoSec=function(id,secili){if(secili)_aktEnvDepolar.add(id);else _aktEnvDepolar.delete(id);aktarimEnvDepoCiz();};
window.aktarimEnvDepoHepsi=function(secili){_aktEnvDepolar=secili?new Set(_aktEnvTumDepolar().map(d=>d.id)):new Set();aktarimEnvDepoCiz();};
if(!window._aktEnvDisTiklama){window._aktEnvDisTiklama=true;document.addEventListener('click',e=>{const p=document.getElementById('aktenv-depo-panel');if(p&&p.style.display!=='none'&&!document.getElementById('aktenv-depo-wrap')?.contains(e.target))p.style.display='none';});}
// Aynı dönem VE ortak depo varsa çifte sayım olur. Eski kayıtlarda yalnızca depo adı metni vardır: boş/"Tüm depolar" her depoyla çakışır, aksi hâlde adlar karşılaştırılır.
function _aktEnvKapsamCakisir(p,idler,adlar){
  if(Array.isArray(p.depo_idleri)&&p.depo_idleri.length)return p.depo_idleri.some(id=>idler.includes(id));
  const m=(p.depo_ad||'').trim().toLocaleLowerCase('tr');
  if(!m||m.startsWith('tüm depolar'))return true;
  const secAd=adlar.map(x=>String(x).toLocaleLowerCase('tr'));
  return m.split(',').map(x=>x.trim()).some(x=>secAd.includes(x));
}
// Başlık adı: baştaki + / − işaretleri anlam taşır (+ Transfer = giriş, − Transfer = çıkış); gerisi harf/rakam dışı her şey atılır
function _envyBaslikNorm(s){
  let x=String(s==null?'':s).trim();
  if(/^\+/.test(x))x='arti '+x.slice(1);else if(/^[−–—-]\s*\S/.test(x))x='eksi '+x.replace(/^[−–—-]/,'');
  return _aktNorm(x);
}
// Sütun adından {alan, tur:'m'|'t'} bulur (ör. "Devir Miktar" → devir/m); tanınmazsa null
function _envyKolon(norm){
  let tur=null,govde=norm;
  const m=norm.match(/^(.*?)(miktari|miktar|mik)$/),t=norm.match(/^(.*?)(tutari|tutar|deger)$/);
  if(m&&m[1]){tur='m';govde=m[1];}else if(t&&t[1]){tur='t';govde=t[1];}
  if(!tur)return null;
  if(ENVY_YOKSAY.includes(govde))return {alan:null,tur};
  const a=_envyAlanHarita.get(govde);return a?{alan:a,tur}:null;
}
// Satır dizisini (ilk sayfa) doğrular ve yüklenecek satırları üretir. Saf hesap: dosya okumadan test edilebilir.
function aktarimEnvanterAyristir(rows){
  const hatalar=[],satirlar=[];
  const bos=(m)=>({satirlar:[],hatalar:[{satir:0,kod:'',mesaj:m}],uyari:0,tanınan:[],atlanan:[],kalanHesaplandi:false,sayimli:0,kalanToplam:0});
  // 1) başlık satırı: "Kod" / "Stok Kodu" sütununu içeren ilk satır
  let hr=-1,kodCol=-1;
  for(let i=0;i<Math.min(rows.length,15)&&hr<0;i++){
    (rows[i]||[]).forEach((c,idx)=>{if(hr<0&&['kod','stokkodu','stokkod','malzemekodu','urunkodu'].includes(_aktNorm(c))){hr=i;kodCol=idx;}});
  }
  if(hr<0)return bos('Başlık satırı bulunamadı. "Kod" (ya da "Stok Kodu") sütununu ve Devir/Alım/.../Kalan sütunlarının Miktar ve Tutar başlıklarını içeren şablonu kullanın');
  // 2) iki satırlı başlık mı? (altındaki satırda çoğunlukla "Miktar"/"Tutar")
  const alt=rows[hr+1]||[];
  const altSayi=alt.filter(c=>['miktar','tutar'].includes(_aktNorm(c))).length;
  const ikiSatir=altSayi>=4;
  const ustSatir=rows[hr]||[];
  const genislik=Math.max(ustSatir.length,alt.length);
  const sutunlar=[];let onceki='';
  for(let c=0;c<genislik;c++){
    let ad;
    if(ikiSatir){
      const u=_envyBaslikNorm(ustSatir[c]);if(u&&c!==kodCol)onceki=u;else if(c<=kodCol+2&&!u)onceki=''; // birleşik hücre: boş üst hücre soldakinin devamıdır
      ad=(onceki&&['miktar','tutar'].includes(_aktNorm(alt[c]))?onceki+_aktNorm(alt[c]):_envyBaslikNorm(ustSatir[c]));
    }else ad=_envyBaslikNorm(ustSatir[c]);
    sutunlar.push(_envyKolon(ad));
  }
  const harita={};const tanınan=new Set(),atlanan=[];
  sutunlar.forEach((s,c)=>{
    if(s&&s.alan){harita[s.alan.k+'_'+s.tur]=c;tanınan.add(s.alan.ad);}
    else if(!s){const ham=ikiSatir?[ustSatir[c],alt[c]].filter(x=>x!==undefined&&x!=='').join(' '):ustSatir[c];if(c!==kodCol&&ham!==undefined&&String(ham).trim()!==''&&!['stok','stokadi','ad','adi','birim','stokad','malzeme'].includes(_aktNorm(ham)))atlanan.push(String(ham).trim());}
  });
  if(!tanınan.size)return bos('Devir/Alım/Satış/Kalan gibi hiçbir alan başlığı tanınamadı (Miktar ve Tutar ayrı sütunlar olmalı)');
  const veriBas=hr+(ikiSatir?2:1);
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok');
  const kodHarita=new Map();kapsam.forEach(s=>{kodHarita.set(String(s.kod).trim().toLocaleLowerCase('tr'),s);});
  const adCol=sutunlar.findIndex((s,c)=>c!==kodCol&&['stok','stokadi','ad','adi','stokad','malzeme'].includes(_envyBaslikNorm(ustSatir[c])));
  const gorulen=new Set();let uyari=0,sayimli=0,kalanToplam=0,kalanHesaplandi=!('kalan_m' in harita||'kalan_t' in harita);
  const ro=(v,n)=>{const p=Math.pow(10,n);return Math.round(v*p)/p;};
  for(let i=veriBas;i<rows.length;i++){
    const r=rows[i];
    if(!r||!r.some(c=>c!==undefined&&c!==null&&String(c).trim()!==''))continue;
    const no=i+1;
    const kodHam=r[kodCol];const kod=(kodHam===undefined||kodHam===null)?'':String(kodHam).trim();
    const adHam=adCol>=0?String(r[adCol]??'').trim():'';
    if(!kod&&/toplam/i.test(adHam+' '+String(r[0]??'')))continue; // alt toplam satırı
    const hata=m=>hatalar.push({satir:no,kod,mesaj:m});
    if(!kod){hata('Stok kodu boş');continue;}
    const stok=kodHarita.get(kod.toLocaleLowerCase('tr'));
    if(!stok){hata('Stok kodu sistemde bulunamadı');continue;}
    if(gorulen.has(stok.id)){hata('Bu stok dosyada birden çok satırda');continue;}
    gorulen.add(stok.id);
    const sayi=(alan,tur)=>{const c=harita[alan+'_'+tur];if(c===undefined)return null;const v=_aktSayi(r[c]);return Number.isNaN(v)?null:v;};
    const o={stok_id:stok.id,_kod:kod,_ad:stok.ad};let bozuk=null;
    ENVY_ALANLAR.forEach(a=>{
      if(a.k==='kalan'||a.k==='sayim')return;
      ['m','t'].forEach(t=>{const v=sayi(a.k,t);const c=harita[a.k+'_'+t];
        if(c!==undefined&&r[c]!==undefined&&r[c]!==null&&String(r[c]).trim()!==''&&v===null)bozuk=`${a.ad} ${t==='m'?'Miktar':'Tutar'} sayı değil: "${r[c]}"`;
        o[a.db+'_'+t]=ro(v||0,t==='m'?3:2);});
    });
    if(bozuk){hata(bozuk);continue;}
    const hesM=o.devir_m+o.alim_m-o.alis_iade_m+o.trf_arti_m-o.trf_eksi_m-o.satis_m-o.odenmez_m-o.ikram_m-o.hasar_m-o.atik_m-o.diger_m;
    const hesT=o.devir_t+o.alim_t-o.alis_iade_t+o.trf_arti_t-o.trf_eksi_t-o.satis_t-o.odenmez_t-o.ikram_t-o.hasar_t-o.atik_t-o.diger_t;
    const kM=sayi('kalan','m'),kT=sayi('kalan','t');
    o.kalan_m=ro(kM===null?hesM:kM,3);o.kalan_t=ro(kT===null?hesT:kT,2);
    if((kM!==null&&Math.abs(kM-hesM)>0.0015)||(kT!==null&&Math.abs(kT-hesT)>0.015))uyari++; // dosyadaki Kalan, hareketlerin toplamıyla uyuşmuyor
    const sM=sayi('sayim','m');let sT=sayi('sayim','t');
    if(sM===null&&sT===null){o.sayim_m=null;o.sayim_t=null;}
    else{
      if(sT===null)sT=o.kalan_m>0?sM*(o.kalan_t/o.kalan_m):0; // miktar var, tutar yok: ortalama maliyetle
      o.sayim_m=ro(sM===null?0:sM,3);o.sayim_t=ro(sT,2);sayimli++;
    }
    kalanToplam+=o.kalan_t;satirlar.push(o);
  }
  if(!satirlar.length&&!hatalar.length)hatalar.push({satir:0,kod:'',mesaj:'Dosyada yüklenecek satır bulunamadı'});
  return {satirlar,hatalar,uyari,tanınan:[...tanınan],atlanan:[...new Set(atlanan)],kalanHesaplandi,sayimli,kalanToplam:ro(kalanToplam,2)};
}
window.aktarimEnvSablonIndir=function(){
  if(typeof XLSX==='undefined'){bil('Excel kütüphanesi yüklenemedi, sayfayı yenileyin.','err');return;}
  const baslik=['Kod','Stok','Birim'];ENVY_ALANLAR.forEach(a=>{baslik.push(a.ad+' Miktar',a.ad+' Tutar');});
  const ornek=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok').slice(0,2);
  const kisa=s=>birimler.find(b=>b.id===s?.birim_id)?.kisaltma||'Kg';
  const sat=(s,i)=>{const d=[100,1000],al=[30,330],sa=[10,100];const k=[d[0]+al[0]-sa[0],d[1]+al[1]-sa[1]];
    const v={'Devir Miktar':d[0]+i*10,'Devir Tutar':d[1]+i*100,'Alım Miktar':al[0],'Alım Tutar':al[1],'Satış Miktar':sa[0],'Satış Tutar':sa[1],'KALAN Miktar':k[0]+i*10,'KALAN Tutar':k[1]+i*100,'Sayım Miktar':k[0]+i*10-2,'Sayım Tutar':k[1]+i*100-20};
    return [s.kod,s.ad,kisa(s),...baslik.slice(3).map(h=>v[h]===undefined?'':v[h])];};
  const aoa=[baslik,...(ornek.length?ornek.map(sat):[['10.10.10.001','Örnek Stok','Kg',...baslik.slice(3).map(h=>h==='Devir Miktar'?100:h==='KALAN Miktar'?100:'')]])];
  const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=baslik.map((h,i)=>({wch:i===1?28:i<3?12:14}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Envanter');
  XLSX.writeFile(wb,'envanter_raporu_sablon.xlsx');
};
window.aktarimEnvDosyaSecildi=async function(input){
  const dosya=input.files&&input.files[0];if(!dosya)return;
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
  try{
    const wb=XLSX.read(await dosya.arrayBuffer(),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true});
    _aktEnvOnizleme={...aktarimEnvanterAyristir(rows),dosyaAdi:dosya.name,ad:dosya.name.replace(/\.[^.]+$/,'')};
    const tumD=_aktEnvTumDepolar();_aktEnvDepolar=new Set(tumD.length===1?[tumD[0].id]:[]);
    aktarimEnvOnizlemeCiz();
  }catch(e){bil('Dosya okunamadı: '+e.message,'err');}
  input.value='';
};
function aktarimEnvOnizlemeCiz(){
  const kutu=document.getElementById('aktenv-onizleme');if(!kutu)return;
  const o=_aktEnvOnizleme;if(!o){kutu.innerHTML='';return;}
  if(o.hatalar.length){
    kutu.innerHTML=`<div style="margin-top:.9rem">
      <div style="font-size:13px;font-weight:600;margin-bottom:.4rem">${_logEsc(o.dosyaAdi)} — ${o.hatalar.length} hata, ${o.satirlar.length} geçerli satır</div>
      <div class="tw" style="max-height:260px;overflow-y:auto"><table><thead><tr><th style="width:70px">Satır</th><th style="width:160px">Stok Kodu</th><th>Hata</th></tr></thead><tbody>
      ${o.hatalar.slice(0,60).map(h=>`<tr><td>${h.satir||'—'}</td><td>${_logEsc(h.kod)}</td><td>${_logEsc(h.mesaj)}</td></tr>`).join('')}
      ${o.hatalar.length>60?`<tr><td colspan="3" style="color:var(--yazi3)">… ve ${o.hatalar.length-60} hata daha</td></tr>`:''}
      </tbody></table></div></div>`;
    return;
  }
  const fm=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});
  kutu.innerHTML=`<div style="margin-top:.9rem">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:.6rem">
      <div class="fg" style="margin:0;min-width:200px"><label>Rapor Adı</label><input type="text" id="aktenv-ad" value="${_logEsc(o.ad)}"></div>
      <div class="fg" style="margin:0"><label>Dönem Başlangıcı</label><input type="date" id="aktenv-bas"></div>
      <div class="fg" style="margin:0"><label>Dönem Sonu</label><input type="date" id="aktenv-bit"></div>
      <div style="margin:0;display:flex;flex-direction:column;gap:3px"><label style="font-size:10px;color:var(--yazi2);text-transform:uppercase;letter-spacing:.04em">Depo (tekli / çoklu)</label>
        <div id="aktenv-depo-wrap" style="position:relative">
          <button type="button" id="aktenv-depo-btn" class="btn sm" onclick="aktarimEnvDepoPanel(event)" style="min-width:190px;text-align:left;padding:9px 12px">— Depo seçin — ▾</button>
          <div id="aktenv-depo-panel" style="display:none;position:absolute;z-index:70;top:100%;left:0;margin-top:4px;min-width:240px;max-height:300px;overflow-y:auto;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;padding:6px 10px;box-shadow:0 6px 20px rgba(0,0,0,.25)">
            <label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--krem2);margin-bottom:3px"><input type="checkbox" id="aktenv-depo-hepsi" onchange="aktarimEnvDepoHepsi(this.checked)"> <strong>Tümü (hepsi)</strong></label>
            <div id="aktenv-depo-liste"></div>
          </div>
        </div></div>
      <button class="btn pri" onclick="aktarimEnvOnayla()">✔ Yükle</button>
      <button class="btn ghost" onclick="aktarimEnvIptal()">Vazgeç</button>
    </div>
    <div style="font-size:13px;margin-bottom:.5rem"><strong>${o.satirlar.length}</strong> stok · Kalan toplam <strong>${_aktPara(o.kalanToplam)}</strong> · Sayım yapılan <strong>${o.sayimli}</strong>${o.kalanHesaplandi?' · Kalan hareketlerden hesaplandı':''}${o.uyari?` · <span style="color:#c62828">⚠ ${o.uyari} stokta Kalan, hareketlerin toplamıyla uyuşmuyor</span>`:''}</div>
    <div style="font-size:11px;color:var(--yazi3);margin-bottom:.5rem">Okunan: ${o.tanınan.map(_logEsc).join(' · ')}${o.atlanan.length?` · Atlanan sütunlar: ${o.atlanan.slice(0,8).map(_logEsc).join(', ')}`:''}</div>
    <div class="tw"><table><thead><tr><th>Kod</th><th>Stok</th><th style="text-align:right">Devir</th><th style="text-align:right">Alım</th><th style="text-align:right">Satış</th><th style="text-align:right">Kalan</th><th style="text-align:right">Kalan Tutar</th><th style="text-align:right">Sayım</th></tr></thead><tbody>
    ${o.satirlar.slice(0,8).map(s=>`<tr><td>${_logEsc(s._kod)}</td><td>${_logEsc(s._ad)}</td><td style="text-align:right">${fm(s.devir_m)}</td><td style="text-align:right">${fm(s.alim_m)}</td><td style="text-align:right">${fm(s.satis_m)}</td><td style="text-align:right">${fm(s.kalan_m)}</td><td style="text-align:right">${_aktPara(s.kalan_t)}</td><td style="text-align:right">${s.sayim_m===null?'':fm(s.sayim_m)}</td></tr>`).join('')}
    ${o.satirlar.length>8?`<tr><td colspan="8" style="color:var(--yazi3)">… ve ${o.satirlar.length-8} stok daha</td></tr>`:''}
    </tbody></table></div></div>`;
  aktarimEnvDepoCiz();
}
window.aktarimEnvIptal=function(){_aktEnvOnizleme=null;aktarimEnvOnizlemeCiz();};
window.aktarimEnvOnayla=async function(){
  const o=_aktEnvOnizleme;if(!o||o.hatalar.length||!o.satirlar.length)return;
  const ad=(document.getElementById('aktenv-ad')?.value||o.ad).trim()||o.ad;
  const bas=document.getElementById('aktenv-bas')?.value,bit=document.getElementById('aktenv-bit')?.value;
  if(!bas||!bit){bil('Dönem başlangıç ve bitiş tarihini seçin!','err');return;}
  if(bas>bit){bil('Dönem başlangıcı bitişten sonra olamaz!','err');return;}
  if(!_aktEnvDepolar.size){bil('En az bir depo seçin!','err');return;}
  const depoB=aktarimEnvDepoBilgi(),depo=depoB.ad;
  // Aynı depo/kapsam için aralığı örtüşen envanter varsa uyarı (çifte sayım olmasın)
  try{
    const {data:cakisan}=await sb.from('aktarim_partileri').select('ad,bas,bit,depo_ad,depo_idleri').eq('isyeri_id',aktifIsyeri.id).eq('tur','envanter').eq('silindi',false).lte('bas',bit).gte('bit',bas);
    const ayni=(cakisan||[]).filter(p=>_aktEnvKapsamCakisir(p,depoB.idler,_aktEnvSecilenAdlar()));
    if(ayni.length&&!(await onay(`Seçtiğiniz depo(lar) için bu dönemle çakışan envanter raporu var:<br>• ${ayni.slice(0,4).map(p=>`${_logEsc(p.ad)} (${_aktTr(p.bas)} – ${_aktTr(p.bit)})`).join('<br>• ')}<br><br>Yine de yüklensin mi?`,'⚠️','Evet','Hayır')))return;
  }catch(e){}
  const parti={id:crypto.randomUUID(),isyeri_id:aktifIsyeri.id,tur:'envanter',ad,bas,bit,depo_ad:depo,depo_idleri:depoB.idler,dosya_adi:o.dosyaAdi,kullanici:aktifKullanici?.ad||'',ts:Date.now()};
  const satirlar=o.satirlar.map(({_kod,_ad,...s})=>s);
  const btn=document.querySelector('#aktenv-onizleme .btn.pri');if(btn){btn.disabled=true;btn.textContent='Yükleniyor...';}
  const {error}=await sb.rpc('aktarim_envanter_yaz',{p_parti:parti,p_satirlar:satirlar});
  if(error){bil('Yüklenemedi: '+error.message,'err');if(btn){btn.disabled=false;btn.textContent='✔ Yükle';}return;}
  await logYaz({islem:'olustur',belgeTuru:'aktarim',altTur:'envanter',belgeId:parti.id,belgeNo:ad,belgeTarihi:bit,tutar:o.kalanToplam,
    yeni:{baslik:{'Rapor':ad,'Dosya':o.dosyaAdi,'Dönem':`${_aktTr(bas)} – ${_aktTr(bit)}`,'Depo':depo,'Stok':satirlar.length,'Kalan Tutar':o.kalanToplam},kalemler:[]}});
  bil(`✓ Envanter raporu yüklendi (${satirlar.length} stok)`);
  _aktEnvOnizleme=null;aktarimEnvOnizlemeCiz();
  if(typeof aktarimListeYukle==='function')aktarimListeYukle();
  if(typeof bagEnvanterPartileriYukle==='function')bagEnvanterPartileriYukle();
};
