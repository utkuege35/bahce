// ===== STOK MİKTAR =====
function stokMiktar(stokId){
  let m=0;const s=stoklar.find(x=>x.id===stokId);if(s)m+=parseFloat(s.baslangic||0);
  islemler.forEach(i=>{if(i.stok_id===stokId){const c=birimTemelCarp(i.birim_id);const mik=parseFloat(i.miktar||0)*c;if(i.tur==='giris')m+=mik;else if(['cikis','satis','uretim_sarfiyat','satis_sarfiyat'].includes(i.tur))m-=mik;}});
  return m;
}
function urunStok(urunId){
  const u=urunler.find(x=>x.id===urunId);return parseFloat(u?.stok||0);
}

// ===== STOK TREE =====
// ===== STOK EXCEL TOPLU YÜKLEME =====
// Excel formatı: Ana Grup | Alt Grup 1 | Alt Grup 2 | Stok Adı | Birim | Başlangıç Stok | Min Stok | Maliyet | Açıklama
// Aynı isimli gruplar tekrar oluşturulmaz — bulunup altına eklenir. Kodlar
// (10, 10.10, 10.10.10, 10.10.10.001...) otomatik ve hiyerarşiye uygun üretilir.
function stokGrupBulVeyaOlustur(ad,ustId,isyeriId,hedefListe){
  ad=(ad||'').trim();if(!ad)return null;
  const mevcut=stoklar.find(s=>s.tip==='grup'&&(s.ust_id||null)===(ustId||null)&&(s.isyeri_id||null)===(isyeriId||null)&&s.ad.trim().toLowerCase()===ad.toLowerCase());
  if(mevcut)return mevcut;
  const ust=ustId?stoklar.find(s=>s.id===ustId):null;
  const kod=kodOlusturStok(ustId,'grup');
  const yeni={id:uid(),ad,tip:'grup',kod,ust_id:ustId||null,seviye:ust?(ust.seviye||1)+1:1,isyeri_id:isyeriId,aktif:true};
  stoklar.push(yeni);
  hedefListe.push(yeni);
  return yeni;
}
window.stokExcelSecildi=async function(input){
  const file=input.files[0];if(!file)return;
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
  const isyeriId=aktifIsyeri?.id||null;
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
    const seviye1Yeni=[],seviye2Yeni=[],seviye3Yeni=[],stokYeni=[];
    const hatali=[];
    for(const row of rows){
      if(!row||!row.length)continue;
      const anaGrup=(row[0]===undefined||row[0]===null)?'':String(row[0]).trim();
      if(!anaGrup||anaGrup.toLowerCase()==='ana grup')continue; // boş veya başlık satırı
      const altGrup1=(row[1]===undefined||row[1]===null)?'':String(row[1]).trim();
      const altGrup2=(row[2]===undefined||row[2]===null)?'':String(row[2]).trim();
      const stokAdi=(row[3]===undefined||row[3]===null)?'':String(row[3]).trim();
      const birimKisa=(row[4]===undefined||row[4]===null)?'':String(row[4]).trim().toLowerCase();
      if(!altGrup1||!altGrup2||!stokAdi||!birimKisa){hatali.push(`${stokAdi||anaGrup} (Ana Grup/Alt Grup 1/Alt Grup 2/Stok Adı/Birim zorunlu)`);continue;}
      const birim=birimler.find(b=>b.temel!==false&&(b.kisaltma||'').toLowerCase()===birimKisa);
      if(!birim){hatali.push(`${stokAdi} (birim "${birimKisa}" bulunamadı — temel birim olmalı: kg, lt, adet vb.)`);continue;}
      const ana=stokGrupBulVeyaOlustur(anaGrup,null,isyeriId,seviye1Yeni);
      const alt1=stokGrupBulVeyaOlustur(altGrup1,ana.id,isyeriId,seviye2Yeni);
      const alt2=stokGrupBulVeyaOlustur(altGrup2,alt1.id,isyeriId,seviye3Yeni);
      if((alt2.seviye||1)!==3){hatali.push(`${stokAdi} (grup zinciri hatalı)`);continue;}
      const dupAd=stoklar.find(s=>(s.isyeri_id||null)===isyeriId&&s.ad.trim().toLowerCase()===stokAdi.toLowerCase());
      if(dupAd){hatali.push(`${stokAdi} (bu isimde zaten bir kayıt var)`);continue;}
      const kod=kodOlusturStok(alt2.id,'stok');
      const yeniStok={id:uid(),ad:stokAdi,kod,tip:'stok',ust_id:alt2.id,seviye:4,isyeri_id:isyeriId,birim_id:birim.id,baslangic:0,min_stok:0,maliyet:0,aciklama:null,aktif:true};
      stoklar.push(yeniStok);
      stokYeni.push(yeniStok);
    }
    // Seviye seviye ekle — üst gruplar veritabanına önce yazılmalı (foreign key)
    if(seviye1Yeni.length)await sb.from('stoklar').insert(seviye1Yeni);
    if(seviye2Yeni.length)await sb.from('stoklar').insert(seviye2Yeni);
    if(seviye3Yeni.length)await sb.from('stoklar').insert(seviye3Yeni);
    if(stokYeni.length)await sb.from('stoklar').insert(stokYeni);
    const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
    renderStoklar();doldurStokFil();kontolUyari();
    const grupSayisi=seviye1Yeni.length+seviye2Yeni.length+seviye3Yeni.length;
    if(hatali.length)bil(`${stokYeni.length} stok kartı (+${grupSayisi} yeni grup) eklendi. ${hatali.length} satır atlandı: ${hatali.slice(0,4).join(', ')}${hatali.length>4?'...':''}`,'uyari');
    else if(stokYeni.length)bil(`${stokYeni.length} stok kartı, ${grupSayisi} yeni grupla birlikte eklendi ✓`);
    else bil('Excel dosyasında geçerli satır bulunamadı.','err');
  }catch(e){
    bil('Excel okunamadı: '+e.message,'err');
  }
  input.value='';
};

