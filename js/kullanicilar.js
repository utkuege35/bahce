// ===== KULLANICILAR =====
const YETKI_ALANLARI=['islem','islem-liste','stok','urunler','receteler','hizmetler','kasalar','cari','birimler','merkezler','rapor'];

function _doldurKasaSelect(seciliId){
  const el=document.getElementById('km-varsayilan-kasa');if(!el)return;
  el.innerHTML='<option value="">— Kasa seçin —</option>'+
    (typeof kasalar_list!=='undefined'?kasalar_list:[]).filter(k=>k.aktif!==false).map(k=>`<option value="${k.id}"${k.id===seciliId?' selected':''}>${{nakit:'💵',banka:'🏦',pos:'💳'}[k.tip]||'💵'} ${k.ad}</option>`).join('');
}

function _yetkiOku(){
  const y={};
  YETKI_ALANLARI.forEach(a=>{const el=document.getElementById('yk-'+a);if(el)y[a]=el.checked;});
  return y;
}

function _yetkiDoldur(yetkiler){
  YETKI_ALANLARI.forEach(a=>{
    const el=document.getElementById('yk-'+a);
    if(el)el.checked=yetkiler?.[a]===true;
  });
}

window.yeniKullaniciModalAc=function(){
  document.getElementById('km-uid').value='';
  document.getElementById('km-title').textContent='Yeni Kullanıcı';
  ['km-ad','km-soyad','km-email','km-kullanici-adi','km-sifre'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('km-rol').value='kullanici';
  _doldurKasaSelect('');
  _yetkiDoldur({});
  if(typeof doldurKmIsyeriListe==='function')doldurKmIsyeriListe([]);
  modalAc('modal-kullanici');
};

window.kullaniciyiKaydet=async function(){
  const ad=document.getElementById('km-ad').value.trim();
  const soyad=document.getElementById('km-soyad').value.trim();
  const email=document.getElementById('km-email').value.trim();
  const kAdi=document.getElementById('km-kullanici-adi').value.trim();
  const sifre=document.getElementById('km-sifre').value;
  const rol=document.getElementById('km-rol').value;
  const mUid=document.getElementById('km-uid').value;
  const varsayilanKasa=document.getElementById('km-varsayilan-kasa')?.value||null;
  const yetkiler=_yetkiOku();
  if(!ad||!email||!kAdi){bil('Ad, e-posta ve kullanıcı adı zorunlu!','err');return;}
  try{
    if(!mUid){
      if(!sifre||sifre.length<6){bil('Şifre en az 6 karakter!','err');return;}
      const {data:sd,error:se}=await sb.auth.signUp({email,password:sifre});
      if(se){bil('Hata: '+se.message,'err');return;}
      const isyeriYetkiler=typeof isyeriYetkilerOku==='function'?isyeriYetkilerOku():[];
      await sb.from('kullanicilar').insert({id:sd?.user?.id||uid(),ad,soyad,email,kullanici_adi:kAdi,rol,varsayilan_kasa_id:varsayilanKasa||null,yetkiler,isyeri_yetkiler:isyeriYetkiler});
      bil(`${ad} ${soyad} eklendi ✓`);
    }else{
      const isyeriYetkiler=typeof isyeriYetkilerOku==='function'?isyeriYetkilerOku():[];
      await sb.from('kullanicilar').update({ad,soyad,email,kullanici_adi:kAdi,rol,varsayilan_kasa_id:varsayilanKasa||null,yetkiler,isyeri_yetkiler:isyeriYetkiler}).eq('id',mUid);
      bil('Güncellendi ✓');
    }
    const {data}=await sb.from('kullanicilar').select('*');if(data)kullanicilar=data;
    // Kendi yetkilerimiz güncellendiyse aktif kullanıcıyı güncelle
    if(mUid===aktifKullanici?.id){aktifKullanici={...aktifKullanici,yetkiler,varsayilan_kasa_id:varsayilanKasa||null};}
    modalKapat('modal-kullanici');
    ['km-uid','km-ad','km-soyad','km-email','km-kullanici-adi','km-sifre'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('km-title').textContent='Yeni Kullanıcı';
    document.getElementById('km-rol').value='kullanici';
    renderKullanicilar();
  }catch(e){bil('Hata: '+e.message,'err');}
};

window.kullaniciGoruntule=function(id){kullaniciDuzenle(id,'goruntule');};
window.kullaniciDuzenle=function(id,mod='duzenle'){
  const k=kullanicilar.find(x=>x.id===id);if(!k)return;
  document.getElementById('km-uid').value=k.id;
  document.getElementById('km-title').textContent='Kullanıcıyı Düzenle';
  document.getElementById('km-ad').value=k.ad||'';
  document.getElementById('km-soyad').value=k.soyad||'';
  document.getElementById('km-email').value=k.email||'';
  document.getElementById('km-kullanici-adi').value=k.kullanici_adi||'';
  document.getElementById('km-rol').value=k.rol||'kullanici';
  document.getElementById('km-sifre').value='';
  _doldurKasaSelect(k.varsayilan_kasa_id||'');
  _yetkiDoldur(k.yetkiler||{});
  if(typeof doldurKmIsyeriListe==='function')doldurKmIsyeriListe(k.isyeri_yetkiler||[]);
  modalAc('modal-kullanici');setTimeout(()=>modalMod('modal-kullanici',mod),50);
};

function renderKullanicilar(){
  if(!kullanicilar.length){document.getElementById('kullanici-liste').innerHTML='<div class="bos">Henüz kullanıcı yok.</div>';return;}
  document.getElementById('kullanici-liste').innerHTML=kullanicilar.map(k=>{
    const ini=(k.ad||'?')[0].toUpperCase()+(k.soyad||'')[0]?.toUpperCase()||'';
    const varsKasa=typeof kasalar_list!=='undefined'?kasalar_list.find(x=>x.id===k.varsayilan_kasa_id):null;
    const yetkiSayisi=k.rol==='admin'?'Tüm yetkiler':Object.values(k.yetkiler||{}).filter(Boolean).length+' yetki';
    return `<div class="kullanici-kart">
      <div class="kk-avatar">${ini}</div>
      <div class="kk-bilgi">
        <div class="kk-ad">${k.ad||''} ${k.soyad||''}</div>
        <div class="kk-email">${k.email||''} ${k.kullanici_adi?'· @'+k.kullanici_adi:''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:3px">
          <span class="kk-rol ${k.rol==='admin'?'admin':''}">${k.rol==='admin'?'Admin':'Kullanıcı'}</span>
          <span style="font-size:10px;color:var(--yazi3);background:var(--krem2);padding:1px 6px;border-radius:8px">${yetkiSayisi}</span>
          ${varsKasa?`<span style="font-size:10px;color:var(--yazi3)">💵 ${varsKasa.ad}</span>`:''}
        </div>
      </div>
      <button class="btn sm" onclick="kullaniciGoruntule('${k.id}')">👁 Görüntüle</button>
      <button class="btn sm" onclick="kullaniciDuzenle('${k.id}')">✏ Düzenle</button>
    </div>`;
  }).join('');
}
