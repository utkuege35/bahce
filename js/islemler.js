// ===== ÜRETİM MALİYET =====
// _derinlik: döngüsel referanslara (A -> B -> A) karşı güvenlik sınırı
function hesaplaUrunMaliyeti(urunId,miktar,_derinlik){
  _derinlik=_derinlik||0;
  if(_derinlik>15)return 0;
  const bilesenleri=urunBilesenleri.filter(b=>b.urun_id===urunId);
  let toplam=0;
  bilesenleri.forEach(b=>{
    if(b.kaynak_tip==='stok'){
      const s=stoklar.find(x=>x.id===b.kaynak_id);
      toplam+=(s?.maliyet||0)*(b.miktar||0)*birimTemelCarp(b.birim_id)*miktar;
    }else if(b.kaynak_tip==='hizmet'){
      toplam+=(parseFloat(b.fiyat)||0)*(b.miktar||0)*birimTemelCarp(b.birim_id)*miktar;
    }else{
      // 'ara_urun' veya 'urun' (mamul) — iç içe olabilir
      toplam+=hesaplaUrunMaliyeti(b.kaynak_id,(b.miktar||0)*birimTemelCarp(b.birim_id)*miktar,_derinlik+1);
    }
  });
  return toplam;
}
window.uretimBilesenGoster=function(){
  const urunId=document.getElementById('ur-urun').value;
  const div=document.getElementById('ur-bilesen-bilgi');
  const bilesenleri=urunBilesenleri.filter(b=>b.urun_id===urunId);
  if(!bilesenleri.length){div.style.display='none';return;}
  div.style.display='block';
  div.innerHTML='<strong>Bileşenler:</strong> '+bilesenleri.map(b=>{
    const ad=b.kaynak_tip==='stok'?stoklar.find(s=>s.id===b.kaynak_id)?.ad:urunler.find(u=>u.id===b.kaynak_id)?.ad;
    return `${b.miktar} ${birimAd(b.birim_id)} ${ad||''}`;
  }).join(' + ');
  uretimMaliyetHesapla();
};
window.uretimMaliyetHesapla=function(){
  const urunId=document.getElementById('ur-urun').value;
  const mik=parseFloat(document.getElementById('ur-miktar').value)||1;
  if(!urunId){document.getElementById('ur-maliyet').value='';return;}
  document.getElementById('ur-maliyet').value=para(hesaplaUrunMaliyeti(urunId,mik));
};
window.kaydetUretim=async function(){
  const tarih=document.getElementById('ur-tarih').value;const urunId=document.getElementById('ur-urun').value;
  const mik=parseFloat(document.getElementById('ur-miktar').value)||1;const an=document.getElementById('ur-not').value;
  if(!tarih||!urunId){bil('Eksik bilgi!','err');return;}
  const urun=urunler.find(x=>x.id===urunId);if(!urun)return;
  const bilesenleri=urunBilesenleri.filter(b=>b.urun_id===urunId);
  let topMal=0;
  async function sarfiyatKaydet(bList,carpan,_derinlik){
    _derinlik=_derinlik||0;
    if(_derinlik>15)return true; // döngüsel referans güvenlik sınırı
    for(const b of bList){
      if(b.kaynak_tip==='stok'){
        const gMik=parseFloat(b.miktar)*carpan;const s=stoklar.find(x=>x.id===b.kaynak_id);const carp=birimTemelCarp(b.birim_id);
        if(stokMiktar(b.kaynak_id)<gMik*carp){if(!(await onay(`${s?.ad||''} stoğu yetersiz! Devam edilsin mi?`,'⚠️')))return false;}
        topMal+=(s?.maliyet||0)*gMik*carp;
        await sb.from('islemler').insert({tur:'uretim_sarfiyat',tarih,stok_id:b.kaynak_id,birim_id:b.birim_id,miktar:gMik,urun_id:urunId,aciklama:`${urun.ad} üretimi (sarfiyat)`,kat:'Üretim',aciklama_not:an,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()});
      }else if(b.kaynak_tip!=='hizmet'){
        // 'ara_urun' veya 'urun' (mamul) — iç içe olabilir
        const altBilesenleri=urunBilesenleri.filter(x=>x.urun_id===b.kaynak_id);
        const ok=await sarfiyatKaydet(altBilesenleri,(b.miktar||1)*carpan,_derinlik+1);if(!ok)return false;
      }
    }
    return true;
  }
  const ok=await sarfiyatKaydet(bilesenleri,mik);if(!ok)return;
  await sb.from('islemler').insert({tur:'uretim',tarih,urun_id:urunId,miktar:mik,birim_id:urun.birim_id,tutar:topMal,aciklama:`${urun.ad} üretimi`,kat:'Üretim',aciklama_not:an,kullanici:aktifKullanici?.ad||'',ts:Date.now()+1});
  await sb.from('urunler').update({stok:(parseFloat(urun.stok||0)+mik)}).eq('id',urunId);
  const {data:iData}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(iData)islemler=iData;
  const {data:ud}=await sb.from('urunler').select('*').order('kod');if(ud)urunler=ud;
  document.getElementById('ur-miktar').value='';document.getElementById('ur-not').value='';
  document.getElementById('ur-bilesen-bilgi').style.display='none';document.getElementById('ur-maliyet').value='';
  bil(`${urun.ad} üretimi kaydedildi ✓`);
};

// ===== SATIŞ ANINDA REÇETE BAZLI HAMMADDE DÜŞÜMÜ =====
// Bir ürün (mamul veya ara ürün) satıldığında, reçetesindeki bileşenleri
// (iç içe yarı mamul / ürün dahil) takip ederek en dipteki gerçek
// hammaddeleri (stoklar) doğru oranda düşer. "Üretim" adımına gerek kalmaz —
// made-to-order (siparişe göre anlık hazırlanan) restoran mantığı.
async function satisSarfiyatKaydet(urunId,mik,tarih,an,_derinlik){
  _derinlik=_derinlik||0;
  if(_derinlik>15)return; // döngüsel referans güvenlik sınırı
  const bilesenleri=urunBilesenleri.filter(b=>b.urun_id===urunId);
  if(!bilesenleri.length)return; // reçetesi tanımlanmamış — sadece gelir kaydedilir, hammadde düşülmez
  for(const b of bilesenleri){
    const gMik=(parseFloat(b.miktar)||0)*mik;
    if(b.kaynak_tip==='stok'){
      await sb.from('islemler').insert({
        tur:'satis_sarfiyat',tarih,stok_id:b.kaynak_id,birim_id:b.birim_id,miktar:gMik,urun_id:urunId,
        aciklama:'Satış sarfiyatı',kat:'Satış Sarfiyatı',aciklama_not:an,
        kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()
      });
    }else if(b.kaynak_tip!=='hizmet'){
      // 'ara_urun' veya 'urun' (mamul) — iç içe olabilir, orantılı olarak devam
      await satisSarfiyatKaydet(b.kaynak_id,gMik,tarih,an,_derinlik+1);
    }
  }
}

