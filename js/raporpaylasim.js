// ===== RAPOR PAYLAŞIMI (yönetici ekranı) =====
// Akış: 1) RAPOR HAZIRLA (canlı panel ya da belirli dönem için dondurulmuş)  2) ALICIYA GÖNDER (mevcut kişi ya da yeni kişi: bağlantı + PIN).
//  • Alıcı KALICI ise zamanla yeni rapor gönderilir; geçmişi görme / yalnızca son gönderileni görme seçilir. TEK SEFERLİK alıcı yalnızca tek rapor açar.
// Güvenlik kuralları veritabanında uygulanır (veritabani_rapor_paylasim.sql): bu ekran yalnızca arayüzdür. Yönetici (rol='admin') değilse veritabanı reddeder.
// Üretilen link ve PIN veritabanında DÜZ YAZI saklanmaz; bu yüzden YALNIZCA oluşturulduğu anda gösterilir.
//  • Link biçimi:  <uygulama adresi>/rapor/#<jeton>   (jeton '#' sonrasındadır: sunucu kayıtlarına ve yönlendirme başlığına gitmez)
//  • PIN'i linkle AYNI kanaldan göndermeyin (link WhatsApp, PIN telefon/SMS gibi).
let _rpSonuc=null;        // {link, pin, etiket, baslik} — yalnızca ekranda gösterilirken tutulur, kapatılınca silinir
let _rpYayin=[],_rpAlici=[];

const RP_DURUM={aktif:['Aktif','var(--yesil)'],kilitli:['Kilitli','var(--turuncu)'],iptal:['İptal','var(--kirmizi,#c62828)'],suresi_doldu:['Süresi doldu','var(--yazi3)']};
const RP_OLAY={olusturuldu:'Alıcı oluşturuldu',giris:'Giriş yapıldı',liste:'Rapor listesine bakıldı',veri:'Rapor görüntülendi',hatali_pin:'Hatalı PIN',kilitlendi:'Kilitlendi (çok hatalı PIN)',kilitli_deneme:'Kilitliyken deneme',
  otomatik_iptal:'Otomatik iptal (güvenlik)',gecersiz_baglanti:'İptal/süresi dolmuş linkle deneme',tarih_sinir:'İzin dışı tarih denemesi',yetkisiz_rapor:'Erişimi olmayan rapora deneme',cikis:'Çıkış yapıldı',iptal:'İptal edildi',
  pin_yenilendi:'PIN yenilendi',rapor_gonderildi:'Rapor gönderildi',rapor_geri_alindi:'Rapor geri alındı',gecmis_ayari:'Geçmiş ayarı değişti',sure_uzatildi:'Süre uzatıldı'};
const RP_SUPHELI=['hatali_pin','kilitlendi','kilitli_deneme','otomatik_iptal','gecersiz_baglanti','tarih_sinir','yetkisiz_rapor'];
const RP_TIP={kalici:'Kalıcı',tek_seferlik:'Tek seferlik'},RP_GECMIS={tumu:'Tümü görünür',sadece_son:'Yalnızca son'};
const _rpTr=t=>t?new Date(t).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const _rpTarih=t=>t?new Date(t).toLocaleDateString('tr-TR'):'—';
const _rpGun=t=>{const p=String(t||'').slice(0,10).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:'';};
const _rpDonem=y=>y.kip==='canli'?'Canlı panel':(y.donem_bas===y.donem_bit?_rpGun(y.donem_bas):_rpGun(y.donem_bas)+' – '+_rpGun(y.donem_bit));
const _rpEsc=s=>typeof _logEsc==='function'?_logEsc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _rpPara=n=>'₺'+Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const _rpId=id=>document.getElementById(id);
const _rpIsoYerel=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// Veritabanı hatasını anlaşılır mesaja çevirir
function _rpHata(error){
  const m=String((error&&(error.message||error.details))||error||'');
  if(/Could not find the function|PGRST202|does not exist/i.test(m)||(error&&error.code==='PGRST202'))return 'Rapor paylaşımı henüz kurulmamış: veritabani_rapor_paylasim.sql dosyasını Supabase SQL Editor\'de çalıştırın.';
  if(/yönetici yetkisi/i.test(m))return 'Bu işlem yalnızca yöneticiler içindir (veritabanı yetkiyi doğrulayamadı).';
  return m||'Bilinmeyen hata';
}

