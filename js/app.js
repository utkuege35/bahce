// ===== DARK MODE =====
(function(){
  const dk = localStorage.getItem('sv-dark');
  if(dk==='1'){document.body.classList.add('dark');}
})();
window.darkToggle=function(){
  const isDark=document.body.classList.toggle('dark');
  localStorage.setItem('sv-dark', isDark?'1':'0');
  const btn=document.getElementById('dark-toggle-btn');
  if(btn)btn.textContent=isDark?'🌙':'☀️';
};
// Sayfa yüklenince buton ikonunu ayarla
document.addEventListener('DOMContentLoaded',function(){
  const btn=document.getElementById('dark-toggle-btn');
  if(btn)btn.textContent=document.body.classList.contains('dark')?'🌙':'☀️';
});

// ===== MODALLARı BODY'E TAŞI =====
document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('.overlay').forEach(function(m){
    if(m.parentElement!==document.body){document.body.appendChild(m);}
  });
});

// ===== YARDIMCI FONKSİYONLAR =====
window.modalAc=function(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.add('open');
  document.body.style.overflow='hidden';
};
window.modalKapat=function(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.remove('open');
  document.body.style.overflow='';
};
document.addEventListener('click',function(e){
  if(e.target.classList.contains('overlay')&&e.target.classList.contains('open')){
    if(e.target.id!=='modal-onay')modalKapat(e.target.id);
  }
});

window.bil=function(msg,tip='ok'){
  let t=document.getElementById('_bildirim');
  if(!t){t=document.createElement('div');t.id='_bildirim';t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:99999;transition:opacity .3s;box-shadow:0 4px 16px rgba(0,0,0,.18)';document.body.appendChild(t);}
  t.textContent=msg;
  t.style.background=tip==='err'?'#c62828':tip==='uyari'?'#e65100':'#2d6a4f';
  t.style.color='#fff';t.style.opacity='1';t.style.display='block';
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.style.display='none',400);},3000);
};

window.onay=function(mesaj,ikon='❓'){
  return new Promise(resolve=>{
    const el=document.getElementById('modal-onay');
    if(!el){resolve(confirm(mesaj));return;}
    document.getElementById('onay-mesaj').innerHTML=mesaj;
    const ikonEl=document.getElementById('onay-ikon');if(ikonEl)ikonEl.textContent=ikon;
    el.classList.add('open');
    document.body.style.overflow='hidden';
    const temizle=()=>{el.classList.remove('open');document.body.style.overflow='';window._onayTamam=null;window._onayIptal=null;};
    window._onayTamam=()=>{temizle();resolve(true);};
    window._onayIptal=()=>{temizle();resolve(false);};
  });
};

