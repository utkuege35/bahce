// ===== RAPOR PAYLAŞIMI (yönetici ekranı) =====
// Akış: 1) VERİ KAYNAĞINI seç (Uygulama / Bağımsız Raporlama)  2) RAPORU OLUŞTUR  3) raporu EKRANDA gör (alıcının göreceğiyle aynı)
//       4) PAYLAŞ: alıcı (kalıcı / tek seferlik), geçmiş, geçerlilik, kullanıcı adı + şifre  5) bağlantı + kullanıcı adı + şifre ekranda; kopyalayıp siz iletirsiniz.
// Program hiçbir mesaj göndermez. Güvenlik kuralları veritabanındadır (veritabani_rapor_paylasim.sql); bu ekran yalnızca arayüzdür.
// Bağlantı ve şifre veritabanında DÜZ YAZI saklanmaz; bu yüzden yalnızca oluşturulduğunda gösterilir (kaybedilirse "Linki yenile" / "Kullanıcı adı / şifre").
// Önizleme, alıcı sayfasıyla AYNI çizim kodunu ve stili kullanır (rapor/cizim.js + rapor/cizim.css; koyu tema).
let _rpSonuc=null;        // {link, kullanici, sifre, etiket, baslik} — yalnızca ekranda gösterilirken tutulur, kapatılınca silinir
let _rpYayin=[],_rpAlici=[],_rpPartiler=[],_rpSecYayin=null,_rpSecAlici=null,_rpBaslikElle=false,_rpOnizleNo=0;

const RP_DURUM={aktif:['Aktif','var(--yesil,#2d6a4f)'],kilitli:['Kilitli','var(--turuncu,#d9822b)'],iptal:['İptal','var(--kirmizi,#c62828)'],suresi_doldu:['Süresi doldu','var(--yazi3,#8a96a0)']};
const RP_OLAY={olusturuldu:'Alıcı oluşturuldu',giris:'Giriş yapıldı',liste:'Rapor listesine bakıldı',veri:'Rapor görüntülendi',hatali_pin:'Hatalı kullanıcı adı / şifre',kilitlendi:'Kilitlendi (çok hatalı giriş)',kilitli_deneme:'Kilitliyken deneme',
  otomatik_iptal:'Otomatik iptal (güvenlik)',gecersiz_baglanti:'İptal/süresi dolmuş linkle deneme',tarih_sinir:'İzin dışı tarih denemesi',yetkisiz_rapor:'Erişimi olmayan rapora deneme',cikis:'Çıkış yapıldı',iptal:'İptal edildi',
  pin_yenilendi:'Şifre yenilendi',kimlik_degisti:'Kullanıcı adı / şifre değiştirildi',link_yenilendi:'Bağlantı yenilendi',rapor_gonderildi:'Rapor gönderildi',rapor_geri_alindi:'Rapor geri alındı',gecmis_ayari:'Geçmiş ayarı değişti',sure_uzatildi:'Süre uzatıldı'};
const RP_SUPHELI=['hatali_pin','kilitlendi','kilitli_deneme','otomatik_iptal','gecersiz_baglanti','tarih_sinir','yetkisiz_rapor'];
const RP_TIP={kalici:'Kalıcı',tek_seferlik:'Tek seferlik'},RP_GECMIS={tumu:'Görünsün',sadece_son:'Sadece son'};
const RP_VARSAYILAN={kullanici:'rapor',sifre:'1234'};
const _rpTr=t=>t?new Date(t).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const _rpTarih=t=>t?new Date(t).toLocaleDateString('tr-TR'):'—';
const _rpGun=t=>{const p=String(t||'').slice(0,10).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:'';};
const _rpDonem=y=>y.kip==='canli'?'Canlı panel':(y.donem_bas===y.donem_bit?_rpGun(y.donem_bas):_rpGun(y.donem_bas)+' – '+_rpGun(y.donem_bit));
const _rpKaynak=y=>y.tur==='alimlar_bagimsiz'?('Bağımsız Raporlama'+(y.parti_ad?' · '+y.parti_ad:'')):'Uygulama';
const _rpEsc=s=>typeof _logEsc==='function'?_logEsc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _rpPara=n=>'₺'+Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const _rpId=id=>document.getElementById(id);
const _rpIso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const _rpKulOk=k=>/^[a-zA-Z0-9._@-]{3,32}$/.test(k);

function _rpHata(error){
  const m=String((error&&(error.message||error.details))||error||'');
  if(/Could not find the function|PGRST202|does not exist/i.test(m)||(error&&error.code==='PGRST202'))return 'Veritabanı güncellemesi gerekli: veritabani_rapor_paylasim.sql dosyasını Supabase SQL Editor\'de çalıştırın.';
  if(/yönetici yetkisi/i.test(m))return 'Bu işlem yalnızca yöneticiler içindir (veritabanı yetkiyi doğrulayamadı).';
  return m||'Bilinmeyen hata';
}

