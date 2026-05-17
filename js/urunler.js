// ===== ÜRÜN TREE =====
let bilesenler=[];
window.umTipDegis=function(yeniTip){
  document.getElementById('um-tip-h').value=yeniTip;
  // Seçili radio stilini güncelle
  document.getElementById('um-tip-urun-lbl').style.borderColor=yeniTip==='urun'?'var(--yesil)':'var(--border)';
  document.getElementById('um-tip-ara-lbl').style.borderColor=yeniTip==='ara_urun'?'var(--mor)':'var(--border)';
  const tipAd={urun:'Mamul Ürün',ara_urun:'Yarı Mamul'}[yeniTip]||yeniTip;
  document.getElementById('um-title').textContent=document.getElementById('um-id').value?`${tipAd} Düzenle`:`Yeni ${tipAd}`;
};
window.urunModalAc=function(ustId,tip){
  document.getElementById('um-id').value='';document.getElementById('um-tip-h').value=tip;
  document.getElementById('um-ad').value='';document.getElementById('um-ikon').value='';
  document.getElementById('um-kod').value=kodOlusturUrun(ustId);
  document.getElementById('um-log').style.display='none';bilesenler=[];renderBilesenler();
  const isGrup=tip==='grup';
  document.getElementById('um-urun-alanlar').style.display=isGrup?'none':'';
  document.getElementById('um-birim-fg').style.display=isGrup?'none':'';
  document.getElementById('um-aktif-satir').style.display='none';
  document.getElementById('um-fiyat').value=0;document.getElementById('um-min').value=0;
  document.getElementById('um-merkez').value='';
  document.getElementById('um-varsayilan-birim').value='';
  // Tip seçim alanını göster/gizle
  const tipSecim=document.getElementById('um-tip-secim');
  if(tipSecim)tipSecim.style.display=isGrup?'none':'block';
  // Radio'yu seç
  if(!isGrup){
    const radio=document.querySelector(`input[name="um-tip-radio"][value="${tip}"]`);
    if(radio)radio.checked=true;
    umTipDegis(tip);
  }
  const tipAd={grup:'Grup',ara_urun:'Yarı Mamul',urun:'Mamul Ürün'}[tip]||tip;
  document.getElementById('um-title').textContent=`Yeni ${tipAd}`;
  if(ustId){const ust=urunler.find(u=>u.id===ustId);document.getElementById('um-ust-bilgi').textContent=`Üst: ${ust?.ikon||''} ${ust?.ad||''} [${ust?.kod||''}]`;}
  else document.getElementById('um-ust-bilgi').textContent=isGrup?'Ana ürün grubu':'Grup seçilmedi';
  document.getElementById('um-kod').disabled=false;doldurBirimSecleri();modalAc('modal-urun');
};
window.urunDuzenle=function(id){
  const u=urunler.find(x=>x.id===id);if(!u)return;
  const hv=islemler.some(i=>i.urun_id===id);
  document.getElementById('um-id').value=u.id;document.getElementById('um-tip-h').value=u.tip;
  const tipAd={grup:'Grup',ara_urun:'Yarı Mamul',urun:'Mamul Ürün'}[u.tip]||u.tip;
  document.getElementById('um-title').textContent=`${tipAd} Düzenle`;
  document.getElementById('um-ad').value=u.ad;document.getElementById('um-kod').value=u.kod;
  document.getElementById('um-ikon').value=u.ikon||'';document.getElementById('um-renk').value=u.renk||'yesil';
  document.getElementById('um-kod').disabled=hv;
  const isGrup=u.tip==='grup';
  // Tip seçim
  const tipSecim=document.getElementById('um-tip-secim');
  if(tipSecim)tipSecim.style.display=isGrup?'none':'block';
  if(!isGrup){
    const radio=document.querySelector(`input[name="um-tip-radio"][value="${u.tip}"]`);
    if(radio)radio.checked=true;
    umTipDegis(u.tip);
  }
  document.getElementById('um-urun-alanlar').style.display=isGrup?'none':'';
  document.getElementById('um-birim-fg').style.display=isGrup?'none':'';
  if(!isGrup){
    document.getElementById('um-fiyat').value=u.fiyat||0;document.getElementById('um-min').value=u.min_stok||0;
    document.getElementById('um-aktif-satir').style.display='';
    document.getElementById('um-aktif').checked=u.aktif!==false;
    doldurBirimSecleri();doldurMerkezSecleri();
    setTimeout(()=>{
      document.getElementById('um-birim').value=u.birim_id||'';
      document.getElementById('um-merkez').value=u.merkez_id||'';
      _doldurVarsayilanBirim('um-varsayilan-birim',u.birim_id,u.varsayilan_birim_id);
    },100);
    bilesenler=urunBilesenleri.filter(b=>b.urun_id===id).map(b=>({...b}));renderBilesenler();
  }else{
    document.getElementById('um-aktif-satir').style.display='none';
    bilesenler=[];renderBilesenler();
  }
  const ust=urunler.find(x=>x.id===u.ust_id);
  document.getElementById('um-ust-bilgi').textContent=ust?`Üst: ${ust.ikon||''} ${ust.ad} [${ust.kod}]`:(isGrup?'Ana ürün grubu':'Grup seçilmedi');
  const loglar=isimLoglari.filter(l=>l.tablo==='urunler'&&l.kayit_id===id);
  if(loglar.length){document.getElementById('um-log').style.display='block';document.getElementById('um-log-liste').innerHTML=loglar.map(l=>`<div class="log-item"><span class="log-eski">${l.eski_ad}</span> → <span class="log-yeni">${l.yeni_ad}</span><span style="color:var(--yazi3);font-size:10px;float:right">${new Date(l.tarih).toLocaleDateString('tr-TR')} — ${l.degistiren||'?'}</span></div>`).join('');}
  else document.getElementById('um-log').style.display='none';
  modalAc('modal-urun');
};