window.stokModalAc=function(ustId,tip){
  // Seviyelendirme kuralı: en fazla 3 grup seviyesi, stok kartları
  // SADECE 3. seviye bir grubun altına eklenebilir.
  if(tip==='grup'&&ustId){
    const ust=stoklar.find(s=>s.id===ustId);
    if(ust&&(ust.seviye||1)>=3){bil('En fazla 3 seviye grup açılabilir!','err');return;}
  }
  if(tip==='stok'){
    const ust=ustId?stoklar.find(s=>s.id===ustId):null;
    if(!ust||(ust.seviye||0)!==3){bil('Stok kartı sadece 3. seviye bir grubun altına eklenebilir!','err');return;}
  }
  document.getElementById('sm-id').value='';
  document.getElementById('sm-tip-h').value=tip;
  document.getElementById('sm-ad').value='';

  document.getElementById('sm-kod').value=kodOlusturStok(ustId,tip);
  document.getElementById('sm-log').style.display='none';
  document.getElementById('sm-aktif-satir').style.display='none';
  document.getElementById('sm-baslangic').value=0;
  document.getElementById('sm-min').value=0;
  document.getElementById('sm-maliyet').value=0;
  document.getElementById('sm-aciklama').value='';
  document.getElementById('sm-merkez').value='';
  document.getElementById('sm-varsayilan-birim').value='';
  if(tip==='grup'){
    document.getElementById('sm-title').textContent=ustId?'Alt Grup Ekle':'Ana Grup Ekle';
    document.getElementById('sm-stok-alanlar').style.display='none';
    document.getElementById('sm-birim-fg').style.display='none';
    if(ustId){const ust=stoklar.find(s=>s.id===ustId);document.getElementById('sm-ust-bilgi').textContent=`Üst: ${ust?.ikon||''} ${ust?.ad||''} [${ust?.kod||''}]`;}
    else document.getElementById('sm-ust-bilgi').textContent='Ana stok grubu';
  }else{
    document.getElementById('sm-title').textContent='Yeni Stok Kartı';
    document.getElementById('sm-stok-alanlar').style.display='';
    document.getElementById('sm-birim-fg').style.display='';
    document.getElementById('sm-ust-bilgi').textContent=ustId?(()=>{const ust=stoklar.find(s=>s.id===ustId);return `Grup: ${ust?.ikon||''} ${ust?.ad||''} [${ust?.kod||''}]`;})():'Grup seçilmedi';
  }
  document.getElementById('sm-kod').disabled=false;
  doldurBirimSecleri();doldurMerkezSecleri();
  modalAc('modal-stok');
};
window.stokGoruntule=function(id){stokDuzenle(id,'goruntule');};
window.stokDuzenle=function(id,mod='duzenle'){
  const s=stoklar.find(x=>x.id===id);if(!s)return;
  const hv=islemler.some(i=>i.stok_id===id);
  document.getElementById('sm-id').value=s.id;document.getElementById('sm-tip-h').value=s.tip;
  document.getElementById('sm-title').textContent=s.tip==='grup'?'Grubu Düzenle':'Stok Kartını Düzenle';
  document.getElementById('sm-ad').value=s.ad;document.getElementById('sm-kod').value=s.kod;

  document.getElementById('sm-kod').disabled=hv;
  if(s.tip==='grup'){
    document.getElementById('sm-stok-alanlar').style.display='none';document.getElementById('sm-birim-fg').style.display='none';
    document.getElementById('sm-aktif-satir').style.display='none';
  }else{
    document.getElementById('sm-stok-alanlar').style.display='';document.getElementById('sm-birim-fg').style.display='';
    document.getElementById('sm-baslangic').value=s.baslangic||0;document.getElementById('sm-min').value=s.min_stok||0;
    document.getElementById('sm-maliyet').value=s.maliyet||0;document.getElementById('sm-aciklama').value=s.aciklama||'';
    document.getElementById('sm-aktif-satir').style.display='';
    document.getElementById('sm-aktif').checked=s.aktif!==false;
    doldurBirimSecleri();doldurMerkezSecleri();
    setTimeout(()=>{
      document.getElementById('sm-birim').value=s.birim_id||'';
      document.getElementById('sm-merkez').value=s.merkez_id||'';
      // Varsayılan birim select'i temel birime göre doldur
      _doldurVarsayilanBirim('sm-varsayilan-birim',s.birim_id,s.varsayilan_birim_id);
    },100);
  }
  const ust=stoklar.find(x=>x.id===s.ust_id);
  document.getElementById('sm-ust-bilgi').textContent=ust?`Üst: ${ust.ikon||''} ${ust.ad} [${ust.kod}]`:'Ana grup';
  const loglar=isimLoglari.filter(l=>l.tablo==='stoklar'&&l.kayit_id===id);
  if(loglar.length){document.getElementById('sm-log').style.display='block';document.getElementById('sm-log-liste').innerHTML=loglar.map(l=>`<div class="log-item"><span class="log-eski">${l.eski_ad}</span> → <span class="log-yeni">${l.yeni_ad}</span><span style="color:var(--yazi3);font-size:10px;float:right">${new Date(l.tarih).toLocaleDateString('tr-TR')} — ${l.degistiren||'?'}</span></div>`).join('');}
  else document.getElementById('sm-log').style.display='none';
  modalAc('modal-stok');setTimeout(()=>modalMod('modal-stok',mod),50);
};
window.kaydetStok=async function(){
  const id=document.getElementById('sm-id').value||uid();
  const tip=document.getElementById('sm-tip-h').value;
  const ad=document.getElementById('sm-ad').value.trim();
  const kod=document.getElementById('sm-kod').value;
  if(!ad){bil('Ad zorunlu!','err');return;}
  if(!kod){bil('Kod oluşturulamadı, üst grup seçin','err');return;}
  const mevcut=stoklar.find(x=>x.id===id);
  const isyeriId=mevcut?mevcut.isyeri_id:(aktifIsyeri?.id||null);
  // Mükerrer kontrol — sadece AYNI işyeri kapsamında
  const kapsam=stoklar.filter(x=>(x.isyeri_id||null)===(isyeriId||null));
  const dupAd=kapsam.find(x=>x.id!==id&&x.ad.trim().toLowerCase()===ad.toLowerCase());
  if(dupAd){bil(`"${ad}" adında zaten bir stok/grup var! [${dupAd.kod}]`,'err');return;}
  const dupKod=kapsam.find(x=>x.id!==id&&x.kod===kod);
  if(dupKod){bil(`"${kod}" kodu zaten kullanımda! [${dupKod.ad}]`,'err');return;}
  const hv=mevcut&&islemler.some(i=>i.stok_id===id);
  if(mevcut&&mevcut.ad!==ad)await sb.from('isim_loglari').insert({tablo:'stoklar',kayit_id:id,eski_ad:mevcut.ad,yeni_ad:ad,degistiren:aktifKullanici?.ad||''});
  const data={id,ad,tip};
  if(!hv)data.kod=kod;
  if(tip==='stok'){
    const bId=document.getElementById('sm-birim').value||null;
    if(!bId){bil('Birim zorunlu!','err');return;}
    data.birim_id=bId;
    data.varsayilan_birim_id=document.getElementById('sm-varsayilan-birim').value||null;
    data.baslangic=parseFloat(document.getElementById('sm-baslangic').value)||0;
    data.min_stok=parseFloat(document.getElementById('sm-min').value)||0;
    data.maliyet=parseFloat(document.getElementById('sm-maliyet').value)||0;
    data.aciklama=document.getElementById('sm-aciklama').value;
    data.merkez_id=document.getElementById('sm-merkez').value||null;
    data.aktif=document.getElementById('sm-aktif').checked;
  }
  if(!mevcut){
    const ustBilgi=document.getElementById('sm-ust-bilgi').textContent;
    const ustKod=ustBilgi.match(/\[([^\]]+)\]/)?.[1];
    const ust=ustKod?stoklar.find(s=>s.kod===ustKod&&(s.isyeri_id||null)===(aktifIsyeri?.id||null)):null;
    data.ust_id=ust?.id||null;
    data.seviye=ust?(ust.seviye||1)+1:1;
    data.isyeri_id=aktifIsyeri?.id||null;
    if(tip==='stok')data.aktif=true;
  }
  if(mevcut)await sb.from('stoklar').update(data).eq('id',id);
  else await sb.from('stoklar').insert(data);
  const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
  const {data:il}=await sb.from('isim_loglari').select('*').order('tarih',{ascending:false});if(il)isimLoglari=il;
  modalKapat('modal-stok');renderStoklar();doldurStokFil();doldurIslemSecleri();kontolUyari();bil('Stok kaydedildi ✓');
};
window.stokSil=async function(id){
  const hv=islemler.some(i=>i.stok_id===id);
  if(hv){
    if(await onay('Bu stokta hareket kaydı var, silinemez.<br><small>Tamam\'a basarsan pasife alınır (kullanım dışı olur).</small>','⚠️'))
      await sb.from('stoklar').update({aktif:false}).eq('id',id);
    else return;
  }else{
    const alts=tumAltlar(stoklar,id);if(alts.length){bil('Alt kayıtları silin!','err');return;}
    if(!(await onay('Kalıcı olarak silmek istiyor musunuz?','🗑️')))return;
    await sb.from('stoklar').delete().eq('id',id);
  }
  const {data}=await sb.from('stoklar').select('*').order('kod');if(data)stoklar=data;
  renderStoklar();doldurStokFil();doldurIslemSecleri();bil(hv?'Pasife alındı ✓':'Silindi ✓');
};
function renderStoklar(){
  const el=document.getElementById('stok-tree');if(!el)return;
  const fil=document.getElementById('stok-fil')?.value||'';
  const kapsam=isyeriFiltre(stoklar);
  function renderRow(s,depth){
    const renk=renkMap[s.renk]||'var(--yesil)';
    const isGrup=s.tip==='grup';
    const mik=s.tip==='stok'?stokMiktar(s.id):null;
    const tb=birimler.find(b=>b.id===s.birim_id);
    const dusuk=s.tip==='stok'&&s.min_stok>0&&mik<=s.min_stok;
    const pasif=s.aktif===false;
    // Seviyeye göre grup rengi — stok/ürün kartları renksiz
    const grupRenkler=['#284a65','#355f82','#a9c8e0','#d4e6f1'];
    const satirRenk=isGrup?grupRenkler[Math.min(depth,grupRenkler.length-1)]:'var(--border)';
    const satirBg=isGrup?(depth===0?'rgba(53,95,130,.06)':depth===1?'rgba(77,127,168,.04)':'rgba(169,200,224,.03)'):'';
    return `<div class="tree-row${isGrup?' is-grup':''}" style="padding-left:${10+depth*18}px;border-left:${isGrup?'4':'2'}px solid ${satirRenk};${satirBg?'background:'+satirBg+';':''}${pasif?'opacity:0.45;':''}">
      <span style="font-size:${isGrup?15:13}px">${s.ikon||'📦'}</span>
      <span class="tree-kod" style="min-width:52px">${s.kod}</span>
      <span style="flex:1;font-size:${isGrup?13:12}px">${s.ad}${pasif?' <span style="font-size:10px;color:var(--turuncu);font-weight:500">[PASİF]</span>':''}</span>
      ${s.tip==='stok'?`<span style="font-size:12px;font-weight:500;color:${dusuk?'var(--sari)':'var(--yesil)'}">${mik?.toLocaleString('tr-TR',{maximumFractionDigits:2})||0} ${tb?.kisaltma||''}</span>`:''}
      ${dusuk?'<span class="badge sari">⚠ Min</span>':''}
      <span class="tip-chip ${isGrup?'tip-grup':'tip-stok'}">${isGrup?'GRUP':'STOK'}</span>
      ${aktifKullanici?.rol==='admin'?`<div class="tree-actions">
        ${isGrup?`${(s.seviye||1)<3?`<button class="btn sm" onclick="event.stopPropagation();stokModalAc('${s.id}','grup')">+G</button>`:''}${(s.seviye||1)>=3?`<button class="btn sm sec" onclick="event.stopPropagation();stokModalAc('${s.id}','stok')">+S</button>`:''}`:''}
        <button class="btn sm" onclick="event.stopPropagation();stokGoruntule('${s.id}')">👁</button>
        <button class="btn sm" onclick="event.stopPropagation();stokDuzenle('${s.id}')">✏</button>
        <button class="btn sm ghost" onclick="event.stopPropagation();stokSil('${s.id}')">✕</button>
      </div>`:''}
    </div>`;
  }
  function renderTree(ustId,depth){
    return kapsam.filter(s=>s.ust_id===ustId&&s.aktif!==false).map(s=>renderRow(s,depth)+renderTree(s.id,depth+1)).join('');
  }
  function renderTreeAdmin(ustId,depth){
    return kapsam.filter(s=>s.ust_id===ustId).map(s=>renderRow(s,depth)+renderTreeAdmin(s.id,depth+1)).join('');
  }
  const isAdmin=aktifKullanici?.rol==='admin';
  const treeFn=isAdmin?renderTreeAdmin:renderTree;
  let html='';
  if(fil){
    const grup=kapsam.find(s=>s.id===fil);if(!grup)return;
    html=renderRow(grup,0)+treeFn(fil,1);
  }else{
    html=kapsam.filter(s=>!s.ust_id&&(isAdmin||s.aktif!==false)).map(s=>renderRow(s,0)+treeFn(s.id,1)).join('');
  }
  el.innerHTML=html||'<div class="bos">Henüz stok yok. "Grup" veya "Stok Kartı" ekleyin.</div>';
}
function kontolUyari(){
  const kapsam=isyeriFiltre(stoklar);
  const d=kapsam.filter(s=>s.tip==='stok'&&s.min_stok>0&&stokMiktar(s.id)<=s.min_stok);
  const bant=document.getElementById('uyari-bant');
  if(d.length){bant.style.display='block';document.getElementById('uyari-txt').textContent=`${d.length} stok kritik: ${d.map(s=>s.ad).join(', ')}`;}
  else bant.style.display='none';
}
window.stokDetay=async function(id){
  const s=stoklar.find(x=>x.id===id);if(!s||s.tip==='grup')return;
  document.getElementById('sd-title').textContent=`[${s.kod}] ${s.ad}`;
  const mik=stokMiktar(id);const tb=birimler.find(b=>b.id===s.birim_id);
  document.getElementById('sd-ozet').innerHTML=`<div class="mg" style="grid-template-columns:repeat(3,1fr)"><div class="met"><div class="ml">Mevcut</div><div class="mv g">${mik.toLocaleString('tr-TR',{maximumFractionDigits:2})} ${tb?.kisaltma||''}</div></div><div class="met"><div class="ml">Ort. Maliyet</div><div class="mv k">${s.maliyet?para(s.maliyet):'—'}</div></div><div class="met"><div class="ml">Stok Değeri</div><div class="mv k">${s.maliyet?para(mik*(s.maliyet||0)):'—'}</div></div></div>`;
  const isAdmin=aktifKullanici?.rol==='admin';
  const thEl=document.getElementById('sd-islem-th');if(thEl)thEl.style.display=isAdmin?'':'none';
  const rows=islemler.filter(i=>i.stok_id===id).map(i=>`<tr>
    <td>${i.tarih}</td>
    <td><span class="badge ${i.tur==='giris'?'g':'d'}">${{giris:'Giriş',satis:'Satış',uretim_sarfiyat:'Sarfiyat',satis_sarfiyat:'Satış Sarfiyatı',sayim:'Sayım'}[i.tur]||i.tur}</span></td>
    <td style="color:${i.tur==='giris'?'var(--yesil)':'var(--turuncu)'}">${i.tur==='giris'?'+':'-'}${parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})}</td>
    <td>${birimAd(i.birim_id)}</td>
    <td>${i.tutar?para(i.tutar):''}</td>
    <td style="font-size:11px;color:var(--yazi3)">${i.satir_not||i.aciklama_not||'—'}</td>
    ${isAdmin?`<td><button class="btn sm" onclick="islemDuzenleAc('${i.id}')">✏</button><button class="btn sm ghost" onclick="islemSil('${i.id}')">✕</button></td>`:'<td></td>'}
  </tr>`).join('');
  document.getElementById('sd-tb').innerHTML=rows||'<tr><td colspan="7" class="bos">Hareket yok</td></tr>';
  modalAc('modal-stok-detay');
};
