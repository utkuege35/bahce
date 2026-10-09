// Öneri listesi sıralaması: yazılan harflerle BAŞLAYANLAR önce, sonra içinde geçenler.
// Sınırsız liste döner (tüm kalemler kaydırılarak görülebilir).
window._oneriSirala=function(liste,q,adFn){
  if(!q)return liste;
  const bas=[],ic=[];
  liste.forEach(x=>{(adFn(x).toLocaleLowerCase('tr').startsWith(q)?bas:ic).push(x);});
  return bas.concat(ic);
};
// ===== ARAMA KUTUSU (ÖNERİ LİSTESİ) KLAVYE GEZİNMESİ =====
// Malzeme/ürün arama kutularında (Alış, Satış, İrsaliyeler...) öneri
// listesi açıkken aşağı/yukarı ok ile üzerinde gezinme, Enter ile üzerinde
// durulanı seçme sağlar. Liste kapalıysa aşağı ok eski davranışa
// (satirAsagiGec — bir alt satıra geçiş) döner.
window._oneriTusVurusu=function(e,kutuId){
  const kutu=document.getElementById(kutuId);
  const acik=!!(kutu&&kutu.style.display==='block'&&kutu.children.length>0);
  if(e.key==='ArrowDown'){
    if(acik){
      e.preventDefault();
      let idx=parseInt(kutu.dataset.vurgu||'-1',10);
      idx=Math.min(idx+1,kutu.children.length-1);
      _oneriVurguAyarla(kutu,idx);
    }else{
      satirAsagiGec(e);
    }
    return;
  }
  if(e.key==='ArrowUp'){
    if(acik){
      e.preventDefault();
      let idx=parseInt(kutu.dataset.vurgu||'-1',10);
      idx=Math.max(idx-1,0);
      _oneriVurguAyarla(kutu,idx);
    }
    return;
  }
  if(e.key==='Enter'){
    if(acik){
      const idx=parseInt(kutu.dataset.vurgu||'-1',10);
      const el=kutu.children[idx>=0?idx:0];
      if(el){e.preventDefault();el.click();}
    }
    return;
  }
  if(e.key==='Escape'&&kutu)kutu.style.display='none';
};
function _oneriVurguAyarla(kutu,idx){
  Array.from(kutu.children).forEach((el,i)=>{
    el.classList.toggle('oneri-aktif',i===idx);
    // Harici CSS'e bağımlı kalmamak için vurguyu doğrudan satır içi style
    // ile de uyguluyoruz — bu dosya güncellenince kesin görünür olsun diye.
    el.style.background=i===idx?'rgba(91,158,201,.35)':'';
    el.style.outline=i===idx?'1px solid rgba(91,158,201,.6)':'none';
  });
  kutu.dataset.vurgu=String(idx);
  kutu.children[idx]?.scrollIntoView({block:'nearest'});
}

// ===== SATIRDA AŞAĞI OK TUŞU İLE GEZİNME =====
// Excel'deki gibi: bir hücrede aşağı ok tuşuna basınca, bir alt satırın
// aynı sütunundaki (hücredeki) giriş alanına odaklanır.
// ===== SATIR TAMAMLANMA KONTROLÜ (genel/yeniden kullanılabilir kayıt sistemi) =====
// Her tablo türü (hm, st, dv, irs-alis, ileride fatura/stok işlemleri...)
// kendi "satırı oku" ve "satır tamam mı" fonksiyonlarını buraya kaydeder.
// Yeni bir ekran eklenince sadece bir _satirKayitEkle(...) çağrısı yeterli.
window._satirTabloKayit={};
window._satirKayitEkle=function(tabloAdi,getSatir,tamamMi){
  window._satirTabloKayit[tabloAdi]={getSatir,tamamMi};
};

