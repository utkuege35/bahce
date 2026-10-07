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
// Bellekteki hareket listesini (henüz veritabanı katmanına taşınmamış ekranlar için) tazeler.
window.islemleriYenile=async function(){
  const {data}=await sb.from('islemler').select('*').eq('isyeri_id',aktifIsyeri?.id).order('ts',{ascending:false});
  if(data)islemler=data.filter(i=>!i.silindi);
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