window.para=function(sayi){
  return '₺'+parseFloat(sayi||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
};

window.bugun=function(){
  return new Date().toISOString().split('T')[0];
};

// ===== UYGULAMA =====
function uygulamaAc(){
  document.getElementById('giris-wrap').style.display='none';document.getElementById('uygulama').style.display='block';
  document.getElementById('kullanici-chip').textContent=(aktifKullanici.ad||'')+' '+(aktifKullanici.soyad||'');
  // İşyeri adını sub başlığa yaz
  const subEl=document.querySelector('.hdr .sub');
  if(subEl&&aktifIsyeri){subEl.textContent=aktifIsyeri.ad+(aktifSirket?' · '+aktifSirket.ad:'');}
  if(aktifKullanici.rol==='admin'){
    document.getElementById('nav-kullanicilar').style.display='';
    document.getElementById('nav-isyerleri')?.style && (document.getElementById('nav-isyerleri').style.display='');
    ['btn-yeni-stok-grup','btn-yeni-stok','btn-yeni-urun-grup','btn-yeni-ara-urun','btn-yeni-urun'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});
  }else{
    // Yetki bazlı nav butonlarını göster/gizle
    const yetkiler=aktifKullanici.yetkiler||{};
    const navMap={
      'islem':'gp(\'islem\')', 'islem-liste':'gp(\'islem-liste\')',
      'stok':'gp(\'stok\')', 'urunler':'gp(\'urunler\')',
      'hizmetler':'gp(\'hizmetler\')', 'kasalar':'gp(\'kasalar\')',
      'cari':'gp(\'cari\')', 'birimler':'gp(\'birimler\')',
      'merkezler':'gp(\'merkezler\')', 'receteler':'gp(\'receteler\')', 'rapor':'gp(\'rapor\')'
    };
    const isyeriRoller=(aktifKullanici.isyeri_yetkiler||[]).map(y=>y.rol);
    if(isyeriRoller.includes('admin')||isyeriRoller.includes('yonetici')){
      document.getElementById('nav-isyerleri')?.style && (document.getElementById('nav-isyerleri').style.display='');
    }
    document.querySelectorAll('.nav button,.nav-grup-icerik button').forEach(btn=>{
      const oc=btn.getAttribute('onclick')||'';
      for(const [alan,gpc] of Object.entries(navMap)){
        if(oc.includes(gpc)){
          btn.style.display=yetkiler[alan]?'':'none';
          break;
        }
      }
    });
    // Tanımlar grubunu — içinde hiç yetkili alan yoksa gizle
    document.querySelectorAll('.nav-grup').forEach(grup=>{
      const gorunenBtnSayisi=grup.querySelectorAll('.nav-grup-icerik button:not([style*="none"])').length;
      const baslik=grup.querySelector('.nav-grup-baslik');
      if(baslik)baslik.style.display=gorunenBtnSayisi>0?'':'none';
    });
  }
  baslat();
}

async function baslat(){
  document.getElementById('sync').textContent='⟳';document.getElementById('sync').className='sync load';
  // İşyeri bazlı filtre — admin ise tüm işyerlerini çek, değilse sadece aktif işyerini
  const isyFil=q=>aktifKullanici?.rol==='admin'?q:q.or(`isyeri_id.eq.${aktifIsyeri?.id},isyeri_id.is.null`);
  const [b,s,u,ub,k,il,mz,gk,ilog,ks]=await Promise.all([
    sb.from('birimler').select('*'),
    isyFil(sb.from('stoklar').select('*')).order('kod'),
    isyFil(sb.from('urunler').select('*')).order('kod'),
    sb.from('urun_bilesenleri').select('*'),
    sb.from('kullanicilar').select('*'),
    sb.from('islem_loglari').select('*').order('tarih',{ascending:false}),
    isyFil(sb.from('merkezler').select('*')).order('kod'),
    isyFil(sb.from('gider_kalemleri').select('*')).order('kod'),
    sb.from('islem_loglari').select('*').order('tarih',{ascending:false}),
    isyFil(sb.from('kasalar').select('*')).order('kod')
  ]);
  if(b.data)birimler=b.data;if(s.data)stoklar=s.data;if(u.data)urunler=u.data;
  if(ub.data)urunBilesenleri=ub.data;if(k.data)kullanicilar=k.data;if(il.data)islemLoglari=il.data;
  if(mz.data)merkezler=mz.data;if(gk.data)giderKalemleri=gk.data;if(ilog.data)islemLoglari=ilog.data;
  if(ks.data)kasalar_list=ks.data;
  const islemQ=aktifKullanici?.rol==='admin'
    ?sb.from('islemler').select('*').order('ts',{ascending:false})
    :sb.from('islemler').select('*').eq('isyeri_id',aktifIsyeri?.id).order('ts',{ascending:false});
  const {data:iData}=await islemQ;
  if(iData)islemler=iData.filter(i=>!i.silindi);
  document.getElementById('sync').textContent='● Canlı';document.getElementById('sync').className='sync ok';
  const stokK=sb.channel('stoklar-ch').on('postgres_changes',{event:'*',schema:'public',table:'stoklar'},async()=>{
    const {data}=await sb.from('stoklar').select('*').order('kod');if(data){stoklar=data;renderStoklar();kontolUyari();}
  }).subscribe();
  const urunK=sb.channel('urunler-ch').on('postgres_changes',{event:'*',schema:'public',table:'urunler'},async()=>{
    const {data}=await sb.from('urunler').select('*').order('kod');if(data){urunler=data;renderUrunler();}
  }).subscribe();
  const islemK=sb.channel('islemler-ch').on('postgres_changes',{event:'*',schema:'public',table:'islemler'},async()=>{
    const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});
    if(data){islemler=data.filter(i=>!i.silindi);renderPanel();kontolUyari();}
  }).subscribe();
  realtimeKanallar=[stokK,urunK,islemK];
  doldurBirimSecleri();doldurStokFil();doldurUrunFil();doldurIslemSecleri();doldurMerkezSecleri();
  await cariYukle();
  renderPanel();renderStoklar();renderUrunler();renderBirimler();renderMerkezler();renderGiderKalemTree();renderKullanicilar();if(typeof renderIsyerleri==='function')renderIsyerleri();kontolUyari();
  // Satır listelerini cari yüklendikten sonra yenile
  if(hmSatirListesi.length)hmSatirRender();
  if(stSatirListesi.length)stSatirRender();
  ['hm-tarih','ur-tarih','st-tarih'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=bugun();});
  if(hmSatirListesi.length===0)setTimeout(()=>hmSatirEkle(),200);
  if(stSatirListesi.length===0)setTimeout(()=>stSatirEkle(),250);
  if(gdSatirListesi.length===0)setTimeout(()=>gdSatirEkle(),300);
}