// ---------- görünüm (kapsamlı stil; yalnızca bu sayfayı etkiler) ----------
function rpStil(){
  if(document.getElementById('rp-stil'))return;
  const s=document.createElement('style');s.id='rp-stil';
  s.textContent=`
#rapor-paylasim{--k:var(--border,#e1ddd2);--y:var(--yazi,#1f2a33);--s:var(--yazi3,#8a96a0);--v:var(--yesil,#2d6a4f);--z:var(--beyaz,#fff);--a:var(--krem,#f4f1ea)}
#rapor-paylasim .rp-ust{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px}
#rapor-paylasim .rp-baslik{font-size:18px;font-weight:600;color:var(--y)}
#rapor-paylasim .rp-sol{font-size:12px;font-weight:400;color:var(--s)}
#rapor-paylasim .rp-sekmeler,#rapor-paylasim .rp-seg{display:inline-flex;gap:2px;padding:3px;background:var(--a);border:1px solid var(--k);border-radius:10px;width:fit-content}
#rapor-paylasim .rp-sekmeler button,#rapor-paylasim .rp-seg button{border:none;background:transparent;color:var(--s);padding:7px 14px;border-radius:8px;font:inherit;font-size:13px;cursor:pointer}
#rapor-paylasim .rp-sekmeler button.on,#rapor-paylasim .rp-seg button.on{background:var(--z);color:var(--y);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.22)}
#rapor-paylasim .rp-kart{background:var(--z);border:1px solid var(--k);border-radius:14px;padding:16px;margin-bottom:14px;color:var(--y)}
#rapor-paylasim .rp-satir{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
#rapor-paylasim .rp-alan{display:flex;flex-direction:column;gap:5px;min-width:150px}
#rapor-paylasim .rp-genis{flex:1;min-width:200px}
#rapor-paylasim .rp-alan label,#rapor-paylasim .rp-k{font-size:11px;color:var(--s);text-transform:uppercase;letter-spacing:.04em}
#rapor-paylasim .rp-alan input,#rapor-paylasim .rp-alan select{padding:9px 11px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:13px;width:100%;box-sizing:border-box}
#rapor-paylasim .rp-btn{padding:10px 22px;border:none;border-radius:10px;background:var(--v);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
#rapor-paylasim .rp-btn:disabled{opacity:.55;cursor:default}
#rapor-paylasim .rp-btn2{padding:7px 13px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:12px;cursor:pointer}
#rapor-paylasim .rp-btn2.kirmizi{color:var(--kirmizi,#c62828)}
#rapor-paylasim .rp-ikon{border:none;background:transparent;color:var(--s);font-size:15px;cursor:pointer;padding:4px 8px;border-radius:8px}
#rapor-paylasim .rp-ikon:hover{background:var(--a);color:var(--y)}
#rapor-paylasim .rp-detay-ust{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
#rapor-paylasim .rp-d-baslik{font-size:16px;font-weight:600;color:var(--y)}
#rapor-paylasim .rp-d-sag{display:flex;align-items:center;gap:4px}
#rapor-paylasim .rp-d-sag input{padding:6px 8px;border:1px solid var(--k);border-radius:8px;background:var(--a);color:var(--y);font:inherit;font-size:12px}
#rapor-paylasim .rp-baslik-k{font-size:14px;font-weight:600;margin-bottom:12px}
#rapor-paylasim .rp-tablo{width:100%;border-collapse:collapse;font-size:13px}
#rapor-paylasim .rp-tablo th{text-align:left;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--s);padding:8px 10px;border-bottom:1px solid var(--k)}
#rapor-paylasim .rp-tablo td{padding:10px;border-bottom:1px solid var(--k);vertical-align:middle}
#rapor-paylasim .rp-tablo tr.rp-tikla{cursor:pointer}
#rapor-paylasim .rp-tablo tr.rp-tikla:hover td{background:var(--a)}
#rapor-paylasim .rp-sag{text-align:right}
#rapor-paylasim .rp-chip{font-size:11px;font-weight:600;padding:2px 9px;border-radius:10px;border:1px solid currentColor}
#rapor-paylasim .rp-bos{padding:22px;text-align:center;color:var(--s)}
#rapor-paylasim .rp-izgara{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}
#rapor-paylasim .rp-v{font-size:14px;margin-top:3px}
#rapor-paylasim .rp-mono{font-family:monospace}
#rapor-paylasim .rp-eylem{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
#rapor-paylasim .rp-bilgi{display:flex;align-items:center;gap:8px;margin:4px 0 10px}
#rapor-paylasim .rp-bilgi input{flex:1;min-width:220px;padding:8px 10px;border:1px solid var(--k);border-radius:8px;background:var(--a);color:var(--y);font:inherit;font-size:12px}
#rapor-paylasim .rp-bilgi .rp-mono{font-size:18px;font-weight:600}
#rapor-paylasim .rp-etiket{font-size:11px;color:var(--s);text-transform:uppercase;letter-spacing:.04em}`;
  document.head.appendChild(s);
}