// ===== SAYIM =====
// Sayım Fişi SADECE hammaddeleri (stok) satır olarak gösterir. Bir YM veya
// Ürün sayılmak istendiğinde ayrı bir pencereden (modal) girilir; sistem
// reçetesini (iç içe olabilir) otomatik dağıtıp SONUCU doğrudan fişteki
// ilgili hammadde satırlarına ekler — YM/Ürün'ün kendisi fişte satır
// olarak görünmez, sadece etkisi yansır. Her hammadde satırında "Direkt"
// (elle sayılan) ve "YM/Ürün'den" (otomatik gelen, kaynak dökümü açılabilir)
// ayrı ayrı tutulur. NOT: Bu kayıtlar stok miktarını OTOMATİK DEĞİŞTİRMEZ —
// sadece bilgi amaçlıdır (ileride envanter raporunda kullanılacak).
// sayimSatirListesi öğesi: {stokId, birimId(stok'un temel birimi), direkt, kaynaklar:[{ustId,ad,miktar}], _detayAcik}
let sayimSatirListesi=[];

function doldurDepoSecleri(){
  const el=document.getElementById('sy-depo');if(!el)return;
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  const c=el.value;
  el.innerHTML='<option value="">— Depo seçin —</option>'+kapsam.filter(d=>d.aktif!==false).map(d=>`<option value="${d.id}">${d.ad}${d.kod?' ['+d.kod+']':''}</option>`).join('');
  if(c)el.value=c;
}

// ---- Hammadde / YM-Ürün seçim listeleri (modallar için) ----
function sySecimOpts(tip,seciliId){
  let liste;
  if(tip==='stok')liste=stoklar.filter(s=>s.tip==='stok'&&s.aktif!==false);
  else if(tip==='ara_urun')liste=urunler.filter(u=>u.tip==='ara_urun'&&u.aktif!==false);
  else liste=urunler.filter(u=>u.tip==='urun'&&u.aktif!==false);
  return '<option value="">Seçin...</option>'+liste.map(x=>`<option value="${x.id}"${x.id===seciliId?' selected':''}>[${x.kod}] ${x.ad}</option>`).join('');
}
function syBirimOpts(tip,kaynakId,seciliId){
  let tbId=null;
  if(tip==='stok'){const s=stoklar.find(x=>x.id===kaynakId);tbId=s?.birim_id;}
  else{const u=urunler.find(x=>x.id===kaynakId);tbId=u?.birim_id;}
  const list=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
  return '<option value="">-</option>'+list.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');
}

// ---- Fişe hammadde satırı ekleme/güncelleme (ortak yardımcı) ----
function sayimFisSatiriEkleVeyaGuncelle(stokId,ekMiktarTemel){
  let satir=sayimSatirListesi.find(s=>s.stokId===stokId);
  if(!satir){
    const stok=stoklar.find(x=>x.id===stokId);
    satir={stokId,birimId:stok?.birim_id||'',direkt:0,kaynaklar:[]};
    sayimSatirListesi.push(satir);
  }
  satir.direkt+=ekMiktarTemel;
  return satir;
}

// ---- "+ Hammadde Ekle" penceresi ----
window.hmSayimModalAc=function(){
  document.getElementById('hsm-stok').innerHTML=sySecimOpts('stok','');
  document.getElementById('hsm-birim').innerHTML=syBirimOpts('stok','','');
  document.getElementById('hsm-miktar').value='';
  modalAc('modal-hammadde-sayim');
};
window.hmSayimStokDegis=function(){
  const stokId=document.getElementById('hsm-stok').value;
  document.getElementById('hsm-birim').innerHTML=syBirimOpts('stok',stokId,'');
};
window.hmSayimUygula=function(){
  const stokId=document.getElementById('hsm-stok').value;
  const miktar=parseFloat(document.getElementById('hsm-miktar').value)||0;
  const birimId=document.getElementById('hsm-birim').value;
  if(!stokId||!(miktar>0)||!birimId){bil('Stok, miktar ve birim gerekli!','err');return;}
  const mikTemel=miktar*birimTemelCarp(birimId);
  sayimFisSatiriEkleVeyaGuncelle(stokId,mikTemel);
  sySatirRender();
  modalKapat('modal-hammadde-sayim');
  bil('Hammadde fişe eklendi ✓');
};

// ---- "+ YM/Ürün Sayımı Ekle" penceresi ----
window.ymSayimModalAc=function(){
  document.getElementById('ysm-tip').value='ara_urun';
  ymSayimTipDegis();
  document.getElementById('ysm-miktar').value='';
  modalAc('modal-ym-sayim');
};
window.ymSayimTipDegis=function(){
  const tip=document.getElementById('ysm-tip').value;
  document.getElementById('ysm-kalem').innerHTML=sySecimOpts(tip,'');
  document.getElementById('ysm-birim').innerHTML=syBirimOpts(tip,'','');
};
window.ymSayimKalemDegis=function(){
  const tip=document.getElementById('ysm-tip').value;
  const kaynakId=document.getElementById('ysm-kalem').value;
  document.getElementById('ysm-birim').innerHTML=syBirimOpts(tip,kaynakId,'');
};
// Bir YM/Ürünün miktarını, reçetesi üzerinden (iç içe olabilir) altındaki
// gerçek hammaddelere dağıtır. DB'ye yazmaz, sadece hesaplanan {stokId,miktarTemel}
// listesini döner — sonuç fişe uygulanmadan önce toplanır.
function sayimHesaplaDagitim(urunId,mikTemel,ustAd,ustId,sonuc,_derinlik){
  _derinlik=_derinlik||0;sonuc=sonuc||[];
  if(_derinlik>15)return sonuc;
  const bilesenleri=urunBilesenleri.filter(b=>b.urun_id===urunId);
  bilesenleri.forEach(b=>{
    const gMikTemel=(parseFloat(b.miktar)||0)*birimTemelCarp(b.birim_id)*mikTemel;
    if(b.kaynak_tip==='stok'){
      sonuc.push({stokId:b.kaynak_id,miktar:gMikTemel,ustAd,ustId});
    }else if(b.kaynak_tip!=='hizmet'){
      sayimHesaplaDagitim(b.kaynak_id,gMikTemel,ustAd,ustId,sonuc,_derinlik+1);
    }
  });
  return sonuc;
}
window.ymSayimUygula=function(){
  const tip=document.getElementById('ysm-tip').value;
  const kaynakId=document.getElementById('ysm-kalem').value;
  const miktar=parseFloat(document.getElementById('ysm-miktar').value)||0;
  const birimId=document.getElementById('ysm-birim').value;
  if(!kaynakId||!(miktar>0)||!birimId){bil('Kalem, miktar ve birim gerekli!','err');return;}
  const kalem=urunler.find(u=>u.id===kaynakId);
  const mikTemel=miktar*birimTemelCarp(birimId);
  const sonuc=sayimHesaplaDagitim(kaynakId,mikTemel,kalem?.ad||'Bilinmeyen',kaynakId);
  if(!sonuc.length){bil('Bu kalemin reçetesi tanımlı değil, dağıtılacak hammadde bulunamadı.','err');return;}
  // Aynı stok + aynı üst kaynak için topla, sonra fişe uygula
  const gruplanmis={};
  sonuc.forEach(r=>{
    const key=r.stokId+'|'+r.ustId;
    if(!gruplanmis[key])gruplanmis[key]={stokId:r.stokId,ustId:r.ustId,ustAd:r.ustAd,miktar:0};
    gruplanmis[key].miktar+=r.miktar;
  });
  Object.values(gruplanmis).forEach(g=>{
    let satir=sayimSatirListesi.find(s=>s.stokId===g.stokId);
    if(!satir){
      const stok=stoklar.find(x=>x.id===g.stokId);
      satir={stokId:g.stokId,birimId:stok?.birim_id||'',direkt:0,kaynaklar:[]};
      sayimSatirListesi.push(satir);
    }
    let kaynak=satir.kaynaklar.find(k=>k.ustId===g.ustId);
    if(kaynak)kaynak.miktar+=g.miktar;
    else satir.kaynaklar.push({ustId:g.ustId,ad:g.ustAd,miktar:g.miktar});
  });
  sySatirRender();
  modalKapat('modal-ym-sayim');
  bil(`${kalem?.ad||''} → ${Object.keys(gruplanmis).length} hammaddeye dağıtılıp fişe yansıtıldı ✓`);
};