window.rpAc=async function(){
  rpSonucKapat();
  const ad=_rpId('rp-isyeri-ad');if(ad)ad.textContent=(typeof aktifIsyeri!=='undefined'&&aktifIsyeri&&aktifIsyeri.ad)||'';
  ['rp-y-baslik','rp-y-aciklama','rp-g-etiket','rp-g-pin'].forEach(i=>{const e=_rpId(i);if(e)e.value='';});
  _rpId('rp-detay').style.display='none';_rpId('rp-gunluk').style.display='none';
  rpKipDegisti();rpPinModDegisti();
  await rpYukle();
};

window.rpYukle=async function(){
  if(typeof aktifIsyeri==='undefined'||!aktifIsyeri)return;
  const [y,a]=await Promise.all([sb.rpc('rapor_yayin_listele',{p_isyeri:aktifIsyeri.id}),sb.rpc('rapor_baglanti_listele',{p_isyeri:aktifIsyeri.id})]);
  const hata=y.error||a.error;
  if(hata){const m=`<div class="bos" style="padding:1rem;color:var(--kirmizi,#c62828)">${_rpEsc(_rpHata(hata))}</div>`;_rpId('rp-alicilar').innerHTML=m;_rpId('rp-yayinlar').innerHTML='';return;}
  _rpYayin=y.data||[];_rpAlici=a.data||[];
  const etkin=_rpAlici.filter(x=>x.durum==='aktif'||x.durum==='kilitli').length;
  _rpId('rp-ozet').textContent=`${_rpYayin.length} rapor · ${etkin} etkin alıcı`;
  rpSecimleriDoldur();rpAlicilarCiz();rpYayinlarCiz();
};

// ---------- 1 · Rapor hazırla ----------
window.rpKipDegisti=function(){const d=_rpId('rp-y-kip').value==='donmus';_rpId('rp-y-donem').style.display=d?'flex':'none';};
window.rpDonemHizli=function(ne){
  const b=new Date();b.setHours(12,0,0,0);let bas,bit;
  if(ne==='dun'){bas=bit=new Date(b.getTime()-864e5);}
  else if(ne==='7gun'){bit=new Date(b.getTime()-864e5);bas=new Date(bit.getTime()-6*864e5);}
  else if(ne==='buay'){bas=new Date(b.getFullYear(),b.getMonth(),1,12);bit=new Date(b.getTime()-864e5);if(bit<bas)bit=bas;}
  else{bas=new Date(b.getFullYear(),b.getMonth()-1,1,12);bit=new Date(b.getFullYear(),b.getMonth(),0,12);}
  _rpId('rp-y-bas').value=_rpIsoYerel(bas);_rpId('rp-y-bit').value=_rpIsoYerel(bit);
};
window.rpYayinla=async function(){
  const baslik=(_rpId('rp-y-baslik').value||'').trim(),kip=_rpId('rp-y-kip').value,aciklama=(_rpId('rp-y-aciklama').value||'').trim()||null;
  if(!baslik){bil('Rapora bir başlık verin (örn. Haziran 2026 Alım Raporu)','err');return;}
  let bas=null,bit=null;
  if(kip==='donmus'){bas=_rpId('rp-y-bas').value||null;bit=_rpId('rp-y-bit').value||null;if(!bas||!bit){bil('Dondurulmuş rapor için dönem başlangıcı ve sonunu seçin','err');return;}if(bas>bit){bil('Dönem başlangıcı bitişten sonra olamaz','err');return;}}
  const btn=_rpId('rp-y-btn');btn.disabled=true;
  try{
    const {data,error}=await sb.rpc('rapor_yayin_olustur',{p_isyeri:aktifIsyeri.id,p_tur:_rpId('rp-y-tur').value,p_kip:kip,p_baslik:baslik,p_aciklama:aciklama,p_bas:bas,p_bit:bit});
    if(error){bil(_rpHata(error),'err');return;}
    const oz=data.ozet;
    bil(kip==='donmus'&&oz?`Rapor hazırlandı: ${oz.kalem_sayisi} kalem · ${_rpPara(oz.toplam_tutar)}`:'Canlı panel hazırlandı','ok');
    _rpId('rp-y-baslik').value='';_rpId('rp-y-aciklama').value='';
    await rpYukle();_rpId('rp-g-yayin').value=data.id;rpAliciDegisti();
  }finally{btn.disabled=false;}
};

