// ===== BİRİMLER =====
window.kaydetTemelBirim=async function(){
  const ad=document.getElementById('tb-ad').value.trim();const kis=document.getElementById('tb-kisaltma').value.trim();const tur=document.getElementById('tb-tur').value;
  if(!ad||!kis){bil('Ad ve kısaltma zorunlu!','err');return;}
  await sb.from('birimler').insert({id:uid(),ad,kisaltma:kis,tur,temel:true});
  const {data}=await sb.from('birimler').select('*');if(data)birimler=data;
  document.getElementById('tb-ad').value='';document.getElementById('tb-kisaltma').value='';renderBirimler();doldurBirimSecleri();bil('Birim eklendi ✓');
};
window.kaydetAltBirim=async function(){
  const ad=document.getElementById('ab-ad').value.trim();const tId=document.getElementById('ab-temel').value;const carpan=parseFloat(document.getElementById('ab-carpan').value);const kis=document.getElementById('ab-kisaltma').value.trim();
  if(!ad||!tId||isNaN(carpan)||carpan<=0){bil('Eksik bilgi!','err');return;}
  const temel=birimler.find(x=>x.id===tId);
  await sb.from('birimler').insert({id:uid(),ad,kisaltma:kis||ad,tur:temel?.tur||'adet',temel:false,temel_id:tId,carpan});
  const {data}=await sb.from('birimler').select('*');if(data)birimler=data;
  document.getElementById('ab-ad').value='';document.getElementById('ab-kisaltma').value='';document.getElementById('ab-carpan').value='';
  renderBirimler();doldurBirimSecleri();bil('Alt birim eklendi ✓');
};
window.birimDuzenleAc=function(id){
  const b=birimler.find(x=>x.id===id);if(!b)return;
  document.getElementById('bd-id').value=id;
  document.getElementById('bd-title').textContent=b.temel?'Temel Birimi Düzenle':'Alt Birimi Düzenle';
  document.getElementById('bd-ad').value=b.ad;
  document.getElementById('bd-kisaltma').value=b.kisaltma;
  const carpanWrap=document.getElementById('bd-carpan-wrap');
  if(!b.temel){carpanWrap.style.display='';document.getElementById('bd-carpan').value=b.carpan||1;}
  else carpanWrap.style.display='none';
  modalAc('modal-birim-duzenle');
};
window.birimKaydet=async function(){
  const id=document.getElementById('bd-id').value;
  const ad=document.getElementById('bd-ad').value.trim();
  const kis=document.getElementById('bd-kisaltma').value.trim();
  if(!ad||!kis){bil('Ad ve kısaltma zorunlu!','err');return;}
  const b=birimler.find(x=>x.id===id);
  const upd={ad,kisaltma:kis};
  if(!b.temel)upd.carpan=parseFloat(document.getElementById('bd-carpan').value)||1;
  await sb.from('birimler').update(upd).eq('id',id);
  const {data}=await sb.from('birimler').select('*');if(data)birimler=data;
  modalKapat('modal-birim-duzenle');renderBirimler();doldurBirimSecleri();
  hmSatirRender();stSatirRender();gdSatirRender();bil('Birim güncellendi ✓');
};
window.birimSil=async function(id){
  const hv=islemler.some(i=>i.birim_id===id);
  if(hv){bil('Bu birimle işlem var, silinemez!','err');return;}
  const stokBagli=stoklar.some(s=>s.birim_id===id)||urunler.some(u=>u.birim_id===id);
  if(stokBagli){bil('Stok veya ürüne bağlı birim silinemez!','err');return;}
  const altBagli=birimler.some(b=>b.temel_id===id);
  if(altBagli){bil('Alt birimi olan temel birim silinemez!','err');return;}
  if(!(await onay('Silmek istiyor musunuz?','🗑️')))return;
  await sb.from('birimler').delete().eq('id',id);
  const {data}=await sb.from('birimler').select('*');if(data)birimler=data;renderBirimler();doldurBirimSecleri();
};
function renderBirimler(){
  const temel=birimler.filter(b=>b.temel!==false&&b.temel!=='false');const alt=birimler.filter(b=>b.temel===false||b.temel==='false');
  let html='';
  temel.forEach(t=>{const altlar=alt.filter(a=>a.temel_id===t.id);
    html+=`<div style="margin-bottom:.6rem">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--krem2);border-radius:6px;font-size:12px;font-weight:500">
        <span>${t.ad} <span style="color:var(--yazi3)">(${t.kisaltma})</span></span>
        <div style="display:flex;gap:4px">
          <button class="btn sm" onclick="birimDuzenleAc('${t.id}')">✏</button>
          <button class="btn ghost sm" onclick="birimSil('${t.id}')">Sil</button>
        </div>
      </div>
      ${altlar.map(a=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 10px 5px 22px;font-size:11px;color:var(--yazi2);border-bottom:1px solid var(--krem2)">
        <span>↳ ${a.ad} <span style="color:var(--yazi3)">(${a.kisaltma})</span> = ${a.carpan} ${t.kisaltma}</span>
        <div style="display:flex;gap:4px">
          <button class="btn sm" onclick="birimDuzenleAc('${a.id}')">✏</button>
          <button class="btn ghost sm" onclick="birimSil('${a.id}')">Sil</button>
        </div>
      </div>`).join('')}
    </div>`;
  });
  document.getElementById('birim-liste').innerHTML=html||'<div class="bos">Henüz birim yok</div>';
}