// ---- Excel'den içe aktarma — sadece hammadde (stok) kabul eder ----
window.syExcelSecildi=async function(input){
  const file=input.files[0];if(!file)return;
  const depoId=document.getElementById('sy-depo')?.value;
  if(!depoId){bil('Excel aktarmadan önce depo seçin!','err');input.value='';return;}
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
    let eklenen=0;const hatali=[];
    for(const row of rows){
      if(!row||!row.length)continue;
      const kodRaw=row[0],miktarRaw=row[1],birimRaw=row[2];
      const kod=(kodRaw===undefined||kodRaw===null)?'':String(kodRaw).trim();
      if(!kod||kod.toLowerCase()==='kod')continue; // boş satır veya başlık satırı
      const miktar=parseFloat(miktarRaw);
      if(!(miktar>0)){hatali.push(`${kod} (miktar geçersiz)`);continue;}
      const stok=stoklar.find(s=>s.kod===kod);
      if(!stok){
        const urunEslesme=urunler.find(u=>u.kod===kod);
        if(urunEslesme)hatali.push(`${kod} (YM/Ürün kodu — "YM/Ürün Sayımı" penceresinden ekleyin)`);
        else hatali.push(`${kod} (kod bulunamadı)`);
        continue;
      }
      const birimKisa=(birimRaw===undefined||birimRaw===null)?'':String(birimRaw).trim().toLowerCase();
      const tbId=stok.birim_id;
      const uygunBirimler=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
      let birim=birimKisa?uygunBirimler.find(b=>(b.kisaltma||'').toLowerCase()===birimKisa):null;
      if(!birim)birim=birimler.find(b=>b.id===tbId)||uygunBirimler[0];
      const mikTemel=miktar*birimTemelCarp(birim?.id);
      sayimFisSatiriEkleVeyaGuncelle(stok.id,mikTemel);
      eklenen++;
    }
    sySatirRender();
    if(hatali.length)bil(`${eklenen} satır eklendi. ${hatali.length} satır atlandı: ${hatali.slice(0,4).join(', ')}${hatali.length>4?'...':''}`,'uyari');
    else if(eklenen)bil(`${eklenen} satır Excel'den eklendi ✓`);
    else bil('Excel dosyasında geçerli satır bulunamadı.','err');
  }catch(e){
    bil('Excel okunamadı: '+e.message,'err');
  }
  input.value='';
};

// ---- Fiş tablosu render ----
function sySatirRender(){
  const el=document.getElementById('sy-satirlar');if(!el)return;
  el.innerHTML=sayimSatirListesi.map((s,i)=>{
    const stok=stoklar.find(x=>x.id===s.stokId);
    const birim=birimler.find(b=>b.id===s.birimId);
    const ymToplam=s.kaynaklar.reduce((t,k)=>t+k.miktar,0);
    const genelToplam=(s.direkt||0)+ymToplam;
    const detaySatir=s._detayAcik?`<tr><td colspan="6" style="background:var(--krem);padding:6px 14px;font-size:11px;color:var(--yazi2)">
      ${s.kaynaklar.map(k=>`<span style="margin-right:12px">${k.ad}: <strong>${k.miktar.toLocaleString('tr-TR',{maximumFractionDigits:3})}</strong> ${birim?.kisaltma||''}</span>`).join('')}
    </td></tr>`:'';
    return `<tr>
      <td>${stok?stok.ad:'(bilinmeyen)'} <span style="font-size:10px;color:var(--yazi3)">[${stok?.kod||''}]</span></td>
      <td>${birim?.kisaltma||''}</td>
      <td><input type="number" placeholder="0" value="${s.direkt||''}" onblur="sySatirGuncelle(${i},this.value)" style="width:100%;padding:5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
      <td style="text-align:center">${ymToplam>0?`<span style="cursor:pointer;color:var(--mor);text-decoration:underline;font-size:12px" onclick="syDetayToggle(${i})">${ymToplam.toLocaleString('tr-TR',{maximumFractionDigits:3})} ${s._detayAcik?'▲':'▼'}</span>`:'<span style="color:var(--yazi3);font-size:12px">—</span>'}</td>
      <td style="font-weight:600">${genelToplam.toLocaleString('tr-TR',{maximumFractionDigits:3})}</td>
      <td><button onclick="sySatirSil(${i})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:18px">×</button></td>
    </tr>${detaySatir}`;
  }).join('');
}
window.syDetayToggle=function(i){sayimSatirListesi[i]._detayAcik=!sayimSatirListesi[i]._detayAcik;sySatirRender();};
window.sySatirGuncelle=function(i,val){sayimSatirListesi[i].direkt=parseFloat(val)||0;sySatirRender();};
window.sySatirSil=function(i){sayimSatirListesi.splice(i,1);sySatirRender();};