// ---------- 2 · Raporu gönder ----------
function rpSecimleriDoldur(){
  const ys=_rpId('rp-g-yayin'),onceki=ys.value;
  ys.innerHTML=_rpYayin.length?_rpYayin.map(y=>`<option value="${y.id}">${_rpEsc(y.baslik)} — ${_rpEsc(_rpDonem(y))}</option>`).join(''):'<option value="">(önce bir rapor hazırlayın)</option>';
  if(onceki&&_rpYayin.some(y=>y.id===onceki))ys.value=onceki;
  const as=_rpId('rp-g-alici'),oa=as.value;
  const etkin=_rpAlici.filter(a=>a.durum==='aktif'||a.durum==='kilitli');
  as.innerHTML=etkin.map(a=>`<option value="${a.id}">${_rpEsc(a.etiket)} · ${RP_TIP[a.tip]}${a.tip==='kalici'?' · geçmiş: '+RP_GECMIS[a.gecmis].toLowerCase():''}</option>`).join('')+'<option value="__yeni">➕ Yeni alıcı oluştur…</option>';
  if(oa&&(oa==='__yeni'||etkin.some(a=>a.id===oa)))as.value=oa;
  rpAliciDegisti();
}
window.rpPinModDegisti=function(){
  const elle=_rpId('rp-g-pin-mod')?.value==='elle',k=_rpId('rp-g-pin');if(k){k.style.display=elle?'':'none';if(!elle)k.value='';}
};
window.rpAliciDegisti=function(){
  const sec=_rpId('rp-g-alici').value,yeni=sec==='__yeni';
  _rpId('rp-g-yeni').style.display=yeni?'':'none';
  const tip=_rpId('rp-g-tip').value;
  _rpId('rp-g-gecmis-kutu').style.display=(yeni&&tip==='kalici')?'':'none';
  let ipucu='';
  if(yeni){
    ipucu=tip==='tek_seferlik'?'Tek seferlik: alıcı yalnızca bu raporu açar; başka rapor gönderilemez. Süre dolunca bağlantı kapanır.'
      :(_rpId('rp-g-gecmis').value==='sadece_son'?'Kalıcı · yalnızca son: alıcı her zaman en son gönderdiğiniz raporu açar; yenisini gönderince öncekiler görünmez olur.'
        :'Kalıcı · geçmiş açık: alıcı en son raporu görür ve "Geçmiş raporlar"dan önceki gönderdiklerinizi tarih ve açıklamaya göre bulabilir.');
  }else{
    const a=_rpAlici.find(x=>x.id===sec);
    if(a)ipucu=a.tip==='tek_seferlik'?(a.rapor_sayisi>=1?'Bu tek seferlik alıcıya zaten rapor gönderilmiş; başka rapor gönderilemez. Yeni bir alıcı oluşturun.':'Tek seferlik alıcı: yalnızca bu rapor açılacak.')
      :(a.gecmis==='sadece_son'?'Bu alıcıda yalnızca en son gönderilen rapor açılır; bu rapor gönderilince öncekiler görünmez olur.':'Alıcı bu raporu ve daha önce gönderdiklerinizi görebilir (geçmiş açık). Alıcı kendi bağlantısından açar; PIN değişmez.');
  }
  _rpId('rp-g-ipucu').textContent=ipucu;
};
window.rpGonder=async function(){
  const yid=_rpId('rp-g-yayin').value,sec=_rpId('rp-g-alici').value;
  if(!yid){bil('Önce göndereceğiniz raporu seçin (ya da hazırlayın)','err');return;}
  const y=_rpYayin.find(x=>x.id===yid);const btn=_rpId('rp-g-btn');
  if(sec!=='__yeni'){
    const a=_rpAlici.find(x=>x.id===sec);
    if(a&&a.tip==='tek_seferlik'&&a.rapor_sayisi>=1){bil('Bu tek seferlik alıcıya zaten rapor gönderilmiş; yeni bir alıcı oluşturun','err');return;}
    btn.disabled=true;
    try{
      const {error}=await sb.rpc('rapor_paylas',{p_baglanti:sec,p_yayin:yid});
      if(error){bil(_rpHata(error),'err');return;}
      bil(`"${y?y.baslik:'Rapor'}" → ${a?a.etiket:'alıcı'} gönderildi. Alıcı kendi bağlantısından görebilir.`,'ok');
      await rpYukle();
    }finally{btn.disabled=false;}
    return;
  }
  const etiket=(_rpId('rp-g-etiket').value||'').trim();
  if(!etiket){bil('"Kime verilecek" alanını doldurun (örn. Genel Müdür – Ahmet Bey)','err');return;}
  const elle=_rpId('rp-g-pin-mod').value==='elle',pin=elle?(_rpId('rp-g-pin').value||'').trim():null;
  if(elle&&pin.length<6){bil('PIN en az 6 karakter olmalı','err');return;}
  const tip=_rpId('rp-g-tip').value;
  btn.disabled=true;
  try{
    const {data,error}=await sb.rpc('rapor_baglanti_olustur',{p_isyeri:aktifIsyeri.id,p_etiket:etiket,p_tip:tip,p_gecmis:tip==='kalici'?_rpId('rp-g-gecmis').value:'sadece_son',
      p_gecmis_gun:parseInt(_rpId('rp-g-gun').value,10),p_gecerlilik_gun:parseInt(_rpId('rp-g-gecerlilik').value,10),p_pin:pin});
    if(error){bil(_rpHata(error),'err');return;}
    _rpSonuc={link:new URL('rapor/',location.href).href+'#'+data.token,pin:data.pin,etiket,baslik:y?y.baslik:''};
    rpSonucCiz(true);
    _rpId('rp-g-etiket').value='';_rpId('rp-g-pin').value='';
    const p=await sb.rpc('rapor_paylas',{p_baglanti:data.id,p_yayin:yid});       // bağlantı oluştu; rapor gönderilemezse kullanıcı bilgilendirilir (bağlantı yine de verilebilir)
    if(p.error)bil('Alıcı oluşturuldu ama rapor gönderilemedi: '+_rpHata(p.error),'err');
    await rpYukle();
  }finally{btn.disabled=false;}
};

