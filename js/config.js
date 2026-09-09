const SUPABASE_URL='https://thupqmtgxaqnnadrhuwi.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodXBxbXRneGFxbm5hZHJodXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MjU5MzQsImV4cCI6MjEwNDQwMTkzNH0.mbeQe7p-SzIW-eUdMBQ88EwtU9tsDOSK3RiMVpWvMaM';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

// Aktif oturum değişkenleri
let aktifKullanici=null;
let aktifIsyeri=null;   // {id, ad, kod, sirket_id}
let aktifSirket=null;   // {id, ad, kod}

// Veri listeleri
let stoklar=[],urunler=[],urunBilesenleri=[],islemler=[],birimler=[],merkezler=[],giderKalemleri=[],kullanicilar=[],isimLoglari=[],islemLoglari=[],realtimeKanallar=[];
let sirketler=[],isyerleri=[];
let kasalar_list=[];
let depolar=[];

const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const para=n=>'₺'+Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const bugun=()=>new Date().toISOString().split('T')[0];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

function bil(msg,tip='ok'){const e=document.getElementById('bil');e.textContent=msg;e.className='bil '+tip;e.style.display='block';setTimeout(()=>e.style.display='none',3500);}
function birimAd(id){const b=birimler.find(x=>x.id===id);return b?b.kisaltma||b.ad:'';}
function birimTemelCarp(id){const b=birimler.find(x=>x.id===id);if(!b)return 1;return b.temel?1:(parseFloat(b.carpan)||1);}
function birimSecenekleri(temelId){
  if(!temelId)return birimler.map(b=>`<option value="${b.id}">${b.ad} (${b.kisaltma})</option>`).join('');
  return birimler.filter(b=>b.id===temelId||b.temel_id===temelId).map(b=>`<option value="${b.id}">${b.ad} (${b.kisaltma})</option>`).join('');
}
function merkezOpts(tip,seciliId=''){
  return '<option value="">—</option>'+merkezler.filter(m=>m.tip===tip&&m.aktif!==false).map(m=>`<option value="${m.id}"${m.id===seciliId?' selected':''}>[${m.kod}] ${m.ad}</option>`).join('');
}
function tumAltlar(liste,ustId){const a=liste.filter(x=>x.ust_id===ustId);let s=[...a];a.forEach(x=>{s=[...s,...tumAltlar(liste,x.id)];});return s;}
const renkMap={turuncu:'var(--turuncu)',mavi:'var(--mavi)',mor:'var(--mor)',sari:'var(--sari)',yesil:'var(--yesil)'};

// İşyeri filtresi: isyeri_id eşleşen VEYA null olanlar (genel kayıtlar)
function isyeriFiltre(liste){
  if(!aktifIsyeri)return liste;
  if(aktifKullanici?.rol==='admin')return liste; // admin hepsini görür, filtre uygulanmaz
  return liste.filter(x=>!x.isyeri_id||x.isyeri_id===aktifIsyeri.id);
}