// ===== ÖNERİ LİSTESİNDE KLAVYE İLE GEZİNME =====
// Malzeme/ürün arama kutularının altında açılan öneri listesi için ortak
// kullanılır (Alış, Satış, İrsaliyeler, ileride Fatura/Stok İşlemleri...).
// Liste açıkken: ↓/↑ ile üzerinde gezinilir, Enter ile üzerindeki öğe seçilir.
// Liste kapalıyken: eski davranışa (satirAsagiGec) düşer.
window.oneriKlavye=function(e,kutuId){
  const kutu=document.getElementById(kutuId);
  const acikMi=kutu&&kutu.style.display==='block'&&kutu.querySelector('.oneri-item');
  if(acikMi&&(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter')){
    e.preventDefault();
    const items=Array.from(kutu.querySelectorAll('.oneri-item'));
    let idx=items.findIndex(it=>it.classList.contains('oneri-aktif'));
    if(e.key==='ArrowDown'){
      idx=idx<items.length-1?idx+1:0;
      items.forEach(it=>it.classList.remove('oneri-aktif'));
      items[idx].classList.add('oneri-aktif');
      items[idx].scrollIntoView({block:'nearest'});
    }else if(e.key==='ArrowUp'){
      idx=idx>0?idx-1:items.length-1;
      items.forEach(it=>it.classList.remove('oneri-aktif'));
      items[idx].classList.add('oneri-aktif');
      items[idx].scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter'){
      if(idx>=0)items[idx].click();
      else if(items.length===1)items[0].click();
    }
    return;
  }
  satirAsagiGec(e);
};

window.satirAsagiGec=function(e){
  if(e.key!=='ArrowDown')return;
  const el=e.target;
  const td=el.closest('td');const tr=td?.closest('tr');
  if(!tr||!td)return;
  const nextTr=tr.nextElementSibling;
  if(!nextTr)return;

  // Satır, alt satıra geçmeden önce tamamlanmış olmalı (kayıtlı tablolarda)
  const tabloAdi=tr.dataset.tablo;
  if(tabloAdi&&window._satirTabloKayit[tabloAdi]){
    const {getSatir,tamamMi}=window._satirTabloKayit[tabloAdi];
    const tbody=tr.parentElement;
    const rowIdx=Array.from(tbody.children).indexOf(tr);
    const satir=getSatir(rowIdx);
    if(!tamamMi(satir)){
      e.preventDefault();
      bil('Alt satıra geçmeden önce bu satırı tamamlayın (malzeme, birim, miktar, fiyat, tutar)','err');
      return;
    }
  }

  // Öncelik: satırdaki "ana" alan (malzeme/ürün/stok adı) — hangi sütunda
  // olursak olalım, aşağı ok tuşu her zaman bir sonraki satırın bu alanına gider.
  let odaklanacak=nextTr.querySelector('[data-satir-ana="1"]');
  if(!odaklanacak){
    // Ana alan işaretli değilse (ör. Sayım/Devir gibi tablolarda), eski
    // davranışa dön: aynı sütundaki (hücredeki) alana odaklan.
    const tds=Array.from(tr.children);
    const colIdx=tds.indexOf(td);
    const nextTd=nextTr.children[colIdx];
    odaklanacak=nextTd?.querySelector('input,select');
  }
  if(odaklanacak){
    e.preventDefault();
    odaklanacak.focus();
    if(typeof odaklanacak.select==='function')odaklanacak.select();
  }
};

// Alış (hm), Satış (st), Devir (dv) satırlarının tamamlanma kuralları
_satirKayitEkle('hm',
  (i)=>hmSatirListesi[i],
  (s)=>{
    if(!s)return false;
    const miktar=parseFloat(s.miktar)||0,fiyat=parseFloat(s.fiyat)||0,tutar=parseFloat(s.tutar)||0;
    if(!(miktar>0&&fiyat>0&&tutar>0))return false;
    const tip=s.tip||'hizmet';
    const secimVar=tip==='diger'?!!s.manuel:!!s.secimId;
    return secimVar&&!!s.birimId;
  }
);


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
// (Üretim kaydı artık Stok İşlemleri → Üretim sekmesindedir: stokuretim.js)

let sayimSatirListesi=[];
// Mevcut bir sayım fişi "Fişi Düzenle" ile açıldığında bu fişin belge_id'sini
// tutar. Dolu olduğu sürece kaydetSayim() YENİ fiş açmaz, bu belge_id'yi
// günceller (eski satırları silip yeni haliyle yeniden yazar).
let _syDuzenlenenBelgeId=null;
let _syHoverIndex=null;
window.sySatirSilHover=function(){if(_syHoverIndex===null||!sayimSatirListesi[_syHoverIndex]){bil('Önce bir satır seçin','err');return;}sySatirSil(_syHoverIndex);};

function doldurDepoSecleri(){
 const el=document.getElementById('sy-depo');if(!el)return;
 const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
 const c=el.value;
 el.innerHTML='<option value="">— Depo seçin —</option>'+kapsam.filter(d=>d.aktif!==false).map(d=>`<option value="${d.id}">${d.ad}${d.kod?' ['+d.kod+']':''}</option>`).join('');
 if(c)el.value=c;
}

// ---- Hammadde / YM-Ürün seçim listeleri (modallar için) ----
function sySecimOpts(tip,seciliId,filtre){
 let liste;
 if(tip==='stok')liste=stoklar.filter(s=>s.tip==='stok'&&s.aktif!==false);
 else if(tip==='ara_urun')liste=urunler.filter(u=>u.tip==='ara_urun'&&u.aktif!==false);
 else liste=urunler.filter(u=>u.tip==='urun'&&u.aktif!==false);
 if(filtre){const f=filtre.trim().toLocaleLowerCase('tr');liste=liste.filter(x=>(x.ad||'').toLocaleLowerCase('tr').includes(f)||(x.kod||'').toLowerCase().includes(f.toLowerCase()));}
 return '<option value=""></option>'+liste.map(x=>`<option value="${x.id}"${x.id===seciliId?' selected':''}>${x.ad}</option>`).join('');
}
function syBirimOpts(tip,kaynakId,seciliId){
 let tbId=null;
 if(tip==='stok'){const s=stoklar.find(x=>x.id===kaynakId);tbId=s?.birim_id;}
 else{const u=urunler.find(x=>x.id===kaynakId);tbId=u?.birim_id;}
 const list=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
 return '<option value=""></option>'+list.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');
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

// ---- YM / Ürün Sayımı (ayrı ekran) ----
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
// Bu ekranda hangi ürün/YM'den ne kadar sayıldığı satır satır görünür
// (Hammadde Sayım Fişi'ndeki gibi) — "Sayım Fişine Yansıt" ile ana fişe eklenir.
let _ymSayimListesi=[];
// YM/Ürün seviyesindeki orijinal sayılan miktarları (hammadde dağılımına
// girmeden ÖNCEki hali) tutar — "Sayım Fişine Yansıt" her tıklandığında
// birikir, aynı YM/Ürün tekrar sayılırsa üzerine toplanır. "Sayımı Kaydet"
// ile birlikte veritabanına da yazılır (stok_id boş, urun_id dolu satırlar
// olarak) — böylece "hangi YM'den ne kadar saymışım" sonradan raporlanabilir.
let _ymSayimOzetListesi=[];
let _ymsyHoverIndex=null;
function ymsySecenekleri(tip){
 if(tip==='ara_urun')return urunler.filter(u=>u.tip==='ara_urun'&&u.aktif!==false);
 return urunler.filter(u=>u.tip==='urun'&&u.aktif!==false);
}
window.ymSayimSatirSilHover=function(){
 if(_ymsyHoverIndex===null||!_ymSayimListesi[_ymsyHoverIndex]){bil('Önce bir satır seçin','err');return;}
 _ymSayimListesi.splice(_ymsyHoverIndex,1);ymSayimSatirRender();
};
window.ymSayimSatirGuncelle=function(i,alan,deger){
 _ymSayimListesi[i][alan]=alan==='miktar'?(parseFloat(deger)||0):deger;
 ymSayimSatirRender();
};
window.ymSayimBosSatirTipDegis=function(sel){
 ymSayimSatirRender();
};
window.ymSayimAramaInput=function(val){
 const tip=document.getElementById('ymsy-bos-tip')?.value||'ara_urun';
 const eslesen=ymsySecenekleri(tip).find(x=>`[${x.kod}] ${x.ad}`===val);
 if(eslesen)ymSayimBosSatirSec(eslesen.id);
};

// ---- Excel'den toplu içe aktar (Tip | Kalem Adı | Birim | Miktar) ----
// Tam ya da hiç: dosyanın TAMAMI önce doğrulanır, tek bir satırda bile hata
// varsa (kalem adı bulunamadı, birim uyuşmazlığı vb.) HİÇBİR satır eklenmez.
window.ymSayimExcelSecildi=async function(input){
 const file=input.files[0];if(!file)return;
 if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
 try{
 const data=await file.arrayBuffer();
 const wb=XLSX.read(data,{type:'array'});
 const ws=wb.Sheets[wb.SheetNames[0]];
 const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});
 const gecerliSatirlar=[];const hatali=[];
 for(const row of rows){
 if(!row||!row.length)continue;
 const tipRaw=(row[0]===undefined||row[0]===null)?'':String(row[0]).trim().toLowerCase();
 if(!tipRaw||tipRaw==='tip')continue; // başlık veya boş satır
 const ad=(row[1]===undefined||row[1]===null)?'':String(row[1]).trim();
 const birimKisa=(row[2]===undefined||row[2]===null)?'':String(row[2]).trim().toLowerCase();
 const miktar=parseFloat(row[3]);
 if(!ad){hatali.push('(isimsiz satır)');continue;}
 if(!(miktar>0)){hatali.push(`${ad} (miktar geçersiz)`);continue;}
 const tip=tipRaw.startsWith('yarı')||tipRaw==='ym'||tipRaw==='ara_urun'?'ara_urun':'urun';
 const kalem=ymsySecenekleri(tip).find(x=>x.ad.trim().toLowerCase()===ad.toLowerCase());
 if(!kalem){hatali.push(`${ad} (${tip==='ara_urun'?'Yarı Mamul':'Ürün'} olarak bulunamadı)`);continue;}
 const tbId=kalem.birim_id;
 const uygunBirimler=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
 let birim=birimKisa?uygunBirimler.find(b=>(b.kisaltma||'').toLowerCase()===birimKisa):null;
 if(birimKisa&&!birim){hatali.push(`${ad} (birim "${birimKisa}" bu kalem için uygun değil)`);continue;}
 if(!birim)birim=birimler.find(b=>b.id===(kalem.varsayilan_birim_id||tbId))||uygunBirimler[0];
 gecerliSatirlar.push({tip,kaynakId:kalem.id,birimId:birim?.id||'',miktar});
 }
 if(hatali.length){
 bil(`❌ Yükleme iptal edildi — hiçbir satır eklenmedi. ${hatali.length} satırda hata var: ${hatali.slice(0,10).join(', ')}${hatali.length>10?` (+${hatali.length-10} satır daha)`:''}`,'err');
 input.value='';
 return;
 }
 if(!gecerliSatirlar.length){
 bil('Excel dosyasında geçerli satır bulunamadı.','err');
 input.value='';
 return;
 }
 _ymSayimListesi.push(...gecerliSatirlar);
 ymSayimSatirRender();
 bil(`✓ ${gecerliSatirlar.length} kalem Excel'den eklendi`);
 }catch(e){
 bil('Excel okunamadı: '+e.message,'err');
 }
 input.value='';
};
window.ymSayimBosSatirSec=function(kalemId){
 if(!kalemId)return;
 const tip=document.getElementById('ymsy-bos-tip')?.value||'ara_urun';
 const kalem=urunler.find(u=>u.id===kalemId);
 _ymSayimListesi.push({tip,kaynakId:kalemId,birimId:kalem?.varsayilan_birim_id||kalem?.birim_id||'',miktar:''});
 ymSayimSatirRender();
};
window.ymSayimSatirRender=function(){
 const el=document.getElementById('ymsy-satirlar');if(!el)return;
 let html=_ymSayimListesi.map((s,i)=>{
 const kalem=urunler.find(u=>u.id===s.kaynakId);
 return `<tr onmouseenter="_ymsyHoverIndex=${i}">
 <td><span class="tip-chip ${s.tip==='urun'?'tip-urun':'tip-ara'}" style="font-size:9px">${s.tip==='urun'?'ÜRÜN':'YM'}</span></td>
 <td>[${kalem?.kod||''}] ${kalem?.ad||'(bilinmeyen)'}</td>
 <td><input type="number" value="${s.miktar||''}" onfocus="_ymsyHoverIndex=${i}" onblur="ymSayimSatirGuncelle(${i},'miktar',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px"></td>
 <td><select onchange="ymSayimSatirGuncelle(${i},'birimId',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)">${syBirimOpts(s.tip,s.kaynakId,s.birimId)}</select></td>
 <td></td>
 </tr>`;
 }).join('');
 const tipBos=document.getElementById('ymsy-bos-tip')?.value||'ara_urun';
 html+=`<tr style="background:var(--krem)">
 <td><select id="ymsy-bos-tip" onchange="ymSayimBosSatirTipDegis(this)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)">
 <option value="ara_urun"${tipBos==='ara_urun'?' selected':''}>⚙️ Yarı Mamul</option>
 <option value="urun"${tipBos==='urun'?' selected':''}>🍽️ Ürün</option>
 </select></td>
 <td><input type="text" id="ymsy-bos-kalem-arama" list="ymsy-datalist" autocomplete="off" oninput="ymSayimAramaInput(this.value)" style="width:100%;padding:3px 6px;font-size:12px;background:var(--beyaz)">
 <datalist id="ymsy-datalist">${ymsySecenekleri(tipBos).map(x=>`<option value="[${x.kod}] ${x.ad}">`).join('')}</datalist></td>
 <td colspan="2" style="color:var(--yazi3);font-size:11px">Seçince satır otomatik eklenir</td>
 <td></td>
 </tr>`;
 el.innerHTML=html;
};
window.ymSayimTumunuYansit=function(){
 const gecerli=_ymSayimListesi.filter(s=>s.kaynakId&&s.miktar>0&&s.birimId);
 if(!gecerli.length){bil('Yansıtılacak geçerli satır yok!','err');return;}
 let hatali=0;
 gecerli.forEach(s=>{
 const kalem=urunler.find(u=>u.id===s.kaynakId);
 const mikTemel=s.miktar*birimTemelCarp(s.birimId);
 const sonuc=sayimHesaplaDagitim(s.kaynakId,mikTemel,kalem?.ad||'Bilinmeyen',s.kaynakId);
 if(!sonuc.length){hatali++;return;}
 // Orijinal YM/Ürün seviyesindeki sayılan miktarı da ayrıca biriktir
 let ozet=_ymSayimOzetListesi.find(o=>o.urunId===s.kaynakId);
 if(!ozet){ozet={tip:s.tip,urunId:s.kaynakId,ad:kalem?.ad||'Bilinmeyen',birimId:s.birimId,miktar:0};_ymSayimOzetListesi.push(ozet);}
 ozet.miktar+=parseFloat(s.miktar)||0;
 const gruplanmis={};
 sonuc.forEach(r=>{
 const key=r.stokId+'|'+r.ustId;
 if(!gruplanmis[key])gruplanmis[key]={stokId:r.stokId,ustId:r.ustId,ustAd:r.ustAd,miktar:0};
 gruplanmis[key].miktar+=r.miktar;
 });
 Object.values(gruplanmis).forEach(g=>{
 let satir=sayimSatirListesi.find(x=>x.stokId===g.stokId);
 if(!satir){
 const stok=stoklar.find(x=>x.id===g.stokId);
 satir={stokId:g.stokId,birimId:stok?.birim_id||'',direkt:0,kaynaklar:[]};
 sayimSatirListesi.push(satir);
 }
 let kaynak=satir.kaynaklar.find(k=>k.ustId===g.ustId);
 if(kaynak)kaynak.miktar+=g.miktar;
 else satir.kaynaklar.push({ustId:g.ustId,ad:g.ustAd,miktar:g.miktar});
 });
 });
 const yansitilan=gecerli.length-hatali;
 _ymSayimListesi=[];
 // Sayım Fişi'ne (Stok İşlemleri > Sayım sekmesi) geri dön
 syFormAc();
 sySatirRender();
 if(hatali)bil(`${yansitilan} kalem sayım fişine yansıtıldı. ${hatali} kalemin reçetesi tanımlı değildi, atlandı.`,'uyari');
 else bil(`${yansitilan} kalem sayım fişine yansıtıldı ✓`);
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
// Tek "Miktar" kolonu gösterilir (direkt + YM/Ürün kaynaklı toplam birlikte).
// Kaynağın nereden geldiği burada gösterilmez — Sayım Raporu ekranında var.
// En altta her zaman boş bir satır durur — oradan hammadde seçince satır
// otomatik eklenir ve altında yeni bir boş satır belirir (ayrı pencere yok).
function sySatirRender(){
 const el=document.getElementById('sy-satirlar');if(!el)return;
 const f3=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});
 const kr=(v,esik)=>v<-(esik||0.0005)?'color:#c62828;':''; // sadece negatif sayılar kırmızı
 let topKalanT=0,topSayimT=0,kalanVarMi=false;
 let html=sayimSatirListesi.map((s,i)=>{
 const stok=stoklar.find(x=>x.id===s.stokId);
 const birim=birimler.find(b=>b.id===s.birimId);
 const kaynaklarToplam=(s.kaynaklar||[]).reduce((t,k)=>t+(parseFloat(k.miktar)||0),0);
 const genelToplam=(s.direkt||0)+kaynaklarToplam;
 const birimFiyat=stok?stokBirimMaliyet(stok.id):0;
 const tutar=genelToplam*birimFiyat;
 // KALAN (Kalanları Getir ile gelir; elle eklenen satırda yoktur) ve FARK = Kalan − Sayım (sayım girildiyse)
 const kalanVar=s.kalanM!==undefined&&s.kalanM!==null;
 if(kalanVar){kalanVarMi=true;topKalanT+=s.kalanT||0;}
 topSayimT+=tutar;
 const fark=kalanVar&&genelToplam>0?(s.kalanM-genelToplam):null;
 return `<tr onmouseenter="_syHoverIndex=${i}">
 <td>${stok?stok.ad:'(bilinmeyen)'} <span style="font-size:10px;color:var(--yazi3)">[${stok?.kod||''}]</span></td>
 <td>${birim?.kisaltma||''}</td>
 <td style="text-align:right;${kalanVar?kr(s.kalanM):''}">${kalanVar?f3(s.kalanM):'—'}</td>
 <td style="text-align:right;${kalanVar?kr(s.kalanT,0.005):''}">${kalanVar?para(s.kalanT):'—'}</td>
 <td><input type="number" value="${genelToplam||''}" onfocus="_syHoverIndex=${i}" onblur="sySatirGuncelle(${i},this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px"></td>
 <td style="text-align:right">${birimFiyat>0?para(birimFiyat):'—'}</td>
 <td style="text-align:right;font-weight:600">${tutar>0?para(tutar):'—'}</td>
 <td style="text-align:right;${fark!==null?kr(fark):''}">${fark===null?'':f3(fark)}</td>
 <td></td>
 </tr>`;
 }).join('');
 const eklenenler=new Set(sayimSatirListesi.map(s=>s.stokId));
 const secenekler=isyeriFiltre(stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false&&!eklenenler.has(s.id));
 html+=`<tr style="background:var(--krem)">
 <td><input type="text" id="sy-bos-hammadde-arama" list="sy-hammadde-datalist" autocomplete="off" placeholder="Listede olmayan stok ekle..." oninput="syBosSatirAramaInput(this.value)" style="width:100%;padding:3px 5px;font-size:12px;background:var(--beyaz)">
 <datalist id="sy-hammadde-datalist">${secenekler.map(s=>`<option value="[${s.kod}] ${s.ad}">`).join('')}</datalist></td>
 <td colspan="8"></td>
 </tr>`;
 el.innerHTML=html;
 const oz=document.getElementById('sy-ozet');
 if(oz)oz.textContent=(kalanVarMi||topSayimT>0)?`${kalanVarMi?`Kalan toplam: ${para(topKalanT)}  ·  `:''}Sayım toplam: ${para(topSayimT)}`:'';
 if(typeof syKalanKilidiUygula==='function')syKalanKilidiUygula();
}
window.syBosSatirAramaInput=function(val){
 const eklenenler=new Set(sayimSatirListesi.map(s=>s.stokId));
 const secenekler=isyeriFiltre(stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false&&!eklenenler.has(s.id));
 const eslesen=secenekler.find(s=>`[${s.kod}] ${s.ad}`===val);
 if(eslesen)syBosSatirSec(eslesen.id);
};
window.syBosSatirSec=function(stokId){
 if(!stokId)return;
 sayimFisSatiriEkleVeyaGuncelle(stokId,0);
 sySatirRender();
};
window.sySatirGuncelle=function(i,val){
 const s=sayimSatirListesi[i];
 const kaynaklarToplam=(s.kaynaklar||[]).reduce((t,k)=>t+(parseFloat(k.miktar)||0),0);
 const girilenToplam=parseFloat(val)||0;
 // Girilen değer toplamı temsil eder — kaynaklardan gelen kısım sabit kalır,
 // fark direkt (manuel) kısma yansıtılır.
 s.direkt=Math.max(0,girilenToplam-kaynaklarToplam);
 sySatirRender();
};
window.sySatirSil=function(i){sayimSatirListesi.splice(i,1);sySatirRender();};

