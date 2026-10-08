// ===== VERİTABANI KATMANI İSTEMCİSİ =====
// Stok hesapları ve fiş yazma/silme kuralları veritabanında (SQL fonksiyonları) çalışır.
// Bu dosya onları çağıran ince yardımcıları içerir. Hata olursa veritabanının mesajı (ör. "Domates: Ana Depo
// deposunda yeterli stok yok (kalacak: -3)") olduğu gibi kullanıcıya gösterilebilir.

// Birden çok stok için bakiye {stok_id: bakiye}. depoId boşsa tüm depoların toplamı.
window.stokBakiyelerDb=async function(depoId,stokIdleri,haricBelge,tarih){
  const {data,error}=await sb.rpc('stok_bakiyeler',{
    p_isyeri:aktifIsyeri?.id||null,p_depo:depoId||null,
    p_stoklar:(stokIdleri&&stokIdleri.length)?stokIdleri:null,
    p_haric_belge:haricBelge||null,p_tarih:tarih||null
  });
  if(error)throw error;
  return data||{};
};
// Fişi tek işlemde yazar (yeni ya da düzenleme). sert=true: stok eksiye düşecekse veritabanı HATA verir.
window.fisYazDb=async function(baslik,satirlar,eskiBelge,sert){
  const {data,error}=await sb.rpc('stok_fisi_yaz',{p_baslik:baslik,p_satirlar:satirlar,p_eski_belge:eskiBelge||null,p_sert:!!sert});
  if(error)throw error;
  return data;
};
// Fişi tek işlemde siler (yumuşak silme).
window.fisSilDb=async function(fisId,sert){
  const {error}=await sb.rpc('stok_fisi_sil',{p_fis:fisId,p_isyeri:aktifIsyeri?.id||null,p_kullanici:aktifKullanici?.ad||'',p_sert:!!sert});
  if(error)throw error;
};
// Üretim fişi: ürün + reçeteden açılan hammadde sarfiyatları + urunler.stok sayacı TEK işlemde yazılır/silinir.
window.uretimYazDb=async function(baslik,satirlar,eskiBelge){
  const {data,error}=await sb.rpc('uretim_fisi_yaz',{p_baslik:baslik,p_satirlar:satirlar,p_eski:eskiBelge||null});
  if(error)throw error;
  return data;
};
window.uretimSilDb=async function(fisId){
  const {error}=await sb.rpc('uretim_fisi_sil',{p_fis:fisId,p_isyeri:aktifIsyeri?.id||null,p_kullanici:aktifKullanici?.ad||''});
  if(error)throw error;
};
// GEÇİŞ KOLAYLIĞI: henüz yeni yapıya taşınmamış eski rapor ekranları (Sayım Raporu, Rapor, Reçete Kullanım Raporu, YM Sayım Özeti, Cari)
// hareketleri bellekteki `islemler` listesinden okuyabilir. O ekranlar açılırken liste veritabanından (sayfalı) yüklenir;
// herhangi bir kayıt yazımından sonra bayat sayılır ve ekran tekrar açılınca yenilenir.
window.islemlerLegacyYukle=async function(){
  if(!aktifIsyeri?.id)return;
  try{islemler=await sbSayfali(()=>_aktifIslemSorgusu().order('tarih',{ascending:false}).order('ts',{ascending:false}).order('id'));}
  catch(e){console.warn('Eski ekranlar için hareket listesi yüklenemedi:',e.message);}
};
// Hareketlerin hepsi artık tarayıcıda tutulmaz; her ekran ihtiyacını veritabanından (filtreli, sayfalı) alır.
// Sadece stok miktarı ve son alım fiyatları küçük bir önbellekte durur (veritabanı fonksiyonlarından gelir).
window._stokBakiyeToplam={};
window._stokSonAlim={};
window.stokBakiyeToplamYenile=async function(){
  window._legacyHazir=false; // eski ekranlar için hareket kopyası bayatladı
  const isyeri=aktifIsyeri?.id||null;
  const [bak,alim]=await Promise.all([
    sb.rpc('stok_bakiyeler',{p_isyeri:isyeri,p_depo:null,p_stoklar:null,p_haric_belge:null,p_tarih:null}),
    sb.rpc('stok_son_alim_fiyatlari',{p_isyeri:isyeri})
  ]);
  if(!bak.error)_stokBakiyeToplam=bak.data||{};
  if(!alim.error)_stokSonAlim=alim.data||{};
  // Hareket listeleri/önbellekleri de bayatlamış olabilir
  if(typeof ilCacheSifirla==='function')ilCacheSifirla();
};
// Geriye dönük uyumluluk: yazma işlemlerinden sonra çağrılan eski ad
window.islemleriYenile=window.stokBakiyeToplamYenile;