// ---------- parçalı seçici (segment) ve sekmeler ----------
window.rpSegDeger=id=>{const e=_rpId(id);return e?e.dataset.deger:'';};
window.rpSec=function(id,deger){
  const e=_rpId(id);if(!e)return;e.dataset.deger=deger;
  e.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.d===deger));
  if(id==='rp-kaynak'){_rpId('rp-parti-kutu').style.display=deger==='bagimsiz'?'':'none';}
  if(id==='rp-kip'){_rpId('rp-donem-kutu').style.display=deger==='donmus'?'':'none';rpDonemSec();}
  if(id==='rp-tip'){_rpId('rp-gecmis-kutu').style.display=deger==='kalici'?'':'none';}
};
window.rpSekme=function(ad){
  document.querySelectorAll('#rapor-paylasim .rp-sekmeler button').forEach(b=>b.classList.toggle('on',b.dataset.sekme===ad));
  _rpId('rp-s-yeni').style.display=ad==='yeni'?'':'none';_rpId('rp-s-raporlar').style.display=ad==='raporlar'?'':'none';_rpId('rp-s-alicilar').style.display=ad==='alicilar'?'':'none';
  rpDetayKapat();rpAliciKapat();
};

window.rpAc=async function(){
  rpStil();rpSonucKapat();
  const ad=_rpId('rp-isyeri-ad');if(ad)ad.textContent=(typeof aktifIsyeri!=='undefined'&&aktifIsyeri&&aktifIsyeri.ad)||'';
  _rpBaslikElle=false;_rpId('rp-acik').value='';
  rpSec('rp-kaynak','uygulama');_rpId('rp-donem').value='gecenay';rpSec('rp-kip','donmus');
  rpSekme('yeni');
  await rpYukle();
};

window.rpYukle=async function(){
  if(typeof aktifIsyeri==='undefined'||!aktifIsyeri)return;
  const [y,a,pt]=await Promise.all([sb.rpc('rapor_yayin_listele',{p_isyeri:aktifIsyeri.id}),sb.rpc('rapor_baglanti_listele',{p_isyeri:aktifIsyeri.id}),sb.rpc('rapor_bagimsiz_partileri',{p_isyeri:aktifIsyeri.id})]);
  const hata=y.error||a.error;
  if(hata){const m=`<div class="rp-bos" style="color:var(--kirmizi,#c62828)">${_rpEsc(_rpHata(hata))}</div>`;_rpId('rp-alicilar').innerHTML=m;_rpId('rp-yayinlar').innerHTML=m;return;}
  _rpYayin=y.data||[];_rpAlici=a.data||[];_rpPartiler=(pt&&!pt.error&&pt.data)||[];
  rpPartileriDoldur();rpYayinlarCiz();rpAlicilarCiz();
  if(_rpSecYayin&&_rpYayin.some(x=>x.id===_rpSecYayin))rpPaylasHazirla();
  if(_rpSecAlici&&_rpAlici.some(x=>x.id===_rpSecAlici))rpAliciAc(_rpSecAlici);
};