function doldurBirimSecleri(){
  const temel=birimler.filter(b=>b.temel!==false&&b.temel!=='false');
  ['sm-birim','um-birim'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const c=el.value;el.innerHTML='<option value="">Seçin...</option>'+temel.map(b=>`<option value="${b.id}">${b.ad} (${b.kisaltma})</option>`).join('');if(c)el.value=c;});
  const abEl=document.getElementById('ab-temel');if(abEl){const c=abEl.value;abEl.innerHTML='<option value="">Seçin...</option>'+temel.map(b=>`<option value="${b.id}">${b.ad}</option>`).join('');if(c)abEl.value=c;}
}
function doldurStokFil(){
  const el=document.getElementById('stok-fil');if(!el)return;
  const gruplar=stoklar.filter(s=>s.tip==='grup');
  let fo='<option value="">Tüm stoklar</option>';
  gruplar.forEach(g=>{fo+=`<option value="${g.id}">${'—'.repeat((g.seviye||1)-1)} ${g.ikon||''} ${g.ad}</option>`;});
  el.innerHTML=fo;
}
function doldurUrunFil(){
  const el=document.getElementById('urun-fil');if(!el)return;
  const gruplar=urunler.filter(u=>u.tip==='grup');
  let fo='<option value="">Tüm ürünler</option>';
  gruplar.forEach(g=>{fo+=`<option value="${g.id}">${'—'.repeat((g.seviye||1)-1)} ${g.ikon||''} ${g.ad}</option>`;});
  el.innerHTML=fo;
}
function doldurIslemSecleri(){
  const urEl=document.getElementById('ur-urun');
  if(urEl){const c=urEl.value;urEl.innerHTML='<option value="">Seçin...</option>'+urunler.filter(u=>u.tip==='urun'||u.tip==='ara_urun').map(u=>`<option value="${u.id}">[${u.kod}] ${u.ad} ${u.tip==='ara_urun'?'(Ara Ürün)':''}</option>`).join('');if(c)urEl.value=c;}
  if(hmSatirListesi.length)hmSatirRender();
  if(stSatirListesi.length)stSatirRender();
}