// BİLEŞENLER
window.bilesenEkle=function(kaynak_tip){
  bilesenler.push({id:'',urun_id:'',kaynak_tip,kaynak_id:'',miktar:1,birim_id:''});
  renderBilesenler();
};
function renderBilesenler(){
  const el=document.getElementById('bilesen-listesi');if(!el)return;
  // Reçete sayfasındaysak kaydet butonu göster
  const receteSayfasi=document.getElementById('receteler')?.classList.contains('active');
  if(!bilesenler.length){
    el.innerHTML='<div style="font-size:12px;color:var(--yazi3);padding:8px 0">Henüz bileşen eklenmedi.</div>';
    if(receteSayfasi&&_receteSeciliId)el.innerHTML+=`<div style="margin-top:8px"><button class="btn pri sm" onclick="receteKaydet()">💾 Kaydet</button></div>`;
    return;
  }
  el.innerHTML=bilesenler.map((b,i)=>{
    const isStok=b.kaynak_tip==='stok';
    const liste=isStok?stoklar.filter(s=>s.tip==='stok'):urunler.filter(u=>u.tip==='ara_urun');
    return `<div class="bilesen-item ${isStok?'bi-stok':'bi-ara'}">
      <span class="tip-chip ${isStok?'tip-stok':'tip-ara'}">${isStok?'HAM':'ARA'}</span>
      <select onchange="bilesenGuncelle(${i},'kaynak_id',this.value)" style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
        <option value="">${isStok?'Stok':'Ara Ürün'} seçin...</option>
        ${liste.map(x=>`<option value="${x.id}"${x.id===b.kaynak_id?' selected':''}>[${x.kod}] ${x.ad}</option>`).join('')}
      </select>
      <input type="number" placeholder="Miktar" value="${b.miktar||''}" min="0" step="any" onchange="bilesenGuncelle(${i},'miktar',this.value)" style="width:70px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">
      <select onchange="bilesenGuncelle(${i},'birim_id',this.value)" style="width:90px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
        <option value="">Birim</option>
        ${birimler.map(bx=>`<option value="${bx.id}"${bx.id===b.birim_id?' selected':''}>${bx.kisaltma||bx.ad}</option>`).join('')}
      </select>
      <button onclick="bilesenSil(${i})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:18px">×</button>
    </div>`;
  }).join('');
  if(receteSayfasi&&_receteSeciliId){
    el.innerHTML+=`<div style="margin-top:10px"><button class="btn pri" onclick="receteKaydet()">💾 Reçeteyi Kaydet</button></div>`;
  }
}
window.bilesenGuncelle=function(i,alan,deger){bilesenler[i][alan]=deger;};
window.bilesenSil=function(i){bilesenler.splice(i,1);renderBilesenler();};

