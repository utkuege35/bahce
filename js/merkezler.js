// ===== MERKEZLER =====
window.kaydetMerkez=async function(){
  const ad=document.getElementById('mz-ad').value.trim();
  const kod=document.getElementById('mz-kod').value.trim().toUpperCase();
  const tip=document.getElementById('mz-tip').value;
  if(!ad||!kod){bil('Ad ve kod zorunlu!','err');return;}
  const dupKod=merkezler.find(m=>m.kod===kod);if(dupKod){bil(`"${kod}" kodu zaten var!`,'err');return;}
  const dupAd=merkezler.find(m=>m.ad.toLowerCase()===ad.toLowerCase());if(dupAd){bil(`"${ad}" adında merkez zaten var!`,'err');return;}
  await sb.from('merkezler').insert({id:uid(),kod,ad,tip,aktif:true});
  const {data}=await sb.from('merkezler').select('*').order('kod');if(data)merkezler=data;
  document.getElementById('mz-ad').value='';document.getElementById('mz-kod').value='';
  renderMerkezler();hmSatirRender();stSatirRender();gdSatirRender();bil('Merkez eklendi ✓');
};
window.merkezSil=async function(id){
  if(islemler.some(i=>i.merkez_id===id)){bil('Bu merkeze bağlı işlem var, silinemez!','err');return;}
  if(!confirm('Silmek istiyor musunuz?'))return;
  await sb.from('merkezler').delete().eq('id',id);
  const {data}=await sb.from('merkezler').select('*').order('kod');if(data)merkezler=data;
  renderMerkezler();bil('Silindi ✓');
};
window.merkezPasif=async function(id){
  const m=merkezler.find(x=>x.id===id);if(!m)return;
  await sb.from('merkezler').update({aktif:!m.aktif}).eq('id',id);
  const {data}=await sb.from('merkezler').select('*').order('kod');if(data)merkezler=data;
  renderMerkezler();bil((m.aktif?'Pasife alındı':'Aktife alındı')+' ✓');
};
function renderMerkezler(){
  const el=document.getElementById('merkez-liste');if(!el)return;
  if(!merkezler.length){el.innerHTML='<div class="bos">Henüz merkez yok.</div>';return;}
  const gelir=merkezler.filter(m=>m.tip==='gelir');
  const masraf=merkezler.filter(m=>m.tip==='masraf');
  function satir(m){
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid var(--krem2);${m.aktif===false?'opacity:0.5':''}">
      <span style="font-size:12px"><span class="tree-kod">${m.kod}</span> <strong>${m.ad}</strong>${m.aktif===false?' <span style="font-size:10px;color:var(--turuncu)">[PASİF]</span>':''}</span>
      <div style="display:flex;gap:6px">
        <button class="btn sm" onclick="merkezPasif('${m.id}')">${m.aktif===false?'Aktif Et':'Pasif'}</button>
        <button class="btn sm ghost" onclick="merkezSil('${m.id}')">Sil</button>
      </div>
    </div>`;
  }
  el.innerHTML=
    (gelir.length?`<div style="font-size:11px;font-weight:600;color:var(--yesil);padding:8px 10px 4px;text-transform:uppercase;letter-spacing:.05em">GELİR MERKEZLERİ</div>${gelir.map(satir).join('')}`:'')
    +(masraf.length?`<div style="font-size:11px;font-weight:600;color:var(--turuncu);padding:8px 10px 4px;text-transform:uppercase;letter-spacing:.05em">MASRAF MERKEZLERİ</div>${masraf.map(satir).join('')}`:'');
}
