// ===== STOK ENVANTER RAPORU =====
// Seçilen DEPOLAR (tek, birden fazla ya da hepsi) için, seçilen tarih aralığında her stoğun hareketleri.
// Tarih aralığı + depo seçilip "Raporla" butonuna basılmadan rakam gelmez; filtre değişince tablo temizlenir.
//  • "Dönem öncesi" yoktur: rapor sadece seçilen aralığın hareketlerini gösterir.
//  • DEVİR: sadece BAŞLANGIÇ TARİHİNDE devir fişi varsa görünür; yoksa boştur.
//  • Her alan MİKTAR | TUTAR olarak yan yana, Excel benzeri hücreli tabloda gösterilir.
//  • KALAN = Devir + Alım + Transfer(+) − Transfer(−) − Satış − Ödenmez − İkram − Hasar − Atık − Diğer  (bitiş tarihindeki bakiye)
//  • SAYIM: bitiş tarihinde yapılmış sayım. FARK = Kalan − Sayım, HER stok için hem Miktar hem Tutar olarak hesaplanır
//    (sayım fazlaysa EKSİ, sayım eksikse ARTI). Bitiş tarihinde sayım yoksa sayım 0 kabul edilir, yani Fark = Kalan olur.
//  • GÖRÜNÜM: "Detay" tüm stokları; "Grup" stok gruplarını KÜMÜLATİF toplamla (üst grup = altındaki tüm gruplar + stoklar) gösterir.
//    Farklı birimler (kg, adet, lt) toplanamayacağı için grup görünümünde MİKTAR hiç gösterilmez; sadece TUTAR sütunları gelir.
// Satış/Ödenmez/İkram/Hasar/Atık, ürünlerin reçetesinden açılan hammadde sarfiyatlarını da içerir. Hesap veritabanında yapılır.
const ENV_KOLONLAR=[
  {k:'devir',ad:'Devir'},{k:'giris',ad:'Alım'},
  {k:'trfArti',ad:'+ Transfer'},{k:'trfEksi',ad:'− Transfer'},{k:'satis',ad:'Satış'},{k:'odenmez',ad:'Ödenmez'},
  {k:'ikram',ad:'İkram'},{k:'hasar',ad:'Hasar'},{k:'atik',ad:'Atık'},{k:'diger',ad:'Diğer Çıkış'}
];
const ENV_TUR_ADLARI={devir:'Devir',giris:'Alım',transfer_giris:'Transfer Giriş',transfer_cikis:'Transfer Çıkış',
  satis:'Satış',satis_sarfiyat:'Satış (reçeteden)',odenmez:'Ödenmez',odenmez_sarfiyat:'Ödenmez (reçeteden)',
  ikram:'İkram',ikram_sarfiyat:'İkram (reçeteden)',hasar:'Hasar',hasar_sarfiyat:'Hasar (reçeteden)',
  atik:'Atık',atik_sarfiyat:'Atık (reçeteden)',cikis:'Çıkış',uretim_sarfiyat:'Üretim Sarfiyatı',sayim:'Sayım'};
let _envSonSatirlar=[],_envSonKolonlar=[],_envSonGorunum='detay';
let _envSeciliDepolar=new Set();
let _envVeri=null; // {anahtar, satir}

const _envBos=()=>({devir:0,giris:0,trfArti:0,trfEksi:0,satis:0,odenmez:0,ikram:0,hasar:0,atik:0,diger:0});
const _envKalan=o=>o.devir+o.giris+o.trfArti-o.trfEksi-o.satis-o.odenmez-o.ikram-o.hasar-o.atik-o.diger;
const _envFmtM=v=>(+v).toLocaleString('tr-TR',{maximumFractionDigits:3});
const _envM=v=>Math.abs(v)<0.0005?'':_envFmtM(v);
const _envT=v=>Math.abs(v)<0.005?'':_irsSayi(v);

