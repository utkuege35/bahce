// ===== STOK İŞLEMLERİ — SATIŞ / İKRAM / ÖDENMEZ / HASAR / ATIK =====
// Beş sekme aynı yapıyı paylaşır (tur parametresiyle). Fiş bir DEPODAN stok çıkışıdır.
// Kalem hammadde (stok) ya da ürün (mamul) olabilir:
//  - Hammadde kalemi: fiş satırı doğrudan stoktan düşer (tur = satis/ikram/...).
//  - Ürün kalemi: fiş satırı ürün olarak görünür (stoğa etkisi yok); reçetesi (iç içe yarı mamuller dahil)
//    hammaddelere açılarak "<tur>_sarfiyat" bileşen satırları yazılır ve stoktan onlar düşer.
// Başlık "stok_fisleri" tablosundadır (fis_turu = tur). Satırlar ve bileşenler aynı belge_id'yi taşır.
const SC_TURLER=['satis','ikram','odenmez','hasar','atik'];
const SC_ETIKET={satis:'Satış',ikram:'İkram',odenmez:'Ödenmez',hasar:'Hasar',atik:'Atık'};
let scSatirListesi={},_scDuz={},_scGor={},_scSecili={},_scEski={},_scFisListesi={};
SC_TURLER.forEach(t=>{scSatirListesi[t]=[];_scDuz[t]=null;_scGor[t]=false;_scSecili[t]=null;_scEski[t]=null;_scFisListesi[t]=[];});

