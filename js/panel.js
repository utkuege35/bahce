// ===== PANEL =====
function renderPanel(){
  const gun=bugun();const gv=islemler.filter(i=>i.tarih===gun);
  const gelirB=gv.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const giderB=gv.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const ay=gun.substring(0,7);const av=islemler.filter(i=>i.tarih?.startsWith(ay));
  const gelirA=av.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const giderA=av.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  document.getElementById('panel-met').innerHTML=`<div class="met"><div class="ml">Bugün gelir</div><div class="mv g">${para(gelirB)}</div></div><div class="met"><div class="ml">Bugün gider</div><div class="mv d">${para(giderB)}</div></div><div class="met"><div class="ml">Bu ay gelir</div><div class="mv g">${para(gelirA)}</div></div><div class="met"><div class="ml">Bu ay net</div><div class="mv ${gelirA-giderA>=0?'k':'z'}">${para(gelirA-giderA)}</div></div>`;
  const stokAdMap={};stoklar.forEach(s=>{stokAdMap[s.id]=s.ad;});const urunAdMap={};urunler.forEach(u=>{urunAdMap[u.id]=u.ad;});
  const rows=islemler.slice(0,20).map(i=>`<tr><td>${i.tarih||''}</td><td><span class="badge ${i.tur==='satis'?'g':['gider','giris'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${{satis:'Satış',gider:'Gider',giris:'Giriş',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat'}[i.tur]||i.tur}</span></td><td style="font-size:11px">${i.aciklama||i.kat||''}</td><td style="font-weight:500;color:${i.tur==='satis'?'var(--yesil)':['gider','giris'].includes(i.tur)?'var(--turuncu)':'var(--yazi2)'}">${i.tutar?para(i.tutar):''}</td><td style="font-size:11px;color:var(--yazi3)">${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+birimAd(i.birim_id):''}</td></tr>`).join('');
  document.getElementById('son-tb').innerHTML=rows||'<tr><td colspan="5" class="bos">Henüz işlem yok</td></tr>';
}