window.kaydetUrun=async function(){
  const id=document.getElementById('um-id').value||uid();
  const tip=document.getElementById('um-tip-h').value;
  const ad=document.getElementById('um-ad').value.trim();
  const kod=document.getElementById('um-kod').value;
  if(!ad){bil('Ad zorunlu!','err');return;}
  if(!kod){bil('Kod oluşturulamadı','err');return;}
  // Mükerrer kontrol
  const dupAd=urunler.find(x=>x.id!==id&&x.ad.trim().toLowerCase()===ad.toLowerCase());
  if(dupAd){bil(`"${ad}" adında zaten bir ürün/grup var! [${dupAd.kod}]`,'err');return;}
  const dupKod=urunler.find(x=>x.id!==id&&x.kod===kod);
  if(dupKod){bil(`"${kod}" kodu zaten kullanımda! [${dupKod.ad}]`,'err');return;}
  const mevcut=urunler.find(x=>x.id===id);
  const hv=mevcut&&islemler.some(i=>i.urun_id===id);
  if(mevcut&&mevcut.ad!==ad)await sb.from('isim_loglari').insert({tablo:'urunler',kayit_id:id,eski_ad:mevcut.ad,yeni_ad:ad,degistiren:aktifKullanici?.ad||''});
  const data={id,ad,tip,ikon:document.getElementById('um-ikon').value.trim(),renk:document.getElementById('um-renk').value};
  if(!hv)data.kod=kod;
  if(tip!=='grup'){
    const bId=document.getElementById('um-birim').value||null;
    if(!bId){bil('Birim zorunlu!','err');return;}
    data.birim_id=bId;
    data.fiyat=parseFloat(document.getElementById('um-fiyat').value)||0;
    data.min_stok=parseFloat(document.getElementById('um-min').value)||0;
    data.stok=mevcut?.stok||0;
    data.varsayilan_birim_id=document.getElementById('um-varsayilan-birim').value||null;
    data.merkez_id=document.getElementById('um-merkez').value||null;
    data.aktif=document.getElementById('um-aktif').checked;
  }
  if(!mevcut){
    const ustBilgi=document.getElementById('um-ust-bilgi').textContent;
    const ustKod=ustBilgi.match(/\[([^\]]+)\]/)?.[1];
    const ust=ustKod?urunler.find(u=>u.kod===ustKod):null;
    data.ust_id=ust?.id||null;data.seviye=ust?(ust.seviye||1)+1:1;
    if(tip!=='grup')data.aktif=true;
  }
  if(mevcut)await sb.from('urunler').update(data).eq('id',id);else await sb.from('urunler').insert(data);
  // Bileşenleri kaydet
  if(tip!=='grup'){
    await sb.from('urun_bilesenleri').delete().eq('urun_id',id);
    const gecerliBilesenler=bilesenler.filter(b=>b.kaynak_id&&b.miktar>0);
    if(gecerliBilesenler.length){
      await sb.from('urun_bilesenleri').insert(gecerliBilesenler.map((b,si)=>({urun_id:id,kaynak_tip:b.kaynak_tip,kaynak_id:b.kaynak_id,miktar:parseFloat(b.miktar),birim_id:b.birim_id||null,sira:si})));
    }
  }
  const {data:ud}=await sb.from('urunler').select('*').order('kod');if(ud)urunler=ud;
  const {data:ub}=await sb.from('urun_bilesenleri').select('*');if(ub)urunBilesenleri=ub;
  const {data:il}=await sb.from('isim_loglari').select('*').order('tarih',{ascending:false});if(il)isimLoglari=il;
  modalKapat('modal-urun');renderUrunler();doldurUrunFil();doldurIslemSecleri();bil('Ürün kaydedildi ✓');
};
window.urunSil=async function(id){
  const hv=islemler.some(i=>i.urun_id===id);
  if(hv){
    if(await onay('Bu üründe hareket kaydı var, silinemez.<br><small>Tamam\'a basarsan pasife alınır (kullanım dışı olur).</small>','⚠️'))
      await sb.from('urunler').update({aktif:false}).eq('id',id);
    else return;
  }else{
    const alts=tumAltlar(urunler,id);if(alts.length){bil('Alt kayıtları silin!','err');return;}
    if(!(await onay('Kalıcı olarak silmek istiyor musunuz?','🗑️')))return;
    await sb.from('urun_bilesenleri').delete().eq('urun_id',id);
    await sb.from('urunler').delete().eq('id',id);
  }
  const {data}=await sb.from('urunler').select('*').order('kod');if(data)urunler=data;
  const {data:ub}=await sb.from('urun_bilesenleri').select('*');if(ub)urunBilesenleri=ub;
  renderUrunler();doldurUrunFil();bil(hv?'Pasife alındı ✓':'Silindi ✓');
};
function renderUrunler(){
  const el=document.getElementById('urun-tree');if(!el)return;
  const fil=document.getElementById('urun-fil')?.value||'';
  const isAdmin=aktifKullanici?.rol==='admin';
  function renderRow(u,depth){
    const renk=renkMap[u.renk]||'var(--yesil)';
    const isGrup=u.tip==='grup';const isAra=u.tip==='ara_urun';
    const stokAdet=isGrup?0:urunStok(u.id);const tb=birimler.find(b=>b.id===u.birim_id);
    const dusuk=!isGrup&&u.min_stok>0&&stokAdet<=u.min_stok;
    const bilesenSayisi=urunBilesenleri.filter(b=>b.urun_id===u.id).length;
    const pasif=u.aktif===false;
    const merkezAd=!isGrup&&u.merkez_id?merkezler.find(m=>m.id===u.merkez_id)?.ad:'';
    const grupRenkler=['#284a65','#355f82','#a9c8e0','#d4e6f1'];
    const satirRenk=isGrup?grupRenkler[Math.min(depth,grupRenkler.length-1)]:'var(--border)';
    const satirBg=isGrup?(depth===0?'rgba(53,95,130,.13)':depth===1?'rgba(77,127,168,.08)':'rgba(169,200,224,.05)'):'';
    return `<div class="tree-row${isGrup?' is-grup':''}" style="padding-left:${10+depth*18}px;border-left:${isGrup?'4':'2'}px solid ${satirRenk};${satirBg?'background:'+satirBg+';':''}${pasif?'opacity:0.45;':''}">
      <span style="font-size:${isGrup?15:13}px">${u.ikon||'🍽️'}</span>
      <span class="tree-kod" style="min-width:52px">${u.kod}</span>
      <span style="flex:1;font-size:${isGrup?13:12}px">${u.ad}${pasif?' <span style="font-size:10px;color:var(--turuncu);font-weight:500">[PASİF]</span>':''}</span>
      ${merkezAd?`<span style="font-size:10px;color:var(--mor);background:var(--mor-ac);padding:1px 6px;border-radius:10px">${merkezAd}</span>`:''}
      ${!isGrup?`<span style="font-size:12px;font-weight:500;color:${dusuk?'var(--sari)':'var(--mavi)'}">${stokAdet.toLocaleString('tr-TR',{maximumFractionDigits:2})} ${tb?.kisaltma||''}</span>`:''}
      ${!isGrup&&bilesenSayisi?`<span style="font-size:10px;color:var(--yazi3)">${bilesenSayisi} bil.</span>`:''}
      ${dusuk?'<span class="badge sari">⚠</span>':''}
      <span class="tip-chip ${isGrup?'tip-grup':isAra?'tip-ara':'tip-urun'}">${isGrup?'GRUP':isAra?'YARI MAMUL':'MAMUL'}</span>
      ${isAdmin?`<div class="tree-actions">
        ${isGrup?`<button class="btn sm" onclick="event.stopPropagation();urunModalAc('${u.id}','grup')" title="Alt Grup">+G</button><button class="btn sm" style="background:var(--mor-ac);color:var(--mor)" onclick="event.stopPropagation();urunModalAc('${u.id}','ara_urun')" title="Yarı Mamul Ekle">+Y</button><button class="btn sm sec" onclick="event.stopPropagation();urunModalAc('${u.id}','urun')" title="Mamul Ürün Ekle">+Ü</button>`:''}
        <button class="btn sm" onclick="event.stopPropagation();urunDuzenle('${u.id}')">✏</button>
        <button class="btn sm ghost" onclick="event.stopPropagation();urunSil('${u.id}')">✕</button>
      </div>`:''}
    </div>`;
  }
  function renderTree(ustId,depth,showAll){
    return urunler.filter(u=>u.ust_id===ustId&&(showAll||u.aktif!==false)).map(u=>renderRow(u,depth)+renderTree(u.id,depth+1,showAll)).join('');
  }
  let html='';
  if(fil){
    const grup=urunler.find(u=>u.id===fil);if(!grup)return;
    html=renderRow(grup,0)+renderTree(fil,1,isAdmin);
  }else{
    html=urunler.filter(u=>!u.ust_id&&(isAdmin||u.aktif!==false)).map(u=>renderRow(u,0)+renderTree(u.id,1,isAdmin)).join('');
  }
  el.innerHTML=html||'<div class="bos">Henüz ürün yok. "Grup", "Ara Ürün" veya "Ürün" ekleyin.</div>';
}