// ---------- 1 · Rapor oluştur ----------
function rpPartileriDoldur(){
  const s=_rpId('rp-parti');if(!s)return;const onceki=s.value;
  s.innerHTML=_rpPartiler.length?'<option value="">Tüm yüklemeler</option>'+_rpPartiler.map(p=>`<option value="${p.id}">${_rpEsc(p.ad||p.dosya_adi||'Yükleme')} · ${_rpGun(p.bas)} – ${_rpGun(p.bit)} · ${p.satir_sayisi||0} satır · ${_rpPara(p.toplam_tutar)}</option>`).join(''):'<option value="">Yüklenmiş alım verisi yok</option>';
  if(onceki&&_rpPartiler.some(p=>p.id===onceki))s.value=onceki;
}
// Yükleme seçilince dönem, yüklemenin tarihleriyle dolar
window.rpPartiDegisti=function(){
  const p=_rpPartiler.find(x=>x.id===_rpId('rp-parti').value);
  if(p&&p.bas&&p.bit&&rpSegDeger('rp-kip')==='donmus'){
    const bugun=_rpIso(new Date()),bit=String(p.bit).slice(0,10);
    _rpId('rp-donem').value='ozel';rpDonemSec();_rpId('rp-bas').value=String(p.bas).slice(0,10);_rpId('rp-bit').value=bit>bugun?bugun:bit;rpBaslikOner();
  }
};
window.rpDonemSec=function(){
  const v=_rpId('rp-donem').value,b=new Date();b.setHours(12,0,0,0);let bas,bit;
  _rpId('rp-ozel-kutu').style.display=_rpId('rp-ozel-kutu2').style.display=(v==='ozel'&&rpSegDeger('rp-kip')==='donmus')?'':'none';
  if(v==='ozel'){rpBaslikOner();return;}
  if(v==='dun'){bas=bit=new Date(b.getTime()-864e5);}
  else if(v==='7gun'){bit=new Date(b.getTime()-864e5);bas=new Date(bit.getTime()-6*864e5);}
  else if(v==='buay'){bas=new Date(b.getFullYear(),b.getMonth(),1,12);bit=new Date(b.getTime()-864e5);if(bit<bas)bit=bas;}
  else{bas=new Date(b.getFullYear(),b.getMonth()-1,1,12);bit=new Date(b.getFullYear(),b.getMonth(),0,12);}
  _rpId('rp-bas').value=_rpIso(bas);_rpId('rp-bit').value=_rpIso(bit);rpBaslikOner();
};
window.rpBaslikElle=function(){_rpBaslikElle=true;};
window.rpBaslikOner=function(){
  if(_rpBaslikElle)return;
  const canli=rpSegDeger('rp-kip')==='canli',bas=_rpId('rp-bas').value,bit=_rpId('rp-bit').value;
  _rpId('rp-bslk').value=canli?'Alımlar · günlük':('Alımlar'+(bas&&bit?' · '+(bas===bit?_rpGun(bas):_rpGun(bas)+' – '+_rpGun(bit)):''));
};
window.rpRaporOlustur=async function(){
  const baslik=(_rpId('rp-bslk').value||'').trim(),kip=rpSegDeger('rp-kip'),aciklama=(_rpId('rp-acik').value||'').trim()||null;
  const bag=rpSegDeger('rp-kaynak')==='bagimsiz',parti=bag?(_rpId('rp-parti').value||null):null;
  if(!baslik){bil('Rapora bir başlık verin','err');return;}
  if(bag&&!_rpPartiler.length){bil('Bağımsız Raporlama\'da yüklenmiş alım verisi yok. Önce Bağımsız Raporlama › Veri Yükleme bölümünden yükleyin','err');return;}
  let bas=null,bit=null;
  if(kip==='donmus'){bas=_rpId('rp-bas').value||null;bit=_rpId('rp-bit').value||null;if(!bas||!bit){bil('Dönem başlangıcı ve sonunu seçin','err');return;}if(bas>bit){bil('Dönem başlangıcı bitişten sonra olamaz','err');return;}}
  const btn=_rpId('rp-olustur');btn.disabled=true;
  try{
    const {data,error}=await sb.rpc('rapor_yayin_olustur',{p_isyeri:aktifIsyeri.id,p_tur:bag?'alimlar_bagimsiz':'alimlar',p_kip:kip,p_baslik:baslik,p_aciklama:aciklama,p_bas:bas,p_bit:bit,p_parti:parti});
    if(error){bil(_rpHata(error),'err');return;}
    const oz=data.ozet;
    bil(kip==='donmus'&&oz?`Rapor oluşturuldu: ${oz.kalem_sayisi} kalem · ${_rpPara(oz.toplam_tutar)}`:'Canlı panel oluşturuldu','ok');
    _rpBaslikElle=false;_rpId('rp-acik').value='';rpBaslikOner();
    await rpYukle();await rpRaporAc(data.id);
  }finally{btn.disabled=false;}
};