window.kaydetSayim=async function(){
  const tarih=document.getElementById('sy-tarih').value;
  const depoId=document.getElementById('sy-depo').value;
  const an=document.getElementById('sy-not').value;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(!depoId){bil('Depo seçimi zorunlu!','err');return;}
  const gecerli=sayimSatirListesi.filter(s=>(s.direkt>0)||s.kaynaklar.some(k=>k.miktar>0));
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  for(const s of gecerli){
    if(s.direkt>0){
      await sb.from('islemler').insert({
        tur:'sayim',tarih,depo_id:depoId,stok_id:s.stokId,birim_id:s.birimId||null,miktar:s.direkt,
        aciklama:'Sayım (direkt)',kat:'Sayım',satir_not:'Doğrudan sayım',aciklama_not:an,
        kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()
      });
    }
    for(const k of s.kaynaklar){
      if(!(k.miktar>0))continue;
      await sb.from('islemler').insert({
        tur:'sayim',tarih,depo_id:depoId,stok_id:s.stokId,urun_id:k.ustId,birim_id:s.birimId||null,miktar:k.miktar,
        aciklama:'Sayım (dolaylı)',kat:'Sayım',satir_not:`${k.ad} sayımından`,aciklama_not:an,
        kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()
      });
    }
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  sayimSatirListesi=[];sySatirRender();
  document.getElementById('sy-not').value='';
  bil(`${gecerli.length} kalem sayımı kaydedildi ✓`);
};

// ===== ALIŞ =====
let hmSatirListesi=[];
let _hmTur='malzeme'; // malzeme | hizmet | diger

window.hmTurDegis=function(){
  _hmTur=document.getElementById('hm-tur').value;
  hmSatirListesi=[];
  const thSecim=document.getElementById('hm-th-secim');
  if(thSecim)thSecim.textContent=_hmTur==='malzeme'?'Stok':_hmTur==='hizmet'?'Hizmet Kalemi':'Açıklama (Manuel)';
  const thAlt=document.getElementById('hm-th-alt');
  if(thAlt)thAlt.textContent=_hmTur==='diger'?'Masraf Merkezi':'Açıklama';
  hmSatirRender();
  setTimeout(()=>hmSatirEkle(),50);
};
window.stTurDegis=function(){
  const tip=document.getElementById('st-tip').value;
  const thAlt=document.getElementById('st-th-alt');
  if(thAlt)thAlt.textContent=tip==='diger'?'Gelir Merkezi':'Açıklama';
  stSatirRender();
};

window.hmSatirEkle=function(){
  hmSatirListesi.push({secimId:'',birimId:'',miktar:'',fiyat:'',tutar:'',satir_not:'',cari_id:'',odeme_tipi:'pesin',manuel:''});
  hmSatirRender();
};

function hmSecimOpts(seciliId){
  if(_hmTur==='malzeme'){
    return '<option value="">Stok seçin...</option>'+stoklar.filter(x=>x.tip==='stok'&&x.aktif!==false).map(k=>`<option value="${k.id}"${k.id===seciliId?' selected':''}>[${k.kod}] ${k.ad}</option>`).join('');
  }else if(_hmTur==='hizmet'){
    return '<option value="">Kalem seçin...</option>'+giderKalemleri.filter(g=>g.tip==='kalem'&&g.aktif!==false).map(k=>`<option value="${k.id}"${k.id===seciliId?' selected':''}>[${k.kod}] ${k.ad}</option>`).join('');
  }
  return '';
}
function hmBirimOpts(secimId,seciliId){
  if(_hmTur==='malzeme'){const s=stoklar.find(x=>x.id===secimId);const list=s?.birim_id?birimler.filter(b=>b.id===s.birim_id||b.temel_id===s.birim_id):birimler;return list.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');}
  return birimler.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');
}
function odemeOpts(secili='pesin'){return `<option value="pesin"${secili==='pesin'?' selected':''}>💵 Peşin</option><option value="cari"${secili==='cari'?' selected':''}>📋 Cari</option>`;}

function hmSatirRender(){
  const el=document.getElementById('hm-satirlar');if(!el)return;
  el.innerHTML=hmSatirListesi.map((s,i)=>`<tr>
    <td>${_hmTur==='diger'
      ?`<input type="text" placeholder="Ne alındı..." value="${s.manuel||''}" onblur="hmSatirGuncelle(${i},'manuel',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">`
      :`<select onchange="hmSatirGuncelle(${i},'secimId',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">${hmSecimOpts(s.secimId)}</select>`
    }</td>
    <td><select onchange="hmBirimSec(${i},this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">-</option>${hmBirimOpts(s.secimId,s.birimId)}</select></td>
    <td><input type="number" placeholder="0" value="${s.miktar||''}" onblur="hmSatirHesapla(${i},'miktar',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><input type="number" placeholder="0.00" value="${s.fiyat||''}" onblur="hmSatirHesapla(${i},'fiyat',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><input type="number" placeholder="0.00" value="${s.tutar||''}" onblur="hmSatirHesapla(${i},'tutar',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:500;color:var(--yesil)"></td>
    <td>${_hmTur==='diger'
      ?`<select onchange="hmSatirGuncelle(${i},'merkez_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">— Masraf Merkezi —</option>${merkezler.filter(m=>m.tip==='masraf'&&m.aktif!==false).map(m=>`<option value="${m.id}"${m.id===s.merkez_id?' selected':''}>${m.ad}</option>`).join('')}</select>`
      :`<input type="text" placeholder="Açıklama..." value="${s.satir_not||''}" onblur="hmSatirGuncelle(${i},'satir_not',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">`
    }</td>
    <td><select onchange="hmSatirGuncelle(${i},'cari_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">—</option>${(typeof cariOpts==='function'?cariOpts('',s.cari_id):'')}</select></td>
    <td><select onchange="hmSatirGuncelle(${i},'odeme_tipi',this.value);hmOdemeKasaGuncelle(${i},this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz);${s.odeme_tipi==='cari'?'color:var(--mor)':''}">${odemeOpts(s.odeme_tipi)}</select></td>
    <td style="min-width:90px">${s.odeme_tipi!=='cari'?`<select onchange="hmSatirGuncelle(${i},'kasa_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)" id="hm-kasa-${i}"><option value="">Kasa</option></select>`:'<span style="font-size:10px;color:var(--yazi3)">Cari</span>'}</td>
    <td><button onclick="hmSatirSil(${i})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:18px">×</button></td>
  </tr>`).join('');
  hmToplamGuncelle();
  setTimeout(()=>_doldurSatirKasalari('hm',hmSatirListesi.length),50);
}
function hmToplamGuncelle(){const t=hmSatirListesi.reduce((s,r)=>s+parseFloat(r.tutar||0),0);const el=document.getElementById('hm-toplam');if(el)el.textContent='₺'+t.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});}
// Satır render sonrası kasa select'lerini doldur
async function _doldurSatirKasalari(prefix, liste_len) {
  const satirListesi = prefix==='hm' ? hmSatirListesi : stSatirListesi;
  for(let i=0;i<liste_len;i++){
    const el=document.getElementById(`${prefix}-kasa-${i}`);
    if(el && typeof kasaSelectDoldur==='function') {
      await kasaSelectDoldur(`${prefix}-kasa-${i}`, true);
      // Mevcut kasa_id varsa seç, yoksa seçilen değeri satıra yaz
      if(satirListesi[i]?.kasa_id) {
        el.value = satirListesi[i].kasa_id;
      } else if(el.value) {
        satirListesi[i].kasa_id = el.value;
      }
      // Select değişince satır verisini güncelle
      el.onchange = (function(idx, pref){
        return function(){
          const lst = pref==='hm' ? hmSatirListesi : stSatirListesi;
          if(lst[idx]) lst[idx].kasa_id = this.value;
        };
      })(i, prefix);
    }
  }
}
window.hmOdemeKasaGuncelle=function(i,odeme){
  hmSatirListesi[i].odeme_tipi=odeme;
  hmSatirRender();
  setTimeout(()=>_doldurSatirKasalari('hm',hmSatirListesi.length),50);
};
window.stOdemeKasaGuncelle=function(i,odeme){
  stSatirListesi[i].odeme_tipi=odeme;
  stSatirRender();
  setTimeout(()=>_doldurSatirKasalari('st',stSatirListesi.length),50);
};

