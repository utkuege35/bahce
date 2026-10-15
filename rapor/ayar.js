// Rapor sayfası ayarları: Supabase PROJE ADRESİ ve GENEL (anon/publishable) anahtar.
// Bu iki değer, uygulamanızın js/config.js dosyasındaki ile AYNIDIR. Genel anahtar gizli değildir; veriyi koruyan şey
// veritabanı işlevleridir (jeton + PIN). ASLA "service_role" anahtarını buraya yazmayın.
window.RAPOR_AYAR = {
  url: 'https://PROJE_KODUNUZ.supabase.co',
  anahtar: 'GENEL_ANON_ANAHTARINIZ'
};