// Aynı gün + aynı depo için zaten bir sayım fişi var mı kontrol eder.
// Varsa uyarı bandı gösterir ve "Sayımı Kaydet" butonunu devre dışı bırakır
// — sistem bir depoya bir günde SADECE TEK sayım fişine izin verir.
window.syFisKontrol=async function(){
 const tarih=document.getElementById('sy-tarih')?.value;
 const depoId=document.getElementById('sy-depo')?.value;
 const bant=document.getElementById('sy-uyari-bant');
 const btn=document.getElementById('btn-sayim-kaydet');
 if(!bant||!btn)return false;
 if(!tarih||!depoId){bant.style.display='none';btn.disabled=false;btn.style.opacity='';return false;}
 // Düzenlenmekte olan fişin kendisi hariç, başka bir fiş var mı?
 // Aynı gün + aynı depo için (düzenlenen fişin kendisi hariç) başka sayım fişi var mı? — veritabanından sorgulanır
 let mevcut=false;
 try{
 const {data}=await sb.from('islemler').select('id,belge_id').eq('tur','sayim').eq('tarih',tarih).eq('depo_id',depoId).eq('isyeri_id',aktifIsyeri?.id).or('silindi.is.null,silindi.eq.false').limit(50);
 mevcut=(data||[]).some(i=>(i.belge_id||i.id)!==_syDuzenlenenBelgeId);
 }catch(e){mevcut=false;}
 if(mevcut){
 const depo=depolar.find(d=>d.id===depoId);
 bant.textContent=`⚠️ Bu depo (${depo?.ad||''}) için ${tarih} tarihinde zaten bir sayım fişi var. Aynı depoya, aynı gün içinde ikinci bir sayım fişi girilemez.`;
 bant.style.display='block';
 btn.disabled=true;btn.style.opacity='.5';btn.style.cursor='not-allowed';
 return true;
 }
 bant.style.display='none';btn.disabled=false;btn.style.opacity='';btn.style.cursor='';
 return false;
};