// ===== ÜRÜN REÇETELERİ SAYFASI =====
let _receteSeciliId = null;

window.renderReceteler = function() {
  receteAra();
};

window.receteAra = function() {
  const ara = (document.getElementById('recete-ara')?.value || '').toLowerCase();
  const el = document.getElementById('recete-urun-liste'); if (!el) return;
  // Sadece tip='urun' veya 'ara_urun' olanları göster
  let liste = urunler.filter(u => u.tip === 'urun' || u.tip === 'ara_urun');
  if (ara) liste = liste.filter(u => u.ad.toLowerCase().includes(ara) || u.kod.toLowerCase().includes(ara));

  el.innerHTML = liste.map(u => {
    const grup = urunler.find(g => g.id === u.ust_id);
    const bilSayisi = urunBilesenleri.filter(b => b.urun_id === u.id).length;
    const secili = u.id === _receteSeciliId;
    return `<div onclick="receteUrunSec('${u.id}')" style="
      display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;
      margin-bottom:4px;border:1px solid ${secili ? 'var(--yesil)' : 'var(--border)'};
      background:${secili ? 'var(--yesil-cok-ac)' : 'var(--beyaz)'};
    ">
      <span class="tree-kod" style="min-width:48px;font-size:11px">${u.kod}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:${secili?'600':'400'};color:${secili?'var(--yesil)':'var(--yazi1)'}">${u.ikon||'🍽️'} ${u.ad}</div>
        <div style="font-size:10px;color:var(--yazi3)">${grup ? grup.ad + ' · ' : ''}${u.tip === 'ara_urun' ? '⚙️ Yarı Mamul' : '🍽️ Mamul Ürün'}</div>
      </div>
      <span style="font-size:10px;background:${bilSayisi?'var(--yesil-cok-ac)':'var(--krem2)'};color:${bilSayisi?'var(--yesil)':'var(--yazi3)'};padding:2px 8px;border-radius:10px">${bilSayisi} bileşen</span>
    </div>`;
  }).join('') || '<div class="bos">Ürün bulunamadı</div>';
};

