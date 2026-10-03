// ===== KDV TANIMLARI =====
let kdvOranlari=[];
let _kdvDuzenlenenId=null;

window.renderKdvTanimlari=function(){
  const el=document.getElementById('kdv-tb');if(!el)return;
  const liste=[...kdvOranlari].sort((a,b)=>(a.sira||0)-(b.sira||0));
  if(!liste.length){el.innerHTML='<tr><td colspan="4" class="bos">Henüz KDV tanımı yok.</td></tr>';return;}
  el.innerHTML=liste.map(k=>`<tr>
    <td>${k.ad}</td>
    <td style="text-align:right">%${parseFloat(k.oran).toLocaleString('tr-TR',{maximumFractionDigits:2})}</td>
    <td>${k.aktif!==false?'<span style="color:var(--yesil)">Aktif</span>':'<span style="color:var(--yazi3)">Pasif</span>'}</td>
    <td style="text-align:right">
      <button class="btn sm" onclick="kdvDuzenleAc('${k.id}')">✏</button>
      <button class="btn sm ghost" onclick="kdvSil('${k.id}')">✕</button>
    </td>
  </tr>`).join('');
};

window.kdvYeniAc=function(){
  _kdvDuzenlenenId=null;
  document.getElementById('kdv-form-baslik').textContent='Yeni KDV Tanımı';
  document.getElementById('kdv-ad').value='';
  document.getElementById('kdv-oran').value='';
  document.getElementById('kdv-aktif').checked=true;
  document.getElementById('kdv-form-card').style.display='';
};
window.kdvDuzenleAc=function(id){
  const k=kdvOranlari.find(x=>x.id===id);if(!k)return;
  _kdvDuzenlenenId=id;
  document.getElementById('kdv-form-baslik').textContent='KDV Tanımını Düzenle';
  document.getElementById('kdv-ad').value=k.ad||'';
  document.getElementById('kdv-oran').value=k.oran||'';
  document.getElementById('kdv-aktif').checked=k.aktif!==false;
  document.getElementById('kdv-form-card').style.display='';
};
window.kdvFormKapat=function(){
  document.getElementById('kdv-form-card').style.display='none';
};
window.kdvKaydet=async function(){
  const ad=document.getElementById('kdv-ad').value.trim();
  const oran=parseFloat(document.getElementById('kdv-oran').value);
  const aktif=document.getElementById('kdv-aktif').checked;
  if(!ad){bil('Ad zorunlu!','err');return;}
  if(!(oran>=0)){bil('Geçerli bir oran girin!','err');return;}
  if(_kdvDuzenlenenId){
    await sb.from('kdv_oranlari').update({ad,oran,aktif}).eq('id',_kdvDuzenlenenId);
  }else{
    const sira=kdvOranlari.length?Math.max(...kdvOranlari.map(k=>k.sira||0))+1:1;
    await sb.from('kdv_oranlari').insert({ad,oran,aktif,sira});
  }
  const {data}=await sb.from('kdv_oranlari').select('*').order('sira');
  if(data)kdvOranlari=data;
  renderKdvTanimlari();
  kdvFormKapat();
  bil('KDV tanımı kaydedildi ✓');
};
window.kdvSil=async function(id){
  if(!(await onay('Bu KDV tanımını silmek istiyor musunuz?<br><small>Bu orana sahip stok kartları etkilenmez, sadece yeni seçimde görünmez olur.</small>','🗑️')))return;
  await sb.from('kdv_oranlari').delete().eq('id',id);
  kdvOranlari=kdvOranlari.filter(k=>k.id!==id);
  renderKdvTanimlari();
  bil('KDV tanımı silindi ✓');
};

// ===== STOK İÇİN ETKİN KDV ORANINI BULMA =====
// Stoğun kendi kdv_orani_id'si varsa onu kullanır; yoksa ağaçta yukarı
// doğru (ust_id) giderek en yakın grubun kdv_orani_id'sini bulur.
window.stokKdvOraniId=function(stokId){
  let guvenlik=0;
  let s=stoklar.find(x=>x.id===stokId);
  while(s&&guvenlik<20){
    if(s.kdv_orani_id)return s.kdv_orani_id;
    if(!s.ust_id)return null;
    s=stoklar.find(x=>x.id===s.ust_id);
    guvenlik++;
  }
  return null;
};
window.kdvOraniDegeri=function(kdvOraniId){
  const k=kdvOranlari.find(x=>x.id===kdvOraniId);
  return k?parseFloat(k.oran)||0:0;
};

// ===== STOK KARTI MODALI — KDV ALANI =====
window.doldurKdvOranSecenekleri=function(selectId,seciliId){
  const el=document.getElementById(selectId);if(!el)return;
  el.innerHTML='<option value="">— Seçilmedi —</option>'+kdvOranlari.filter(k=>k.aktif!==false).map(k=>`<option value="${k.id}"${k.id===seciliId?' selected':''}>%${k.oran}</option>`).join('');
};
// Stok/grup kartının kendi KDV alanı boşsa, üst gruptan hangi oranın
// devralınacağını küçük bir ipucu olarak gösterir.
window.stokKdvBilgiGuncelle=function(){
  const sel=document.getElementById('sm-kdv-orani');
  const bilgiEl=document.getElementById('sm-kdv-bilgi');
  if(!sel||!bilgiEl)return;
  if(sel.value){bilgiEl.textContent='';return;}
  const ustBilgi=document.getElementById('sm-ust-bilgi')?.textContent||'';
  const ustKod=ustBilgi.match(/\[([^\]]+)\]/)?.[1];
  const ust=ustKod?stoklar.find(s=>s.kod===ustKod):null;
  const devralinanId=ust?stokKdvOraniId(ust.id):null;
  const k=devralinanId?kdvOranlari.find(x=>x.id===devralinanId):null;
  bilgiEl.textContent=k?`Üstten devralınacak: %${k.oran}`:'';
};
