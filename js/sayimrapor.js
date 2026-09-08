// ===== SAYIM RAPORU =====
// Her hammadde için ne kadarının doğrudan sayıldığını, ne kadarının hangi
// YM/Ürün'den (dolaylı) geldiğini gösterir. Tarih aralığı ve depo ile
// filtrelenebilir.
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