function _scFisNesnesi(tur,h){
  const satirlar=islemler.filter(i=>i.belge_id===h.id&&i.tur===tur).sort((a,b)=>(a.ts||0)-(b.ts||0));
  return {id:h.id,tarih:h.tarih,depo:h.depo_id||anaDepoId(),satirlar,kalem:h.kalem_sayisi||satirlar.length,
    tutar:parseFloat(h.toplam_tutar)||0,not:h.aciklama||'',kullanici:h.kullanici||''};
}
// ===== LİSTE =====
window.scGorunumListe=function(tur){
  _scDuz[tur]=null;_scGor[tur]=false;_scSaltOkunur(tur,false);_scBaslikYaz(tur,false,false);
  const l=document.getElementById(`tp-sk-${tur}-liste`),f=document.getElementById(`tp-sk-${tur}-form`);
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderScListe(tur);
};
window.renderScListe=async function(tur){
  const tarihEl=document.getElementById(`sc-${tur}-liste-tarih`);
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tb=document.getElementById(`sc-${tur}-liste-tb`);if(!tb)return;
  let q=sb.from('stok_fisleri').select('*').eq('fis_turu',tur).eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data}=await q;
  const fisler=(data||[]).map(h=>_scFisNesnesi(tur,h));
  _scFisListesi[tur]=fisler;
  const oz=document.getElementById(`sc-${tur}-liste-ozet`);
  if(oz)oz.textContent=fisler.length?`${fisler.length} fiş · ${_irsSayi(fisler.reduce((a,f)=>a+f.tutar,0))}`:'';
  if(!fisler.length){tb.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';_scSecili[tur]=null;return;}
  if(!fisler.some(f=>f.id===_scSecili[tur]))_scSecili[tur]=null;
  tb.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Depo</th><th style="text-align:right">Kalem</th><th style="text-align:right">Tutar</th><th>Not</th><th>Kullanıcı</th>
  </tr></thead><tbody>${fisler.map(f=>`<tr data-id="${f.id}" onclick="scSec('${tur}','${f.id}')" ondblclick="scDuzenleAc('${tur}','${f.id}',true)" style="cursor:pointer;${_scSecili[tur]===f.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${f.tarih}</td>
      <td style="font-size:12px">${_depoAd(f.depo)}</td>
      <td style="text-align:right">${f.kalem}</td>
      <td style="text-align:right;font-weight:500">${_irsSayi(f.tutar)}</td>
      <td style="font-size:11px;color:var(--yazi2);max-width:240px">${_logEsc(f.not)}</td>
      <td style="font-size:11px;color:var(--yazi3)">${f.kullanici}</td>
    </tr>`).join('')}</tbody></table></div>`;
};
window.scSec=function(tur,id){
  _scSecili[tur]=id;
  document.querySelectorAll(`#sc-${tur}-liste-tb tr[data-id]`).forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.scListeIslem=function(tur,islem){
  const id=_scSecili[tur];
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  if(islem==='goruntule')scDuzenleAc(tur,id,true);
  else if(islem==='duzenle')scDuzenleAc(tur,id,false);
  else if(islem==='sil')scSil(tur,id);
  else if(islem==='log')belgeLogGoster(tur,id,`${SC_ETIKET[tur]} Fişi Logu`);
};
// ===== FORM =====
function _scBaslikYaz(tur,duzenleme,salt){
  const el=document.querySelector(`#tp-sk-${tur}-form .card-title`);
  if(el&&el.firstChild)el.firstChild.textContent=`${SC_ETIKET[tur]} Fişi`+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _scSaltOkunur(tur,salt){
  const form=document.getElementById(`tp-sk-${tur}-form`);if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{el.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetStokCikis"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="scKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
}
window.scKaydetmedenCik=async function(tur){
  if(_scGor[tur]){scGorunumListe(tur);return;}
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)scGorunumListe(tur);
};
function _scBosSatir(){return {kaynakTur:'',kaynakId:'',birimId:'',miktar:'',fiyat:'',tutar:''};}
window.scYeniBaslat=function(tur){
  _scDuz[tur]=null;_scGor[tur]=false;_scSaltOkunur(tur,false);_scBaslikYaz(tur,false,false);
  scSatirListesi[tur]=[];
  for(let i=0;i<15;i++)scSatirListesi[tur].push(_scBosSatir());
  document.getElementById(`sc-${tur}-tarih`).value=bugun();
  document.getElementById(`sc-${tur}-not`).value='';
  depoSecenekleri(`sc-${tur}-depo`,anaDepoId()||''); // çıkış deposu: Ana Depo varsayılan
  scSatirRender(tur);
  document.getElementById(`tp-sk-${tur}-liste`).style.display='none';
  document.getElementById(`tp-sk-${tur}-form`).style.display='';
  document.body.classList.add('islem-form-acik');
};
function scSatirRender(tur){
  const el=document.getElementById(`sc-${tur}-satirlar`);if(!el)return;
  el.innerHTML=scSatirListesi[tur].map((s,i)=>{
    const kart=s.kaynakTur==='stok'?stoklar.find(x=>x.id===s.kaynakId):s.kaynakTur==='urun'?urunler.find(x=>x.id===s.kaynakId):null;
    return `<tr data-tablo="sc-${tur}">
      <td><div style="position:relative">
        <input type="text" data-satir-ana="1" autocomplete="off" value="${kart?kart.ad:''}"
          oninput="scAramaFiltrele('${tur}',${i},this.value)"
          onfocus="scAramaFiltrele('${tur}',${i},this.value)"
          onblur="setTimeout(()=>{const d=document.getElementById('sc-oneri-${tur}-${i}');if(d)d.style.display='none';},150)"
          onkeydown="_oneriTusVurusu(event,'sc-oneri-${tur}-${i}')" style="width:100%;padding:3px 6px;font-size:12px">
        <div id="sc-oneri-${tur}-${i}" onmousedown="event.preventDefault()" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:240px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:2px"></div>
      </div></td>
      <td style="font-size:11px;color:var(--yazi3)">${s.kaynakTur==='urun'?'Ürün':s.kaynakTur==='stok'?'Hammadde':''}</td>
      <td><select id="sc-birim-${tur}-${i}" onchange="scBirimSec('${tur}',${i},this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)"><option value=""></option>${irsBirimOpts(s.kaynakTur,s.kaynakId,s.birimId)}</select></td>
      <td><input type="number" value="${s.miktar||''}" onblur="scHesapla('${tur}',${i},'miktar',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.fiyat||''}" onblur="scHesapla('${tur}',${i},'fiyat',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.tutar||''}" onblur="scHesapla('${tur}',${i},'tutar',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;font-weight:500;color:var(--yesil);text-align:right"></td>
    </tr>`;
  }).join('');
  scToplam(tur);
}
function scToplam(tur){
  const t=scSatirListesi[tur].reduce((a,r)=>a+(parseFloat(r.tutar)||0),0);
  const el=document.getElementById(`sc-${tur}-toplam`);if(el)el.textContent=_irsSayi(t);
}
window.scAramaFiltrele=function(tur,i,val){
  const kutu=document.getElementById(`sc-oneri-${tur}-${i}`);if(!kutu)return;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kapsam=_irsKapsam('iade'); // hammadde + ürün birlikte
  const sec=_oneriSirala(q?kapsam.filter(k=>k.kaynak.ad.toLocaleLowerCase('tr').includes(q)):kapsam,q,k=>k.kaynak.ad);
  kutu.dataset.vurgu='-1';
  if(!sec.length){kutu.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--yazi3)">Sonuç bulunamadı</div>';kutu.style.display='block';return;}
  kutu.innerHTML=sec.map(k=>`<div class="oneri-item" onclick="scSecildi('${tur}',${i},'${k.kaynakTur}','${k.kaynak.id}')" style="padding:8px 10px;font-size:12px">${k.kaynak.ad} <span style="font-size:9px;color:var(--yazi3)">[${k.kaynakTur==='stok'?'Hammadde':'Ürün'}]</span></div>`).join('');
  kutu.style.display='block';
};
// Varsayılan birim fiyatı: ürün → satış fiyatı (hasar/atıkta reçete maliyeti); hammadde → stok maliyeti.
function _scVarsayilanFiyat(tur,kaynakTur,kart,birimId){
  const carp=birimTemelCarp(birimId)||1;
  if(kaynakTur==='stok')return (parseFloat(kart.maliyet)||0)*carp;
  if(tur==='hasar'||tur==='atik')return (hesaplaUrunMaliyeti(kart.id,1)||0)*carp;
  return (parseFloat(kart.fiyat)||0)*carp;
}
window.scSecildi=function(tur,i,kaynakTur,kaynakId){
  const kart=kaynakTur==='stok'?stoklar.find(x=>x.id===kaynakId):urunler.find(x=>x.id===kaynakId);
  if(!kart)return;
  const s=scSatirListesi[tur][i];
  s.kaynakTur=kaynakTur;s.kaynakId=kaynakId;
  s.birimId=kart.varsayilan_birim_id||kart.birim_id||'';
  const f=_scVarsayilanFiyat(tur,kaynakTur,kart,s.birimId);
  if(f>0)s.fiyat=f.toFixed(2);
  if(i===scSatirListesi[tur].length-1)scSatirListesi[tur].push(_scBosSatir());
  scSatirRender(tur);
  document.getElementById(`sc-birim-${tur}-${i}`)?.focus();
};
window.scBirimSec=function(tur,i,birimId){scSatirListesi[tur][i].birimId=birimId;};
window.scHesapla=function(tur,i,kaynak,val){
  const s=scSatirListesi[tur][i];s[kaynak]=val;
  const mik=parseFloat(s.miktar)||0,fiy=parseFloat(s.fiyat)||0,tut=parseFloat(s.tutar)||0;
  const row=document.querySelectorAll(`#sc-${tur}-satirlar tr`)[i];if(!row)return;
  const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);s.tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);s.fiyat=y;if(inputs[1])inputs[1].value=y;}}
  scToplam(tur);
};
// ===== STOK GEREKSİNİMİ: hammadde kalemleri + ürünlerin reçetelerinden açılan bileşenler =====
// Dönüş: {gereken:{stokId:temelMiktar}, receteYok:[ürün adları]}
function _scGereksinim(satirlar){
  const gereken={},receteYok=[];
  satirlar.forEach(s=>{
    const mikTemel=(parseFloat(s.miktar)||0)*birimTemelCarp(s.birimId);
    if(s.kaynakTur==='stok'){gereken[s.kaynakId]=(gereken[s.kaynakId]||0)+mikTemel;return;}
    const u=urunler.find(x=>x.id===s.kaynakId);
    const dag=sayimHesaplaDagitim(s.kaynakId,mikTemel,u?.ad||'',s.kaynakId);
    if(!dag.length)receteYok.push(u?.ad||'?');
    dag.forEach(r=>{gereken[r.stokId]=(gereken[r.stokId]||0)+r.miktar;});
  });
  return {gereken,receteYok};
}
// ===== KAYDET =====
window.kaydetStokCikis=async function(tur){
  const etiket=SC_ETIKET[tur];
  const tarih=document.getElementById(`sc-${tur}-tarih`).value;
  const depo=document.getElementById(`sc-${tur}-depo`).value;
  const not=document.getElementById(`sc-${tur}-not`).value.trim()||null;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(!depo){bil('Depo seçimi zorunlu!','err');return;}
  const gecerli=scSatirListesi[tur].filter(s=>s.kaynakId&&parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  if(gecerli.some(s=>!s.birimId)){bil('Tüm satırlarda birim seçilmeli!','err');return;}
  const haric=_scDuz[tur];
  // Stok yeterliliği: engellemez, eksiği gösterip onay ister. Reçetesiz ürünler stoktan düşülmez, uyarılır.
  const {gereken,receteYok}=_scGereksinim(gecerli);
  const eksikler=[];
  let mevcutlar={};
  try{mevcutlar=await stokBakiyelerDb(depo,Object.keys(gereken),haric);}
  catch(e){bil('Stok bakiyesi okunamadı: '+e.message,'err');return;}
  Object.entries(gereken).forEach(([sid,mik])=>{
    const mevcut=parseFloat(mevcutlar[sid])||0;
    if(mik>mevcut+0.0005){
      const st=stoklar.find(x=>x.id===sid);const tb=birimler.find(b=>b.id===st?.birim_id);
      eksikler.push(`${st?.ad||''}: mevcut ${_trfSayi(mevcut)}, gereken ${_trfSayi(mik)} ${tb?.kisaltma||''}`);
    }
  });
  let uyari='';
  if(receteYok.length)uyari+=`Reçetesi tanımlı olmayan ürünler (stoktan düşülmez): ${[...new Set(receteYok)].join(', ')}<br>`;
  if(eksikler.length)uyari+=`${_depoAd(depo)} deposunda yeterli stok yok, stok eksiye düşecek:<br>• ${eksikler.slice(0,6).join('<br>• ')}${eksikler.length>6?`<br>… (+${eksikler.length-6} kalem)`:''}<br>`;
  if(uyari&&!(await onay(uyari+'<br>Yine de kaydedilsin mi?','⚠️','Evet','Hayır')))return;

  const fisId=haric||crypto.randomUUID();
  const baz=Date.now();let n=0;
  const rows=[];
  gecerli.forEach(s=>{
    const kart=s.kaynakTur==='stok'?stoklar.find(x=>x.id===s.kaynakId):urunler.find(x=>x.id===s.kaynakId);
    const mik=parseFloat(s.miktar)||0,fiy=parseFloat(s.fiyat)||0,tut=parseFloat(s.tutar)||(mik*fiy);
    const ortak={tarih,birim_id:s.birimId,miktar:mik,fiyat:fiy,tutar:Math.round(tut*100)/100,belge_id:fisId,depo_id:depo,
      aciklama_not:not,alt_tur:'manuel',kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null};
    if(s.kaynakTur==='stok'){
      rows.push({...ortak,tur,stok_id:s.kaynakId,aciklama:`${kart?.ad||''} ${etiket.toLowerCase()}`,kat:etiket,ts:baz+(n++)});
    }else{
      // Ürün satırı (stoğa etkisi yok) + reçeteden açılan hammadde bileşen satırları
      rows.push({...ortak,tur,urun_id:s.kaynakId,aciklama:`${kart?.ad||''} ${etiket.toLowerCase()}`,kat:etiket,ts:baz+(n++)});
      const dag=sayimHesaplaDagitim(s.kaynakId,mik*birimTemelCarp(s.birimId),kart?.ad||'',s.kaynakId);
      const toplamBilesen={};
      dag.forEach(r=>{toplamBilesen[r.stokId]=(toplamBilesen[r.stokId]||0)+r.miktar;});
      Object.entries(toplamBilesen).forEach(([sid,m])=>{
        const st=stoklar.find(x=>x.id===sid);const maliyet=parseFloat(st?.maliyet)||0;
        rows.push({tur:tur+'_sarfiyat',tarih,stok_id:sid,urun_id:s.kaynakId,birim_id:st?.birim_id||null,miktar:m,fiyat:maliyet,
          tutar:Math.round(m*maliyet*100)/100,aciklama:`${kart?.ad||''} ${etiket.toLowerCase()} bileşeni`,kat:`${etiket} Sarfiyatı`,
          aciklama_not:not,belge_id:fisId,depo_id:depo,alt_tur:'manuel',kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:baz+(n++)});
      });
    }
  });
  const fisSatirlari=rows.filter(r=>r.tur===tur);
  const toplamTutar=Math.round(fisSatirlari.reduce((a,r)=>a+r.tutar,0)*100)/100;
  const baslikVeri={isyeri_id:aktifIsyeri?.id||null,fis_turu:tur,alt_tur:'manuel',tarih,depo_id:depo,
    kalem_sayisi:gecerli.length,toplam_tutar:toplamTutar,aciklama:not};
  // Tek işlemde yazılır (stok yetersizliği yukarıda kullanıcı onayıyla geçildi; eksiye düşmeye izin verilir).
  try{await fisYazDb({id:fisId,...baslikVeri,kullanici:aktifKullanici?.ad||'',ts:baz},rows,haric,false);}
  catch(e){bil('Kaydedilemedi: '+e.message,'err');return;}
  await logYaz({islem:haric?'duzenle':'olustur',belgeTuru:tur,altTur:'manuel',belgeId:fisId,belgeTarihi:tarih,tutar:toplamTutar,
    eski:haric?_scEski[tur]:null,yeni:stokCikisSnapshotKur(tarih,depo,not,gecerli)});
  await islemleriYenile();
  bil(`✓ ${etiket} fişi ${haric?'güncellendi':'kaydedildi'} (${gecerli.length} kalem)`);
  const tEl=document.getElementById(`sc-${tur}-liste-tarih`);if(tEl)tEl.value=tarih;
  scGorunumListe(tur);
};
// ===== DÜZENLE / GÖRÜNTÜLE / SİL =====
window.scDuzenleAc=function(tur,fisId,salt){
  const fis=_scFisListesi[tur].find(f=>f.id===fisId);
  if(!fis){bil('Fiş bulunamadı','err');return;}
  scYeniBaslat(tur);
  document.getElementById(`sc-${tur}-tarih`).value=fis.tarih;
  document.getElementById(`sc-${tur}-not`).value=fis.not;
  depoSecenekleri(`sc-${tur}-depo`,fis.depo);
  _scDuz[tur]=salt?null:fisId;
  scSatirListesi[tur]=fis.satirlar.map(r=>({kaynakTur:r.stok_id?'stok':'urun',kaynakId:r.stok_id||r.urun_id,birimId:r.birim_id||'',miktar:r.miktar,fiyat:r.fiyat||'',tutar:r.tutar||''}));
  if(!salt)_scEski[tur]=stokCikisSnapshotKur(fis.tarih,fis.depo,fis.not,scSatirListesi[tur]);
  if(!salt)for(let i=0;i<5;i++)scSatirListesi[tur].push(_scBosSatir());
  scSatirRender(tur);
  _scBaslikYaz(tur,true,!!salt);
  if(salt){_scGor[tur]=true;_scSaltOkunur(tur,true);}
};
window.scSil=async function(tur,fisId){
  const fis=_scFisListesi[tur].find(f=>f.id===fisId);if(!fis)return;
  if(!(await onay(`Bu ${SC_ETIKET[tur].toLowerCase()} fişi silinsin mi?<br><small>Stoktan düşülen miktarlar geri alınır.</small>`,'🗑️')))return;
  try{await fisSilDb(fisId,false);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  await logYaz({islem:'sil',belgeTuru:tur,altTur:'manuel',belgeId:fisId,belgeTarihi:fis.tarih,tutar:fis.tutar,
    eski:stokCikisSnapshotKur(fis.tarih,fis.depo,fis.not,fis.satirlar.map(r=>({kaynakTur:r.stok_id?'stok':'urun',kaynakId:r.stok_id||r.urun_id,birimId:r.birim_id,miktar:r.miktar,fiyat:r.fiyat,tutar:r.tutar})))});
  await islemleriYenile();
  _scSecili[tur]=null;
  bil('Fiş silindi ✓');
  renderScListe(tur);
};
// Satır tamamlanma kuralı: malzeme + birim + miktar + fiyat + tutar tamamlanmadan alt satıra geçilemez
SC_TURLER.forEach(tur=>{
  if(typeof _satirKayitEkle==='function'){
    _satirKayitEkle('sc-'+tur,(i)=>scSatirListesi[tur][i],
      (s)=>!!(s&&s.kaynakId&&s.birimId&&parseFloat(s.miktar)>0&&parseFloat(s.fiyat)>0&&parseFloat(s.tutar)>0));
  }
});
