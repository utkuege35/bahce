// ===== DEPOLAR =====
// Sayım ve stok hareketleri depo bazlı yapılır. Her işyerinde TEK bir "Ana Depo" olabilir
// (alış belgeleri stoğu önce Ana Depo'ya alır, diğer depolara Ana Depo Çıkış fişiyle dağıtılır).
// Aynı işyerindeki mevcut ana depo işaretini kaldırır (yeni bir depo ana depo yapılırken).
async function _anaDepoIsaretiniKaldir(haricId){
  let q=sb.from('depolar').update({ana_depo:false}).eq('ana_depo',true);
  q=aktifIsyeri?.id?q.eq('isyeri_id',aktifIsyeri.id):q.is('isyeri_id',null);
  if(haricId)q=q.neq('id',haricId);
  const {error}=await q;
  return error;
}
function _mevcutAnaDepo(haricId){
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  return kapsam.find(d=>d.ana_depo&&d.id!==haricId)||null;
}
async function _depolariYenile(){
  const {data}=await sb.from('depolar').select('*').order('ad');if(data)depolar=data;
}
window.kaydetDepo=async function(){
  const ad=document.getElementById('dp-ad').value.trim();
  const kod=document.getElementById('dp-kod').value.trim();
  if(!ad){bil('Depo adı zorunlu!','err');return;}
  const dup=depolar.find(d=>d.ad.trim().toLowerCase()===ad.toLowerCase()&&(d.isyeri_id||null)===(aktifIsyeri?.id||null));
  if(dup){bil(`"${ad}" adında zaten bir depo var!`,'err');return;}
  const {error}=await sb.from('depolar').insert({ad,kod:kod||null,isyeri_id:aktifIsyeri?.id||null,aktif:true,ana_depo:false});
  if(error){bil('Kaydedilemedi: '+error.message,'err');return;}
  await _depolariYenile();
  document.getElementById('dp-ad').value='';document.getElementById('dp-kod').value='';
  renderDepolar();if(typeof doldurDepoSecleri==='function')doldurDepoSecleri();
  bil('Depo eklendi ✓');
};
window.depoDuzenleAc=function(id){
  const d=depolar.find(x=>x.id===id);if(!d)return;
  document.getElementById('dpd-id').value=d.id;
  document.getElementById('dpd-ad').value=d.ad;
  document.getElementById('dpd-kod').value=d.kod||'';
  document.getElementById('dpd-aktif').checked=d.aktif!==false;
  const anaEl=document.getElementById('dpd-ana');
  if(anaEl){
    anaEl.checked=!!d.ana_depo;
    // Mevcut ana depodan işaret doğrudan kaldırılamaz; başka bir depoyu ana depo yapmak gerekir.
    anaEl.disabled=!!d.ana_depo;
    anaEl.title=d.ana_depo?'Ana depoyu değiştirmek için başka bir depoyu "Ana Depo" olarak işaretleyin':'';
  }
  modalAc('modal-depo-duzenle');
};
window.depoKaydetDuzenle=async function(){
  const id=document.getElementById('dpd-id').value;
  const ad=document.getElementById('dpd-ad').value.trim();
  const kod=document.getElementById('dpd-kod').value.trim();
  const aktif=document.getElementById('dpd-aktif').checked;
  const ana=document.getElementById('dpd-ana')?.checked||false;
  const eski=depolar.find(x=>x.id===id);
  if(!ad){bil('Depo adı zorunlu!','err');return;}
  if(eski?.ana_depo&&!aktif){bil('Ana depo pasife alınamaz. Önce başka bir depoyu ana depo yapın.','err');return;}
  if(ana&&!eski?.ana_depo){
    if(!aktif){bil('Pasif bir depo ana depo olamaz.','err');return;}
    const mevcut=_mevcutAnaDepo(id);
    if(mevcut&&!(await onay(`Mevcut ana depo "${mevcut.ad}" yerine bu depo ana depo olsun mu?`,'🏬')))return;
    const hata=await _anaDepoIsaretiniKaldir(id);
    if(hata){bil('Ana depo güncellenemedi: '+hata.message,'err');return;}
  }
  const {error}=await sb.from('depolar').update({ad,kod:kod||null,aktif,ana_depo:ana}).eq('id',id);
  if(error){bil('Kaydedilemedi: '+error.message,'err');return;}
  await _depolariYenile();
  modalKapat('modal-depo-duzenle');renderDepolar();if(typeof doldurDepoSecleri==='function')doldurDepoSecleri();
  bil('Depo güncellendi ✓');
};
window.depoSil=async function(id){
  const d=depolar.find(x=>x.id===id);
  if(d?.ana_depo){bil('Ana depo silinemez. Önce başka bir depoyu ana depo yapın.','err');return;}
  const kullanimda=islemler.some(i=>i.depo_id===id||i.hedef_depo_id===id);
  if(kullanimda){
    if(await onay('Bu depoda hareket/sayım kayıtları var, silinemez.<br><small>Tamam\'a basarsan pasife alınır.</small>','⚠️'))
      await sb.from('depolar').update({aktif:false}).eq('id',id);
    else return;
  }else{
    if(!(await onay('Kalıcı olarak silmek istiyor musunuz?','🗑️')))return;
    await sb.from('depolar').delete().eq('id',id);
  }
  await _depolariYenile();
  renderDepolar();if(typeof doldurDepoSecleri==='function')doldurDepoSecleri();
  bil(kullanimda?'Pasife alındı ✓':'Silindi ✓');
};
function renderDepolar(){
  const el=document.getElementById('depo-liste');if(!el)return;
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  const isAdmin=aktifKullanici?.rol==='admin';
  const uyari=kapsam.length&&!kapsam.some(d=>d.ana_depo)
    ?'<div style="padding:8px 12px;font-size:12px;background:var(--turuncu-cok-ac);color:var(--turuncu);border-radius:8px;margin-bottom:8px">⚠ Ana depo işaretli değil. Alış irsaliyesi/faturası stok girişi yapabilmek için bir depoyu "Ana Depo" olarak işaretleyin.</div>':'';
  el.innerHTML=uyari+(kapsam.map(d=>{
    const pasif=d.aktif===false;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--krem2);${pasif?'opacity:0.5':''}">
      <span style="font-size:16px">🏬</span>
      <span style="flex:1;font-size:13px">${d.ad}${d.kod?` <span style="color:var(--yazi3);font-size:11px">[${d.kod}]</span>`:''}${d.ana_depo?' <span style="font-size:10px;font-weight:600;color:var(--yesil);background:var(--yesil-cok-ac);padding:1px 7px;border-radius:10px">ANA DEPO</span>':''}${pasif?' <span style="font-size:10px;color:var(--turuncu)">[PASİF]</span>':''}</span>
      ${isAdmin?`<button class="btn sm" onclick="depoDuzenleAc('${d.id}')">✏</button><button class="btn sm ghost" onclick="depoSil('${d.id}')">✕</button>`:''}
    </div>`;
  }).join('')||'<div class="bos">Henüz depo tanımlanmadı.</div>');
}