window.hmBirimSec=function(i,birimId){
  hmSatirListesi[i].birimId=birimId;
  const secimId=hmSatirListesi[i].secimId;
  if(secimId)birimHafizaYaz(secimId,birimId);
};
window.hmSatirGuncelle=function(i,alan,deger){
  hmSatirListesi[i][alan]=deger;
  if(alan==='secimId'&&_hmTur==='malzeme'){
    const k=stoklar.find(x=>x.id===deger);
    // Önce varsayılan birim, yoksa temel birim
    hmSatirListesi[i].birimId=k?.varsayilan_birim_id||k?.birim_id||'';
    if(k?.maliyet)hmSatirListesi[i].fiyat=k.maliyet.toString();
    hmSatirRender();
  }else if(alan==='secimId'&&_hmTur==='hizmet'){
    const k=giderKalemleri.find(x=>x.id===deger);
    hmSatirListesi[i].birimId=k?.varsayilan_birim_id||'';
    hmSatirRender();
  }
};
window.hmSatirHesapla=function(i,kaynak,val){
  hmSatirListesi[i][kaynak]=val;const mik=parseFloat(hmSatirListesi[i].miktar)||0;const fiy=parseFloat(hmSatirListesi[i].fiyat)||0;const tut=parseFloat(hmSatirListesi[i].tutar)||0;
  const row=document.querySelectorAll('#hm-satirlar tr')[i];if(!row)return;const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);hmSatirListesi[i].tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);hmSatirListesi[i].fiyat=y;if(inputs[1])inputs[1].value=y;}}
  hmToplamGuncelle();
};
window.hmSatirSil=function(i){hmSatirListesi.splice(i,1);hmSatirRender();};
window.kaydetHammadde=async function(){
  const tarih=document.getElementById('hm-tarih').value;
  const an=document.getElementById('hm-not').value;
  const belge=document.getElementById('hm-belge')?.value||null;
  const belgeId=crypto.randomUUID();
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  const gecerli=hmSatirListesi.filter(s=>(s.secimId||s.manuel)&&parseFloat(s.tutar)>0||(parseFloat(s.miktar)>0&&parseFloat(s.fiyat)>0));
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  // Peşin satırlarda kasa zorunlu
  for(const s of gecerli){
    if((s.odeme_tipi||'pesin')==='pesin'&&!s.kasa_id){
      bil('Peşin ödeme seçiliyse kasa seçimi zorunlu!','err');return;
    }
  }
  let n=0;
  for(const s of gecerli){
    const mik=parseFloat(s.miktar)||0;const fiy=parseFloat(s.fiyat)||0;const tut=parseFloat(s.tutar)||(mik*fiy)||0;const hFiy=tut>0&&mik>0?tut/mik:fiy;
    const odeme=s.odeme_tipi||'pesin';const kasaEtkisi=odeme==='pesin'?-tut:0;
    const satirKasaId=s.kasa_id||null;
    let islemData=null;
    if(_hmTur==='malzeme'&&s.secimId){
      const kart=stoklar.find(x=>x.id===s.secimId);
      const {data:id}=await sb.from('islemler').insert({tur:'giris',tarih,stok_id:s.secimId,birim_id:s.birimId||null,miktar:mik,fiyat:hFiy,tutar:tut,aciklama:`${kart?.ad||''} alışı`,kat:'Alış',aciklama_not:an,belge_no:belge,belge_id:belgeId,satir_not:s.satir_not||null,cari_id:s.cari_id||null,odeme_tipi:odeme,kasa_etkisi:kasaEtkisi,kasa_id:satirKasaId,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n}).select();
      islemData=id;
      if(hFiy>0){const yeni=hFiy/birimTemelCarp(s.birimId);const eski=parseFloat(kart?.maliyet||0);await sb.from('stoklar').update({maliyet:eski>0?(eski+yeni)/2:yeni}).eq('id',s.secimId);}
      if(s.birimId&&s.secimId)birimHafizaYaz(s.secimId,s.birimId);
    }else if(_hmTur==='hizmet'){
      const kalem=giderKalemleri.find(k=>k.id===s.secimId);
      const merkez_id=kalem?.merkez_id||null;
      const {data:id}=await sb.from('islemler').insert({tur:'gider',tarih,birim_id:s.birimId||null,miktar:mik,fiyat:hFiy,tutar:tut,aciklama:kalem?.ad||'Hizmet alımı',kat:kalem?.ad||'Hizmet',gider_kalem_id:s.secimId||null,aciklama_not:an,belge_id:belgeId,satir_not:s.satir_not||null,cari_id:s.cari_id||null,odeme_tipi:odeme,kasa_etkisi:kasaEtkisi,merkez_id,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n}).select();
      islemData=id;
    }else{
      const merkez_id=s.merkez_id||null;
      const {data:id}=await sb.from('islemler').insert({tur:'gider',tarih,birim_id:s.birimId||null,miktar:mik,fiyat:hFiy,tutar:tut,aciklama:s.manuel||'Diğer alım',kat:'Diğer',aciklama_not:an,belge_id:belgeId,satir_not:s.satir_not||null,cari_id:s.cari_id||null,odeme_tipi:odeme,kasa_etkisi:kasaEtkisi,merkez_id,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n}).select();
      islemData=id;
    }
    if(odeme==='cari'&&s.cari_id&&tut>0){
      const islemId=islemData?.[0]?.id||null;
      const aciklamaText=_hmTur==='malzeme'?`${stoklar.find(x=>x.id===s.secimId)?.ad||''} alışı`:_hmTur==='hizmet'?`${giderKalemleri.find(k=>k.id===s.secimId)?.ad||'Hizmet'} alışı`:s.manuel||'Alım';
      await sb.from('cari_hareketler').insert({cari_id:s.cari_id,islem_id:islemId,tarih,tip:'borc',tutar:tut,aciklama:`${aciklamaText} (${an||''})`,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n});
    }
    n++;
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
  hmSatirListesi=[];hmSatirRender();
  document.getElementById('hm-not').value='';
  const hmBelgeEl=document.getElementById('hm-belge');if(hmBelgeEl)hmBelgeEl.value='';
  bil(`${n} kalem kaydedildi ✓`);
};

// ===== KASA İŞLEMİ =====
window.ksTurDegis=function(){
  const tur=document.getElementById('ks-tur').value;
  const cariLabel=document.getElementById('ks-cari-label');
  const cariFg=document.getElementById('ks-cari-fg');
  const cariSel=document.getElementById('ks-cari');
  if(tur==='odeme'){
    cariFg.style.display='';cariLabel.textContent='Satıcı';
    cariSel.innerHTML='<option value="">— Satıcı seçin —</option>'+cariOpts('satici');
  }else if(tur==='tahsilat'){
    cariFg.style.display='';cariLabel.textContent='Alıcı';
    cariSel.innerHTML='<option value="">— Alıcı seçin —</option>'+cariOpts('alici');
  }else{
    cariFg.style.display='none';
  }
  // Kasa select doldur
  if(typeof kasaSelectDoldur==='function')kasaSelectDoldur('ks-kasa',true);
};
window.kaydetKasa=async function(){
  const tarih=document.getElementById('ks-tarih').value;
  const tur=document.getElementById('ks-tur').value;
  const tutar=parseFloat(document.getElementById('ks-tutar').value)||0;
  const aciklama=document.getElementById('ks-aciklama').value;
  const cariId=document.getElementById('ks-cari')?.value||'';
  const kasaId=document.getElementById('ks-kasa')?.value||null;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(tutar<=0){bil('Tutar zorunlu!','err');return;}
  if((tur==='odeme'||tur==='tahsilat')&&!cariId){bil('Cari seçin!','err');return;}
  if(!kasaId){bil('Kasa seçin!','err');return;}
  if(tur==='odeme'){
    await sb.from('cari_hareketler').insert({cari_id:cariId,tarih,tip:'alacak',tutar,aciklama:aciklama||'Ödeme yapıldı',kullanici:aktifKullanici?.ad||'',ts:Date.now()});
    await sb.from('islemler').insert({tur:'kasa',tarih,tutar,aciklama:aciklama||'Satıcı ödemesi',kat:'Kasa',kasa_etkisi:-tutar,kasa_id:kasaId,cari_id:cariId,kullanici:aktifKullanici?.ad||'',ts:Date.now()});
  }else if(tur==='tahsilat'){
    await sb.from('cari_hareketler').insert({cari_id:cariId,tarih,tip:'borc',tutar,aciklama:aciklama||'Tahsilat yapıldı',kullanici:aktifKullanici?.ad||'',ts:Date.now()});
    await sb.from('islemler').insert({tur:'kasa',tarih,tutar,aciklama:aciklama||'Alıcı tahsilatı',kat:'Kasa',kasa_etkisi:tutar,kasa_id:kasaId,cari_id:cariId,kullanici:aktifKullanici?.ad||'',ts:Date.now()});
  }else if(tur==='kasa-giris'){
    await sb.from('islemler').insert({tur:'kasa',tarih,tutar,aciklama:aciklama||'Kasa girişi',kat:'Kasa',kasa_etkisi:tutar,kasa_id:kasaId,kullanici:aktifKullanici?.ad||'',ts:Date.now()});
  }else{
    await sb.from('islemler').insert({tur:'kasa',tarih,tutar,aciklama:aciklama||'Kasa çıkışı',kat:'Kasa',kasa_etkisi:-tutar,kasa_id:kasaId,kullanici:aktifKullanici?.ad||'',ts:Date.now()});
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  document.getElementById('ks-tutar').value='';document.getElementById('ks-aciklama').value='';
  if(cariId){const {data:ch}=await sb.from('cari_hareketler').select('*').order('tarih',{ascending:true});if(ch&&typeof cariHareketler!=='undefined')cariHareketler=ch;}
  renderPanel();bil('Kasa işlemi kaydedildi ✓');
};

// ===== SATIŞ =====
let stSatirListesi=[];

// Birim hafızası — secimId:birimId eşlemesi
const _birimHafiza={};
function birimHafizaOku(secimId){try{const k=localStorage.getItem('birim_'+secimId);return k||null;}catch{return null;}}
function birimHafizaYaz(secimId,birimId){try{if(secimId&&birimId)localStorage.setItem('birim_'+secimId,birimId);}catch{}}

window.stSatirEkle=function(){stSatirListesi.push({secimId:'',birimId:'',miktar:'',fiyat:'',tutar:'',satir_not:'',cari_id:'',odeme_tipi:'pesin',manuel:''});stSatirRender();};

function stUrunOpts(seciliId){
  const tip=document.getElementById('st-tip')?.value||'urun';
  if(tip==='diger')return '';
  const liste=tip==='urun'?urunler.filter(u=>u.tip==='urun'&&u.aktif!==false):stoklar.filter(s=>s.tip==='stok'&&s.aktif!==false);
  return liste.map(x=>`<option value="${x.id}"${x.id===seciliId?' selected':''}>[${x.kod}] ${x.ad}</option>`).join('');
}
function stBirimOpts(secimId,seciliId){
  const tip=document.getElementById('st-tip')?.value||'urun';
  let tbId=null;
  if(tip==='urun'){const u=urunler.find(x=>x.id===secimId);tbId=u?.birim_id;}
  else if(tip==='stok'){const s=stoklar.find(x=>x.id===secimId);tbId=s?.birim_id;}
  const list=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
  return '<option value="">-</option>'+list.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');
}
function stSatirRender(){
  const el=document.getElementById('st-satirlar');if(!el)return;
  const tip=document.getElementById('st-tip')?.value||'urun';
  el.innerHTML=stSatirListesi.map((s,i)=>`<tr>
    <td>${tip==='diger'
      ?`<input type="text" placeholder="Ne satıldı..." value="${s.manuel||''}" onblur="stSatirGuncelle(${i},'manuel',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">`
      :`<select onchange="stSatirGuncelle(${i},'secimId',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">Seçin...</option>${stUrunOpts(s.secimId)}</select>`
    }</td>
    <td><select onchange="stSatirBirimSec(${i},this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">${stBirimOpts(s.secimId,s.birimId)}</select></td>
    <td><input type="number" placeholder="0" value="${s.miktar||''}" onblur="stSatirHesapla(${i},'miktar',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><input type="number" placeholder="0.00" value="${s.fiyat||''}" onblur="stSatirHesapla(${i},'fiyat',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><input type="number" placeholder="0.00" value="${s.tutar||''}" onblur="stSatirHesapla(${i},'tutar',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:500;color:var(--yesil)"></td>
    <td>${tip==='diger'
      ?`<select onchange="stSatirGuncelle(${i},'merkez_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">— Gelir Merkezi —</option>${merkezler.filter(m=>m.tip==='gelir'&&m.aktif!==false).map(m=>`<option value="${m.id}"${m.id===s.merkez_id?' selected':''}>${m.ad}</option>`).join('')}</select>`
      :`<input type="text" placeholder="Açıklama..." value="${s.satir_not||''}" onblur="stSatirGuncelle(${i},'satir_not',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">`
    }</td>
    <td><select onchange="stSatirGuncelle(${i},'cari_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">—</option>${(typeof cariOpts==='function'?cariOpts('alici',s.cari_id):'')}</select></td>
    <td><select onchange="stSatirGuncelle(${i},'odeme_tipi',this.value);stOdemeKasaGuncelle(${i},this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz);${s.odeme_tipi==='cari'?'color:var(--mor)':''}">${odemeOpts(s.odeme_tipi)}</select></td>
    <td style="min-width:90px">${s.odeme_tipi!=='cari'?`<select onchange="stSatirGuncelle(${i},'kasa_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)" id="st-kasa-${i}"><option value="">Kasa</option></select>`:'<span style="font-size:10px;color:var(--yazi3)">Cari</span>'}</td>
    <td><button onclick="stSatirSil(${i})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:18px">×</button></td>
  </tr>`).join('');
  stToplamGuncelle();
  setTimeout(()=>_doldurSatirKasalari('st',stSatirListesi.length),50);
}
function stToplamGuncelle(){const t=stSatirListesi.reduce((s,r)=>s+parseFloat(r.tutar||0),0);const el=document.getElementById('st-toplam');if(el)el.textContent='₺'+t.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});}

