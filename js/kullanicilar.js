// ===== KULLANICILAR =====
window.kullaniciyiKaydet=async function(){
  const ad=document.getElementById('km-ad').value.trim();const soyad=document.getElementById('km-soyad').value.trim();const email=document.getElementById('km-email').value.trim();const kAdi=document.getElementById('km-kullanici-adi').value.trim();const sifre=document.getElementById('km-sifre').value;const rol=document.getElementById('km-rol').value;const mUid=document.getElementById('km-uid').value;
  if(!ad||!email||!kAdi){bil('Ad, e-posta ve kullanıcı adı zorunlu!','err');return;}
  try{
    if(!mUid){if(!sifre||sifre.length<6){bil('Şifre en az 6 karakter!','err');return;}const {data:sd,error:se}=await sb.auth.signUp({email,password:sifre});if(se){bil('Hata: '+se.message,'err');return;}await sb.from('kullanicilar').insert({id:sd?.user?.id||uid(),ad,soyad,email,kullanici_adi:kAdi,rol});bil(`${ad} ${soyad} eklendi ✓`);}
    else{await sb.from('kullanicilar').update({ad,soyad,email,kullanici_adi:kAdi,rol}).eq('id',mUid);bil('Güncellendi ✓');}
    const {data}=await sb.from('kullanicilar').select('*');if(data)kullanicilar=data;
    modalKapat('modal-kullanici');['km-uid','km-ad','km-soyad','km-email','km-kullanici-adi','km-sifre'].forEach(id=>document.getElementById(id).value='');document.getElementById('km-title').textContent='Yeni Kullanıcı';document.getElementById('km-rol').value='kullanici';renderKullanicilar();
  }catch(e){bil('Hata: '+e.message,'err');}
};
window.kullaniciDuzenle=function(id){
  const k=kullanicilar.find(x=>x.id===id);if(!k)return;
  document.getElementById('km-uid').value=k.id;document.getElementById('km-title').textContent='Kullanıcıyı Düzenle';document.getElementById('km-ad').value=k.ad||'';document.getElementById('km-soyad').value=k.soyad||'';document.getElementById('km-email').value=k.email||'';document.getElementById('km-kullanici-adi').value=k.kullanici_adi||'';document.getElementById('km-rol').value=k.rol||'kullanici';document.getElementById('km-sifre').value='';
  modalAc('modal-kullanici');
};
function renderKullanicilar(){
  if(!kullanicilar.length){document.getElementById('kullanici-liste').innerHTML='<div class="bos">Henüz kullanıcı yok.</div>';return;}
  document.getElementById('kullanici-liste').innerHTML=kullanicilar.map(k=>{const ini=(k.ad||'?')[0].toUpperCase()+(k.soyad||'')[0]?.toUpperCase()||'';return `<div class="kullanici-kart"><div class="kk-avatar">${ini}</div><div class="kk-bilgi"><div class="kk-ad">${k.ad||''} ${k.soyad||''}</div><div class="kk-email">${k.email||''} ${k.kullanici_adi?'· @'+k.kullanici_adi:''}</div><span class="kk-rol ${k.rol==='admin'?'admin':''}">${k.rol==='admin'?'Admin':'Kullanıcı'}</span></div><button class="btn sm" onclick="kullaniciDuzenle('${k.id}')">Düzenle</button></div>`;}).join('');
}
