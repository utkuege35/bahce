// ===== UYGULAMA =====
function uygulamaAc(){
  document.getElementById('giris-wrap').style.display='none';document.getElementById('uygulama').style.display='block';
  document.getElementById('kullanici-chip').textContent=(aktifKullanici.ad||'')+' '+(aktifKullanici.soyad||'');
  if(aktifKullanici.rol==='admin'){
    ['nav-kullanicilar','nav-tanimlar','nav-cari'].forEach(id=>document.getElementById(id).style.display='');
    ['btn-yeni-stok-grup','btn-yeni-stok','btn-yeni-urun-grup','btn-yeni-ara-urun','btn-yeni-urun'].forEach(id=>document.getElementById(id).style.display='');
  }
  baslat();
}

async function baslat(){
  document.getElementById('sync').textContent='⟳';document.getElementById('sync').className='sync load';
  const [b,s,u,ub,k,il,mz,gk,ilog]=await Promise.all([
    sb.from('birimler').select('*'),
    sb.from('stoklar').select('*').order('kod'),
    sb.from('urunler').select('*').order('kod'),
    sb.from('urun_bilesenleri').select('*'),
    sb.from('kullanicilar').select('*'),
    sb.from('isim_loglari').select('*').order('tarih',{ascending:false}),
    sb.from('merkezler').select('*').order('kod'),
    sb.from('gider_kalemleri').select('*').order('kod'),
    sb.from('islem_loglari').select('*').order('tarih',{ascending:false})
  ]);
  if(b.data)birimler=b.data;if(s.data)stoklar=s.data;if(u.data)urunler=u.data;
  if(ub.data)urunBilesenleri=ub.data;if(k.data)kullanicilar=k.data;if(il.data)isimLoglari=il.data;
  if(mz.data)merkezler=mz.data;if(gk.data)giderKalemleri=gk.data;if(ilog.data)islemLoglari=ilog.data;
  const {data:iData}=await sb.from('islemler').select('*').order('ts',{ascending:false});
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
  renderPanel();renderStoklar();renderUrunler();renderBirimler();renderMerkezler();renderGiderKalemTree();renderKullanicilar();kontolUyari();
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

function doldurMerkezSecleri(){
  // Stok modalı masraf merkezi
  const smEl=document.getElementById('sm-merkez');
  if(smEl){const c=smEl.value;smEl.innerHTML='<option value="">—</option>'+merkezler.filter(m=>m.tip==='masraf'&&m.aktif!==false).map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');if(c)smEl.value=c;}
  // Ürün modalı gelir merkezi
  const umEl=document.getElementById('um-merkez');
  if(umEl){const c=umEl.value;umEl.innerHTML='<option value="">—</option>'+merkezler.filter(m=>m.tip==='gelir'&&m.aktif!==false).map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');if(c)umEl.value=c;}
  // Gider kalemi modalı masraf merkezi
  const gkEl=document.getElementById('gk-merkez');
  if(gkEl){const c=gkEl.value;gkEl.innerHTML='<option value="">—</option>'+merkezler.filter(m=>m.tip==='masraf'&&m.aktif!==false).map(m=>`<option value="${m.id}">${m.ad}</option>`).join('');if(c)gkEl.value=c;}
}
window.gp=function(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  document.querySelector(`.nav button[onclick="gp('${id}')"]`)?.classList.add('active');
  if(id==='panel')renderPanel();if(id==='stok')renderStoklar();if(id==='urunler')renderUrunler();
  if(id==='cari'){renderCari();}
  if(id==='rapor')renderRapor();if(id==='tanimlar'){renderBirimler();renderMerkezler();renderGiderKalemTree();}if(id==='kullanicilar')renderKullanicilar();
  if(id==='islem'){
    if(hmSatirListesi.length===0)setTimeout(()=>hmSatirEkle(),100);
    if(stSatirListesi.length===0)setTimeout(()=>stSatirEkle(),150);
    // Kasa tür init
    setTimeout(()=>{ksTurDegis&&ksTurDegis();const ksT=document.getElementById('ks-tarih');if(ksT&&!ksT.value)ksT.value=bugun();},200);
  }
};
window.islemTab=function(id,btn){document.querySelectorAll('#islem .tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('#islem .tab-panel').forEach(p=>p.classList.remove('active'));document.getElementById('tp-'+id)?.classList.add('active');btn.classList.add('active');};
window.tanimTab=function(id,btn){document.querySelectorAll('#tanimlar .tab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('#tanimlar .tab-panel').forEach(p=>p.classList.remove('active'));document.getElementById('tt-'+id)?.classList.add('active');btn.classList.add('active');};
