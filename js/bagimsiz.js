// ===== BAĞIMSIZ RAPORLAMA (modül kabuğu) =====
// Ana sistemin stok/fatura/envanter kayıtlarından BAĞIMSIZ çalışan modül: yüklenen veriler (aktarim_* tabloları) üzerinde analiz yapar.
// Tek menü girişi, içinde sekmeler: Veri Yükleme (aktarim.js) · Alış Fiyat Analizi (alisanaliz.js). Yeni analizler buraya sekme olarak eklenir.
// Yetki tek anahtardır: bagimsiz_raporlama (görüntüle = modül + raporlar, ekle = veri yükleme, sil = parti silme).
window.brTab=function(id,btn){
  const sayfa=document.getElementById('bagimsiz-raporlama');if(!sayfa)return;
  sayfa.querySelectorAll(':scope>.tabs .tab').forEach(b=>b.classList.remove('active'));
  sayfa.querySelectorAll(':scope>.tab-panel').forEach(p=>p.classList.remove('active'));
  const dugme=btn||sayfa.querySelector(`:scope>.tabs .tab[onclick*="'${id}'"]`);
  if(dugme)dugme.classList.add('active');
  document.getElementById('br-'+id)?.classList.add('active');
  if(id==='yukleme'&&typeof aktarimAc==='function')aktarimAc();
  if(id==='alis'&&typeof alisAnalizAc==='function')alisAnalizAc();
};
// Modül açılışı: en son açık sekme korunur, ilk açılışta Veri Yükleme
window.brAc=function(){
  const aktif=document.querySelector('#bagimsiz-raporlama>.tab-panel.active');
  brTab(aktif?aktif.id.replace('br-',''):'yukleme');
};