// Mevcut bir sayım fişini (İşlem Listesi'nden) düzenlemek üzere geri açar —
// satırlar sayimSatirListesi / _ymSayimOzetListesi'ne yüklenir, kaydedince
// aynı belge_id güncellenir (yeni fiş açılmaz).
// Sayım kayıt satırlarını (islemler) ekrandaki satır/özet yapısına çevirir.
window.sayimSatirlariCoz=function(rows){
 const satirlar=[],ozet=[];
 rows.forEach(i=>{
 if(i.kat==='YM Sayım Özeti'){
 ozet.push({tip:urunler.find(u=>u.id===i.urun_id)?.tip==='ara_urun'?'ara_urun':'urun',urunId:i.urun_id,ad:urunler.find(u=>u.id===i.urun_id)?.ad||'Bilinmeyen',birimId:i.birim_id,miktar:parseFloat(i.miktar)||0});
 return;
 }
 if(!i.stok_id)return;
 let satir=satirlar.find(x=>x.stokId===i.stok_id);
 if(!satir){satir={stokId:i.stok_id,birimId:i.birim_id||'',direkt:0,kaynaklar:[]};satirlar.push(satir);}
 if(i.kalan_miktar!==null&&i.kalan_miktar!==undefined&&satir.kalanM===undefined){satir.kalanM=parseFloat(i.kalan_miktar);satir.kalanT=parseFloat(i.kalan_tutar)||0;}
 if(i.urun_id)satir.kaynaklar.push({ustId:i.urun_id,ad:urunler.find(u=>u.id===i.urun_id)?.ad||'Bilinmeyen',miktar:parseFloat(i.miktar)||0});
 else satir.direkt+=parseFloat(i.miktar)||0;
 });
 return {satirlar,ozet};
};
// salt=true: görüntüleme (form kilitli). Aksi halde düzenleme: kaydedince fiş aynı kimlikle güncellenir.
window.sayimFisiDuzenleAc=async function(belgeKey,salt){
 const satirlar=(await belgeSatirlari(belgeKey)).filter(i=>i.tur==='sayim');
 if(!satirlar.length){bil('Fiş bulunamadı','err');return;}
 const c=sayimSatirlariCoz(satirlar);
 sayimSatirListesi=c.satirlar;_ymSayimOzetListesi=c.ozet;
 _syDuzenlenenBelgeId=salt?null:belgeKey;
 const ilk=satirlar[0];
 syFormAc();
 if(typeof fisNoRozetYaz==='function')fisNoRozetYaz('#tp-sk-sayim-form',ilk.fis_no||'');
 document.getElementById('sy-tarih').value=ilk.tarih;
 document.getElementById('sy-depo').value=ilk.depo_id;
 document.getElementById('sy-not').value=ilk.aciklama_not||'';
 sySatirRender();
 const dzBant=document.getElementById('sy-duzenleme-bant');
 const btn=document.getElementById('btn-sayim-kaydet');
 if(salt){
 if(dzBant)dzBant.style.display='none';
 _syGoruntuleme=true;_sySaltOkunur(true);_syBaslikYaz(true,true);
 return;
 }
 _syGoruntuleme=false;_sySaltOkunur(false);_syBaslikYaz(true,false);
 _syEskiSnapshot=sayimSnapshotKur(ilk.tarih,ilk.depo_id,ilk.aciklama_not,sayimSatirListesi,_ymSayimOzetListesi);
 syFisKontrol();
 if(dzBant)dzBant.style.display='flex';
 if(btn)btn.textContent='Değişiklikleri Kaydet';
 bil('Fiş düzenleme için açıldı — ekleme/çıkarma/miktar değişikliği yapıp kaydedebilirsiniz.');
};
window.sayimDuzenlemeIptal=function(){
 _syDuzenlenenBelgeId=null;
 sayimSatirListesi=[];_ymSayimOzetListesi=[];
 sySatirRender();
 document.getElementById('sy-not').value='';
 const dzBant=document.getElementById('sy-duzenleme-bant');
 if(dzBant)dzBant.style.display='none';
 const btn=document.getElementById('btn-sayim-kaydet');
 if(btn)btn.textContent='Sayımı Kaydet';
 syFisKontrol();
};

