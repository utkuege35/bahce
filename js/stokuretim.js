// ===== STOK İŞLEMLERİ — ÜRETİM SEKMESİ =====
// Bir ürün (veya ara ürün) üretimi: seçilen DEPODAN reçetesindeki hammaddeler (iç içe yarı mamuller dahil) stoktan düşülür.
// Bir fiş = ürün satırı (tur='uretim', stoğa etkisi yok, tutar = hammadde maliyeti) + bileşen satırları (tur='uretim_sarfiyat').
// Başlık stok_fisleri'nde (fis_turu='uretim'); hepsi aynı belge_id'yi taşır ve TEK işlemde yazılır/silinir (uretim_fisi_yaz / _sil).
// Veritabanı ayrıca urunler.stok sayacını (üretilen miktar) aynı işlemde günceller; düzenlemede eski miktar geri alınır.
// Düzenlemede bileşenler ürünün GÜNCEL reçetesinden yeniden hesaplanır.
// Stok yetersizse engellemez; eksiği gösterip onay ister (eskiden olduğu gibi).
let _urFisListesi=[],_urSeciliId=null,_urDuz=null,_urGor=false,_urEski=null;

// ===== LİSTE =====
window.urGorunumListe=function(){
  _urDuz=null;_urGor=false;_urSaltOkunur(false);_urBaslikYaz(false,false);
  const l=document.getElementById('tp-sk-uretim-liste'),f=document.getElementById('tp-sk-uretim-form');
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderUretimListe();
};
window.renderUretimListe=async function(){
  const tarihEl=document.getElementById('ur-liste-tarih');
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tb=document.getElementById('ur-liste-tb');if(!tb)return;
  let q=sb.from('stok_fisleri').select('*').eq('fis_turu','uretim').eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data}=await q;
  const basliklar=data||[];
  // Ürün adı ve miktar fiş satırından gelir (başlıkta yok)
  const urunSatir={};
  if(basliklar.length){
    const {data:us}=await sb.from('islemler').select('belge_id,urun_id,miktar,birim_id').eq('tur','uretim').in('belge_id',basliklar.map(h=>h.id)).or('silindi.is.null,silindi.eq.false');
    (us||[]).forEach(r=>{urunSatir[r.belge_id]=r;});
  }
  const fisler=basliklar.map(h=>({id:h.id,tarih:h.tarih,depo:h.depo_id,tutar:parseFloat(h.toplam_tutar)||0,not:h.aciklama||'',kullanici:h.kullanici||'',satir:urunSatir[h.id]||null}));
  _urFisListesi=fisler;
  const oz=document.getElementById('ur-liste-ozet');
  if(oz)oz.textContent=fisler.length?`${fisler.length} fiş · ${_irsSayi(fisler.reduce((a,f)=>a+f.tutar,0))}`:'';
  if(!fisler.length){tb.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';_urSeciliId=null;return;}
  if(!fisler.some(f=>f.id===_urSeciliId))_urSeciliId=null;
  tb.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Ürün</th><th style="text-align:right">Miktar</th><th>Depo</th><th style="text-align:right">Maliyet</th><th>Not</th><th>Kullanıcı</th>
  </tr></thead><tbody>${fisler.map(f=>{
    const ur=f.satir?urunler.find(u=>u.id===f.satir.urun_id):null;
    return `<tr data-id="${f.id}" onclick="urSec('${f.id}')" ondblclick="urDuzenleAc('${f.id}',true)" style="cursor:pointer;${_urSeciliId===f.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${f.tarih}</td>
      <td style="font-size:12px">${_logEsc(ur?.ad||'—')}</td>
      <td style="text-align:right">${f.satir?_trfSayi(f.satir.miktar)+' '+(birimAd(f.satir.birim_id)||''):''}</td>
      <td style="font-size:12px">${_depoAd(f.depo)}</td>
      <td style="text-align:right;font-weight:500">${_irsSayi(f.tutar)}</td>
      <td style="font-size:11px;color:var(--yazi2);max-width:220px">${_logEsc(f.not)}</td>
      <td style="font-size:11px;color:var(--yazi3)">${_logEsc(f.kullanici)}</td>
    </tr>`;}).join('')}</tbody></table></div>`;
};
window.urSec=function(id){
  _urSeciliId=id;
  document.querySelectorAll('#ur-liste-tb tr[data-id]').forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.urListeIslem=function(islem){
  const id=_urSeciliId;
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  if(islem==='goruntule')urDuzenleAc(id,true);
  else if(islem==='duzenle')urDuzenleAc(id,false);
  else if(islem==='sil')urSil(id);
  else if(islem==='log')belgeLogGoster('uretim',id,'Üretim Fişi Logu');
};
// ===== FORM =====
function _urBaslikYaz(duzenleme,salt){
  const el=document.querySelector('#tp-sk-uretim-form .card-title');
  if(el&&el.firstChild)el.firstChild.textContent='Üretim Kaydı'+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _urSaltOkunur(salt){
  const form=document.getElementById('tp-sk-uretim-form');if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{if(el.id!=='ur-maliyet')el.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetUretim"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="urKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
}
window.urKaydetmedenCik=async function(){
  if(_urGor){urGorunumListe();return;}
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)urGorunumListe();
};
window.urYeniBaslat=function(){
  const l=document.getElementById('tp-sk-uretim-liste'),f=document.getElementById('tp-sk-uretim-form');
  if(l)l.style.display='none';
  if(f)f.style.display='';
  document.body.classList.add('islem-form-acik');
  _urDuz=null;_urGor=false;_urEski=null;_urSaltOkunur(false);_urBaslikYaz(false,false);
  document.getElementById('ur-tarih').value=bugun();
  depoSecenekleri('ur-depo',anaDepoId());
  document.getElementById('ur-urun').value='';
  document.getElementById('ur-miktar').value='';document.getElementById('ur-not').value='';
  document.getElementById('ur-bilesen-bilgi').style.display='none';document.getElementById('ur-maliyet').value='';
};
// ===== KAYDET =====
window.kaydetUretim=async function(){
  const tarih=document.getElementById('ur-tarih').value;
  const depo=document.getElementById('ur-depo').value;
  const urunId=document.getElementById('ur-urun').value;
  const mik=parseFloat(document.getElementById('ur-miktar').value)||1;
  const an=document.getElementById('ur-not').value.trim()||null;
  if(!tarih||!urunId){bil('Eksik bilgi!','err');return;}
  if(!depo){bil('Hammadde çıkış deposu seçilmeli!','err');return;}
  const urun=urunler.find(x=>x.id===urunId);if(!urun)return;
  const haric=_urDuz;
  // Reçete (iç içe yarı mamuller dahil) hammaddelere açılır; stok miktarları temel birimdedir.
  const dag=sayimHesaplaDagitim(urunId,mik,urun.ad,urunId);
  const bilesen={};
  dag.forEach(r=>{bilesen[r.stokId]=(bilesen[r.stokId]||0)+r.miktar;});
  if(!dag.length&&!(await onay(`${urun.ad} için reçete tanımlı değil; hammadde stoktan düşülmeyecek.<br>Yine de kaydedilsin mi?`,'⚠️','Evet','Hayır')))return;
  // Stok yeterliliği: engellemez, eksiği gösterip onay ister
  let mevcutlar={};
  try{mevcutlar=await stokBakiyelerDb(depo,Object.keys(bilesen),haric);}
  catch(e){bil('Stok bakiyesi okunamadı: '+e.message,'err');return;}
  const eksikler=[];
  Object.entries(bilesen).forEach(([sid,m])=>{
    const mevcut=parseFloat(mevcutlar[sid])||0;
    if(m>mevcut+0.0005){
      const st=stoklar.find(x=>x.id===sid);
      eksikler.push(`${st?.ad||''}: mevcut ${_trfSayi(mevcut)}, gereken ${_trfSayi(m)} ${birimAd(st?.birim_id)||''}`);
    }
  });
  if(eksikler.length&&!(await onay(`${_depoAd(depo)} deposunda yeterli stok yok, stok eksiye düşecek:<br>• ${eksikler.slice(0,6).join('<br>• ')}${eksikler.length>6?`<br>… (+${eksikler.length-6} kalem)`:''}<br><br>Yine de kaydedilsin mi?`,'⚠️','Evet','Hayır')))return;
  // Fiş satırları
  const fisId=haric||crypto.randomUUID();
  const baz=Date.now();let n=0;
  let topMal=0;
  const ortak={tarih,belge_id:fisId,depo_id:depo,kat:'Üretim',aciklama_not:an,alt_tur:'manuel',kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null};
  const rows=[];
  Object.entries(bilesen).forEach(([sid,m])=>{
    const st=stoklar.find(x=>x.id===sid);const maliyet=parseFloat(st?.maliyet)||0;
    const tut=Math.round(m*maliyet*100)/100;topMal+=tut;
    rows.push({...ortak,tur:'uretim_sarfiyat',stok_id:sid,urun_id:urunId,birim_id:st?.birim_id||null,miktar:m,fiyat:maliyet,tutar:tut,
      aciklama:`${urun.ad} üretimi (sarfiyat)`,ts:baz+1+(n++)});
  });
  topMal=Math.round(topMal*100)/100;
  rows.unshift({...ortak,tur:'uretim',urun_id:urunId,birim_id:urun.birim_id,miktar:mik,fiyat:mik>0?Math.round(topMal/mik*100)/100:0,tutar:topMal,
    aciklama:`${urun.ad} üretimi`,ts:baz});
  const baslik={id:fisId,isyeri_id:aktifIsyeri?.id||null,fis_turu:'uretim',alt_tur:'manuel',tarih,depo_id:depo,kalem_sayisi:1,
    toplam_tutar:topMal,aciklama:an,kullanici:aktifKullanici?.ad||'',ts:baz};
  try{await uretimYazDb(baslik,rows,haric);}
  catch(e){bil('Kaydedilemedi: '+e.message,'err');return;}
  await logYaz({islem:haric?'duzenle':'olustur',belgeTuru:'uretim',altTur:'manuel',belgeId:fisId,belgeTarihi:tarih,tutar:topMal,
    eski:haric?_urEski:null,yeni:uretimSnapshotKur({tarih,depoId:depo,urunId,miktar:mik,maliyet:topMal,not:an})});
  await islemleriYenile();
  const {data:ud}=await sb.from('urunler').select('*').order('kod');if(ud&&ud.length)urunler=ud; // urunler.stok sayacı veritabanında güncellendi
  bil(`✓ ${urun.ad} üretimi ${haric?'güncellendi':'kaydedildi'}`);
  const tEl=document.getElementById('ur-liste-tarih');if(tEl)tEl.value=tarih;
  urGorunumListe();
};
// ===== DÜZENLE / GÖRÜNTÜLE / SİL =====
window.urDuzenleAc=async function(fisId,salt){
  const fis=_urFisListesi.find(f=>f.id===fisId);
  if(!fis){bil('Fiş bulunamadı','err');return;}
  const satir=(await belgeSatirlari(fisId)).find(i=>i.tur==='uretim');
  if(!satir){bil('Fişin üretim satırı bulunamadı','err');return;}
  urYeniBaslat();
  document.getElementById('ur-tarih').value=fis.tarih;
  depoSecenekleri('ur-depo',fis.depo);
  document.getElementById('ur-urun').value=satir.urun_id;
  document.getElementById('ur-miktar').value=satir.miktar;
  document.getElementById('ur-not').value=fis.not||'';
  if(typeof uretimBilesenGoster==='function')uretimBilesenGoster();
  _urDuz=salt?null:fisId;
  if(!salt)_urEski=uretimSnapshotKur({tarih:fis.tarih,depoId:fis.depo,urunId:satir.urun_id,miktar:satir.miktar,maliyet:fis.tutar,not:fis.not});
  _urBaslikYaz(true,!!salt);
  if(salt){_urGor=true;_urSaltOkunur(true);}
};
window.urSil=async function(fisId){
  const fis=_urFisListesi.find(f=>f.id===fisId);if(!fis)return;
  if(!(await onay('Bu üretim fişi silinsin mi?<br><small>Stoktan düşülen hammaddeler geri alınır, üretilen ürün miktarı düşülür.</small>','🗑️')))return;
  try{await uretimSilDb(fisId);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  await logYaz({islem:'sil',belgeTuru:'uretim',altTur:'manuel',belgeId:fisId,belgeTarihi:fis.tarih,tutar:fis.tutar,
    eski:uretimSnapshotKur({tarih:fis.tarih,depoId:fis.depo,urunId:fis.satir?.urun_id,miktar:fis.satir?.miktar,maliyet:fis.tutar,not:fis.not})});
  await islemleriYenile();
  const {data:ud}=await sb.from('urunler').select('*').order('kod');if(ud&&ud.length)urunler=ud;
  _urSeciliId=null;
  bil('Üretim fişi silindi ✓');
  renderUretimListe();
};
