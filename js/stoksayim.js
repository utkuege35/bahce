// ===== STOK İŞLEMLERİ — SAYIM SEKMESİ =====
// Sayım fişi formu (sy* fonksiyonları: Excel'den içe aktarma, YM/Ürün sayımından yansıtma, kaynak dökümü) islemler.js'tedir;
// burada liste / görüntüle / düzenle / sil / log ile Stok İşlemleri çatısına bağlanır.
// SAYIM STOĞU DEĞİŞTİRMEZ (bilgi amaçlıdır). Fiş başlığı stok_fisleri'nde (fis_turu='sayim'), satırlar islemler'de aynı belge_id ile durur.
// Kayıt TEK işlemde yazılır (kaydetSayim → fisYazDb); düzenlemede eski satırlar silinmez, geri alınmış olarak saklanır.
// Aynı işyeri + depo + gün için tek sayım fişi olabilir (veritabanı da zorlar).
let _syFisListesi=[],_sySeciliId=null,_syGoruntuleme=false,_syEskiSnapshot=null;

function _syFisNesnesi(h){
  return {id:h.id,tarih:h.tarih,depo:h.depo_id,kalem:h.kalem_sayisi||0,tutar:parseFloat(h.toplam_tutar)||0,not:h.aciklama||'',kullanici:h.kullanici||''};
}
// ===== LİSTE =====
window.syGorunumListe=function(){
  _syGoruntuleme=false;_sySaltOkunur(false);_syBaslikYaz(false,false);
  const l=document.getElementById('tp-sk-sayim-liste'),f=document.getElementById('tp-sk-sayim-form');
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderSayimListe();
};
window.renderSayimListe=async function(){
  const tarihEl=document.getElementById('sy-liste-tarih');
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tb=document.getElementById('sy-liste-tb');if(!tb)return;
  let q=sb.from('stok_fisleri').select('*').eq('fis_turu','sayim').eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data}=await q;
  const fisler=(data||[]).map(_syFisNesnesi);
  _syFisListesi=fisler;
  const oz=document.getElementById('sy-liste-ozet');
  if(oz)oz.textContent=fisler.length?`${fisler.length} fiş`:'';
  if(!fisler.length){tb.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';_sySeciliId=null;return;}
  if(!fisler.some(f=>f.id===_sySeciliId))_sySeciliId=null;
  tb.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Depo</th><th style="text-align:right">Kalem</th><th style="text-align:right">Tutar</th><th>Not</th><th>Kullanıcı</th>
  </tr></thead><tbody>${fisler.map(f=>`<tr data-id="${f.id}" onclick="sySec('${f.id}')" ondblclick="sayimFisiDuzenleAc('${f.id}',true)" style="cursor:pointer;${_sySeciliId===f.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${f.tarih}</td>
      <td style="font-size:12px">${_depoAd(f.depo)}</td>
      <td style="text-align:right">${f.kalem}</td>
      <td style="text-align:right;font-weight:500">${_irsSayi(f.tutar)}</td>
      <td style="font-size:11px;color:var(--yazi2);max-width:240px">${_logEsc(f.not)}</td>
      <td style="font-size:11px;color:var(--yazi3)">${_logEsc(f.kullanici)}</td>
    </tr>`).join('')}</tbody></table></div>`;
};
window.sySec=function(id){
  _sySeciliId=id;
  document.querySelectorAll('#sy-liste-tb tr[data-id]').forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.syListeIslem=function(islem){
  const id=_sySeciliId;
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  if(islem==='goruntule')sayimFisiDuzenleAc(id,true);
  else if(islem==='duzenle')sayimFisiDuzenleAc(id,false);
  else if(islem==='sil')sySil(id);
  else if(islem==='log')belgeLogGoster('sayim',id,'Sayım Fişi Logu');
};
// ===== FORM =====
// Formu açar (gerekirse Stok İşlemleri → Sayım sekmesine geçer). YM/Ürün sayımı ekranından dönüşte ve düzenlemede kullanılır.
window.syFormAc=function(){
  if(!document.getElementById('stok-islemleri')?.classList.contains('active'))gp('stok-islemleri');
  document.querySelectorAll('#stok-islemleri .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#stok-islemleri .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tp-sk-sayim')?.classList.add('active');
  document.getElementById('sk-tab-sayim')?.classList.add('active');
  _aktifSkTab='sayim';
  const l=document.getElementById('tp-sk-sayim-liste'),f=document.getElementById('tp-sk-sayim-form');
  if(l)l.style.display='none';
  if(f)f.style.display='';
  document.body.classList.add('islem-form-acik');
  if(typeof doldurDepoSecleri==='function')doldurDepoSecleri();
};
window.syYeniBaslat=function(){
  sayimDuzenlemeIptal();_syEskiSnapshot=null;
  syFormAc();
  _syGoruntuleme=false;_sySaltOkunur(false);_syBaslikYaz(false,false);
  const t=document.getElementById('sy-tarih');if(t&&!t.value)t.value=bugun();
  sySatirRender();syFisKontrol();
  bil('Yeni Sayım fişi başlatıldı ✓');
};
function _syBaslikYaz(duzenleme,salt){
  const el=document.querySelector('#tp-sk-sayim-form .card-title');
  if(el&&el.firstChild)el.firstChild.textContent='Sayım Fişi (Hammadde)'+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _sySaltOkunur(salt){
  const form=document.getElementById('tp-sk-sayim-form');if(!form)return;
  form.querySelectorAll('input,select,button').forEach(el=>{
    if((el.getAttribute('onclick')||'').startsWith('syKaydetmedenCik'))return;
    el.disabled=salt;
  });
  const kaydet=document.getElementById('btn-sayim-kaydet');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="syKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
}
window.syKaydetmedenCik=async function(){
  if(_syGoruntuleme){sayimDuzenlemeIptal();syGorunumListe();return;}
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok){sayimDuzenlemeIptal();_syEskiSnapshot=null;syGorunumListe();}
};
// ===== SİL =====
window.sySil=async function(id){
  const fis=_syFisListesi.find(f=>f.id===id);if(!fis)return;
  const rows=(await belgeSatirlari(id)).filter(i=>i.tur==='sayim');
  if(!(await onay('Bu sayım fişi silinsin mi?<br><small>Sayım stok miktarını değiştirmediği için stok etkilenmez.</small>','🗑️')))return;
  try{await fisSilDb(id,false);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  const c=sayimSatirlariCoz(rows);
  await logYaz({islem:'sil',belgeTuru:'sayim',altTur:'manuel',belgeId:id,belgeTarihi:fis.tarih,tutar:fis.tutar,
    eski:sayimSnapshotKur(fis.tarih,fis.depo,fis.not,c.satirlar,c.ozet)});
  await islemleriYenile();
  _sySeciliId=null;
  bil('Fiş silindi ✓');
  renderSayimListe();
};
