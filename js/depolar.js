// ===== DEPOLAR =====
// Sayım işlemleri depo bazlı yapılır. Basit, hiyerarşisiz bir liste — merkezler
// ekranıyla aynı desende.
window.kaydetDepo=async function(){
  const ad=document.getElementById('dp-ad').value.trim();
  const kod=document.getElementById('dp-kod').value.trim();
  if(!ad){bil('Depo adı zorunlu!','err');return;}
  const dup=depolar.find(d=>d.ad.trim().toLowerCase()===ad.toLowerCase()&&(d.isyeri_id||null)===(aktifIsyeri?.id||null));
  if(dup){bil(`"${ad}" adında zaten bir depo var!`,'err');return;}
  await sb.from('depolar').insert({ad,kod:kod||null,isyeri_id:aktifIsyeri?.id||null,aktif:true});
  const {data}=await sb.from('depolar').select('*').order('ad');if(data)depolar=data;
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
  modalAc('modal-depo-duzenle');
};
window.depoKaydetDuzenle=async function(){
  const id=document.getElementById('dpd-id').value;
  const ad=document.getElementById('dpd-ad').value.trim();
  const kod=document.getElementById('dpd-kod').value.trim();
  const aktif=document.getElementById('dpd-aktif').checked;
  if(!ad){bil('Depo adı zorunlu!','err');return;}
  await sb.from('depolar').update({ad,kod:kod||null,aktif}).eq('id',id);
  const {data}=await sb.from('depolar').select('*').order('ad');if(data)depolar=data;
  modalKapat('modal-depo-duzenle');renderDepolar();if(typeof doldurDepoSecleri==='function')doldurDepoSecleri();
  bil('Depo güncellendi ✓');
};
window.depoSil=async function(id){
  const kullanimda=islemler.some(i=>i.depo_id===id);
  if(kullanimda){
    if(await onay('Bu depoda sayım kayıtları var, silinemez.<br><small>Tamam\'a basarsan pasife alınır.</small>','⚠️'))
      await sb.from('depolar').update({aktif:false}).eq('id',id);
    else return;
  }else{
    if(!(await onay('Kalıcı olarak silmek istiyor musunuz?','🗑️')))return;
    await sb.from('depolar').delete().eq('id',id);
  }
  const {data}=await sb.from('depolar').select('*').order('ad');if(data)depolar=data;
  renderDepolar();if(typeof doldurDepoSecleri==='function')doldurDepoSecleri();
  bil(kullanimda?'Pasife alındı ✓':'Silindi ✓');
};
function renderDepolar(){
  const el=document.getElementById('depo-liste');if(!el)return;
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  const isAdmin=aktifKullanici?.rol==='admin';
  el.innerHTML=kapsam.map(d=>{
    const pasif=d.aktif===false;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--krem2);${pasif?'opacity:0.5':''}">
      <span style="font-size:16px">🏬</span>
      <span style="flex:1;font-size:13px">${d.ad}${d.kod?` <span style="color:var(--yazi3);font-size:11px">[${d.kod}]</span>`:''}${pasif?' <span style="font-size:10px;color:var(--turuncu)">[PASİF]</span>':''}</span>
      ${isAdmin?`<button class="btn sm" onclick="depoDuzenleAc('${d.id}')">✏</button><button class="btn sm ghost" onclick="depoSil('${d.id}')">✕</button>`:''}
    </div>`;
  }).join('')||'<div class="bos">Henüz depo tanımlanmadı.</div>';
}
