// ===== YENİ EKRANLARDA YETKİ DENETİMİ =====
// Menü gizleme ve ekran açılış denetimi app.js'tedir. Burada ise EKRANA GİRMİŞ bir kullanıcının yapabileceği işlemler denetlenir:
//  • Kayıt/silme/düzenleme işlevleri sarmalanır: yetki yoksa işlem yapılmaz ve uyarı verilir (tarayıcı konsolundan çağrılsa bile).
//  • Araç çubuğundaki düğmeler (Yeni / Görüntüle / Düzenle / Sil / Log / Faturaya Dönüştür) yetkisizse gizlenir.
// Admin her zaman yetkilidir (yetkiVar). Her kural, çağrının argümanlarından GEREKLİ [ekran, eylem] çiftlerini üretir; hepsi
// sağlanmalıdır. Eylem 'ekle|duzenle' biçimindeyse biri yeterlidir (kaydet düğmesi: yeni kayıt ya da düzenleme).
// Düzenleme formuna sadece "düzenle" izni olan, yeni forma sadece "ekle" izni olan girebilir; kaydet ikisinden birini ister.
(function(){
  const ISLEM={goruntule:'goruntule',duzenle:'duzenle',sil:'sil',log:'goruntule'};
  const KAYDET='ekle|duzenle';
  const e=(ekran,eylem)=>[[ekran,eylem]];
  const liste=(ekran,islem)=>e(ekran,ISLEM[islem]||'goruntule');
  const KURAL={
    // İrsaliyeler (tur, islem)
    irsYeniBaslat:()=>e('irsaliyeler','ekle'),
    irsListeIslem:a=>a[1]==='fatura'?[['irsaliyeler','goruntule'],['faturalar','ekle']]:liste('irsaliyeler',a[1]),
    kaydetIrsaliye:()=>e('irsaliyeler',KAYDET),
    // Faturalar (tur, islem)
    fatYeniBaslat:()=>e('faturalar','ekle'),
    fatListeIslem:a=>liste('faturalar',a[1]),
    kaydetFatura:()=>e('faturalar',KAYDET),
    // Stok İşlemleri: Devir, Transfer (islem) · Satış/İkram/Ödenmez/Hasar/Atık (tur, islem) · Üretim, Sayım (islem)
    dvrYeniBaslat:()=>e('stok_islemleri','ekle'), dvrListeIslem:a=>liste('stok_islemleri',a[0]), kaydetDevirFisi:()=>e('stok_islemleri',KAYDET),
    trfYeniBaslat:()=>e('stok_islemleri','ekle'), trfListeIslem:a=>liste('stok_islemleri',a[0]), kaydetTransfer:()=>e('stok_islemleri',KAYDET),
    scYeniBaslat:()=>e('stok_islemleri','ekle'),  scListeIslem:a=>liste('stok_islemleri',a[1]),  kaydetStokCikis:()=>e('stok_islemleri',KAYDET),
    urYeniBaslat:()=>e('stok_islemleri','ekle'),  urListeIslem:a=>liste('stok_islemleri',a[0]),  kaydetUretim:()=>e('stok_islemleri',KAYDET),
    syYeniBaslat:()=>e('stok_islemleri','ekle'),  syListeIslem:a=>liste('stok_islemleri',a[0]),  kaydetSayim:()=>e('stok_islemleri',KAYDET),
    // İşlem Listesi'nden sayım fişini açma: (belgeAnahtari, salt) — salt=true görüntüleme
    sayimFisiDuzenleAc:a=>e('stok_islemleri',a[1]?'goruntule':'duzenle'),
    // Kasa İşlemleri (tur, islem)
    kiYeniBaslat:()=>e('kasa_islemleri','ekle'), kiListeIslem:a=>liste('kasa_islemleri',a[1]), kaydetKasaFisi:()=>e('kasa_islemleri',KAYDET),
    // KDV Tanımları
    kdvYeniAc:()=>e('kdv_tanimlari','ekle'), kdvDuzenleAc:()=>e('kdv_tanimlari','duzenle'), kdvKaydet:()=>e('kdv_tanimlari',KAYDET), kdvSil:()=>e('kdv_tanimlari','sil')
  };
  const izinVar=gerekli=>gerekli.every(([ekran,eylem])=>eylem.split('|').some(ey=>yetkiVar(ekran,ey)));
  window.yetkiKuraliIzinVar=(ad,args)=>!KURAL[ad]||izinVar(KURAL[ad](args||[]));
  Object.keys(KURAL).forEach(ad=>{
    const orj=window[ad];
    if(typeof orj!=='function'||orj._yetkiKorumali)return;
    const sarmal=function(...args){
      if(!izinVar(KURAL[ad](args))){bil('Bu işlem için yetkiniz yok','err');return;}
      return orj.apply(this,args);
    };
    sarmal._yetkiKorumali=true;
    window[ad]=sarmal;
  });
  // Araç çubuğu düğmeleri: onclick="irsListeIslem('alis','duzenle')" gibi çağrıları okuyup yetkisizse gizler
  const DUGME=/^\s*(irsYeniBaslat|irsListeIslem|fatYeniBaslat|fatListeIslem|dvrYeniBaslat|dvrListeIslem|trfYeniBaslat|trfListeIslem|scYeniBaslat|scListeIslem|urYeniBaslat|urListeIslem|syYeniBaslat|syListeIslem|kiYeniBaslat|kiListeIslem|kdvYeniAc)\(([^)]*)\)/;
  window.yetkiEylemleriUygula=function(){
    document.querySelectorAll('button[onclick]').forEach(b=>{
      const m=(b.getAttribute('onclick')||'').match(DUGME);
      if(!m)return;
      const args=m[2].split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).filter(s=>s!=='');
      b.style.display=izinVar(KURAL[m[1]](args))?'':'none';
    });
  };
})();