// ===== Sayfalı okuma (Supabase tek istekte en fazla 1000 satır döner) =====
// kur: her çağrıda yeni bir sorgu üreten fonksiyon (ör. ()=>sb.from('islemler').select('*').eq(...))
window.sbSayfali=async function(kur,sayfa){
  sayfa=sayfa||1000;const tum=[];
  for(let bas=0;;bas+=sayfa){
    const {data,error}=await kur().range(bas,bas+sayfa-1);
    if(error)throw error;
    tum.push(...(data||[]));
    if(!data||data.length<sayfa)break;
  }
  return tum;
};
const _aktifIslemSorgusu=()=>sb.from('islemler').select('*').eq('isyeri_id',aktifIsyeri?.id).or('silindi.is.null,silindi.eq.false');
// Tarih aralığındaki hareketler (Panel)
window.islemlerAralik=function(bas,bit){
  return sbSayfali(()=>_aktifIslemSorgusu().gte('tarih',bas).lte('tarih',bit).order('ts',{ascending:false}).order('id'));
};
// İşlem Listesi: tür ve tarih sunucuda filtrelenir
window.islemlerListe=function(f){
  return sbSayfali(()=>{
    let q=_aktifIslemSorgusu();
    if(f.tur)q=q.eq('tur',f.tur);
    if(f.bas)q=q.gte('tarih',f.bas);
    if(f.bit)q=q.lte('tarih',f.bit);
    return q.order('tarih',{ascending:false}).order('ts',{ascending:false}).order('id');
  });
};
// Günlük sekme listesi (belirli bir gün + tür listesi)
window.islemlerGun=function(tarih,turler){
  return sbSayfali(()=>_aktifIslemSorgusu().eq('tarih',tarih).in('tur',turler).order('ts',{ascending:false}).order('id'));
};
window.islemGetir=async function(id){
  const {data}=await sb.from('islemler').select('*').eq('id',id).maybeSingle();
  return data||null;
};
// Bir belgenin (fişin) tüm satırları. belgeKey = belge_id (belge_id boşsa satırın kendi id'si)
window.belgeSatirlari=async function(belgeKey){
  return sbSayfali(()=>_aktifIslemSorgusu().or(`belge_id.eq.${belgeKey},id.eq.${belgeKey}`).order('ts').order('id'));
};
// Bir stoğun hareketleri (stok detayı)
window.islemlerStok=function(stokId){
  return sbSayfali(()=>_aktifIslemSorgusu().eq('stok_id',stokId).order('tarih',{ascending:false}).order('ts',{ascending:false}).order('id'));
};
window.islemLoglariGetir=async function(islemId){
  const {data}=await sb.from('islem_loglari').select('*').eq('islem_id',islemId).order('tarih');
  return data||[];
};
window.kasaToplamDb=async function(){
  const {data,error}=await sb.rpc('kasa_toplam',{p_isyeri:aktifIsyeri?.id||null});
  if(error)throw error;
  return parseFloat(data)||0;
};
// Hareket var mı kontrolleri (silme/pasife alma kararları için)
window.stokHareketVarMi=async function(stokId){
  const {data}=await sb.from('islemler').select('id').eq('stok_id',stokId).or('silindi.is.null,silindi.eq.false').limit(1);
  return !!(data&&data.length);
};
window.depoHareketVarMi=async function(depoId){
  const {data}=await sb.from('islemler').select('id,silindi').or(`depo_id.eq.${depoId},hedef_depo_id.eq.${depoId}`).limit(200);
  return (data||[]).some(i=>!i.silindi);
};
// Bir irsaliye/faturaya bağlı (silinmemiş) Ana Depo Çıkış fişleri
window.bagliCikisFisleri=async function(alan,belgeId){
  const {data}=await sb.from('stok_fisleri').select('*').eq(alan,belgeId).eq('fis_turu','transfer').eq('silindi',false);
  return data||[];
};