window.receteUrunSec = function(id) {
  _receteSeciliId = id;
  const u = urunler.find(x => x.id === id); if (!u) return;
  const grup = urunler.find(g => g.id === u.ust_id);
  document.getElementById('recete-detay-bos').style.display = 'none';
  document.getElementById('recete-detay').style.display = 'block';
  document.getElementById('recete-urun-ad').textContent = `${u.ikon||'🍽️'} [${u.kod}] ${u.ad}`;
  document.getElementById('recete-urun-grup').textContent = grup ? `Grup: ${grup.ad}` : '';
  // Mevcut bileşenleri yükle
  bilesenler = urunBilesenleri.filter(b => b.urun_id === id).map(b => ({...b}));
  renderBilesenler();
  // Ürün id'yi modal'a set et (bilesenEkle için)
  document.getElementById('um-mevcut-id').value = id;
  // Listeyi yenile (seçili vurgusu için)
  receteAra();
};

window.receteKaydet = async function() {
  const urunId = _receteSeciliId; if (!urunId) return;
  const gecerli = bilesenler.filter(b => b.kaynak_id && parseFloat(b.miktar) > 0);
  if (!gecerli.length && bilesenler.length > 0) { bil('Eksik bileşen var!', 'err'); return; }
  // Butonları devre dışı bırak
  document.querySelectorAll('[onclick="receteKaydet()"]').forEach(b=>{b.disabled=true;b.textContent='Kaydediliyor...';});
  // Sil ve yeniden ekle
  await sb.from('urun_bilesenleri').delete().eq('urun_id', urunId);
  for (const b of gecerli) {
    await sb.from('urun_bilesenleri').insert({
      id: b.id && b.id.length > 10 ? b.id : uid(),
      urun_id: urunId, kaynak_tip: b.kaynak_tip,
      kaynak_id: b.kaynak_id, miktar: parseFloat(b.miktar), birim_id: b.birim_id || null
    });
  }
  const { data: ub } = await sb.from('urun_bilesenleri').select('*');
  if (ub) urunBilesenleri = ub;
  bil('Reçete kaydedildi ✓');
  // Seçimi temizle — kayıt tamamlandı
  _receteSeciliId = null;
  document.getElementById('recete-detay').style.display = 'none';
  document.getElementById('recete-detay-bos').style.display = '';
  bilesenler = [];
  receteAra();
};