// ---------- sonuç kutusu (link + PIN, yalnızca bir kez) ----------
function rpSonucCiz(yeni){
  const k=_rpId('rp-sonuc');if(!k)return;
  if(!_rpSonuc){k.style.display='none';k.innerHTML='';return;}
  const s=_rpSonuc,bsl=yeni?'Alıcı oluşturuldu ve rapor gönderildi':'PIN yenilendi';
  k.style.display='';
  k.innerHTML=`<div style="font-weight:600;margin-bottom:6px">🔐 ${bsl} — ${_rpEsc(s.etiket)}${s.baslik?` <span style="font-weight:400;color:var(--yazi2)">· ${_rpEsc(s.baslik)}</span>`:''}</div>
    <div style="font-size:12px;color:var(--turuncu);margin-bottom:10px">Bu bilgiler yalnızca <b>şimdi</b> gösterilir; sistemde düz yazı olarak saklanmaz. Kapatınca bir daha görülemez.</div>
    ${s.link?`<div style="font-size:11px;color:var(--yazi3)">BAĞLANTI</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:3px 0 10px"><input id="rp-link-kutu" readonly value="${_rpEsc(s.link)}" style="flex:1;min-width:220px;font-size:12px;padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--krem)" onclick="this.select()"><button class="btn sm" onclick="rpKopyala('link')">📋 Kopyala</button><button class="btn sm" onclick="rpWhatsapp()">WhatsApp</button><button class="btn sm" id="rp-paylas-btn" style="display:none" onclick="rpPaylas()">Paylaş…</button></div>`:'<div style="font-size:12px;color:var(--yazi2);margin-bottom:8px">Bağlantı değişmedi; yalnızca PIN yenilendi.</div>'}
    <div style="font-size:11px;color:var(--yazi3)">PIN</div><div style="display:flex;gap:8px;align-items:center;margin:3px 0 10px"><span id="rp-pin-goster" style="font-size:26px;font-weight:700;letter-spacing:.25em;font-family:monospace">${_rpEsc(s.pin)}</span><button class="btn sm" onclick="rpKopyala('pin')">📋 Kopyala</button></div>
    <div style="font-size:12px;color:var(--yazi2);margin-bottom:10px">💡 PIN'i linkle <b>aynı kanaldan göndermeyin</b>: link WhatsApp'tan, PIN telefonla ya da SMS ile iletilsin. Link yanlış kişiye gitse bile PIN olmadan rapor açılmaz.</div>
    <button class="btn sm" onclick="rpSonucKapat()">Kapat ve sil</button>`;
  if(navigator.share){const b=_rpId('rp-paylas-btn');if(b)b.style.display='';}
}
window.rpSonucKapat=function(){_rpSonuc=null;rpSonucCiz(false);};
window.rpKopyala=async function(ne){
  if(!_rpSonuc)return;const metin=ne==='pin'?_rpSonuc.pin:_rpSonuc.link;
  try{await navigator.clipboard.writeText(metin);bil(ne==='pin'?'PIN kopyalandı':'Bağlantı kopyalandı','ok');}
  catch(e){const k=_rpId(ne==='pin'?'rp-pin-goster':'rp-link-kutu');if(k&&k.select)k.select();bil('Otomatik kopyalanamadı; seçili metni elle kopyalayın','err');}
};
window.rpWhatsapp=function(){
  if(!_rpSonuc||!_rpSonuc.link)return;
  const metin=`${_rpSonuc.baslik?'"'+_rpSonuc.baslik+'"':'Rapor'} raporuna bu bağlantıdan ulaşabilirsiniz (PIN ayrıca iletilecek): ${_rpSonuc.link}`;   // PIN ASLA metne eklenmez
  window.open('https://wa.me/?text='+encodeURIComponent(metin),'_blank','noopener');
};
window.rpPaylas=async function(){if(!_rpSonuc||!_rpSonuc.link)return;try{await navigator.share({title:_rpSonuc.baslik||'Rapor',text:'Rapor bağlantısı (PIN ayrıca iletilecek)',url:_rpSonuc.link});}catch(e){/* vazgeçildi */}};

// ---------- Alıcılar tablosu ----------
function rpAlicilarCiz(){
  const kap=_rpId('rp-alicilar');
  if(!_rpAlici.length){kap.innerHTML='<div class="bos" style="padding:1.2rem;text-align:center;color:var(--yazi3)">Henüz alıcı yok. "2 · Raporu Gönder" bölümünden yeni alıcı oluşturabilirsiniz.</div>';return;}
  kap.innerHTML=`<div class="tw"><table><thead><tr><th>Kime</th><th>Tip</th><th>Geçmiş</th><th style="text-align:right">Rapor</th><th>Durum</th><th>Bitiş</th><th>Son erişim</th><th style="text-align:right">Erişim</th><th style="text-align:right">Hatalı PIN</th><th></th></tr></thead><tbody>`+
    _rpAlici.map(b=>{const d=RP_DURUM[b.durum]||[b.durum,'var(--yazi3)'],etkin=b.durum==='aktif'||b.durum==='kilitli',sure=b.durum!=='iptal';
      return `<tr><td style="min-width:140px"><b>${_rpEsc(b.etiket)}</b>${b.iptal_nedeni?`<div style="font-size:11px;color:var(--kirmizi,#c62828)">${_rpEsc(b.iptal_nedeni)}</div>`:''}</td><td>${RP_TIP[b.tip]||b.tip}</td>
      <td>${b.tip==='kalici'?RP_GECMIS[b.gecmis]:'—'}</td><td style="text-align:right">${b.rapor_sayisi}</td>
      <td><span style="font-size:11px;font-weight:600;color:${d[1]}">● ${d[0]}</span></td><td>${_rpTarih(b.bitis)}</td><td>${_rpTr(b.son_erisim)}</td>
      <td style="text-align:right">${b.erisim_sayisi}</td><td style="text-align:right;${b.toplam_basarisiz>0?'color:var(--turuncu);font-weight:600':''}">${b.toplam_basarisiz}</td>
      <td style="min-width:250px"><div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" onclick="rpGonderilenler('${b.id}')">Raporlar</button>${etkin&&b.tip==='kalici'?` <button class="btn sm" onclick="rpGecmisDegistir('${b.id}','${b.gecmis}')">Geçmiş: ${b.gecmis==='tumu'?'kapat':'aç'}</button>`:''}${sure?` <button class="btn sm" onclick="rpSureUzat('${b.id}')">Süre +90g</button>`:''}${etkin?` <button class="btn sm" onclick="rpPinYenile('${b.id}')">PIN yenile</button>`:''} <button class="btn sm" onclick="rpGunluk('${b.id}')">Günlük</button>${etkin?` <button class="btn sm" style="color:var(--kirmizi,#c62828)" onclick="rpIptal('${b.id}')">İptal et</button>`:''}</div></td></tr>`;}).join('')+`</tbody></table></div>`;
}
window.rpGonderilenler=async function(id){
  const k=_rpId('rp-detay');
  const {data,error}=await sb.rpc('rapor_baglanti_gonderilenler',{p_baglanti:id});
  if(error){bil(_rpHata(error),'err');return;}
  const a=_rpAlici.find(x=>x.id===id),L=data||[];k.style.display='';
  k.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="card-title" style="margin:0">Gönderilen Raporlar — ${_rpEsc(a?a.etiket:'')} <span style="font-weight:400;font-size:12px;color:var(--yazi3)">(${a?RP_TIP[a.tip]+(a.tip==='kalici'?' · geçmiş: '+RP_GECMIS[a.gecmis].toLowerCase():''):''})</span></div><button class="btn sm" onclick="document.getElementById('rp-detay').style.display='none'">Kapat</button></div>`+
    (L.length?`<div class="tw"><table><thead><tr><th>Rapor</th><th>Tür / dönem</th><th>Gönderim</th><th>Alıcı şu an</th><th></th></tr></thead><tbody>`+
      L.map(x=>`<tr><td><b>${_rpEsc(x.baslik)}</b></td><td>${_rpEsc(_rpDonem(x))}</td><td>${_rpTr(x.zaman)}</td><td><span style="font-size:11px;font-weight:600;color:${x.gorulebilir?'var(--yesil)':'var(--yazi3)'}">${x.gorulebilir?'● Görebilir':'○ Göremez (yalnızca son gönderilen açılır)'}</span></td><td style="text-align:right"><button class="btn sm" style="color:var(--kirmizi,#c62828)" onclick="rpGeriAl('${id}','${x.id}')">Geri al</button></td></tr>`).join('')+`</tbody></table></div>`
      :'<div class="bos" style="padding:1rem;text-align:center;color:var(--yazi3)">Bu alıcıya henüz rapor gönderilmedi.</div>');
  k.scrollIntoView?.({behavior:'smooth',block:'nearest'});
};
window.rpGeriAl=async function(baglanti,yayin){
  if(!(await onay('Bu rapor alıcıdan <b>geri alınacak</b>: alıcı artık açamaz. (Rapor silinmez; başkasına gönderilebilir.)','↩️','Geri al','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_paylasim_kaldir',{p_baglanti:baglanti,p_yayin:yayin});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Rapor geri alındı','ok');await rpYukle();await rpGonderilenler(baglanti);
};
window.rpGecmisDegistir=async function(id,mevcut){
  const yeni=mevcut==='tumu'?'sadece_son':'tumu';
  const msg=yeni==='sadece_son'?'Geçmiş <b>kapatılacak</b>: alıcı yalnızca <b>son gönderilen</b> raporu açabilir; öncekiler anında görünmez olur.':'Geçmiş <b>açılacak</b>: alıcı daha önce gönderdiğiniz raporları da görebilir ve tarih/açıklamaya göre arayabilir.';
  if(!(await onay(msg,'📚','Uygula','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_baglanti_gecmis_ayarla',{p_id:id,p_gecmis:yeni});
  if(error){bil(_rpHata(error),'err');return;}
  bil(yeni==='tumu'?'Geçmiş raporlar açıldı':'Yalnızca son gönderilen görünür','ok');await rpYukle();
};
window.rpSureUzat=async function(id){
  if(!(await onay('Bağlantının süresi <b>bugünden itibaren 90 gün</b> olarak yenilenecek.','⏳','Uzat','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_baglanti_sure_uzat',{p_id:id,p_gun:90});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Süre uzatıldı','ok');await rpYukle();
};
window.rpIptal=async function(id){
  if(!(await onay('Bu alıcının bağlantısı <b>iptal</b> edilecek. Linki bilen kimse artık raporu göremez ve açık oturumlar hemen kapanır. Geri alınamaz.','🚫','İptal et','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_baglanti_iptal',{p_id:id});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Bağlantı iptal edildi','ok');await rpYukle();
};
window.rpPinYenile=async function(id){
  if(!(await onay('PIN yenilenecek: <b>eski PIN geçersiz</b> olur ve açık oturumlar kapanır. Bağlantı aynı kalır. Yeni PIN yalnızca bir kez gösterilir.','🔑','PIN yenile','Vazgeç')))return;
  const {data,error}=await sb.rpc('rapor_baglanti_pin_yenile',{p_id:id});
  if(error){bil(_rpHata(error),'err');return;}
  const a=_rpAlici.find(x=>x.id===id);
  _rpSonuc={link:null,pin:data.pin,etiket:a?a.etiket:'',baslik:''};
  rpSonucCiz(false);_rpId('rp-sonuc').scrollIntoView?.({behavior:'smooth',block:'center'});
  await rpYukle();
};
window.rpGunluk=async function(id){
  const k=_rpId('rp-gunluk');if(!k)return;
  const {data,error}=await sb.rpc('rapor_erisim_gunlugu',{p_id:id,p_limit:100});
  if(error){bil(_rpHata(error),'err');return;}
  const L=data||[];k.style.display='';
  k.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="card-title" style="margin:0">Erişim Günlüğü <span style="font-weight:400;font-size:12px;color:var(--yazi3)">(son ${L.length} olay)</span></div><button class="btn sm" onclick="document.getElementById('rp-gunluk').style.display='none'">Kapat</button></div>`+
    (L.length?`<div class="tw"><table><thead><tr><th>Zaman</th><th>Olay</th><th>Görüntülenen gün</th><th>IP</th><th>Tarayıcı / cihaz</th><th>Ayrıntı</th></tr></thead><tbody>`+
      L.map(x=>{const uyari=RP_SUPHELI.includes(x.olay);
        return `<tr><td style="white-space:nowrap">${_rpTr(x.ts)}</td><td style="${uyari?'color:var(--turuncu);font-weight:600':''}">${_rpEsc(RP_OLAY[x.olay]||x.olay)}</td><td>${x.tarih?_rpTarih(x.tarih):'—'}</td><td>${_rpEsc(x.ip||'—')}</td><td style="font-size:11px;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_rpEsc(x.ajan||'')}">${_rpEsc(x.ajan||'—')}</td><td style="font-size:11px">${_rpEsc(x.ayrinti||'')}</td></tr>`;}).join('')+`</tbody></table></div>`:'<div class="bos" style="padding:1rem;text-align:center;color:var(--yazi3)">Kayıt yok.</div>');
  k.scrollIntoView?.({behavior:'smooth',block:'nearest'});
};