window.modalAc=function(id){
  const el=document.getElementById(id);if(!el)return;
  const acikSayisi=document.querySelectorAll('.overlay.open').length;
  el.style.zIndex=300+(acikSayisi*100);
  el.classList.add('open');
  if(id==='modal-profil'&&aktifKullanici){
    const ini=(aktifKullanici.ad||'?')[0].toUpperCase()+(aktifKullanici.soyad||'')[0]?.toUpperCase()||'';
    document.getElementById('profil-avatar').textContent=ini;
    document.getElementById('profil-ad').textContent=(aktifKullanici.ad||'')+' '+(aktifKullanici.soyad||'');
    document.getElementById('profil-email').textContent=aktifKullanici.email||'';
    document.getElementById('profil-rol').innerHTML=`<span class="kk-rol ${aktifKullanici.rol==='admin'?'admin':''}">${aktifKullanici.rol==='admin'?'Admin':'Kullanıcı'}</span>`;
    ['eski-sifre','yeni-sifre','yeni-sifre2'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('psifre-hata').style.display='none';document.getElementById('psifre-ok').style.display='none';
  }
};
window.modalKapat=function(id){
  const el=document.getElementById(id);if(!el)return;
  el.classList.remove('open');el.style.zIndex='';
};
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
window.panelAc=function(id){document.getElementById(id)?.classList.add('open');};
window.panelKapat=function(id){document.getElementById(id)?.classList.remove('open');};

// Hiyerarşik + işyerine özel kod üretici.
// Gruplar için Dewey tipi (10, 10.10, 10.10.10 ...) — kardeşler arasında
// 10'ar arayla, araya sonradan manuel kod eklenebilmesi için boşluk bırakır.
// Gerçek kartlar (stok/ürün/YM — grup olmayanlar) için son segment 3 haneli
// ve 001'den başlayarak 1'er artar (örn. 10.10.10.001, 10.10.10.002 ...).
// Kodlar sadece AYNI işyeri + AYNI üst grup kapsamında karşılaştırılır.
// agacTip (ürünler için): kök seviyede (ustId yokken) hangi ağacın (urun/ara_urun)
// numaralandırma havuzunu kullanacağını belirtir — iki ağaç birbirinden bağımsızdır.
function kodOlusturHiyerarsik(liste,ustId,tip,agacTip){
  const isyeriId=aktifIsyeri?.id||null;
  const kapsam=liste.filter(x=>(x.isyeri_id||null)===isyeriId);
  const isGrup=tip==='grup';
  if(!ustId){
    const kokKapsam=agacTip?kapsam.filter(x=>(x.agac_tip||'urun')===agacTip):kapsam;
    const kokSayilar=kokKapsam.filter(x=>!x.ust_id).map(x=>parseInt(x.kod)).filter(n=>!isNaN(n));
    const m=kokSayilar.length?Math.max(...kokSayilar):0;
    return String(Math.ceil((m+1)/10)*10);
  }
  const ust=liste.find(x=>x.id===ustId);
  if(!ust)return '';
  if(isGrup){
    const kardesSayilar=kapsam.filter(x=>x.ust_id===ustId&&x.tip==='grup').map(x=>{
      const parcalar=String(x.kod).split('.');
      return parseInt(parcalar[parcalar.length-1]);
    }).filter(n=>!isNaN(n));
    const m=kardesSayilar.length?Math.max(...kardesSayilar):0;
    return ust.kod+'.'+String(Math.ceil((m+1)/10)*10);
  }
  // Gerçek kart (stok/ürün/ara_urun) — 3 haneli, 001'den başlar, 1'er artar
  const kardesSayilar=kapsam.filter(x=>x.ust_id===ustId&&x.tip!=='grup').map(x=>{
    const parcalar=String(x.kod).split('.');
    return parseInt(parcalar[parcalar.length-1]);
  }).filter(n=>!isNaN(n));
  const m=kardesSayilar.length?Math.max(...kardesSayilar):0;
  return ust.kod+'.'+String(m+1).padStart(3,'0');
}
function kodOlusturStok(ustId,tip){return kodOlusturHiyerarsik(stoklar,ustId,tip);}
function kodOlusturUrun(ustId,tip,agacTip){return kodOlusturHiyerarsik(urunler,ustId,tip,agacTip);}

window.uygulamaYenile=async function(){
  const btn=document.getElementById('yenile-btn');
  if(btn){btn.style.animation='spin 0.8s linear infinite';btn.disabled=true;}
  try{if('serviceWorker' in navigator){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}}catch(e){}
  window.location.reload(true);
};

let _onayResolve=null;
window.onay=function(mesaj,ikon){
  return new Promise(res=>{
    _onayResolve=res;
    document.getElementById('onay-mesaj').innerHTML=mesaj;
    document.getElementById('onay-ikon').textContent=ikon||'⚠️';
    modalAc('modal-onay');
  });
};
window._onayTamam=function(){modalKapat('modal-onay');if(_onayResolve){_onayResolve(true);_onayResolve=null;}};
window._onayIptal=function(){modalKapat('modal-onay');if(_onayResolve){_onayResolve(false);_onayResolve=null;}};

// ===== MODAL MOD (görüntüle / düzenle) =====
window.modalMod = function(modalId, mod) {
  const el = document.getElementById(modalId); if (!el) return;
  const inputs = el.querySelectorAll('input:not([type=hidden]), select, textarea');
  const kaydetBtn = el.querySelector('.modal-footer .btn.pri');
  const goruntuleChip = el.querySelector('.modal-mod-chip');
  
  if (mod === 'goruntule') {
    inputs.forEach(i => { i.disabled = true; i.style.opacity = '0.7'; });
    if (kaydetBtn) kaydetBtn.style.display = 'none';
    if (!goruntuleChip) {
      const hdr = el.querySelector('.modal-hdr h3');
      if (hdr) {
        const chip = document.createElement('span');
        chip.className = 'modal-mod-chip';
        chip.style.cssText = 'font-size:10px;padding:2px 8px;border-radius:10px;background:var(--krem2);color:var(--yazi3);margin-left:8px;font-weight:400';
        chip.textContent = '👁 Görüntüleme';
        hdr.appendChild(chip);
      }
    }
  } else {
    inputs.forEach(i => { i.disabled = false; i.style.opacity = ''; });
    if (kaydetBtn) kaydetBtn.style.display = '';
    if (goruntuleChip) goruntuleChip.remove();
  }
};

// ===== YETKİ SİSTEMİ =====
let yetkiSablonlari = [];
let kullaniciYetkiSablonlari = [];

const EKRANLAR = [
  {id:'islem',      ad:'Yeni İşlem'},
  {id:'islem_liste',ad:'İşlem Listesi', ekleYok:true},
  {id:'stok',       ad:'Stoklar'},
  {id:'urunler',    ad:'Ürünler'},
  {id:'yarimamuller', ad:'Yarı Mamuller'},
  {id:'receteler',  ad:'Ürün Reçeteleri'},
  {id:'hizmetler',  ad:'Hizmetler'},
  {id:'kasalar',    ad:'Kasalar'},
  {id:'cari',       ad:'Cari & Personel'},
  {id:'birimler',   ad:'Birimler'},
  {id:'merkezler',  ad:'Merkezler'},
  {id:'depolar',    ad:'Depolar'},
  {id:'sayim_raporu', ad:'Sayım Raporu'},
  {id:'rapor',      ad:'Rapor'},
];

const EYLEMLER = [
  {id:'goruntule', ad:'Görüntüle', ikon:'👁'},
  {id:'ekle',      ad:'Ekle',      ikon:'➕'},
  {id:'duzenle',   ad:'Düzenle',   ikon:'✏'},
  {id:'sil',       ad:'Sil',       ikon:'🗑'},
];

// Aktif kullanıcının belirli ekran+eylem için yetkisi var mı?
window.yetkiVar = function(ekran, eylem) {
  // Admin her şeye yetkili
  if (aktifKullanici?.rol === 'admin') return true;

  const isyeriId = aktifIsyeri?.id;
  const kulId = aktifKullanici?.id;

  // 1. Kullanıcı bazlı direkt crud_yetkiler kontrolü
  const crudYetkiler = aktifKullanici?.crud_yetkiler;
  if (crudYetkiler?.[ekran]?.[eylem] === true) {
    // İşyeri kısıtı var mı?
    const crudIsyeriler = aktifKullanici?.crud_isyeriler;
    if (!crudIsyeriler || !crudIsyeriler.length) return true; // Tüm işyerleri
    if (crudIsyeriler.includes(aktifIsyeri?.id)) return true; // Bu işyeri yetkili
  }

  // 2. Şablon bazlı yetki kontrolü (işyeri bazlı + genel)
  const atanmis = kullaniciYetkiSablonlari.filter(k =>
    k.kullanici_id === kulId &&
    (k.isyeri_id === isyeriId || !k.isyeri_id)
  );

  for (const atama of atanmis) {
    const sablon = yetkiSablonlari.find(s => s.id === atama.sablon_id);
    if (!sablon) continue;
    if (sablon.yetkiler?.[ekran]?.[eylem] === true) return true;
  }
  return false;
};

// Yetki yoksa butonu gizle/disable et
window.yetkiButon = function(el, ekran, eylem) {
  if (!el) return;
  if (!yetkiVar(ekran, eylem)) {
    el.style.display = 'none';
  }
};
