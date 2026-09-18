// ===== SAYIM RAPORU =====
// Her hammadde için ne kadarının doğrudan sayıldığını, ne kadarının hangi
// YM/Ürün'den (dolaylı) geldiğini gösterir. Tarih aralığı ve depo ile
// filtrelenebilir. Seçilen tarih aralığındaki TÜM sayım fişlerini (kaç ayrı
// fiş olursa olsun) birleştirip tek kümülatif tablo halinde sunar.
let _syrSonListe=[];
function doldurSayimRaporDepoSecimi(){
  const el=document.getElementById('syr-depo');if(!el)return;
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  const c=el.value;
  el.innerHTML='<option value="">Tüm depolar</option>'+kapsam.map(d=>`<option value="${d.id}">${d.ad}${d.kod?' ['+d.kod+']':''}</option>`).join('');
  if(c)el.value=c;
}
window.renderSayimRaporu=function(){
  const el=document.getElementById('syr-tb');if(!el)return;
  const bas=document.getElementById('syr-bas')?.value||'';
  const bit=document.getElementById('syr-bit')?.value||'';
  const depoId=document.getElementById('syr-depo')?.value||'';
  let kayitlar=islemler.filter(i=>i.tur==='sayim'&&i.stok_id);
  if(bas)kayitlar=kayitlar.filter(i=>i.tarih>=bas);
  if(bit)kayitlar=kayitlar.filter(i=>i.tarih<=bit);
  if(depoId)kayitlar=kayitlar.filter(i=>i.depo_id===depoId);

  const gruplanmis={}; // stok_id -> {direkt, kaynaklar:{urun_id:{ad,miktar}}}
  kayitlar.forEach(i=>{
    if(!gruplanmis[i.stok_id])gruplanmis[i.stok_id]={direkt:0,kaynaklar:{}};
    const g=gruplanmis[i.stok_id];
    if(i.urun_id){
      if(!g.kaynaklar[i.urun_id])g.kaynaklar[i.urun_id]={ad:urunler.find(u=>u.id===i.urun_id)?.ad||'Bilinmeyen',miktar:0};
      g.kaynaklar[i.urun_id].miktar+=parseFloat(i.miktar)||0;
    }else{
      g.direkt+=parseFloat(i.miktar)||0;
    }
  });

  const stokIdler=Object.keys(gruplanmis);
  _syrSonListe=[];
  if(!stokIdler.length){el.innerHTML='<tr><td colspan="5" class="bos">Bu filtrelerle sayım kaydı bulunamadı.</td></tr>';return;}

  const rows=stokIdler.map(stokId=>{
    const g=gruplanmis[stokId];
    const stok=stoklar.find(s=>s.id===stokId);
    const tb=birimler.find(b=>b.id===stok?.birim_id);
    const kisaltma=tb?.kisaltma||'';
    const kaynakDizisi=Object.values(g.kaynaklar);
    const ymToplam=kaynakDizisi.reduce((t,k)=>t+k.miktar,0);
    const genel=g.direkt+ymToplam;
    const detay=kaynakDizisi.map(k=>`${k.ad}: ${k.miktar.toLocaleString('tr-TR',{maximumFractionDigits:3})} ${kisaltma}`).join(' · ');
    _syrSonListe.push({ad:stok?stok.ad:'(silinmiş stok)',kod:stok?.kod||'',birim:kisaltma,direkt:g.direkt,ymToplam,genel,detay});
    return `<tr>
      <td>${stok?stok.ad:'(silinmiş stok)'} <span style="font-size:10px;color:var(--yazi3)">[${stok?.kod||''}]</span></td>
      <td style="text-align:right">${g.direkt.toLocaleString('tr-TR',{maximumFractionDigits:3})} ${kisaltma}</td>
      <td style="text-align:right">${ymToplam>0?ymToplam.toLocaleString('tr-TR',{maximumFractionDigits:3})+' '+kisaltma:'—'}</td>
      <td style="text-align:right;font-weight:600">${genel.toLocaleString('tr-TR',{maximumFractionDigits:3})} ${kisaltma}</td>
      <td style="font-size:10px;color:var(--yazi3)">${detay||'—'}</td>
    </tr>`;
  }).join('');
  el.innerHTML=rows;
};
window.sayimRaporExcelIndir=function(){
  if(!_syrSonListe.length){bil('İndirilecek veri yok','err');return;}
  const data=_syrSonListe.map(r=>({
    'Hammadde':r.ad,'Kod':r.kod,'Birim':r.birim,
    'Direkt Sayım':+r.direkt.toFixed(3),"YM/Ürün'den":+r.ymToplam.toFixed(3),
    'Genel Toplam':+r.genel.toFixed(3),'Kaynak Dökümü':r.detay
  }));
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Sayım Raporu');
  const bas=document.getElementById('syr-bas')?.value||'';
  const bit=document.getElementById('syr-bit')?.value||'';
  XLSX.writeFile(wb,`sayim_raporu${bas?'_'+bas:''}${bit?'_'+bit:''}.xlsx`);
};