// ---------- Hazırlanan raporlar ----------
function rpYayinlarCiz(){
  const kap=_rpId('rp-yayinlar');
  if(!_rpYayin.length){kap.innerHTML='<div class="bos" style="padding:1.2rem;text-align:center;color:var(--yazi3)">Henüz rapor hazırlanmadı.</div>';return;}
  kap.innerHTML=`<div class="tw"><table><thead><tr><th>Başlık</th><th>Tür</th><th>Dönem</th><th>Hazırlanma</th><th style="text-align:right">Toplam</th><th style="text-align:right">Gönderildiği alıcı</th><th></th></tr></thead><tbody>`+
    _rpYayin.map(y=>`<tr><td><b>${_rpEsc(y.baslik)}</b>${y.aciklama?`<div style="font-size:11px;color:var(--yazi3)">${_rpEsc(y.aciklama)}</div>`:''}</td><td>${y.kip==='canli'?'Canlı panel':'Dondurulmuş'}</td><td>${_rpEsc(_rpDonem(y))}</td><td>${_rpTr(y.olusturma)}</td>
      <td style="text-align:right">${y.ozet?_rpPara(y.ozet.toplam_tutar):'—'}</td><td style="text-align:right">${y.paylasim_sayisi}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn sm" style="color:var(--kirmizi,#c62828)" onclick="rpYayinSil('${y.id}')">Sil</button></td></tr>`).join('')+`</tbody></table></div>`;
}
window.rpYayinSil=async function(id){
  const y=_rpYayin.find(x=>x.id===id);
  if(!(await onay(`"${_rpEsc(y?y.baslik:'Rapor')}" <b>silinecek</b>${y&&y.paylasim_sayisi?` ve gönderildiği <b>${y.paylasim_sayisi} alıcıdan</b> kalkacak`:''}. Geri alınamaz.`,'🗑️','Sil','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_yayin_sil',{p_id:id});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Rapor silindi','ok');await rpYukle();
};
