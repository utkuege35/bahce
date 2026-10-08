// ===== YAZI BOYUTU ÖLÇEĞİ =====
// Tek ayar: --yazi-olcek (Normal 1 · Büyük 1.1 · Çok büyük 1.2). Varsayılan: Büyük. Cihaza özeldir (localStorage).
//  • css/style.css içindeki yazı boyutları calc(Npx*var(--yazi-olcek)) olarak yazılmıştır.
//  • Satır içi (style="font-size:12px") ve JS ile sonradan eklenen elemanlardaki px boyutlar da bu betikle otomatik
//    aynı ölçeğe bağlanır (MutationObserver). Böylece yeni ya da eski hiçbir ekran tek tek değiştirilmeden ölçeklenir.
//  • Sadece YAZI büyür; kutu/boşluk ölçüleri aynı kalır.
(function(){
  const ANAHTAR='sb_yazi_olcek',VARSAYILAN='1.1',GECERLI=['1','1.1','1.2'];
  const olcek=()=>{let v=null;try{v=localStorage.getItem(ANAHTAR);}catch(e){}return GECERLI.includes(v)?v:VARSAYILAN;};
  // "font-size:12px" → "font-size:calc(12px*var(--yazi-olcek,1))" (zaten calc ise eşleşmez)
  const RE=/font-size\s*:\s*([\d.]+)px/gi;
  function donustur(el){
    if(!el||el.nodeType!==1)return;
    const s=el.getAttribute('style');
    if(!s||!/font-size/i.test(s))return;
    const y=s.replace(RE,(m,n)=>`font-size:calc(${n}px*var(--yazi-olcek,1))`);
    if(y!==s)el.setAttribute('style',y);
  }
  function tara(kok){donustur(kok);if(kok.querySelectorAll)kok.querySelectorAll('[style*="font-size"]').forEach(donustur);}
  function grafikYazisi(v){if(window.Chart&&Chart.defaults&&Chart.defaults.font)Chart.defaults.font.size=Math.round(12*parseFloat(v));}
  window.yaziBoyutuUygula=function(v){
    if(!GECERLI.includes(v))v=VARSAYILAN;
    document.documentElement.style.setProperty('--yazi-olcek',v);
    grafikYazisi(v);
    const s=document.getElementById('yazi-boyutu');if(s)s.value=v;
  };
  window.yaziBoyutuDegis=function(v){
    try{localStorage.setItem(ANAHTAR,v);}catch(e){}
    yaziBoyutuUygula(v);
    // Grafikler yeni yazı boyutuyla yeniden çizilsin
    if(typeof renderPanel==='function'&&document.getElementById('panel')?.classList.contains('active'))renderPanel();
  };
  const mo=new MutationObserver(liste=>{
    for(const m of liste){
      if(m.type==='attributes')donustur(m.target);
      else m.addedNodes.forEach(n=>{if(n.nodeType===1)tara(n);});
    }
  });
  function basla(){
    yaziBoyutuUygula(olcek());
    tara(document.documentElement);
    mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',basla);else basla();
})();