// ===== İRSALİYE / FATURA (tek işlemde) =====
// Başlık, kalemler, stok girişi, Ana Depo Çıkış fişleri ve irsaliye↔fatura bağlantısı birlikte yazılır/silinir.
// Mükerrer belge, "çıkış fişi varken düzenleme/silme yok", "faturalanmış irsaliye değişmez" ve stok eksiye düşme
// kuralları veritabanında zorlanır; hata mesajı olduğu gibi kullanıcıya gösterilir.
window.irsaliyeYazDb=async function(baslik,kalemler,giris,cikislar,maliyetler,eskiId){
  const {data,error}=await sb.rpc('irsaliye_yaz',{p_baslik:baslik,p_kalemler:kalemler,p_giris:giris||[],p_cikislar:cikislar||[],p_maliyetler:maliyetler||[],p_eski:eskiId||null});
  if(error)throw error;
  return data;
};
window.irsaliyeSilDb=async function(id){
  const {error}=await sb.rpc('irsaliye_sil',{p_id:id,p_kullanici:aktifKullanici?.ad||''});
  if(error)throw error;
};
window.faturaYazDb=async function(baslik,kalemler,giris,cikislar,maliyetler,irsaliyeIdler,eskiId){
  const {data,error}=await sb.rpc('fatura_yaz',{p_baslik:baslik,p_kalemler:kalemler,p_giris:giris||[],p_cikislar:cikislar||[],p_maliyetler:maliyetler||[],
    p_irsaliyeler:(irsaliyeIdler&&irsaliyeIdler.length)?irsaliyeIdler:null,p_eski:eskiId||null});
  if(error)throw error;
  return data;
};
window.faturaSilDb=async function(id){
  const {error}=await sb.rpc('fatura_sil',{p_id:id,p_kullanici:aktifKullanici?.ad||''});
  if(error)throw error;
};

// ===== KASA FİŞLERİ =====
// Kasa günlük listesi: işaret>0 → Tahsil (kasaya giriş), işaret<0 → Tediye (kasadan çıkış)
window.islemlerKasa=function(tarih,isaret){
  return sbSayfali(()=>{
    let q=_aktifIslemSorgusu().eq('tur','kasa').eq('tarih',tarih);
    q=isaret>0?q.gt('kasa_etkisi',0):q.lt('kasa_etkisi',0);
    return q.order('ts',{ascending:false}).order('id');
  });
};
window.kasaBakiyelerDb=async function(){
  const {data,error}=await sb.rpc('kasa_bakiyeler',{p_isyeri:aktifIsyeri?.id||null});
  if(error)throw error;
  return data||{};
};
// Kasa hareketi + cari hareketi tek işlemde yazılır/silinir
window.kasaFisiYazDb=async function(satir,cari,eskiId){
  const {data,error}=await sb.rpc('kasa_fisi_yaz',{p_satir:satir,p_cari:cari||null,p_eski:eskiId||null});
  if(error)throw error;
  return data;
};
window.kasaFisiSilDb=async function(id){
  const {error}=await sb.rpc('kasa_fisi_sil',{p_id:id,p_kullanici:aktifKullanici?.ad||''});
  if(error)throw error;
};