// Temel birim seçilince alt birimlerini de içeren varsayılan birim listesini doldurur
window._doldurVarsayilanBirim=function(elId,temelBirimId,seciliId){
  const el=document.getElementById(elId);if(!el)return;
  const list=temelBirimId?birimler.filter(b=>b.id===temelBirimId||b.temel_id===temelBirimId):birimler;
  el.innerHTML='<option value="">— Temel birim —</option>'+list.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.ad} (${b.kisaltma})</option>`).join('');
  if(seciliId)el.value=seciliId;
};
function doldurMerkezSecleri(){  // Stok modalı masraf merkezi
  const smEl=document.getElementById('sm-merkez');
  if(smEl){const c=smEl.value;smEl.innerHTML='<option value="">—</option>'+merkezler.filter(m=>m.tip==='masraf'&&m.aktif!==false).map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');if(c)smEl.value=c;}
  // Ürün modalı gelir merkezi
  const umEl=document.getElementById('um-merkez');
  if(umEl){const c=umEl.value;umEl.innerHTML='<option value="">—</option>'+merkezler.filter(m=>m.tip==='gelir'&&m.aktif!==false).map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');if(c)umEl.value=c;}
  // Gider kalemi modalı masraf merkezi
  const gkEl=document.getElementById('gk-merkez');
  if(gkEl){const c=gkEl.value;gkEl.innerHTML='<option value="">—</option>'+merkezler.filter(m=>m.tip==='masraf'&&m.aktif!==false).map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');if(c)gkEl.value=c;}
}
window.navToggle=function(){
  const nav=document.getElementById('ana-nav');
  const overlay=document.getElementById('nav-overlay');
  nav.classList.toggle('nav-acik');
  overlay.classList.toggle('acik');
};
window.navKapat=function(){
  document.getElementById('ana-nav')?.classList.remove('nav-acik');
  document.getElementById('nav-overlay')?.classList.remove('acik');
};
window.navGrupToggle=function(btn){
  const icerik=btn.nextElementSibling;
  const acik=icerik.classList.toggle('acik');
  btn.classList.toggle('acik',acik);
};
window.gp=function(id){
  navKapat();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const navBtn=document.querySelector(`.nav button[onclick="gp('${id}')"]`);
  if(navBtn){
    navBtn.classList.add('active');
    const icerik=navBtn.closest('.nav-grup-icerik');
    if(icerik){icerik.classList.add('acik');icerik.previousElementSibling?.classList.add('acik');}
  }
  if(id==='panel')renderPanel();if(id==='stok')renderStoklar();if(id==='urunler')renderUrunler();
  if(id==='receteler')renderReceteler();
  if(id==='kasalar')renderKasalar();
  if(id==='merkezler')renderMerkezler();
  if(id==='hizmetler')renderGiderKalemTree();
  if(id==='cari')renderCari();if(id==='islem-liste')renderIslemListe();
  if(id==='rapor')renderRapor();if(id==='kullanicilar')renderKullanicilar();if(id==='isyerleri'&&typeof renderIsyerleri==='function')renderIsyerleri();
  if(id==='islem'){
    if(hmSatirListesi.length===0)setTimeout(()=>hmSatirEkle(),100);
    if(stSatirListesi.length===0)setTimeout(()=>stSatirEkle(),150);
    setTimeout(()=>{if(typeof ksTurDegis==='function')ksTurDegis();const ksT=document.getElementById('ks-tarih');if(ksT&&!ksT.value)ksT.value=bugun();},200);
  }
};
window.islemTab=function(id,btn){document.querySelectorAll('#islem .tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('#islem .tab-panel').forEach(p=>p.classList.remove('active'));document.getElementById('tp-'+id)?.classList.add('active');btn.classList.add('active');};
window.tanimTab=function(id,btn){document.querySelectorAll('#tanimlar .tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('#tanimlar .tab-panel').forEach(p=>p.classList.remove('active'));document.getElementById('tt-'+id)?.classList.add('active');btn.classList.add('active');};
