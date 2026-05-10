// ===== GİDER KALEMLERİ =====
function kodOlusturGiderKalem(ustId){
  if(!ustId){
    const analar=giderKalemleri.filter(g=>g.seviye===1).map(g=>parseInt(g.kod)).filter(n=>!isNaN(n));
    const m=analar.length?Math.max(...analar):0;
    return 'G'+String(Math.ceil((m+1)/10)*10);
  }
  const ust=giderKalemleri.find(g=>g.id===ustId);if(!ust)return '';
  const altlar=giderKalemleri.filter(g=>g.ust_id===ustId).map(g=>parseInt(g.kod.replace(/\D/g,''))).filter(n=>!isNaN(n));
  if(!altlar.length)return ust.kod+'01';
  return ust.kod+String(Math.max(...altlar.map(n=>n%100))+1).padStart(2,'0');
}
window.giderKalemModalAc=function(ustId,tip){
  document.getElementById('gk-id').value='';document.getElementById('gk-tip-h').value=tip;
  document.getElementById('gk-ad').value='';document.getElementById('gk-ikon').value='';
  document.getElementById('gk-kod').value=kodOlusturGiderKalem(ustId);
  document.getElementById('gk-merkez-fg').style.display=tip==='kalem'?'':'none';
  document.getElementById('gk-birim-fg').style.display=tip==='kalem'?'':'none';
  document.getElementById('gk-merkez').value='';
  document.getElementById('gk-varsayilan-birim').value='';
  const tipAd=tip==='grup'?'Grup':'Gider Kalemi';
  document.getElementById('gk-title').textContent=ustId?`Alt ${tipAd} Ekle`:`Yeni ${tipAd}`;
  if(ustId){const ust=giderKalemleri.find(g=>g.id===ustId);document.getElementById('gk-ust-bilgi').textContent=`Üst: ${ust?.ikon||''} ${ust?.ad||''} [${ust?.kod||''}]`;}
  else document.getElementById('gk-ust-bilgi').textContent=tip==='grup'?'Ana gider grubu':'Grupsuz kalem';
  doldurMerkezSecleri();modalAc('modal-gider-kalem');
};
window.giderKalemDuzenle=function(id){
  const g=giderKalemleri.find(x=>x.id===id);if(!g)return;
  document.getElementById('gk-id').value=g.id;document.getElementById('gk-tip-h').value=g.tip;
  document.getElementById('gk-title').textContent=g.tip==='grup'?'Grubu Düzenle':'Kalemi Düzenle';
  document.getElementById('gk-ad').value=g.ad;document.getElementById('gk-kod').value=g.kod;
  document.getElementById('gk-ikon').value=g.ikon||'';document.getElementById('gk-renk').value=g.renk||'turuncu';
  document.getElementById('gk-merkez-fg').style.display=g.tip==='kalem'?'':'none';
  document.getElementById('gk-birim-fg').style.display=g.tip==='kalem'?'':'none';
  doldurMerkezSecleri();
  // Varsayılan birim listesini doldur
  const vbEl=document.getElementById('gk-varsayilan-birim');
  if(vbEl){vbEl.innerHTML='<option value="">— Seçin —</option>'+birimler.map(b=>`<option value="${b.id}"${b.id===g.varsayilan_birim_id?' selected':''}>${b.ad} (${b.kisaltma})</option>`).join('');}
  setTimeout(()=>document.getElementById('gk-merkez').value=g.merkez_id||'',100);
  const ust=giderKalemleri.find(x=>x.id===g.ust_id);
  document.getElementById('gk-ust-bilgi').textContent=ust?`Üst: ${ust.ikon||''} ${ust.ad} [${ust.kod}]`:(g.tip==='grup'?'Ana gider grubu':'Grupsuz');
  modalAc('modal-gider-kalem');
};
window.kaydetGiderKalem=async function(){
  const id=document.getElementById('gk-id').value||uid();
  const tip=document.getElementById('gk-tip-h').value;
  const ad=document.getElementById('gk-ad').value.trim();
  const kod=document.getElementById('gk-kod').value;
  if(!ad){bil('Ad zorunlu!','err');return;}
  const dupAd=giderKalemleri.find(x=>x.id!==id&&x.ad.toLowerCase()===ad.toLowerCase());
  if(dupAd){bil(`"${ad}" adında kalem zaten var!`,'err');return;}
  const dupKod=giderKalemleri.find(x=>x.id!==id&&x.kod===kod);
  if(dupKod){bil(`"${kod}" kodu zaten kullanımda!`,'err');return;}
  const mevcut=giderKalemleri.find(x=>x.id===id);
  const data={id,ad,tip,kod,ikon:document.getElementById('gk-ikon').value.trim()||'💸',renk:document.getElementById('gk-renk').value};
  if(tip==='kalem'){
    data.merkez_id=document.getElementById('gk-merkez').value||null;
    data.varsayilan_birim_id=document.getElementById('gk-varsayilan-birim').value||null;
  }
  if(!mevcut){
    const ustBilgi=document.getElementById('gk-ust-bilgi').textContent;
    const ustKod=ustBilgi.match(/\[([^\]]+)\]/)?.[1];
    const ust=ustKod?giderKalemleri.find(g=>g.kod===ustKod):null;
    data.ust_id=ust?.id||null;data.seviye=ust?(ust.seviye||1)+1:1;data.aktif=true;
  }
  if(mevcut)await sb.from('gider_kalemleri').update(data).eq('id',id);
  else await sb.from('gider_kalemleri').insert(data);
  const {data:gk}=await sb.from('gider_kalemleri').select('*').order('kod');if(gk)giderKalemleri=gk;
  modalKapat('modal-gider-kalem');renderGiderKalemTree();bil('Kaydedildi ✓');
};
window.giderKalemSil=async function(id){
  if(islemler.some(i=>i.gider_kalem_id===id)){bil('Hareketi olan kalem silinemez!','err');return;}
  if(tumAltlar(giderKalemleri,id).length){bil('Alt kayıtları silin!','err');return;}
  if(!confirm('Silmek istiyor musunuz?'))return;
  await sb.from('gider_kalemleri').delete().eq('id',id);
  const {data}=await sb.from('gider_kalemleri').select('*').order('kod');if(data)giderKalemleri=data;
  renderGiderKalemTree();bil('Silindi ✓');
};
function renderGiderKalemTree(){
  const el=document.getElementById('gider-kalem-tree');if(!el)return;
  function renderRow(g,depth){
    const renk=renkMap[g.renk]||'var(--turuncu)';
    const isGrup=g.tip==='grup';
    const merkezAd=!isGrup&&g.merkez_id?merkezler.find(m=>m.id===g.merkez_id)?.ad:'';
    return `<div class="tree-row${isGrup?' is-grup':''}" style="padding-left:${10+depth*18}px;border-left:${isGrup?'4':'3'}px solid ${renk}">
      <span style="font-size:${isGrup?15:13}px">${g.ikon||'💸'}</span>
      <span style="flex:1;font-size:${isGrup?13:12}px">${g.ad}</span>
      <span class="tree-kod">${g.kod}</span>
      ${merkezAd?`<span style="font-size:10px;color:var(--turuncu);background:var(--turuncu-cok-ac);padding:1px 6px;border-radius:10px">${merkezAd}</span>`:''}
      <span class="tip-chip ${isGrup?'tip-grup':'tip-stok'}" style="${isGrup?'':'background:var(--turuncu-cok-ac);color:var(--turuncu)'}">${isGrup?'GRUP':'KAL.'}</span>
      <div class="tree-actions">
        ${isGrup?`<button class="btn sm" onclick="event.stopPropagation();giderKalemModalAc('${g.id}','grup')">+G</button><button class="btn sm pri" onclick="event.stopPropagation();giderKalemModalAc('${g.id}','kalem')">+K</button>`:''}
        <button class="btn sm" onclick="event.stopPropagation();giderKalemDuzenle('${g.id}')">✏</button>
        <button class="btn sm ghost" onclick="event.stopPropagation();giderKalemSil('${g.id}')">✕</button>
      </div>
    </div>`;
  }
  function renderTree(ustId,depth){return giderKalemleri.filter(g=>g.ust_id===ustId).map(g=>renderRow(g,depth)+renderTree(g.id,depth+1)).join('');}
  const html=giderKalemleri.filter(g=>!g.ust_id).map(g=>renderRow(g,0)+renderTree(g.id,1)).join('');
  el.innerHTML=html||'<div class="bos">Henüz kalem yok. "Grup" veya "Kalem" ekleyin.</div>';
}
