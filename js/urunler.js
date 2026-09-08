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
  // Seviyelendirme kuralı: en fazla 2 grup seviyesi (stoktan 1 basamak az),
  // ürün/YM kartları SADECE 2. seviye bir grubun altına eklenebilir.
  if(tip==='grup'&&ustId){
    const ust=urunler.find(u=>u.id===ustId);
    if(ust&&(ust.seviye||1)>=2){bil('En fazla 2 seviye grup açılabilir!','err');return;}
  }
  if(tip==='ara_urun'||tip==='urun'){
    const ust=ustId?urunler.find(u=>u.id===ustId):null;
    if(!ust||(ust.seviye||0)!==2){bil('Ürün/Yarı Mamul sadece 2. seviye bir grubun altına eklenebilir!','err');return;}
  }
  document.getElementById('um-id').value='';document.getElementById('um-tip-h').value=tip;
  document.getElementById('um-ad').value='';
  document.getElementById('um-kod').value=kodOlusturUrun(ustId,tip);
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
window.urunGoruntule=function(id){urunDuzenle(id,'goruntule');};
window.urunDuzenle=function(id,mod='duzenle'){
  const u=urunler.find(x=>x.id===id);if(!u)return;
  const hv=islemler.some(i=>i.urun_id===id);
  document.getElementById('um-id').value=u.id;document.getElementById('um-tip-h').value=u.tip;
  const tipAd={grup:'Grup',ara_urun:'Yarı Mamul',urun:'Mamul Ürün'}[u.tip]||u.tip;
  document.getElementById('um-title').textContent=`${tipAd} Düzenle`;
  document.getElementById('um-ad').value=u.ad;document.getElementById('um-kod').value=u.kod;

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
  bilesenler.push({id:'',urun_id:'',kaynak_tip,kaynak_id:'',miktar:1,birim_id:'',fiyat:''});
  renderBilesenler();
};
// Stok birim maliyeti hesapla
function stokBirimMaliyet(stokId){
  const girisler=islemler.filter(i=>i.stok_id===stokId&&i.tur==='giris');
  if(!girisler.length)return 0;
  const mevcutMiktar=stokMiktar(stokId);
  if(mevcutMiktar>0){
    let toplamTutar=0,toplamMiktar=0;
    girisler.forEach(i=>{
      const c=birimTemelCarp(i.birim_id);
      const mik=parseFloat(i.miktar||0)*c;
      const tut=parseFloat(i.tutar||0);
      if(mik>0&&tut>0){toplamTutar+=tut;toplamMiktar+=mik;}
    });
    if(toplamMiktar>0)return toplamTutar/toplamMiktar;
  }
  // Stok sıfır veya negatif → son alım fiyatı
  const sonGiris=[...girisler].sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
  const sonFiyat=parseFloat(sonGiris?.fiyat||0);
  if(sonFiyat>0)return sonFiyat;
  const s=stoklar.find(x=>x.id===stokId);
  return s?.maliyet||0;
}

// Ara ürün/ürün 1 birim maliyeti: kendi bileşenlerinin toplam maliyeti (iç içe YM/ürün destekli)
// _derinlik: döngüsel referanslara (A -> B -> A) karşı güvenlik sınırı
function araUrunBirimMaliyet(urunId,_derinlik){
  _derinlik=_derinlik||0;
  if(_derinlik>15)return 0; // olası döngüsel referans — sonsuz döngüyü engelle
  const bilesenleri=urunBilesenleri.filter(b=>b.urun_id===urunId);
  if(!bilesenleri.length)return 0;
  let toplam=0;
  bilesenleri.forEach(b=>{
    const miktar=parseFloat(b.miktar)||0;
    const carpan=birimTemelCarp(b.birim_id);
    if(b.kaynak_tip==='stok'){
      toplam+=stokBirimMaliyet(b.kaynak_id)*miktar*carpan;
    }else if(b.kaynak_tip==='hizmet'){
      toplam+=(parseFloat(b.fiyat)||0)*miktar*carpan;
    }else{
      // 'ara_urun' veya 'urun' (mamul) — ikisi de urunler tablosunda, aynı şekilde iç içe hesaplanır
      toplam+=araUrunBirimMaliyet(b.kaynak_id,_derinlik+1)*miktar*carpan;
    }
  });
  return toplam;
}