// ----- Depo çoklu seçimi -----
const _envTumDepolar=()=>(typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar);
function envDepoMetni(){
  const hepsi=_envTumDepolar(),n=_envSeciliDepolar.size;
  if(!n)return '— Depo seçin —';
  if(n===hepsi.length)return `Tüm depolar (${n})`;
  if(n===1)return depolar.find(d=>d.id===[..._envSeciliDepolar][0])?.ad||'1 depo';
  return `${n} depo seçili`;
}
window.envDepoListeCiz=function(){
  const hepsi=_envTumDepolar();
  const btn=document.getElementById('env-depo-btn');if(btn)btn.textContent=envDepoMetni()+' ▾';
  const liste=document.getElementById('env-depo-liste');if(!liste)return;
  const hepsiEl=document.getElementById('env-depo-hepsi');
  if(hepsiEl)hepsiEl.checked=hepsi.length>0&&_envSeciliDepolar.size===hepsi.length;
  liste.innerHTML=hepsi.map(d=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;font-size:12px"><input type="checkbox" value="${d.id}" ${_envSeciliDepolar.has(d.id)?'checked':''} onchange="envDepoSec('${d.id}',this.checked)"> ${_logEsc(d.ad)}${d.ana_depo?' <span style="color:var(--yesil);font-size:10px">(Ana Depo)</span>':''}${d.aktif===false?' <span style="color:var(--turuncu);font-size:10px">(pasif)</span>':''}</label>`).join('')||'<div class="bos">Depo tanımlı değil</div>';
};
window.envDepoPanelAc=function(ev){
  ev.stopPropagation();
  const p=document.getElementById('env-depo-panel');
  p.style.display=p.style.display==='none'?'block':'none';
};
window.envDepoSec=function(id,secili){
  if(secili)_envSeciliDepolar.add(id);else _envSeciliDepolar.delete(id);
  envDepoListeCiz();envFiltreDegisti();
};
window.envDepoHepsi=function(secili){
  _envSeciliDepolar=secili?new Set(_envTumDepolar().map(d=>d.id)):new Set();
  envDepoListeCiz();envFiltreDegisti();
};
// Panel dışına tıklanınca kapanır (bir kez bağlanır)
if(!window._envDisTiklama){window._envDisTiklama=true;document.addEventListener('click',e=>{
  const p=document.getElementById('env-depo-panel');
  if(p&&p.style.display!=='none'&&!document.getElementById('env-depo-wrap')?.contains(e.target))p.style.display='none';
});}

// ----- Veri -----
const _envAnahtar=()=>`${aktifIsyeri?.id||''}|${document.getElementById('env-bas').value}|${document.getElementById('env-bit').value}|${[..._envSeciliDepolar].sort().join(',')}`;
async function envanterVeriGetir(bas,bit,depolar_){
  const {data,error}=await sb.rpc('stok_envanter',{p_isyeri:aktifIsyeri?.id||null,p_bas:bas,p_bit:bit,p_depolar:depolar_});
  if(error)throw error;
  const n=x=>parseFloat(x)||0;
  const satir={};
  (data||[]).forEach(r=>{
    const m=_envBos(),t=_envBos();
    ['devir','giris','trf_arti','trf_eksi','satis','odenmez','ikram','hasar','atik','diger'].forEach(k=>{
      const kk=k==='trf_arti'?'trfArti':k==='trf_eksi'?'trfEksi':k;
      m[kk]=n(r[k+'_m']);t[kk]=n(r[k+'_t']);
    });
    satir[r.stok_id]={m,t,sayimM:n(r.sayim_m),sayimT:n(r.sayim_t),kalanSayimliM:n(r.kalan_sayimli_m),sayimVar:!!r.sayim_var,hareket:!!r.hareket,maliyet:n(r.maliyet)};
  });
  return satir;
}
// Bir satırın hesaplanmış değerleri (miktar/tutar çiftleri).
// FARK = KALAN − SAYIM (miktar ve tutar için). Bitiş tarihinde sayım yoksa sayım 0'dır, Fark = Kalan olur.
function _envHesapla(o){
  const kalanM=_envKalan(o.m),kalanT=_envKalan(o.t);
  return {kalanM,kalanT,farkM:kalanM-o.sayimM,farkT:kalanT-o.sayimT};
}

// ----- Filtre / Raporla akışı -----
// ----- Yıl + Ay seçici: ikisi de açılışta içinde bulunulan yıl/ayla gelir; seçim ayın ilk ve son gününü tarih alanlarına yazar -----
const _ENV_AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const _envAyKod=i=>String(i+1).padStart(2,'0');
function envAyYilDoldur(){
  const yil=document.getElementById('env-yil'),ay=document.getElementById('env-ay');
  if(!yil||!ay)return;
  if(yil.options.length<=1){const bu=new Date().getFullYear();for(let y=bu;y>=bu-5;y--){const o=document.createElement('option');o.value=String(y);o.textContent=String(y);yil.appendChild(o);}}
  if(ay.options.length<=1){_ENV_AYLAR.forEach((ad,i)=>{const o=document.createElement('option');o.value=_envAyKod(i);o.textContent=ad;ay.appendChild(o);});}
  // İlk açılışta (hiçbir tarih/ay seçilmemişse) güncel yıl ve ay varsayılan gelir
  const b=document.getElementById('env-bas'),s=document.getElementById('env-bit');
  if(b&&s&&!b.value&&!s.value&&!yil.value&&!ay.value){
    const n=new Date();yil.value=String(n.getFullYear());ay.value=_envAyKod(n.getMonth());
    envAyYilSec();
  }
}
window.envAyYilSec=function(){
  const yil=document.getElementById('env-yil'),ay=document.getElementById('env-ay');
  const n=new Date();
  // Sadece biri seçilirse diğeri güncel değerle tamamlanır
  if(ay.value&&!yil.value)yil.value=String(n.getFullYear());
  if(yil.value&&!ay.value)ay.value=_envAyKod(n.getMonth());
  if(!yil.value||!ay.value)return; // "—" (özel tarih): mevcut tarihlere dokunulmaz
  const y=+yil.value,m=+ay.value;
  const sonGun=new Date(y,m,0).getDate(); // m (1-12) → o ayın son günü
  document.getElementById('env-bas').value=`${y}-${ay.value}-01`;
  document.getElementById('env-bit').value=`${y}-${ay.value}-${String(sonGun).padStart(2,'0')}`;
  envFiltreDegisti();
};
// Tarih elle değiştirilirse yıl/ay "—"e döner (ekranda yanlış ay yazmasın)
window.envTarihElleDegisti=function(){
  const yil=document.getElementById('env-yil'),ay=document.getElementById('env-ay');
  if(yil)yil.value='';if(ay)ay.value='';
  envFiltreDegisti();
};

window.envanterAc=function(){
  envAyYilDoldur();
  envDepoListeCiz();
  if(_envVeri&&_envVeri.anahtar===_envAnahtar())renderEnvanter();else envFiltreDegisti();
};
// Tarih/depo değişince eski rakamlar kaldırılır (rakamlar hiçbir zaman seçili filtrelerle uyuşmaz hale gelmez)
window.envFiltreDegisti=function(){
  _envVeri=null;_envSonSatirlar=[];
  document.getElementById('env-th').innerHTML='';
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const tamam=bas&&bit&&_envSeciliDepolar.size>0&&bas<=bit;
  document.getElementById('env-tb').innerHTML=tamam
    ?'<tr><td class="bos">Filtreler hazır. Rakamları görmek için <strong>📊 Raporla</strong> butonuna basın.</td></tr>'
    :'<tr><td class="bos">Raporu görmek için <strong>başlangıç tarihi</strong>, <strong>bitiş tarihi</strong> ve en az bir <strong>depo</strong> seçip <strong>Raporla</strong> butonuna basın.</td></tr>';
  const oz=document.getElementById('env-ozet');if(oz)oz.textContent='';
};
window.envanterRaporla=async function(){
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  if(!bas||!bit){bil('Başlangıç ve bitiş tarihini seçin','err');return;}
  if(bas>bit){bil('Başlangıç tarihi bitiş tarihinden sonra olamaz','err');return;}
  if(!_envSeciliDepolar.size){bil('En az bir depo seçin','err');return;}
  const thEl=document.getElementById('env-th'),tbEl=document.getElementById('env-tb');
  const anahtar=_envAnahtar();
  thEl.innerHTML='';tbEl.innerHTML='<tr><td class="bos">Hesaplanıyor...</td></tr>';
  try{_envVeri={anahtar,satir:await envanterVeriGetir(bas,bit,[..._envSeciliDepolar])};}
  catch(err){_envVeri=null;tbEl.innerHTML=`<tr><td class="bos">Rapor hesaplanamadı: ${_logEsc(err.message)}. Veritabanı fonksiyonları güncel mi?</td></tr>`;return;}
  renderEnvanter();
};

// ----- Çizim -----
// Gruplar: her stok, üst gruplarının hepsine eklenir (kümülatif). maxSeviye: gösterilecek en derin grup seviyesi.
function _envGruplar(tum,maxSeviye){
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar;
  const byId=new Map(kapsam.map(s=>[s.id,s]));
  const gMap=new Map();
  tum.forEach(r=>{
    let p=r.stok.ust_id,koruma=0;
    while(p&&koruma++<10){
      const g=byId.get(p);if(!g)break;
      let a=gMap.get(p);
      if(!a){a={grup:g,m:_envBos(),t:_envBos(),kalanM:0,kalanT:0,sayimM:0,sayimT:0,farkM:0,farkT:0,sayimVar:false,hareket:false,birimler:new Set(),stokSayisi:0};gMap.set(p,a);}
      Object.keys(a.m).forEach(k=>{a.m[k]+=r.o.m[k];a.t[k]+=r.o.t[k];});
      a.kalanM+=r.h.kalanM;a.kalanT+=r.h.kalanT;
      if(r.o.sayimVar){a.sayimVar=true;a.sayimM+=r.o.sayimM;a.sayimT+=r.o.sayimT;}
      a.hareket=a.hareket||r.o.hareket;a.birimler.add(r.stok.birim_id);a.stokSayisi++;
      p=g.ust_id;
    }
  });
  gMap.forEach(a=>{a.farkM=a.kalanM-a.sayimM;a.farkT=a.kalanT-a.sayimT;}); // Fark = Kalan − Sayım
  return [...gMap.values()].filter(a=>(a.grup.seviye||1)<=maxSeviye)
    .sort((a,b)=>(a.grup.kod||'').localeCompare(b.grup.kod||'','tr',{numeric:true}));
}
window.renderEnvanter=function(){
  const thEl=document.getElementById('env-th'),tbEl=document.getElementById('env-tb'),oz=document.getElementById('env-ozet');
  if(!_envVeri||_envVeri.anahtar!==_envAnahtar()){envFiltreDegisti();return;}
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const gorunum=document.getElementById('env-gorunum').value; // detay | grup1 | grup2 | grup3
  const grupMu=gorunum!=='detay',maxSeviye=grupMu?parseInt(gorunum.replace('grup',''),10):0;
  const ara=(document.getElementById('env-ara').value||'').trim().toLocaleLowerCase('tr');
  const gizle=document.getElementById('env-gizle').checked;
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const bosO={m:_envBos(),t:_envBos(),sayimM:0,sayimT:0,kalanSayimliM:0,sayimVar:false,hareket:false,maliyet:0};
  const tum=kapsam.map(s=>{const o=_envVeri.satir[s.id]||bosO;return {stok:s,o,h:_envHesapla(o)};});
  let satirlar;
  if(!grupMu){
    satirlar=tum.filter(r=>{
      if(ara&&!(r.stok.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(r.stok.kod||'').toLowerCase().includes(ara))return false;
      return !(gizle&&!r.o.hareket&&!r.o.sayimVar);
    }).sort((a,b)=>(a.stok.kod||'').localeCompare(b.stok.kod||'','tr',{numeric:true}));
  }else{
    satirlar=_envGruplar(tum,maxSeviye).filter(a=>{
      if(ara&&!(a.grup.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(a.grup.kod||'').toLowerCase().includes(ara))return false;
      return !(gizle&&!a.hareket&&!a.sayimVar);
    });
  }
  _envSonSatirlar=satirlar;_envSonGorunum=gorunum;
  const digerVar=tum.some(r=>Math.abs(r.o.m.diger)>=0.0005||Math.abs(r.o.t.diger)>=0.005);
  const kolonlar=ENV_KOLONLAR.filter(c=>c.k!=='diger'||digerVar);
  _envSonKolonlar=kolonlar;
  // Detay: iki satırlı başlık (alan adı / Miktar | Tutar). Grup: tek satır, sadece Tutar (grupta miktar gösterilmez).
  const grup=(ad,vurgu)=>`<th colspan="2" class="${vurgu?'env-v':''}" style="text-align:center">${ad}</th>`;
  const alt=vurgu=>`<th class="${vurgu?'env-v':''}" style="text-align:right;font-size:10px;font-weight:500">Miktar</th><th class="${vurgu?'env-v':''}" style="text-align:right;font-size:10px;font-weight:500">Tutar</th>`;
  const tekBaslik=(ad,vurgu)=>`<th class="${vurgu?'env-v':''}" style="text-align:center">${ad}</th>`;
  if(!grupMu){
    thEl.innerHTML=`<tr><th rowspan="2" class="env-k1">Kod</th><th rowspan="2" class="env-k2">Stok</th><th rowspan="2">Birim</th>`
      +kolonlar.map(c=>grup(c.ad)).join('')+grup('KALAN',true)+grup('Sayım')+grup('Fark')+`</tr>`
      +`<tr>${kolonlar.map(()=>alt()).join('')}${alt(true)}${alt()}${alt()}</tr>`;
  }else{
    thEl.innerHTML=`<tr><th class="env-k1">Kod</th><th class="env-k2">Stok Grubu</th>`
      +kolonlar.map(c=>tekBaslik(c.ad)).join('')+tekBaslik('KALAN',true)+tekBaslik('Sayım')+tekBaslik('Fark')+`</tr>`;
  }
  // Renk kuralı: sayılarda SADECE iki renk vardır — normal metin rengi ve NEGATİF sayılar için kırmızı.
  const kr=(v,esik)=>v<-(esik||0.0005)?'color:#c62828;':'';
  const tops={};kolonlar.forEach(c=>tops[c.k]=0);let tKalanT=0,tSayimT=0,tFarkT=0;
  const fm=v=>(+v).toLocaleString('tr-TR',{maximumFractionDigits:3});
  const farkM_=v=>Math.abs(v)<0.0005?'0':fm(v);
  const farkT_=v=>Math.abs(v)<0.005?'0,00':_irsSayi(v);
  const hucre=(m,t,mv,tv,sinif)=>`<td class="${sinif||''}" style="text-align:right;${kr(mv)}">${m}</td><td class="${sinif||''}" style="text-align:right;${kr(tv,0.005)}">${t}</td>`;
  let govde;
  if(!grupMu){
    govde=satirlar.map(r=>{
      const {stok,o,h}=r;
      const tb=birimler.find(b=>b.id===stok.birim_id);
      kolonlar.forEach(c=>tops[c.k]+=o.t[c.k]);tKalanT+=h.kalanT;tSayimT+=o.sayimT;tFarkT+=h.farkT;
      return `<tr onclick="envanterDetayAc('${stok.id}')" style="cursor:pointer" title="Hareket dökümü için tıklayın">
        <td class="env-k1">${stok.kod||''}</td><td class="env-k2">${_logEsc(stok.ad)}</td><td style="text-align:center">${tb?.kisaltma||''}</td>
        ${kolonlar.map(c=>hucre(_envM(o.m[c.k]),_envT(o.t[c.k]),o.m[c.k],o.t[c.k])).join('')}
        ${hucre(`<strong>${fm(h.kalanM)}</strong>`,`<strong>${_irsSayi(h.kalanT)}</strong>`,h.kalanM,h.kalanT,'env-v')}
        ${hucre(o.sayimVar?fm(o.sayimM):'',o.sayimVar?_irsSayi(o.sayimT):'',o.sayimM,o.sayimT)}
        ${hucre(farkM_(h.farkM),farkT_(h.farkT),h.farkM,h.farkT)}
      </tr>`;
    }).join('');
  }else{
    govde=satirlar.map(a=>{
      const sev=a.grup.seviye||1;
      if(sev===1){kolonlar.forEach(c=>tops[c.k]+=a.t[c.k]);tKalanT+=a.kalanT;tSayimT+=a.sayimT;tFarkT+=a.farkT;}
      const kalin=sev===1?'font-weight:700;':sev===2?'font-weight:600;':'';
      const tc=(v,stil)=>`<td style="text-align:right;${stil||''}">${v}</td>`;
      // Grup adı sistemdeki gibi (ek bilgi yok); alt gruplar girintili
      return `<tr style="${kalin}${sev===1?'background:var(--krem2);':''}">
        <td class="env-k1">${a.grup.kod||''}</td><td class="env-k2" style="padding-left:${7+(sev-1)*16}px">${_logEsc(a.grup.ad)}</td>
        ${kolonlar.map(c=>tc(_envT(a.t[c.k]))).join('')}
        <td class="env-v" style="text-align:right;${a.kalanT<-0.005?'color:#c62828;':''}"><strong>${_irsSayi(a.kalanT)}</strong></td>
        ${tc(a.sayimVar?_irsSayi(a.sayimT):'',kr(a.sayimT,0.005))}
        ${tc(farkT_(a.farkT),kr(a.farkT,0.005))}
      </tr>`;
    }).join('');
  }
  const toplamSutun=grupMu?(2+kolonlar.length+3):(3+kolonlar.length*2+6);
  const bos=`<tr><td colspan="${toplamSutun}" class="bos">${grupMu?'Bu seçimde stok grubu bulunamadı':'Seçilen depo(lar) ve tarih aralığında hareket yok'}</td></tr>`;
  tbEl.innerHTML=govde||bos;
  // Toplam satırı: sadece Tutar. Grup görünümünde yalnızca 1. seviye gruplar toplanır (çift sayımı önlemek için).
  if(satirlar.length){
    const bl='<td></td>';
    tbEl.innerHTML+=grupMu
      ?`<tr style="background:var(--krem2);font-weight:700"><td class="env-k1"></td><td class="env-k2">TOPLAM</td>
        ${kolonlar.map(c=>`<td style="text-align:right">${_envT(tops[c.k])}</td>`).join('')}
        <td style="text-align:right;${kr(tKalanT,0.005)}">${_irsSayi(tKalanT)}</td><td style="text-align:right;${kr(tSayimT,0.005)}">${_envT(tSayimT)}</td><td style="text-align:right;${kr(tFarkT,0.005)}">${_irsSayi(tFarkT)}</td></tr>`
      :`<tr style="background:var(--krem2);font-weight:700"><td class="env-k1"></td><td class="env-k2">TOPLAM (tutar)</td><td></td>
        ${kolonlar.map(c=>`${bl}<td style="text-align:right">${_envT(tops[c.k])}</td>`).join('')}
        ${bl}<td style="text-align:right;${kr(tKalanT,0.005)}">${_irsSayi(tKalanT)}</td>${bl}<td style="text-align:right;${kr(tSayimT,0.005)}">${_envT(tSayimT)}</td>${bl}<td style="text-align:right;${kr(tFarkT,0.005)}">${_irsSayi(tFarkT)}</td></tr>`;
  }
  const depoMetni=_envSeciliDepolar.size===_envTumDepolar().length?'Tüm depolar':[..._envSeciliDepolar].map(id=>depolar.find(d=>d.id===id)?.ad||'?').join(', ');
  if(oz)oz.textContent=`${satirlar.length} ${grupMu?'grup':'stok kalemi'} · ${depoMetni} · ${bas} – ${bit}`;
};
// ===== HAREKET DÖKÜMÜ (bir stok için) — rapordaki kurallarla aynı; seçili tüm depolar birlikte =====
window.envanterDetayAc=async function(stokId){
  if(!_envVeri)return;
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const stok=stoklar.find(s=>s.id===stokId);if(!stok)return;
  const tb=birimler.find(b=>b.id===stok.birim_id);const bk=tb?.kisaltma||'';
  document.getElementById('env-detay-baslik').textContent=`${stok.ad} — Hareket Dökümü`;
  const kutu=document.getElementById('env-detay-icerik');
  kutu.innerHTML='<div class="bos">Yükleniyor...</div>';
  modalAc('modal-envanter-detay');
  try{
    const {data,error}=await sb.rpc('stok_hareket_dokumu',{p_isyeri:aktifIsyeri?.id||null,p_stok:stokId,p_bas:bas,p_bit:bit,p_depolar:[..._envSeciliDepolar]});
    if(error)throw error;
    const f=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});
    let bakiye=0;
    const satirlar=(data||[]).map(r=>{
      const isaret=r.isaret||0,mik=parseFloat(r.temel_miktar)||0;
      if(isaret)bakiye+=isaret*mik;
      const urun=r.urun_id?urunler.find(u=>u.id===r.urun_id)?.ad:'';
      const kaynak=r.tur==='sayim'?(r.satir_not||''):(urun?`Ürün: ${urun}`:'');
      const belge=r.belge_no?`No: ${r.belge_no}`:'';
      return `<tr>
        <td style="font-size:11px;white-space:nowrap">${r.tarih}</td>
        <td style="font-size:12px">${ENV_TUR_ADLARI[r.tur]||r.tur}${r.alt_tur&&typeof TRF_TIP_ADLARI!=='undefined'&&TRF_TIP_ADLARI[r.alt_tur]?` <span style="font-size:10px;color:var(--yazi3)">(${TRF_TIP_ADLARI[r.alt_tur]})</span>`:''}</td>
        <td style="font-size:12px">${_logEsc(depolar.find(d=>d.id===r.depo_id)?.ad||'')}</td>
        <td style="font-size:11px;color:var(--yazi2)">${_logEsc([kaynak,belge].filter(Boolean).join(' · '))}</td>
        <td style="text-align:right;${isaret<0?'color:#c62828':''}">${isaret===0?f(mik)+' (sayım)':(isaret>0?'+':'−')+f(mik)}</td>
        <td style="text-align:right">${isaret?_irsSayi(r.tutar):''}</td>
        <td style="text-align:right;font-weight:500;${isaret&&bakiye<-0.0005?'color:#c62828':''}">${isaret?f(bakiye):''}</td>
      </tr>`;
    }).join('');
    kutu.innerHTML=`
      <div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">${bas} – ${bit} · ${_logEsc(envDepoMetni())} · Birim: ${bk}</div>
      <div class="tw" style="max-height:55vh;overflow-y:auto"><table>
        <thead><tr><th>Tarih</th><th>Hareket</th><th>Depo</th><th>Kaynak / Not</th><th style="text-align:right">Miktar</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>
        <tbody>${satirlar||'<tr><td colspan="7" class="bos">Bu aralıkta hareket yok</td></tr>'}</tbody></table></div>`;
  }catch(err){kutu.innerHTML='<div class="bos">Hareket dökümü okunamadı: '+_logEsc(err.message)+'</div>';}
};
// ===== EXCEL (ekranda görünen haliyle: Detay ya da Grup) =====
window.envanterExcelIndir=function(){
  if(!_envSonSatirlar.length){bil("İndirilecek veri yok (filtreleri seçip Raporla butonuna basın)","err");return;}
  const grupMu=_envSonGorunum!=='detay';
  const data=_envSonSatirlar.map(r=>{
    let satir,m,t,kalanM,kalanT,sayimM,sayimT,sayimVar,farkM,farkT;
    if(!grupMu){
      const tb=birimler.find(b=>b.id===r.stok.birim_id);
      satir={'Kod':r.stok.kod||'','Stok':r.stok.ad,'Birim':tb?.kisaltma||''};
      m=r.o.m;t=r.o.t;kalanM=r.h.kalanM;kalanT=r.h.kalanT;sayimVar=r.o.sayimVar;sayimM=r.o.sayimM;sayimT=r.o.sayimT;farkM=r.h.farkM;farkT=r.h.farkT;
      _envSonKolonlar.forEach(c=>{satir[c.ad+' Miktar']=+(+m[c.k]).toFixed(3);satir[c.ad+' Tutar']=+t[c.k].toFixed(2);});
      satir['KALAN Miktar']=+(+kalanM).toFixed(3);satir['KALAN Tutar']=+kalanT.toFixed(2);
      satir['Sayım Miktar']=sayimVar?+(+sayimM).toFixed(3):'';satir['Sayım Tutar']=sayimVar?+sayimT.toFixed(2):'';
      satir['Fark Miktar']=+(+farkM).toFixed(3);satir['Fark Tutar']=+farkT.toFixed(2); // Kalan − Sayım
    }else{ // Grup: miktar yok, sadece tutar
      satir={'Seviye':r.grup.seviye||1,'Grup Kodu':r.grup.kod||'','Stok Grubu':r.grup.ad};
      _envSonKolonlar.forEach(c=>{satir[c.ad]=+r.t[c.k].toFixed(2);});
      satir['KALAN']=+r.kalanT.toFixed(2);satir['Sayım']=r.sayimVar?+r.sayimT.toFixed(2):'';satir['Fark']=+r.farkT.toFixed(2); // Kalan − Sayım
    }
    return satir;
  });
  const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,grupMu?'Envanter (Grup)':'Envanter (Detay)');
  XLSX.writeFile(wb,`stok_envanter_${grupMu?'grup':'detay'}_${document.getElementById('env-bas').value}_${document.getElementById('env-bit').value}.xlsx`);
};