window.stSatirBirimSec=function(i,birimId){
  stSatirListesi[i].birimId=birimId;
  if(stSatirListesi[i].secimId)birimHafizaYaz(stSatirListesi[i].secimId,birimId);
};
window.stSatirGuncelle=function(i,alan,deger){
  stSatirListesi[i][alan]=deger;
  if(alan==='secimId'){
    const tip=document.getElementById('st-tip')?.value||'urun';
    if(tip==='urun'){
      const u=urunler.find(x=>x.id===deger);
      stSatirListesi[i].birimId=u?.varsayilan_birim_id||u?.birim_id||'';
      if(u?.fiyat)stSatirListesi[i].fiyat=u.fiyat.toString();
    }else if(tip==='stok'){
      const s=stoklar.find(x=>x.id===deger);
      stSatirListesi[i].birimId=s?.varsayilan_birim_id||s?.birim_id||'';
    }
    stSatirRender();
  }
};
window.stSatirHesapla=function(i,kaynak,val){
  stSatirListesi[i][kaynak]=val;const mik=parseFloat(stSatirListesi[i].miktar)||0;const fiy=parseFloat(stSatirListesi[i].fiyat)||0;const tut=parseFloat(stSatirListesi[i].tutar)||0;
  const row=document.querySelectorAll('#st-satirlar tr')[i];if(!row)return;const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);stSatirListesi[i].tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);stSatirListesi[i].fiyat=y;if(inputs[1])inputs[1].value=y;}}
  stToplamGuncelle();
};
window.stSatirSil=function(i){stSatirListesi.splice(i,1);stSatirRender();};
window.kaydetSatis=async function(){
  const tarih=document.getElementById('st-tarih').value;const tip=document.getElementById('st-tip').value;
  const an=document.getElementById('st-not').value;
  const belge=document.getElementById('st-belge')?.value||null;
  const belgeId=crypto.randomUUID();
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  const gecerli=tip==='diger'
    ?stSatirListesi.filter(s=>s.manuel&&parseFloat(s.tutar)>0||(parseFloat(s.miktar)>0&&parseFloat(s.fiyat)>0))
    :stSatirListesi.filter(s=>s.secimId&&parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  // Peşin satırlarda kasa zorunlu
  for(const s of gecerli){
    if((s.odeme_tipi||'pesin')==='pesin'&&!s.kasa_id){
      bil('Peşin ödeme seçiliyse kasa seçimi zorunlu!','err');return;
    }
  }
  let n=0;
  for(const s of gecerli){
    const mik=parseFloat(s.miktar)||0;const fiy=parseFloat(s.fiyat)||0;const tut=parseFloat(s.tutar)||(mik*fiy)||0;const bId=s.birimId||'';
    const odeme=s.odeme_tipi||'pesin';const kasaEtkisi=odeme==='pesin'?tut:0;
    const satirKasaId=s.kasa_id||null;
    let islemData=null;
    if(tip==='urun'){
      const u=urunler.find(x=>x.id===s.secimId);
      const {data:id}=await sb.from('islemler').insert({tur:'satis',tarih,urun_id:s.secimId,birim_id:bId,miktar:mik,fiyat:fiy,tutar:tut,aciklama:`${u?.ad||''} satışı`,kat:'Satış',aciklama_not:an,belge_no:belge,belge_id:belgeId,satir_not:s.satir_not||null,cari_id:s.cari_id||null,odeme_tipi:odeme,kasa_etkisi:kasaEtkisi,kasa_id:satirKasaId,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n}).select();
      islemData=id;
      if(s.birimId)birimHafizaYaz(s.secimId,s.birimId);
      // Reçeteye göre hammaddeleri (iç içe YM/ürün dahil) düş — üretim adımına gerek yok
      const mikTemel=mik*birimTemelCarp(bId);
      await satisSarfiyatKaydet(s.secimId,mikTemel,tarih,an);
    }else if(tip==='stok'){
      const sk=stoklar.find(x=>x.id===s.secimId);
      if(stokMiktar(s.secimId)<mik*birimTemelCarp(bId)){if(!(await onay(`${sk?.ad||''} stoğu yetersiz! Yine de satış yapılsın mı?`,'⚠️')))return;}
      const {data:id}=await sb.from('islemler').insert({tur:'satis',tarih,stok_id:s.secimId,birim_id:bId,miktar:mik,fiyat:fiy,tutar:tut,aciklama:`${sk?.ad||''} satışı`,kat:'Satış',aciklama_not:an,belge_no:belge,belge_id:belgeId,satir_not:s.satir_not||null,cari_id:s.cari_id||null,odeme_tipi:odeme,kasa_etkisi:kasaEtkisi,kasa_id:satirKasaId,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n}).select();
      islemData=id;
      if(s.birimId)birimHafizaYaz(s.secimId,s.birimId);
    }else{
      const merkez_id=s.merkez_id||null;
      const {data:id}=await sb.from('islemler').insert({tur:'satis',tarih,birim_id:bId,miktar:mik,fiyat:fiy,tutar:tut,aciklama:s.manuel||'Satış',kat:'Satış',aciklama_not:an,belge_no:belge,belge_id:belgeId,satir_not:s.satir_not||null,cari_id:s.cari_id||null,odeme_tipi:odeme,kasa_etkisi:kasaEtkisi,kasa_id:satirKasaId,merkez_id,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n}).select();
      islemData=id;
    }
    if(odeme==='cari'&&s.cari_id&&tut>0){
      await sb.from('cari_hareketler').insert({cari_id:s.cari_id,islem_id:islemData?.[0]?.id||null,tarih,tip:'alacak',tutar:tut,aciklama:`Satış (${an||''})`,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n});
    }
    n++;
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  const {data:ud}=await sb.from('urunler').select('*').order('kod');if(ud)urunler=ud;
  stSatirListesi=[];stSatirRender();
  document.getElementById('st-not').value='';
  const stBelgeEl=document.getElementById('st-belge');if(stBelgeEl)stBelgeEl.value='';
  bil(`${n} kalem satış kaydedildi ✓`);
};

// ===== GİDER =====
const GD_KATLAR=['Elektrik & su','Genel giderler','Personel','Kira','Diğer gider'];
let gdSatirListesi=[];
window.gdSatirEkle=function(){gdSatirListesi.push({kalemId:'',birimId:'',miktar:'',fiyat:'',tutar:'',satir_not:'',cari_id:''});gdSatirRender();};
function gdBirimOpts(seciliId){return '<option value="">-</option>'+birimler.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');}
function gdSatirRender(){
  const el=document.getElementById('gd-satirlar');if(!el)return;
  const kalemler=giderKalemleri.filter(g=>g.tip==='kalem'&&g.aktif!==false);
  el.innerHTML=gdSatirListesi.map((s,i)=>`<tr>
    <td><select onchange="gdSatirGuncelle(${i},'kalemId',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
      <option value="">Kalem seçin...</option>
      ${kalemler.map(k=>`<option value="${k.id}"${k.id===s.kalemId?' selected':''}>[${k.kod}] ${k.ad}</option>`).join('')}
    </select></td>
    <td><select onchange="gdSatirGuncelle(${i},'birimId',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">${gdBirimOpts(s.birimId)}</select></td>
    <td><input type="number" placeholder="0" value="${s.miktar||''}" onblur="gdSatirHesapla(${i},'miktar',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><input type="number" placeholder="0.00" value="${s.fiyat||''}" onblur="gdSatirHesapla(${i},'fiyat',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><input type="number" placeholder="0.00" value="${s.tutar||''}" onblur="gdSatirHesapla(${i},'tutar',this.value)" style="width:100%;padding:6px 5px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:500;color:var(--turuncu)"></td>
    <td><input type="text" placeholder="Açıklama..." value="${s.satir_not||''}" onblur="gdSatirGuncelle(${i},'satir_not',this.value)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td>
    <td><select onchange="gdSatirGuncelle(${i},'cari_id',this.value)" style="width:100%;padding:5px 4px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)"><option value="">—</option>${(typeof cariOptsGider==='function'?cariOptsGider(s.cari_id):'')}</select></td>
    <td><button onclick="gdSatirSil(${i})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:18px">×</button></td>
  </tr>`).join('');
  gdToplamGuncelle();
}
function gdToplamGuncelle(){const t=gdSatirListesi.reduce((s,r)=>s+parseFloat(r.tutar||0),0);const el=document.getElementById('gd-toplam');if(el)el.textContent='₺'+t.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});}
window.gdSatirGuncelle=function(i,alan,deger){gdSatirListesi[i][alan]=deger;if(alan==='tutar')gdToplamGuncelle();};
window.gdSatirHesapla=function(i,kaynak,val){
  gdSatirListesi[i][kaynak]=val;
  const mik=parseFloat(gdSatirListesi[i].miktar)||0;const fiy=parseFloat(gdSatirListesi[i].fiyat)||0;const tut=parseFloat(gdSatirListesi[i].tutar)||0;
  const row=document.querySelectorAll('#gd-satirlar tr')[i];if(!row)return;const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);gdSatirListesi[i].tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);gdSatirListesi[i].fiyat=y;if(inputs[1])inputs[1].value=y;}}
  gdToplamGuncelle();
};
window.gdSatirSil=function(i){gdSatirListesi.splice(i,1);gdSatirRender();};
window.kaydetGider=async function(){
  const tarih=document.getElementById('gd-tarih').value;const an=document.getElementById('gd-genel-not').value;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  const gecerli=gdSatirListesi.filter(s=>s.kalemId||parseFloat(s.tutar)>0||parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır ekleyin!','err');return;}
  const sifirVar=gecerli.some(s=>!(parseFloat(s.tutar)>0)&&!(parseFloat(s.miktar)>0&&parseFloat(s.fiyat)>0));
  if(sifirVar&&!(await onay('Tutarı 0 olan satır var. Yine de kaydetmek istiyor musunuz?','❓')))return;
  let n=0;
  for(const s of gecerli){
    const mik=parseFloat(s.miktar)||0;const fiy=parseFloat(s.fiyat)||0;
    const tutar=parseFloat(s.tutar)||(mik&&fiy?mik*fiy:0);
    const kalem=giderKalemleri.find(k=>k.id===s.kalemId);
    const merkez_id=kalem?.merkez_id||null;const kat=kalem?.ad||'Gider';
    await sb.from('islemler').insert({tur:'gider',tarih,tutar,miktar:mik||null,birim_id:s.birimId||null,fiyat:fiy||null,kat,gider_kalem_id:s.kalemId||null,aciklama:kat,aciklama_not:an,satir_not:s.satir_not||null,cari_id:s.cari_id||null,merkez_id,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()+n});
    n++;
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  gdSatirListesi=[];gdSatirRender();document.getElementById('gd-genel-not').value='';bil(`${n} gider kaydedildi ✓`);
};