// ---------- 2 · Raporu ekranda gör + paylaş ----------
window.rpRaporAc=async function(id){
  _rpSecYayin=id;const y=_rpYayin.find(x=>x.id===id);
  _rpId('rp-rapor-detay').style.display='';
  _rpId('rp-d-baslik').textContent=y?y.baslik:'Rapor';
  _rpId('rp-d-meta').textContent=y?[y.kip==='canli'?'Canlı panel':_rpDonem(y),_rpKaynak(y)].join(' · '):'';
  rpPaylasHazirla();
  _rpId('rp-rapor-detay').scrollIntoView?.({behavior:'smooth',block:'start'});
  await rpOnizle(null);
};
window.rpDetayKapat=function(){_rpSecYayin=null;_rpOnizleNo++;const e=_rpId('rp-rapor-detay');if(e)e.style.display='none';};
window.rpOnizleTarih=function(){const v=_rpId('rp-d-tarih').value;if(/^\d{4}-\d{2}-\d{2}$/.test(v))rpOnizle(v);};
async function rpOnizle(tarih){
  const no=++_rpOnizleNo,kap=_rpId('rp-onizleme');kap.className='rc-panel';kap.innerHTML='<div class="rc rc-kart">Yükleniyor…</div>';
  const {data,error}=await sb.rpc('rapor_yayin_onizle',{p_yayin:_rpSecYayin,p_tarih:tarih||null});
  if(no!==_rpOnizleNo)return;
  if(error){kap.innerHTML=`<div class="rc rc-kart">${_rpEsc(_rpHata(error))}</div>`;return;}
  const y=data.yayin,r=data.rapor,canli=y.kip==='canli',ti=_rpId('rp-d-tarih');
  ti.style.display=canli?'':'none';if(canli){ti.max=data.bugun||'';ti.value=r.tarih||'';}
  kap.replaceChildren();kap.className='rc-panel';
  if(!r.kayit_var){const b=document.createElement('div');b.className='rc-kart';b.textContent='Bu tarih için kayıt yok';kap.appendChild(b);return;}
  if(window.RaporCizim)window.RaporCizim.ciz(r,kap);else kap.innerHTML='<div class="rc rc-kart">Önizleme yüklenemedi (rapor/cizim.js yüklü değil)</div>';
}
window.rpYayinSil=async function(){
  const y=_rpYayin.find(x=>x.id===_rpSecYayin);if(!y)return;
  if(!(await onay(`"${_rpEsc(y.baslik)}" silinecek${y.paylasim_sayisi?` ve gönderildiği ${y.paylasim_sayisi} alıcıdan kalkacak`:''}. Geri alınamaz.`,'🗑️','Sil','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_yayin_sil',{p_id:y.id});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Rapor silindi','ok');rpDetayKapat();await rpYukle();
};

function rpPaylasHazirla(){
  const y=_rpYayin.find(x=>x.id===_rpSecYayin);if(!y)return;
  const s=_rpId('rp-alici'),onceki=s.value,etkin=_rpAlici.filter(a=>a.durum==='aktif'||a.durum==='kilitli');
  s.innerHTML='<option value="__yeni">Yeni alıcı</option>'+etkin.map(a=>`<option value="${a.id}">${_rpEsc(a.etiket)} · ${RP_TIP[a.tip]}</option>`).join('');
  if(onceki&&(onceki==='__yeni'||etkin.some(a=>a.id===onceki)))s.value=onceki;
  _rpId('rp-pencere-kutu').style.display=y.kip==='canli'?'':'none';
  rpAliciDegisti();
}
window.rpAliciDegisti=function(){
  const yeni=_rpId('rp-alici').value==='__yeni';
  _rpId('rp-yeni-alici').style.display=yeni?'':'none';
  _rpId('rp-paylas-btn').textContent=yeni?'Bağlantı oluştur':'Gönder';
};
function rpVarsayilanKimlik(){_rpId('rp-kullanici').value=RP_VARSAYILAN.kullanici;_rpId('rp-sifre').value=RP_VARSAYILAN.sifre;}
window.rpPaylas=async function(){
  const yid=_rpSecYayin,sec=_rpId('rp-alici').value;if(!yid)return;
  const y=_rpYayin.find(x=>x.id===yid),btn=_rpId('rp-paylas-btn');
  if(sec!=='__yeni'){
    const a=_rpAlici.find(x=>x.id===sec);
    if(a&&a.tip==='tek_seferlik'&&a.rapor_sayisi>=1){bil('Bu tek seferlik alıcıya zaten rapor gönderilmiş; yeni bir alıcı oluşturun','err');return;}
    btn.disabled=true;
    try{
      const {error}=await sb.rpc('rapor_paylas',{p_baglanti:sec,p_yayin:yid});
      if(error){bil(_rpHata(error),'err');return;}
      bil(`"${y?y.baslik:'Rapor'}" → ${a?a.etiket:'alıcı'} gönderildi`,'ok');
      await rpYukle();
    }finally{btn.disabled=false;}
    return;
  }
  const etiket=(_rpId('rp-etiket').value||'').trim();
  if(!etiket){bil('"Kime" alanını doldurun (örn. Ahmet Bey)','err');return;}
  const kullanici=(_rpId('rp-kullanici').value||'').trim()||RP_VARSAYILAN.kullanici,sifre=(_rpId('rp-sifre').value||'').trim();
  if(!_rpKulOk(kullanici)){bil('Kullanıcı adı 3-32 karakter olmalı: harf, rakam, nokta, alt çizgi, tire (Türkçe karakter olmadan)','err');return;}
  if(sifre.length<4||sifre.length>32){bil('Şifre en az 4, en çok 32 karakter olmalı','err');return;}
  const tip=rpSegDeger('rp-tip');
  btn.disabled=true;
  try{
    const {data,error}=await sb.rpc('rapor_baglanti_olustur',{p_isyeri:aktifIsyeri.id,p_etiket:etiket,p_tip:tip,p_gecmis:tip==='kalici'?rpSegDeger('rp-gecmis'):'sadece_son',
      p_gecmis_gun:parseInt(_rpId('rp-pencere').value,10),p_gecerlilik_gun:parseInt(_rpId('rp-sure').value,10),p_kullanici:kullanici,p_sifre:sifre});
    if(error){bil(_rpHata(error),'err');return;}
    _rpSonuc={link:new URL('rapor/',location.href).href+'#'+data.token,kullanici:data.kullanici,sifre:data.sifre,etiket,baslik:y?y.baslik:''};
    rpSonucCiz('Giriş bilgileri');
    _rpId('rp-etiket').value='';rpVarsayilanKimlik();
    const p=await sb.rpc('rapor_paylas',{p_baglanti:data.id,p_yayin:yid});
    if(p.error)bil('Alıcı oluşturuldu ama rapor gönderilemedi: '+_rpHata(p.error),'err');
    await rpYukle();
  }finally{btn.disabled=false;}
};

// ---------- sonuç kutusu: bağlantı + kullanıcı adı + şifre (yalnızca bir kez) ----------
function rpMesaj(){
  const s=_rpSonuc;if(!s)return '';
  const satir=[s.link?(s.baslik?`"${s.baslik}" raporuna aşağıdaki bilgilerle ulaşabilirsiniz:`:'Rapora aşağıdaki bilgilerle ulaşabilirsiniz:'):'Rapor giriş bilgileriniz güncellendi:'];
  if(s.link)satir.push(`Bağlantı: ${s.link}`);
  satir.push(`Kullanıcı adı: ${s.kullanici}`);
  satir.push(`Şifre: ${s.sifre!=null?s.sifre:'(değişmedi, daha önce size bildirilen şifre)'}`);
  return satir.join('\n');
}
function rpBilgiSatiri(etiket,id,deger,kopya,mono){
  return `<div class="rp-etiket">${etiket}</div><div class="rp-bilgi">`+
    (id==='rp-link-kutu'?`<input id="${id}" readonly value="${_rpEsc(deger)}" onclick="this.select()">`:`<span id="${id}" class="rp-mono"${mono?'':' style="font-size:15px"'}>${_rpEsc(deger)}</span>`)+
    (kopya?`<button type="button" class="rp-ikon" title="Kopyala" onclick="rpKopyala('${kopya}')">⧉</button>`:'')+`</div>`;
}
function rpSonucCiz(baslik){
  const k=_rpId('rp-sonuc');if(!k)return;
  if(!_rpSonuc){k.style.display='none';k.innerHTML='';return;}
  const s=_rpSonuc;k.style.display='';
  k.innerHTML=`<div class="rp-detay-ust"><div class="rp-d-baslik">${_rpEsc(baslik||'Giriş bilgileri')} <span class="rp-sol">· ${_rpEsc(s.etiket)} · bir kez gösterilir</span></div><button type="button" class="rp-ikon" title="Kapat" onclick="rpSonucKapat()">✕</button></div>
    ${s.link?rpBilgiSatiri('Bağlantı','rp-link-kutu',s.link,'link'):''}
    ${rpBilgiSatiri('Kullanıcı adı','rp-kullanici-goster',s.kullanici,'kullanici',true)}
    ${rpBilgiSatiri('Şifre','rp-sifre-goster',s.sifre!=null?s.sifre:'(değişmedi)',s.sifre!=null?'sifre':'',true)}
    <button type="button" class="rp-btn" onclick="rpKopyala('hepsi')">Hepsini kopyala</button>`;
  k.scrollIntoView?.({behavior:'smooth',block:'start'});
}
window.rpSonucKapat=function(){_rpSonuc=null;rpSonucCiz();};
window.rpKopyala=async function(ne){
  if(!_rpSonuc)return;
  const metin=ne==='hepsi'?rpMesaj():ne==='link'?_rpSonuc.link:ne==='kullanici'?_rpSonuc.kullanici:_rpSonuc.sifre;
  if(metin==null||metin==='')return;
  try{await navigator.clipboard.writeText(metin);bil(ne==='hepsi'?'Kopyalandı: bağlantı, kullanıcı adı ve şifre':'Kopyalandı','ok');}
  catch(e){const k=_rpId(ne==='link'?'rp-link-kutu':ne==='kullanici'?'rp-kullanici-goster':'rp-sifre-goster');if(k&&k.select)k.select();bil('Otomatik kopyalanamadı; seçili metni elle kopyalayın','err');}
};

// ---------- Raporlar sekmesi ----------
function rpYayinlarCiz(){
  const kap=_rpId('rp-yayinlar');
  if(!_rpYayin.length){kap.innerHTML='<div class="rp-bos">Henüz rapor yok</div>';return;}
  kap.innerHTML=`<table class="rp-tablo"><thead><tr><th>Rapor</th><th>Kaynak</th><th>Dönem</th><th class="rp-sag">Toplam</th><th class="rp-sag">Alıcı</th></tr></thead><tbody>`+
    _rpYayin.map(y=>`<tr class="rp-tikla" onclick="rpRaporAc('${y.id}')"><td><b>${_rpEsc(y.baslik)}</b></td><td>${_rpEsc(_rpKaynak(y))}</td><td>${_rpEsc(_rpDonem(y))}</td><td class="rp-sag">${y.ozet?_rpPara(y.ozet.toplam_tutar):'—'}</td><td class="rp-sag">${y.paylasim_sayisi}</td></tr>`).join('')+`</tbody></table>`;
}

// ---------- Alıcılar sekmesi ----------
function rpAlicilarCiz(){
  const kap=_rpId('rp-alicilar');
  if(!_rpAlici.length){kap.innerHTML='<div class="rp-bos">Henüz alıcı yok</div>';return;}
  kap.innerHTML=`<table class="rp-tablo"><thead><tr><th>Kime</th><th>Kullanıcı adı</th><th>Tip</th><th>Durum</th><th>Son erişim</th><th class="rp-sag">Rapor</th></tr></thead><tbody>`+
    _rpAlici.map(b=>{const d=RP_DURUM[b.durum]||[b.durum,'var(--yazi3,#8a96a0)'];
      return `<tr class="rp-tikla" onclick="rpAliciAc('${b.id}')"><td><b>${_rpEsc(b.etiket)}</b></td><td class="rp-mono">${_rpEsc(b.kullanici_adi||'')}</td><td>${RP_TIP[b.tip]||b.tip}</td><td><span class="rp-chip" style="color:${d[1]}">${d[0]}</span></td><td>${_rpTr(b.son_erisim)}</td><td class="rp-sag">${b.rapor_sayisi}</td></tr>`;}).join('')+`</tbody></table>`;
}
window.rpAliciKapat=function(){_rpSecAlici=null;const e=_rpId('rp-alici-detay');if(e){e.style.display='none';e.innerHTML='';}};
window.rpAliciAc=async function(id){
  const b=_rpAlici.find(x=>x.id===id);if(!b)return;_rpSecAlici=id;
  const d=RP_DURUM[b.durum]||[b.durum,'var(--yazi3,#8a96a0)'],etkin=b.durum==='aktif'||b.durum==='kilitli',iptal=b.durum==='iptal';
  const k=_rpId('rp-alici-detay');k.style.display='';
  k.innerHTML=`<div class="rp-detay-ust"><div class="rp-d-baslik">${_rpEsc(b.etiket)} <span class="rp-chip" style="color:${d[1]}">${d[0]}</span>${b.iptal_nedeni?` <span class="rp-sol">${_rpEsc(b.iptal_nedeni)}</span>`:''}</div><button type="button" class="rp-ikon" title="Kapat" onclick="rpAliciKapat()">✕</button></div>
    <div class="rp-izgara"><div><div class="rp-k">Kullanıcı adı</div><div class="rp-v rp-mono">${_rpEsc(b.kullanici_adi||'')}</div></div><div><div class="rp-k">Geçerlilik</div><div class="rp-v">${_rpTarih(b.bitis)}</div></div>
      <div><div class="rp-k">Son erişim</div><div class="rp-v">${_rpTr(b.son_erisim)}</div></div><div><div class="rp-k">Erişim · hatalı giriş</div><div class="rp-v">${b.erisim_sayisi} · ${b.toplam_basarisiz}</div></div></div>
    ${b.tip==='kalici'&&etkin?`<div class="rp-alan" style="margin-bottom:12px"><label>Geçmiş raporlar</label><div class="rp-seg" id="rp-ad-gecmis" data-deger="${b.gecmis}"><button type="button" class="${b.gecmis==='tumu'?'on':''}" data-d="tumu" onclick="rpGecmisDegistir('${b.id}','tumu')">Görünsün</button><button type="button" class="${b.gecmis==='sadece_son'?'on':''}" data-d="sadece_son" onclick="rpGecmisDegistir('${b.id}','sadece_son')">Sadece son</button></div></div>`:''}
    <div class="rp-k">Gönderilen raporlar</div><div id="rp-ad-raporlar"></div>
    <div class="rp-eylem">${iptal?'':`<button type="button" class="rp-btn2" onclick="rpKimlikAc('${b.id}')">Kullanıcı adı / şifre</button><button type="button" class="rp-btn2" onclick="rpLinkYenile('${b.id}')">Linki yenile</button><button type="button" class="rp-btn2" onclick="rpSureUzat('${b.id}')">Süreyi uzat</button>`}<button type="button" class="rp-btn2" onclick="rpGunluk('${b.id}')">Erişim günlüğü</button>${etkin?`<button type="button" class="rp-btn2 kirmizi" onclick="rpIptal('${b.id}')">İptal et</button>`:''}</div>
    <div id="rp-ad-kimlik"></div><div id="rp-ad-gunluk"></div>`;
  const {data,error}=await sb.rpc('rapor_baglanti_gonderilenler',{p_baglanti:id});
  const kap=_rpId('rp-ad-raporlar');if(!kap||_rpSecAlici!==id)return;
  if(error){kap.innerHTML=`<div class="rp-bos">${_rpEsc(_rpHata(error))}</div>`;return;}
  const L=data||[];
  kap.innerHTML=L.length?`<table class="rp-tablo"><tbody>`+L.map(x=>`<tr><td><b>${_rpEsc(x.baslik)}</b><div class="rp-sol">${_rpEsc(_rpDonem(x))}</div></td><td>${_rpTr(x.zaman)}</td><td><span class="rp-chip" style="color:${x.gorulebilir?'var(--yesil,#2d6a4f)':'var(--yazi3,#8a96a0)'}">${x.gorulebilir?'Görebilir':'Göremez'}</span></td><td class="rp-sag"><button type="button" class="rp-btn2" onclick="rpGeriAl('${id}','${x.id}')">Geri al</button></td></tr>`).join('')+`</tbody></table>`:'<div class="rp-bos">Henüz rapor gönderilmedi</div>';
  k.scrollIntoView?.({behavior:'smooth',block:'nearest'});
};
window.rpGeriAl=async function(baglanti,yayin){
  if(!(await onay('Rapor alıcıdan geri alınacak; alıcı artık açamaz. (Rapor silinmez.)','↩️','Geri al','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_paylasim_kaldir',{p_baglanti:baglanti,p_yayin:yayin});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Geri alındı','ok');await rpYukle();
};
window.rpGecmisDegistir=async function(id,yeni){
  const b=_rpAlici.find(x=>x.id===id);if(!b||b.gecmis===yeni)return;
  const {error}=await sb.rpc('rapor_baglanti_gecmis_ayarla',{p_id:id,p_gecmis:yeni});
  if(error){bil(_rpHata(error),'err');return;}
  bil(yeni==='tumu'?'Geçmiş raporlar görünür':'Yalnızca son rapor görünür','ok');await rpYukle();
};
window.rpSureUzat=async function(id){
  if(!(await onay('Geçerlilik bugünden itibaren 90 gün olarak yenilenecek.','⏳','Uzat','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_baglanti_sure_uzat',{p_id:id,p_gun:90});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Süre uzatıldı','ok');await rpYukle();
};
window.rpIptal=async function(id){
  if(!(await onay('Bağlantı iptal edilecek. Linki bilen kimse artık raporu göremez, açık oturumlar hemen kapanır. Geri alınamaz.','🚫','İptal et','Vazgeç')))return;
  const {error}=await sb.rpc('rapor_baglanti_iptal',{p_id:id});
  if(error){bil(_rpHata(error),'err');return;}
  bil('Bağlantı iptal edildi','ok');await rpYukle();
};
window.rpKimlikAc=function(id){
  const a=_rpAlici.find(x=>x.id===id);if(!a)return;
  _rpId('rp-ad-kimlik').innerHTML=`<div class="rp-satir" style="align-items:flex-end;margin-top:4px"><div class="rp-alan"><label>Kullanıcı adı</label><input type="text" id="rp-k-kullanici" maxlength="32" value="${_rpEsc(a.kullanici_adi||'')}" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
    <div class="rp-alan"><label>Yeni şifre</label><input type="text" id="rp-k-sifre" maxlength="32" placeholder="boş = değişmez" autocomplete="off" spellcheck="false"></div><button type="button" class="rp-btn" onclick="rpKimlikKaydet('${a.id}')">Kaydet</button></div>`;
};
window.rpKimlikKaydet=async function(id){
  const a=_rpAlici.find(x=>x.id===id);if(!a)return;
  const kul=(_rpId('rp-k-kullanici').value||'').trim().toLowerCase(),sif=(_rpId('rp-k-sifre').value||'').trim();
  const kulDegisti=kul&&kul!==String(a.kullanici_adi||'').toLowerCase();
  if(!kulDegisti&&!sif){bil('Değişiklik yok: yeni bir kullanıcı adı ya da şifre yazın','err');return;}
  if(kulDegisti&&!_rpKulOk(kul)){bil('Kullanıcı adı 3-32 karakter olmalı: harf, rakam, nokta, alt çizgi, tire (Türkçe karakter olmadan)','err');return;}
  if(sif&&(sif.length<4||sif.length>32)){bil('Şifre en az 4, en çok 32 karakter olmalı','err');return;}
  const {data,error}=await sb.rpc('rapor_baglanti_kimlik_degistir',{p_id:id,p_kullanici:kulDegisti?kul:null,p_sifre:sif||null});
  if(error){bil(_rpHata(error),'err');return;}
  _rpId('rp-ad-kimlik').innerHTML='';
  _rpSonuc={link:null,kullanici:data.kullanici,sifre:data.sifre,etiket:a.etiket,baslik:''};
  rpSonucCiz('Giriş bilgileri güncellendi');
  await rpYukle();
};
window.rpLinkYenile=async function(id){
  if(!(await onay('Bağlantı yenilenecek: eski link geçersiz olur, açık oturumlar kapanır. Kullanıcı adı ve şifre aynı kalır.','🔗','Linki yenile','Vazgeç')))return;
  const {data,error}=await sb.rpc('rapor_baglanti_link_yenile',{p_id:id});
  if(error){bil(_rpHata(error),'err');return;}
  const a=_rpAlici.find(x=>x.id===id);
  _rpSonuc={link:new URL('rapor/',location.href).href+'#'+data.token,kullanici:data.kullanici,sifre:null,etiket:a?a.etiket:'',baslik:''};
  rpSonucCiz('Bağlantı yenilendi');
  await rpYukle();
};
window.rpGunluk=async function(id){
  const k=_rpId('rp-ad-gunluk');if(!k)return;
  const {data,error}=await sb.rpc('rapor_erisim_gunlugu',{p_id:id,p_limit:100});
  if(error){bil(_rpHata(error),'err');return;}
  const L=data||[];
  k.innerHTML=L.length?`<div class="rp-k" style="margin-top:6px">Erişim günlüğü · son ${L.length} olay</div><table class="rp-tablo"><thead><tr><th>Zaman</th><th>Olay</th><th>Gün</th><th>IP</th><th>Cihaz</th></tr></thead><tbody>`+
    L.map(x=>{const uyari=RP_SUPHELI.includes(x.olay);
      return `<tr><td style="white-space:nowrap">${_rpTr(x.ts)}</td><td style="${uyari?'color:var(--turuncu,#d9822b);font-weight:600':''}">${_rpEsc(RP_OLAY[x.olay]||x.olay)}${x.ayrinti?` <span class="rp-sol">${_rpEsc(x.ayrinti)}</span>`:''}</td><td>${x.tarih?_rpTarih(x.tarih):'—'}</td><td>${_rpEsc(x.ip||'—')}</td><td class="rp-sol" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_rpEsc(x.ajan||'')}">${_rpEsc(x.ajan||'—')}</td></tr>`;}).join('')+`</tbody></table>`:'<div class="rp-bos">Kayıt yok</div>';
  k.scrollIntoView?.({behavior:'smooth',block:'nearest'});
};
