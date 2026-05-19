// ===== GİRİŞ =====
window.girisYap=async function(){
  const kAdi=document.getElementById('giris-kullanici-adi').value.trim();
  const sifre=document.getElementById('giris-sifre').value;
  const hatirla=document.getElementById('giris-hatirla').checked;
  const hEl=document.getElementById('giris-hata');const btn=document.getElementById('giris-btn');
  if(!kAdi||!sifre){hEl.textContent='Kullanıcı adı ve şifre gerekli.';hEl.style.display='block';return;}
  btn.disabled=true;btn.textContent='Giriş yapılıyor...';
  try{
    const {data:kData,error:kErr}=await sb.from('kullanicilar').select('*').eq('kullanici_adi',kAdi).single();
    if(kErr||!kData){hEl.textContent='Kullanıcı adı bulunamadı.';hEl.style.display='block';btn.disabled=false;btn.textContent='Giriş Yap';return;}
    const {data,error}=await sb.auth.signInWithPassword({email:kData.email,password:sifre});
    if(error){hEl.textContent='Şifre hatalı.';hEl.style.display='block';btn.disabled=false;btn.textContent='Giriş Yap';return;}
    if(hatirla)localStorage.setItem('bahce_hatirla',kAdi);else localStorage.removeItem('bahce_hatirla');
    hEl.style.display='none';
    aktifKullanici={...kData,uid:data.user.id};
    // İşyeri seçim ekranını aç
    await isyeriSecimAc();
  }catch(e){hEl.textContent='Hata: '+e.message;hEl.style.display='block';}
  btn.disabled=false;btn.textContent='Giriş Yap';
};

// İşyeri seçim ekranını hazırla ve göster
async function isyeriSecimAc(){
  // Şirket ve işyerlerini yükle
  const {data:sData}=await sb.from('sirketler').select('*').eq('aktif',true);
  if(sData)sirketler=sData;
  const {data:iData}=await sb.from('isyerleri').select('*').eq('aktif',true);
  if(iData)isyerleri=iData;

  // Kullanıcının yetkili olduğu işyerlerini bul
  let yetkiliIsyerleri=[];
  if(aktifKullanici.rol==='admin'){
    // Admin tüm işyerlerini görür
    yetkiliIsyerleri=isyerleri;
  }else{
    const isyeriYetkiler=aktifKullanici.isyeri_yetkiler||[];
    yetkiliIsyerleri=isyerleri.filter(iy=>isyeriYetkiler.some(y=>y.isyeri_id===iy.id));
  }

  // Tek işyeri varsa direkt seç
  if(yetkiliIsyerleri.length===1){
    await isyeriSec(yetkiliIsyerleri[0].id);
    return;
  }

  // Seçim ekranını göster
  document.getElementById('giris-wrap').style.display='none';
  document.getElementById('isyeri-wrap').style.display='flex';
  document.getElementById('isyeri-kullanici-ad').textContent=(aktifKullanici.ad||'')+' '+(aktifKullanici.soyad||'');

  const liste=document.getElementById('isyeri-liste');
  liste.innerHTML=yetkiliIsyerleri.map(iy=>{
    const sirket=sirketler.find(s=>s.id===iy.sirket_id);
    return `<button onclick="isyeriSec('${iy.id}')" style="
      width:100%;padding:14px 16px;border:1px solid var(--border);border-radius:10px;
      background:var(--beyaz);cursor:pointer;text-align:left;font-family:'DM Sans',sans-serif;
      transition:all .15s;display:flex;align-items:center;gap:12px
    " onmouseover="this.style.borderColor='var(--yesil)';this.style.background='var(--yesil-cok-ac)'"
       onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--beyaz)'">
      <div style="width:40px;height:40px;border-radius:10px;background:var(--yesil-cok-ac);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏢</div>
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--yazi1)">${iy.ad}</div>
        <div style="font-size:11px;color:var(--yazi3);margin-top:2px">${sirket?sirket.ad:''} ${iy.kod?'· '+iy.kod:''}</div>
      </div>
    </button>`;
  }).join('');

  if(!yetkiliIsyerleri.length){
    liste.innerHTML='<div style="text-align:center;color:var(--yazi3);font-size:13px;padding:1rem">Yetkili işyeriniz bulunmuyor.<br>Yöneticinizle iletişime geçin.</div>';
  }
}

// İşyeri seç ve uygulamayı aç
window.isyeriSec=async function(isyeriId){
  const iy=isyerleri.find(x=>x.id===isyeriId);
  if(!iy)return;
  aktifIsyeri=iy;
  aktifSirket=sirketler.find(s=>s.id===iy.sirket_id)||null;
  // Tercihi kaydet
  localStorage.setItem('bahce_isyeri_'+aktifKullanici.id, isyeriId);
  // Ekranı kapat, uygulamayı aç
  document.getElementById('isyeri-wrap').style.display='none';
  uygulamaAc();
};

document.getElementById('giris-sifre').addEventListener('keydown',e=>{if(e.key==='Enter')window.girisYap();});
document.getElementById('giris-kullanici-adi').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('giris-sifre').focus();});
const _h=localStorage.getItem('bahce_hatirla');
if(_h){document.getElementById('giris-kullanici-adi').value=_h;document.getElementById('giris-hatirla').checked=true;setTimeout(()=>document.getElementById('giris-sifre').focus(),100);}