// ===== İŞLEM DÜZENLE / SİL =====
window.islemDuzenleAc=function(id){
  const i=islemler.find(x=>x.id===id);if(!i)return;
  document.getElementById('id-islem-id').value=id;
  const turAd={giris:'Hammadde Girişi',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',gider:'Gider'}[i.tur]||i.tur;
  document.getElementById('id-bilgi').textContent=`${turAd} — ${i.tarih} — ${i.aciklama||''}`;
  document.getElementById('id-tarih').value=i.tarih||'';
  document.getElementById('id-miktar').value=i.miktar||'';
  document.getElementById('id-fiyat').value=i.fiyat||'';
  document.getElementById('id-tutar').value=i.tutar||'';
  document.getElementById('id-satir-not').value=i.satir_not||'';
  document.getElementById('id-not').value=i.aciklama_not||'';
  const loglar=islemLoglari.filter(l=>l.islem_id===id);
  if(loglar.length){
    document.getElementById('id-log-wrap').style.display='block';
    document.getElementById('id-log-liste').innerHTML=loglar.map(l=>{
      const eski=l.eski_deger||{};const yeni=l.yeni_deger||{};
      const degisikler=Object.keys(yeni).filter(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k])).map(k=>`${k}: ${eski[k]||'—'} → ${yeni[k]}`).join(', ');
      return `<div style="padding:4px 0;border-bottom:1px solid var(--krem2)">${new Date(l.tarih).toLocaleString('tr-TR')} — <strong>${l.degistiren||'?'}</strong> — ${degisikler||'değişiklik'}</div>`;
    }).join('');
  }else document.getElementById('id-log-wrap').style.display='none';
  modalAc('modal-islem-duzenle');
};
window.islemKaydet=async function(){
  const id=document.getElementById('id-islem-id').value;
  const islem=islemler.find(x=>x.id===id);if(!islem)return;
  const yeni={
    tarih:document.getElementById('id-tarih').value,
    miktar:parseFloat(document.getElementById('id-miktar').value)||null,
    fiyat:parseFloat(document.getElementById('id-fiyat').value)||null,
    tutar:parseFloat(document.getElementById('id-tutar').value)||null,
    satir_not:document.getElementById('id-satir-not').value||null,
    aciklama_not:document.getElementById('id-not').value||null
  };
  const eski={tarih:islem.tarih,miktar:islem.miktar,fiyat:islem.fiyat,tutar:islem.tutar,satir_not:islem.satir_not,aciklama_not:islem.aciklama_not};
  await sb.from('islem_loglari').insert({islem_id:id,degistiren:aktifKullanici?.ad||'',eski_deger:eski,yeni_deger:yeni});
  await sb.from('islemler').update(yeni).eq('id',id);
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});
  if(data)islemler=data.filter(i=>!i.silindi);
  const {data:ilog}=await sb.from('islem_loglari').select('*').order('tarih',{ascending:false});if(ilog)islemLoglari=ilog;
  modalKapat('modal-islem-duzenle');renderPanel();kontolUyari();bil('İşlem güncellendi ✓');
};
window.islemSil=async function(id){
  if(!confirm('Bu işlemi silmek istiyor musunuz?\n(Veritabanında kalır, ekranda görünmez.)'))return;
  await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',id);
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});
  if(data)islemler=data.filter(i=>!i.silindi);
  renderPanel();kontolUyari();
  // Eğer stok detay açıksa yenile
  if(document.getElementById('modal-stok-detay').classList.contains('open')){
    const title=document.getElementById('sd-title').textContent;const kod=title.match(/\[([^\]]+)\]/)?.[1];
    const s=stoklar.find(x=>x.kod===kod);if(s)stokDetay(s.id);
  }
  if(document.getElementById('modal-panel-islemler').classList.contains('open'))renderPanelIslemler();
  bil('İşlem silindi ✓');
};
window.renderPanelIslemler=function(){
  const isAdmin=aktifKullanici?.rol==='admin';
  document.getElementById('pi-islem-th').style.display=isAdmin?'':'none';
  const tur=document.getElementById('pi-fil-tur')?.value||'';
  const bas=document.getElementById('pi-fil-bas')?.value||'';
  const bit=document.getElementById('pi-fil-bit')?.value||'';
  let liste=islemler;
  if(tur)liste=liste.filter(i=>i.tur===tur);
  if(bas)liste=liste.filter(i=>i.tarih>=bas);
  if(bit)liste=liste.filter(i=>i.tarih<=bit);
  const rows=liste.map(i=>`<tr>
    <td style="white-space:nowrap">${i.tarih||''}</td>
    <td><span class="badge ${i.tur==='satis'?'g':['gider','giris'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${{satis:'Satış',gider:'Gider',giris:'Giriş',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat'}[i.tur]||i.tur}</span></td>
    <td style="font-size:11px">${i.aciklama||i.kat||''}</td>
    <td style="font-size:11px">${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+birimAd(i.birim_id):''}</td>
    <td style="font-weight:500;color:${i.tur==='satis'?'var(--yesil)':['gider','giris'].includes(i.tur)?'var(--turuncu)':'var(--yazi2)'}">${i.tutar?para(i.tutar):''}</td>
    <td style="font-size:11px;color:var(--yazi3);max-width:150px;overflow:hidden;text-overflow:ellipsis">${i.satir_not||i.aciklama_not||''}</td>
    ${isAdmin?`<td style="white-space:nowrap"><button class="btn sm" onclick="islemDuzenleAc('${i.id}')">✏</button> <button class="btn sm ghost" onclick="islemSil('${i.id}')">✕</button></td>`:'<td></td>'}
  </tr>`).join('');
  document.getElementById('pi-tb').innerHTML=rows||'<tr><td colspan="7" class="bos">İşlem yok</td></tr>';
};