window.kaydetSayim=async function(){
 const tarih=document.getElementById('sy-tarih').value;
 const depoId=document.getElementById('sy-depo').value;
 const an=document.getElementById('sy-not').value;
 if(!tarih){bil('Tarih zorunlu!','err');return;}
 if(!depoId){bil('Depo seçimi zorunlu!','err');return;}
 // Aynı gün + aynı depo için zaten bir sayım fişi varsa KAYDETMEYİ REDDET (veritabanı da aynı kuralı zorlar) —
 // AMA düzenlenmekte olan fişin kendisi bu kurala takılmaz (güncelleme).
 let baskaFisVar=false;
 {const {data:bf}=await sb.from('islemler').select('id,belge_id').eq('tur','sayim').eq('tarih',tarih).eq('depo_id',depoId).eq('isyeri_id',aktifIsyeri?.id).or('silindi.is.null,silindi.eq.false').limit(50);
 baskaFisVar=(bf||[]).some(i=>(i.belge_id||i.id)!==_syDuzenlenenBelgeId);}
 if(baskaFisVar){
 bil('Bu depo için bu tarihte zaten bir sayım fişi var! Aynı depoya aynı gün ikinci fiş girilemez.','err');
 syFisKontrol();
 return;
 }
 const kalanVar=s=>s.kalanM!==undefined&&s.kalanM!==null;
 // Kalanları Getir ile gelen her stok (sayımı girilmemiş olsa bile) fişle saklanır; fiş yeniden açılınca hepsi görünür
 const gecerli=sayimSatirListesi.filter(s=>(s.direkt>0)||s.kaynaklar.some(k=>k.miktar>0)||kalanVar(s));
 if(!gecerli.length&&!_ymSayimOzetListesi.some(o=>o.miktar>0)){bil('En az bir satır!','err');return;}
 const duzenlemeMi=!!_syDuzenlenenBelgeId;
 // Tek bir "sayım oturumu" içindeki tüm satırlar aynı belge_id'yi (= fiş kimliği) paylaşır. Kaynak bazlı satırlar
 // (hangi YM'den ne kadar geldiği) AYRI satırlar olarak tutulur: Sayım Raporu'ndaki "Kaynak Dökümü" bunu kullanır.
 const belgeId=_syDuzenlenenBelgeId||crypto.randomUUID();
 const y3=n=>Math.round(n*1000)/1000; // en fazla 3 ondalık basamak
 const baz=Date.now();let n=0;
 const ortak={tur:'sayim',tarih,depo_id:depoId,belge_id:belgeId,aciklama:'Sayım',aciklama_not:an,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null};
 const rows=[];let toplamTutar=0;
 for(const s of gecerli){
 const stok=stoklar.find(x=>x.id===s.stokId);
 const birimFiyat=stok?stokBirimMaliyet(stok.id):0;
 const ilkSatir=rows.length;
 if(s.direkt>0){
 const mik=y3(parseFloat(s.direkt)||0),tut=Math.round(mik*birimFiyat*100)/100;toplamTutar+=tut;
 rows.push({...ortak,stok_id:s.stokId,birim_id:s.birimId||null,miktar:mik,fiyat:birimFiyat,tutar:tut,kat:'Sayım',satir_not:'Doğrudan sayım',ts:baz+(n++)});
 }
 for(const k of s.kaynaklar){
 if(!(k.miktar>0))continue;
 const mik=y3(k.miktar),tut=Math.round(mik*birimFiyat*100)/100;toplamTutar+=tut;
 rows.push({...ortak,stok_id:s.stokId,urun_id:k.ustId,birim_id:s.birimId||null,miktar:mik,fiyat:birimFiyat,tutar:tut,kat:'Sayım',satir_not:`${k.ad} sayımından`,ts:baz+(n++)});
 }
 // Sayımı girilmemiş ama kalanı olan stok: 0 sayımla satır yazılır; kalan değerleri bu satırda saklanır
 if(rows.length===ilkSatir)rows.push({...ortak,stok_id:s.stokId,birim_id:s.birimId||null,miktar:0,fiyat:birimFiyat,tutar:0,kat:'Sayım',satir_not:'Doğrudan sayım',ts:baz+(n++)});
 if(kalanVar(s)){rows[ilkSatir].kalan_miktar=s.kalanM;rows[ilkSatir].kalan_tutar=s.kalanT;}
 }
 for(const o of _ymSayimOzetListesi){
 if(!(o.miktar>0))continue;
 rows.push({...ortak,urun_id:o.urunId,stok_id:null,birim_id:o.birimId||null,miktar:y3(o.miktar),fiyat:0,tutar:0,kat:'YM Sayım Özeti',satir_not:null,ts:baz+(n++)});
 }
 toplamTutar=Math.round(toplamTutar*100)/100;
 const baslik={id:belgeId,isyeri_id:aktifIsyeri?.id||null,fis_turu:'sayim',alt_tur:'manuel',tarih,depo_id:depoId,
 kalem_sayisi:gecerli.length,toplam_tutar:toplamTutar,aciklama:an||null,kullanici:aktifKullanici?.ad||'',ts:baz};
 // Başlık + satırlar TEK işlemde yazılır; düzenlemede eski satırlar silinmez, geri alınmış (pasif) olarak saklanır.
 try{await fisYazDb(baslik,rows,_syDuzenlenenBelgeId,false);}
 catch(e){bil('Kaydedilemedi: '+e.message,'err');return;}
 await logYaz({islem:duzenlemeMi?'duzenle':'olustur',belgeTuru:'sayim',altTur:'manuel',belgeId,belgeTarihi:tarih,tutar:toplamTutar,
 eski:duzenlemeMi?_syEskiSnapshot:null,yeni:sayimSnapshotKur(tarih,depoId,an,gecerli,_ymSayimOzetListesi)});
 await islemleriYenile();
 sayimSatirListesi=[];
 sySatirRender();
 _ymSayimOzetListesi=[];
 _syDuzenlenenBelgeId=null;_syEskiSnapshot=null;
 document.getElementById('sy-not').value='';
 const dzBant=document.getElementById('sy-duzenleme-bant');
 if(dzBant)dzBant.style.display='none';
 const btn=document.getElementById('btn-sayim-kaydet');
 if(btn)btn.textContent='Sayımı Kaydet';
 bil(duzenlemeMi?`✓ Fiş güncellendi (${gecerli.length} kalem)`:`${gecerli.length} kalem sayımı kaydedildi ✓`);
 const tEl=document.getElementById('sy-liste-tarih');if(tEl)tEl.value=tarih;
 syGorunumListe();
};

// ===== UYUMLULUK KATMANI =====
// Eski "Yeni İşlem > Hizmet / Gider" ekranı kaldırıldı (hizmet ve gider girişi artık Alış Faturası'ndan yapılır).
// Bu boş tanımlar, henüz yeni yapıya alınmamış eski dosyaların bu adlara başvurması halinde hata vermemesi içindir.
let hmSatirListesi=[];
window.hmSatirRender=function(){};window.hmSatirListesiDoldur=function(){};window.hmSatirEkle=function(){};
window.islemGorunumListe=function(){};window.islemGorunumForm=function(){};window.renderIslemGunSekmesi=function(){};