window.cikisYap=async function(){
  await sb.auth.signOut();
  aktifKullanici=null;aktifIsyeri=null;aktifSirket=null;
  realtimeKanallar.forEach(k=>sb.removeChannel(k));realtimeKanallar=[];
  document.getElementById('isyeri-wrap').style.display='none';
  document.getElementById('uygulama').style.display='none';
  document.getElementById('giris-wrap').style.display='flex';
};

window.sifreSifirlamaGonder=async function(){
  const email=document.getElementById('unuttum-email').value.trim();
  const hEl=document.getElementById('unuttum-hata');const oEl=document.getElementById('unuttum-ok');
  hEl.style.display='none';oEl.style.display='none';
  if(!email){hEl.textContent='E-posta gerekli.';hEl.style.display='block';return;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://utkuege35.github.io/bahce/'});
  if(error){hEl.textContent='Hata: '+error.message;hEl.style.display='block';return;}
  oEl.textContent='Sıfırlama maili gönderildi ✓';oEl.style.display='block';
};
window.girisEkraniSifreDegistir=async function(){
  const kAdi=document.getElementById('degistir-kullanici').value.trim();
  const eski=document.getElementById('degistir-eski').value;
  const yeni=document.getElementById('degistir-yeni').value;
  const yeni2=document.getElementById('degistir-yeni2').value;
  const hEl=document.getElementById('degistir-hata');const oEl=document.getElementById('degistir-ok');
  hEl.style.display='none';oEl.style.display='none';
  if(!kAdi||!eski||!yeni||!yeni2){hEl.textContent='Tüm alanları doldurun.';hEl.style.display='block';return;}
  if(yeni.length<6){hEl.textContent='En az 6 karakter.';hEl.style.display='block';return;}
  if(yeni!==yeni2){hEl.textContent='Şifreler eşleşmiyor.';hEl.style.display='block';return;}
  try{
    const {data:kData}=await sb.from('kullanicilar').select('email').eq('kullanici_adi',kAdi).single();
    if(!kData){hEl.textContent='Kullanıcı bulunamadı.';hEl.style.display='block';return;}
    const {error:lErr}=await sb.auth.signInWithPassword({email:kData.email,password:eski});
    if(lErr){hEl.textContent='Mevcut şifre hatalı.';hEl.style.display='block';return;}
    const {error:uErr}=await sb.auth.updateUser({password:yeni});
    if(uErr){hEl.textContent='Hata: '+uErr.message;hEl.style.display='block';return;}
    await sb.auth.signOut();oEl.textContent='Şifreniz değiştirildi! ✓';oEl.style.display='block';
  }catch(e){hEl.textContent='Hata: '+e.message;hEl.style.display='block';}
};
window.yeniSifreKaydet=async function(){
  const s1=document.getElementById('yenisifre1').value;const s2=document.getElementById('yenisifre2').value;
  const hEl=document.getElementById('yenisifre-hata');const oEl=document.getElementById('yenisifre-ok');
  hEl.style.display='none';oEl.style.display='none';
  if(!s1||!s2){hEl.textContent='Her iki alanı doldurun.';hEl.style.display='block';return;}
  if(s1.length<6){hEl.textContent='En az 6 karakter.';hEl.style.display='block';return;}
  if(s1!==s2){hEl.textContent='Şifreler eşleşmiyor.';hEl.style.display='block';return;}
  const {error}=await sb.auth.updateUser({password:s1});
  if(error){hEl.textContent='Hata: '+error.message;hEl.style.display='block';return;}
  oEl.textContent='Şifreniz güncellendi! ✓';oEl.style.display='block';
  setTimeout(()=>{document.getElementById('yenisifre-panel').classList.remove('open');document.getElementById('giris-wrap').style.display='flex';},2000);
};
window.sifreDegistir=async function(){
  const eski=document.getElementById('eski-sifre').value;const yeni=document.getElementById('yeni-sifre').value;const yeni2=document.getElementById('yeni-sifre2').value;
  const hEl=document.getElementById('psifre-hata');const oEl=document.getElementById('psifre-ok');
  hEl.style.display='none';oEl.style.display='none';
  if(!eski||!yeni||!yeni2){hEl.textContent='Tüm alanları doldurun.';hEl.style.display='block';return;}
  if(yeni.length<6){hEl.textContent='En az 6 karakter.';hEl.style.display='block';return;}
  if(yeni!==yeni2){hEl.textContent='Şifreler eşleşmiyor.';hEl.style.display='block';return;}
  try{
    const {error:lErr}=await sb.auth.signInWithPassword({email:aktifKullanici.email,password:eski});
    if(lErr){hEl.textContent='Mevcut şifre hatalı.';hEl.style.display='block';return;}
    const {error}=await sb.auth.updateUser({password:yeni});
    if(error){hEl.textContent='Hata: '+error.message;hEl.style.display='block';return;}
    oEl.textContent='Şifreniz güncellendi! ✓';oEl.style.display='block';
  }catch(e){hEl.textContent='Hata: '+e.message;hEl.style.display='block';}
};
(async()=>{
  const hash=window.location.hash;
  if(hash.includes('type=recovery')){
    const params=new URLSearchParams(hash.substring(1));const at=params.get('access_token');
    if(at){await sb.auth.setSession({access_token:at,refresh_token:params.get('refresh_token')||''});document.getElementById('giris-wrap').style.display='none';document.getElementById('yenisifre-panel').classList.add('open');}
  }
})();