// ===== REÇETELERDE KULLANIM RAPORU =====
// Bir stok (hammadde) seçildiğinde, o stoğun DOĞRUDAN bileşeni olduğu tüm
// Yarı Mamul / Ürün reçetelerini, tanımlı miktarlarıyla listeler.
let _rkSeciliStokId='';
let _rkSonListe=[];
function doldurReceteKullanimDatalist(){
  const dl=document.getElementById('rk-stok-datalist');if(!dl)return;
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  dl.innerHTML=kapsam.map(s=>`<option value="[${s.kod}] ${s.ad}">`).join('');
}
window.receteKullanimAramaInput=function(val){
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok');
  const eslesen=kapsam.find(s=>`[${s.kod}] ${s.ad}`===val);
  if(!eslesen)return;
  _rkSeciliStokId=eslesen.id;
  renderReceteKullanim();
};
window.renderReceteKullanim=function(){
  const el=document.getElementById('rk-tb');if(!el)return;
  if(!_rkSeciliStokId){el.innerHTML='<tr><td colspan="5" class="bos">← Yukarıdan bir stok seçin</td></tr>';_rkSonListe=[];return;}
  const kayitlar=urunBilesenleri.filter(b=>b.kaynak_tip==='stok'&&b.kaynak_id===_rkSeciliStokId);
  if(!kayitlar.length){el.innerHTML='<tr><td colspan="5" class="bos">Bu stok hiçbir reçetede doğrudan bileşen olarak kullanılmıyor.</td></tr>';_rkSonListe=[];return;}
  _rkSonListe=[];
  const rows=kayitlar.map(b=>{
    const urun=urunler.find(u=>u.id===b.urun_id);
    const grup3=urun?urunler.find(g=>g.id===urun.ust_id):null;
    const grup2=grup3?urunler.find(g=>g.id===grup3.ust_id):null;
    const grupAdi=urun?.agac_tip==='ara_urun'?(grup3?.ad||''):[grup2?.ad,grup3?.ad].filter(Boolean).join(' / ');
    const birim=birimler.find(bi=>bi.id===b.birim_id);
    const tipAd=urun?.tip==='ara_urun'?'Yarı Mamul':'Ürün';
    _rkSonListe.push({ad:urun?.ad||'(silinmiş)',tip:tipAd,grup:grupAdi,miktar:parseFloat(b.miktar)||0,birim:birim?.kisaltma||''});
    return `<tr>
      <td style="font-weight:500">${urun?.ad||'(silinmiş)'} <span style="font-size:10px;color:var(--yazi3)">[${urun?.kod||''}]</span></td>
      <td><span class="badge ${tipAd==='Yarı Mamul'?'m':'u'}">${tipAd}</span></td>
      <td style="font-size:11px;color:var(--yazi3)">${grupAdi}</td>
      <td style="text-align:right">${(parseFloat(b.miktar)||0).toLocaleString('tr-TR',{maximumFractionDigits:3})}</td>
      <td>${birim?.kisaltma||''}</td>
    </tr>`;
  }).join('');
  el.innerHTML=rows;
};
window.receteKullanimExcelIndir=function(){
  if(!_rkSonListe.length){bil('İndirilecek veri yok — önce bir stok seçin','err');return;}
  const stok=stoklar.find(s=>s.id===_rkSeciliStokId);
  const data=_rkSonListe.map(r=>({'Ürün/YM Adı':r.ad,'Tip':r.tip,'Grup':r.grup,'Bileşen Miktarı':+r.miktar.toFixed(3),'Bileşen Birimi':r.birim}));
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Kullanım Raporu');
  XLSX.writeFile(wb,`recete_kullanim_${(stok?.ad||'stok').replace(/\s+/g,'_')}.xlsx`);
};