function renderBilesenler(){
  const el=document.getElementById('bilesen-listesi');if(!el)return;
  const receteSayfasi=document.getElementById('receteler')?.classList.contains('active');
  if(!bilesenler.length){
    el.innerHTML='<div style="font-size:12px;color:var(--yazi3);padding:8px 0">Henüz bileşen eklenmedi.</div>';
    if(_receteSeciliId&&_receteMod==='duzenle')el.innerHTML+=`<div style="margin-top:8px"><button class="btn pri sm" onclick="receteKaydet()">💾 Kaydet</button></div>`;
    return;
  }
  let toplamMaliyet=0;
  const baslik=`<div style="display:flex;align-items:center;border-bottom:2px solid var(--border);padding-bottom:4px;margin-bottom:2px">
    <div style="width:30px;flex-shrink:0"></div>
    <div style="flex:1;min-width:120px;font-size:10px;color:var(--yazi3);font-weight:600;padding:0 4px">MALZEME</div>
    <div style="width:70px;flex-shrink:0;font-size:10px;color:var(--yazi3);font-weight:600;padding:0 4px">BİRİM</div>
    <div style="width:70px;flex-shrink:0;font-size:10px;color:var(--yazi3);font-weight:600;padding:0 4px">MİKTAR</div>
    <div style="width:80px;flex-shrink:0;font-size:10px;color:var(--yazi3);font-weight:600;padding:0 4px;text-align:right">FİYAT</div>
    <div style="width:80px;flex-shrink:0;font-size:10px;color:var(--yazi3);font-weight:600;padding:0 4px;text-align:right">MALİYET</div>
    <div style="width:28px;flex-shrink:0"></div>
  </div>`;
  // Bileşen seçim listeleri: sadece aktif işyerinin (veya genel/işyerisiz) kayıtları gösterilir
  const stoklarKapsam=isyeriFiltre(stoklar);
  const urunlerKapsam=isyeriFiltre(urunler);
  const giderKapsam=typeof giderKalemleri!=='undefined'?isyeriFiltre(giderKalemleri):[];
  const satirlar=bilesenler.map((b,i)=>{
    const isStok=b.kaynak_tip==='stok';
    const isHizmet=b.kaynak_tip==='hizmet';
    const isUrun=b.kaynak_tip==='urun';
    const liste=isStok?stoklarKapsam.filter(s=>s.tip==='stok'):isHizmet?giderKapsam.filter(k=>k.tip==='kalem'&&k.aktif!==false):isUrun?urunlerKapsam.filter(u=>u.tip==='urun'):urunlerKapsam.filter(u=>u.tip==='ara_urun');
    const birimFiyat=isStok?stokBirimMaliyet(b.kaynak_id):isHizmet?(parseFloat(b.fiyat)||0):araUrunBirimMaliyet(b.kaynak_id);
    const miktar=parseFloat(b.miktar)||0;
    const carpan=birimTemelCarp(b.birim_id);
    const maliyet=birimFiyat*miktar*carpan;
    toplamMaliyet+=maliyet;
    const secenekler=liste.map(x=>`<option value="${x.id}"${x.id===b.kaynak_id?' selected':''}>${x.ad}</option>`).join('');
    const secPlaceholder=isStok?'Hammadde seçin...':isHizmet?'Hizmet seçin...':isUrun?'Ürün (mamul) seçin...':'Ara ürün seçin...';
    return `<div style="display:flex;align-items:center;border-bottom:1px solid var(--krem2)">
      <div style="width:30px;flex-shrink:0;padding:8px 4px 8px 0">
        <span class="tip-chip ${isStok?'tip-stok':isHizmet?'tip-hizmet':isUrun?'tip-urun':'tip-ara'}" style="font-size:9px;padding:2px 3px">${isStok?'HAM':isHizmet?'HİZ':isUrun?'MM':'ARA'}</span>
      </div>
      <div style="flex:1;min-width:120px;padding:6px 4px">
        <select onchange="bilesenGuncelle(${i},'kaynak_id',this.value);renderBilesenler()" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
          <option value="">${secPlaceholder}</option>
          ${secenekler}
        </select>
      </div>
      <div style="width:70px;flex-shrink:0;padding:6px 4px">
        <select onchange="bilesenGuncelle(${i},'birim_id',this.value);renderBilesenler()" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
          <option value="">—</option>
          ${birimler.map(bx=>`<option value="${bx.id}"${bx.id===b.birim_id?' selected':''}>${bx.kisaltma||bx.ad}</option>`).join('')}
        </select>
      </div>
      <div style="width:70px;flex-shrink:0;padding:6px 4px">
        <input type="number" placeholder="0" value="${b.miktar||''}" min="0" step="any" onchange="bilesenGuncelle(${i},'miktar',this.value);renderBilesenler()" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px">
      </div>
      <div style="width:80px;flex-shrink:0;padding:6px 4px;text-align:right">${isHizmet?`<input type="number" placeholder="Fiyat" value="${b.fiyat||''}" min="0" step="any" onclick="event.stopPropagation()" onchange="bilesenGuncelle(${i},'fiyat',this.value);renderBilesenler()" style="width:100%;padding:4px 5px;border:1px solid var(--border);border-radius:6px;font-size:11px;text-align:right">`:`<span style="font-size:11px;color:var(--yazi3)">${birimFiyat>0?para(birimFiyat):'—'}</span>`}</div>
      <div style="width:80px;flex-shrink:0;padding:6px 4px;text-align:right;font-size:12px;font-weight:600;color:var(--yesil)">${maliyet>0?para(maliyet):'—'}</div>
      <div style="width:28px;flex-shrink:0;text-align:center">
        <button onclick="bilesenSil(${i})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:18px;padding:0">×</button>
      </div>
    </div>`;
  }).join('');
  const toplamHtml=`<div style="margin-top:10px;padding:8px 12px;background:var(--yesil-cok-ac);border-radius:8px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:12px;color:var(--yazi2)">Toplam Maliyet</span>
    <span style="font-size:14px;font-weight:600;color:var(--yesil)">${para(toplamMaliyet)}</span>
  </div>`;
  // Scroll container ile sar — mobilden yatay kaydırma
  el.innerHTML=`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <div style="min-width:518px;display:inline-block;width:100%;max-width:700px">${baslik+satirlar}</div>
  </div>`+toplamHtml;

  // Görüntüleme modunda ekle butonları ve kaydet gizli
  const ekleDiv=document.getElementById('recete-ekle-btns');
  if(ekleDiv)ekleDiv.style.display=_receteMod==='goruntule'?'none':'';
  if(_receteSeciliId&&_receteMod==='duzenle'){
    el.innerHTML+=`<div style="margin-top:10px"><button class="btn pri" onclick="receteKaydet()">💾 Reçeteyi Kaydet</button></div>`;
  }
  if(_receteSeciliId&&_receteMod==='goruntule'){
    el.innerHTML+=`<div style="margin-top:8px;padding:6px 10px;background:var(--krem2);border-radius:8px;font-size:11px;color:var(--yazi3);text-align:center">👁 Görüntüleme modu — düzenlemek için ✏ butonunu kullanın</div>`;
  }
  // Görüntüleme modunda tüm inputları/selectleri disable et
  if(_receteMod==='goruntule'){
    el.querySelectorAll('input,select,button:not(.btn.ghost)').forEach(i=>{
      if(!i.onclick?.toString().includes('bilesenSil'))i.disabled=true;
    });
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
  const mevcut=urunler.find(x=>x.id===id);
  const isyeriId=mevcut?mevcut.isyeri_id:(aktifIsyeri?.id||null);
  // Mükerrer kontrol — sadece AYNI işyeri kapsamında
  const kapsam=urunler.filter(x=>(x.isyeri_id||null)===(isyeriId||null));
  const dupAd=kapsam.find(x=>x.id!==id&&x.ad.trim().toLowerCase()===ad.toLowerCase());
  if(dupAd){bil(`"${ad}" adında zaten bir ürün/grup var! [${dupAd.kod}]`,'err');return;}
  const dupKod=kapsam.find(x=>x.id!==id&&x.kod===kod);
  if(dupKod){bil(`"${kod}" kodu zaten kullanımda! [${dupKod.ad}]`,'err');return;}
  const hv=mevcut&&islemler.some(i=>i.urun_id===id);
  if(mevcut&&mevcut.ad!==ad)await sb.from('isim_loglari').insert({tablo:'urunler',kayit_id:id,eski_ad:mevcut.ad,yeni_ad:ad,degistiren:aktifKullanici?.ad||''});
  const data={id,ad,tip};
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
    const ust=ustKod?urunler.find(u=>u.kod===ustKod&&(u.isyeri_id||null)===(aktifIsyeri?.id||null)):null;
    data.ust_id=ust?.id||null;data.seviye=ust?(ust.seviye||1)+1:1;
    data.isyeri_id=aktifIsyeri?.id||null;
    if(tip!=='grup')data.aktif=true;
  }
  if(mevcut)await sb.from('urunler').update(data).eq('id',id);else await sb.from('urunler').insert(data);
  // Bileşenleri kaydet
  if(tip!=='grup'){
    await sb.from('urun_bilesenleri').delete().eq('urun_id',id);
    const gecerliBilesenler=bilesenler.filter(b=>b.kaynak_id&&b.miktar>0);
    if(gecerliBilesenler.length){
      await sb.from('urun_bilesenleri').insert(gecerliBilesenler.map((b,si)=>({urun_id:id,kaynak_tip:b.kaynak_tip,kaynak_id:b.kaynak_id,miktar:parseFloat(b.miktar),birim_id:b.birim_id||null,fiyat:parseFloat(b.fiyat)||null,sira:si})));
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
  const kapsam=isyeriFiltre(urunler);
  function renderRow(u,depth){
    const renk=renkMap[u.renk]||'var(--yesil)';
    const isGrup=u.tip==='grup';const isAra=u.tip==='ara_urun';
    const stokAdet=isGrup?0:urunStok(u.id);const tb=birimler.find(b=>b.id===u.birim_id);
    const dusuk=!isGrup&&u.min_stok>0&&stokAdet<=u.min_stok;
    const bilesenSayisi=urunBilesenleri.filter(b=>b.urun_id===u.id).length;
    const pasif=u.aktif===false;
    const merkezAd=!isGrup&&u.merkez_id?merkezler.find(m=>m.id===u.merkez_id)?.ad:'';
    const grupRenkler=['var(--grup-kenar-0)','var(--grup-kenar-1)','var(--grup-kenar-2)','var(--grup-kenar-3)'];
    const satirRenk=isGrup?grupRenkler[Math.min(depth,grupRenkler.length-1)]:'var(--border)';
    const satirBg=isGrup?(depth===0?'var(--grup-bg-0)':depth===1?'var(--grup-bg-1)':'var(--grup-bg-2)'):'';
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
        ${isGrup?`${(u.seviye||1)<2?`<button class="btn sm" onclick="event.stopPropagation();urunModalAc('${u.id}','grup')" title="Alt Grup">+G</button>`:''}${(u.seviye||1)>=2?`<button class="btn sm" style="background:var(--mor-ac);color:var(--mor)" onclick="event.stopPropagation();urunModalAc('${u.id}','ara_urun')" title="Yarı Mamul Ekle">+Y</button><button class="btn sm sec" onclick="event.stopPropagation();urunModalAc('${u.id}','urun')" title="Mamul Ürün Ekle">+Ü</button>`:''}`:''}
        <button class="btn sm" onclick="event.stopPropagation();urunGoruntule('${u.id}')">👁</button><button class="btn sm" onclick="event.stopPropagation();urunDuzenle('${u.id}')">✏</button>
        <button class="btn sm ghost" onclick="event.stopPropagation();urunSil('${u.id}')">✕</button>
      </div>`:''}
    </div>`;
  }
  function renderTree(ustId,depth,showAll){
    return kapsam.filter(u=>u.ust_id===ustId&&(showAll||u.aktif!==false)).map(u=>renderRow(u,depth)+renderTree(u.id,depth+1,showAll)).join('');
  }
  let html='';
  if(fil){
    const grup=kapsam.find(u=>u.id===fil);if(!grup)return;
    html=renderRow(grup,0)+renderTree(fil,1,isAdmin);
  }else{
    html=kapsam.filter(u=>!u.ust_id&&(isAdmin||u.aktif!==false)).map(u=>renderRow(u,0)+renderTree(u.id,1,isAdmin)).join('');
  }
  el.innerHTML=html||'<div class="bos">Henüz ürün yok. "Grup", "Ara Ürün" veya "Ürün" ekleyin.</div>';
}

// ===== ÜRÜN REÇETELERİ SAYFASI =====
let _receteSeciliId = null;
let _receteMod = 'duzenle'; // 'goruntule' veya 'duzenle'

window.renderReceteler = function() {
  receteAra();
};

function _receteDetayHTML(u, grup) {
  const bilSayisi = urunBilesenleri.filter(b => b.urun_id === u.id).length;
  const birimKisa = birimAd(u.birim_id) || 'birim';
  const normalizeKutu = _receteMod==='duzenle' ? `
    <div style="background:var(--mor-ac,#f3e8ff);border:1px solid #7c3aed33;border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:600;color:var(--yazi2);margin-bottom:6px">📐 Girdiğiniz miktarlar toplamda ne kadar üretti?</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input type="number" id="recete-uretilen-miktar" placeholder="örn: 550" min="0" step="any" style="width:100px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">
        <select id="recete-uretilen-birim" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
          ${birimSecenekleri(u.birim_id)}
        </select>
        <button class="btn sm sec" onclick="event.stopPropagation();receteNormalizeEt('${u.id}')">↺ 1 ${birimKisa} için normalize et</button>
      </div>
      <div style="font-size:10px;color:var(--yazi3);margin-top:4px">Bileşen miktarlarını, tam olarak "1 ${birimKisa}" üretecek şekilde otomatik yeniden ölçeklendirir. Fire/pişirme kaybı böylece hesaba katılmış olur.</div>
    </div>` : '';
  return `<div id="recete-detay-${u.id}" style="border-top:1px solid var(--border);padding:12px 4px 4px">
    ${normalizeKutu}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:12px;font-weight:600;color:var(--yazi2)">Bileşenler <span style="font-weight:400;color:var(--yazi3)">(1 ${birimKisa} için)</span></span>
      <div style="display:flex;gap:6px" id="recete-ekle-btns">
        <button class="btn sm sec" onclick="event.stopPropagation();bilesenEkle('stok')">+ Hammadde</button>
        <button class="btn sm" onclick="event.stopPropagation();bilesenEkle('ara_urun')">+ Ara Ürün</button>
        <button class="btn sm" onclick="event.stopPropagation();bilesenEkle('urun')">+ Ürün</button>
        <button class="btn sm" onclick="event.stopPropagation();bilesenEkle('hizmet')">+ Hizmet</button>
      </div>
    </div>
    <div id="bilesen-listesi"></div>
  </div>`;
}

// Bileşen miktarlarını "1 [ürünün temel birimi]" üretecek şekilde yeniden ölçeklendirir.
// Örn: 500g domates + 100g yağ + 20g tuz karışımı 550g sos verdiyse ve ürünün
// temel birimi kg ise, tüm miktarlar "1 kg sos için gereken miktar"a çevrilir.
window.receteNormalizeEt = function(urunId){
  const u = urunler.find(x=>x.id===urunId); if(!u) return;
  if(!bilesenler.length){bil('Önce bileşen ekleyin!','err');return;}
  const miktarEl = document.getElementById('recete-uretilen-miktar');
  const birimEl = document.getElementById('recete-uretilen-birim');
  const girilenMiktar = parseFloat(miktarEl?.value)||0;
  const girilenBirimId = birimEl?.value||'';
  if(girilenMiktar<=0||!girilenBirimId){bil('Üretilen miktarı ve birimini girin!','err');return;}
  const uretilenTemel = girilenMiktar*birimTemelCarp(girilenBirimId); // ürünün kendi temel birimi cinsinden karşılığı
  if(uretilenTemel<=0){bil('Geçersiz miktar','err');return;}
  const carpan = 1/uretilenTemel;
  bilesenler = bilesenler.map(b=>({...b, miktar:+(((parseFloat(b.miktar)||0)*carpan).toFixed(6))}));
  renderBilesenler();
  bil(`Bileşenler 1 ${birimAd(u.birim_id)||'birim'} için yeniden ölçeklendirildi ✓ — kaydetmeyi unutmayın`);
};

window.receteAra = function() {
  const ara = (document.getElementById('recete-ara')?.value || '').toLowerCase();
  const el = document.getElementById('recete-urun-liste'); if (!el) return;
  let liste = isyeriFiltre(urunler).filter(u => u.tip === 'urun' || u.tip === 'ara_urun');
  if (ara) liste = liste.filter(u => u.ad.toLowerCase().includes(ara) || u.kod.toLowerCase().includes(ara));

  el.innerHTML = liste.map(u => {
    const grup = urunler.find(g => g.id === u.ust_id);
    const bilSayisi = urunBilesenleri.filter(b => b.urun_id === u.id).length;
    const secili = u.id === _receteSeciliId;
    const detayHTML = secili ? _receteDetayHTML(u, grup) : '';
    return `<div class="card" style="margin-bottom:8px;padding:0;overflow:hidden">
      <div onclick="receteUrunSec('${u.id}')" style="
        display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;
        background:${secili?'var(--yesil-cok-ac)':'var(--beyaz)'};
      ">
        <span style="font-size:18px">${u.ikon||'🍽️'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:${secili?'var(--yesil)':'var(--yazi1)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">[${u.kod}] ${u.ad}</div>
          <div style="font-size:11px;color:var(--yazi3);margin-top:2px">${grup ? grup.ad + ' · ' : ''}${u.tip==='ara_urun'?'Yarı Mamul':'Mamul Ürün'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-size:10px;background:${bilSayisi?'var(--yesil-cok-ac)':'var(--krem2)'};color:${bilSayisi?'var(--yesil)':'var(--yazi3)'};padding:2px 8px;border-radius:10px">${bilSayisi} bileşen</span>
          <button class="btn sm" onclick="event.stopPropagation();receteGoruntule('${u.id}')" title="Görüntüle">👁</button>
          <button class="btn sm" onclick="event.stopPropagation();recedeDuzenle('${u.id}')" title="Düzenle">✏</button>
          <button class="btn sm ghost" onclick="event.stopPropagation();recedeSil('${u.id}')" title="Sil">✕</button>
        </div>
        <span style="font-size:16px;color:var(--yazi3);margin-left:4px">${secili?'▲':'▼'}</span>
      </div>
      ${detayHTML}
    </div>`;
  }).join('') || '<div class="bos">Ürün bulunamadı</div>';

  // Seçili ürün açıksa bileşenleri render et
  if (_receteSeciliId) {
    bilesenler = urunBilesenleri.filter(b => b.urun_id === _receteSeciliId).map(b => ({...b}));
    renderBilesenler();
  }
};

window.receteGoruntule=function(id){_receteMod='goruntule';receteUrunSec(_receteSeciliId===id?null:id);};
window.recedeDuzenle=function(id){_receteMod='duzenle';receteUrunSec(_receteSeciliId===id?null:id);};
window.recedeSil=async function(id){
  const u=urunler.find(x=>x.id===id);
  if(!(await onay(`<b>${u?.ad||'Bu ürün'}</b> reçetesindeki tüm bileşenler silinecek. Emin misiniz?`,'🗑️')))return;
  await sb.from('urun_bilesenleri').delete().eq('urun_id',id);
  const {data:ub}=await sb.from('urun_bilesenleri').select('*');if(ub)urunBilesenleri=ub;
  if(_receteSeciliId===id){_receteSeciliId=null;bilesenler=[];}
  receteAra();bil('Reçete silindi ✓');
};
window.receteUrunSec = function(id) {
  if (_receteSeciliId === id) {
    _receteSeciliId = null;
    bilesenler = [];
    receteAra();
    return;
  }
  _receteSeciliId = id;
  bilesenler = urunBilesenleri.filter(b => b.urun_id === id).map(b => ({...b}));
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
      kaynak_id: b.kaynak_id, miktar: parseFloat(b.miktar), birim_id: b.birim_id || null,
      fiyat: parseFloat(b.fiyat) || null
    });
  }
  const { data: ub } = await sb.from('urun_bilesenleri').select('*');
  if (ub) urunBilesenleri = ub;
  bil('Reçete kaydedildi ✓');
  receteAra();
};
