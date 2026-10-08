// ===== STOK İŞLEMLERİ =====
// Sekmeler: Devir, Transfer, Satış, İkram, Ödenmez, Hasar, Atık. (Şu an Transfer hazır.)
// TRANSFER: bir fiş = bir kaynak depo → bir hedef depo + kalemler. Her kalem iki hareket üretir:
// kaynak depoda "transfer_cikis", hedef depoda "transfer_giris" (aynı belge_id altında).
// Fiş tipleri: Ana Depo Çıkış (ana → alt depo), Ana Depoya İade (alt depo → ana), Depolar Arası Transfer.
// İrsaliye/faturadan doğan Ana Depo Çıkış fişleri burada listelenir ve SİLİNEBİLİR ama DÜZENLENEMEZ
// (düzenleme ilgili irsaliye/faturadan yapılır). Elle girilen fişler düzenlenebilir.
const TRF_TIP_ADLARI={ana_depo_cikis:'Ana Depo Çıkış',ana_depoya_iade:'Ana Depoya İade',depolar_arasi:'Depolar Arası Transfer'};
let _aktifSkTab='devir';
let trfSatirListesi=[];
let _trfDuzenlenenId=null;   // düzenlenen (eski) fişin belge_id'si
let _trfGoruntuleme=false;
let _trfSeciliId=null;
let _trfEskiSnapshot=null; // düzenleme öncesi hali (log için)

window.skTab=function(id,btn){
  document.querySelectorAll('#stok-islemleri .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#stok-islemleri .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tp-sk-'+id)?.classList.add('active');
  btn.classList.add('active');
  _aktifSkTab=id;
  if(id==='transfer')trfGorunumListe();
  if(id==='devir'&&typeof dvrGorunumListe==='function')dvrGorunumListe();
  if(typeof SC_TURLER!=='undefined'&&SC_TURLER.includes(id))scGorunumListe(id);
  if(id==='uretim'&&typeof urGorunumListe==='function')urGorunumListe();
  if(id==='sayim'&&typeof syGorunumListe==='function')syGorunumListe();
};
window.skAcilis=function(){
  if(_aktifSkTab==='transfer')trfGorunumListe();
  else if(_aktifSkTab==='devir'&&typeof dvrGorunumListe==='function')dvrGorunumListe();
  else if(typeof SC_TURLER!=='undefined'&&SC_TURLER.includes(_aktifSkTab))scGorunumListe(_aktifSkTab);
  else if(_aktifSkTab==='uretim'&&typeof urGorunumListe==='function')urGorunumListe();
  else if(_aktifSkTab==='sayim'&&typeof syGorunumListe==='function')syGorunumListe();
};

const _depoAd=id=>depolar.find(d=>d.id===id)?.ad||'—';
const _trfSayi=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});

// Transfer fişleri "stok_fisleri" başlık tablosundan okunur (satırları gruplayıp toplamaya gerek yok).
// Fiş satırları (kalemler) sadece fiş açılırken yerel islemler listesinden alınır.
let _trfFisListesi=[];
// Fiş satırları (kalemler) listede çekilmez; fiş açılırken/silinirken veritabanından alınır (trfSatirlariGetir).
async function trfSatirlariGetir(fisId){return (await belgeSatirlari(fisId)).filter(i=>i.tur==='transfer_cikis');}
function _trfFisNesnesi(h){
  return {id:h.id,tarih:h.tarih,alt_tur:h.alt_tur,kaynak:h.depo_id,hedef:h.hedef_depo_id,kalem:h.kalem_sayisi||0,
    not:h.aciklama||'',irsaliye_id:h.irsaliye_id||null,fatura_id:h.fatura_id||null,kullanici:h.kullanici||''};
}

// ===== LİSTE =====
window.trfGorunumListe=function(){
  _trfDuzenlenenId=null;_trfGoruntuleme=false;_trfSaltOkunur(false);_trfBaslikYaz(false,false);
  const l=document.getElementById('tp-sk-transfer-liste'),f=document.getElementById('tp-sk-transfer-form');
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderTransferListe();
};
window.renderTransferListe=async function(){
  const tarihEl=document.getElementById('trf-liste-tarih');
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tb=document.getElementById('trf-liste-tb');if(!tb)return;
  let q=sb.from('stok_fisleri').select('*').eq('fis_turu','transfer').eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data}=await q;
  const fisler=(data||[]).map(_trfFisNesnesi);
  _trfFisListesi=fisler;
  const oz=document.getElementById('trf-liste-ozet');
  if(oz)oz.textContent=fisler.length?`${fisler.length} fiş`:'';
  if(!fisler.length){tb.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';_trfSeciliId=null;return;}
  if(!fisler.some(f=>f.id===_trfSeciliId))_trfSeciliId=null;
  tb.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Fiş Tipi</th><th>Kaynak Depo</th><th>Hedef Depo</th><th style="text-align:right">Kalem</th><th>Kaynak Belge</th><th>Kullanıcı</th>
  </tr></thead><tbody>${fisler.map(f=>{
    const kb=f.irsaliye_id?'İrsaliye':f.fatura_id?'Fatura':'Manuel';
    return `<tr data-id="${f.id}" onclick="trfSec('${f.id}')" ondblclick="trfDuzenleAc('${f.id}',true)" style="cursor:pointer;${_trfSeciliId===f.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${f.tarih}</td>
      <td style="font-size:12px">${TRF_TIP_ADLARI[f.alt_tur]||f.alt_tur}</td>
      <td style="font-size:12px">${_depoAd(f.kaynak)}</td>
      <td style="font-size:12px">${_depoAd(f.hedef)}</td>
      <td style="text-align:right">${f.kalem}</td>
      <td style="font-size:11px;color:${kb==='Manuel'?'var(--yazi2)':'var(--turuncu)'}">${kb}</td>
      <td style="font-size:11px;color:var(--yazi3)">${f.kullanici}</td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
};
window.trfSec=function(id){
  _trfSeciliId=id;
  document.querySelectorAll('#trf-liste-tb tr[data-id]').forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.trfListeIslem=function(islem){
  if(!_trfSeciliId){bil('Önce listeden bir kayıt seçin','err');return;}
  if(islem==='goruntule')trfDuzenleAc(_trfSeciliId,true);
  else if(islem==='duzenle')trfDuzenleAc(_trfSeciliId,false);
  else if(islem==='sil')trfSil(_trfSeciliId);
  else if(islem==='log')belgeLogGoster('transfer',_trfSeciliId,'Transfer Fişi Logu');
};

// ===== FORM =====
function _trfBaslikYaz(duzenleme,salt){
  const el=document.querySelector('#tp-sk-transfer-form .card-title');
  if(el&&el.firstChild)el.firstChild.textContent='Transfer Fişi'+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _trfSaltOkunur(salt){
  const form=document.getElementById('tp-sk-transfer-form');if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{el.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetTransfer"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="trfKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
}
window.trfKaydetmedenCik=async function(){
  if(_trfGoruntuleme){trfGorunumListe();return;}
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)trfGorunumListe();
};
window.trfYeniBaslat=function(){
  _trfBakCache={}; // formu her açışta güncel bakiyeler okunur
  _trfDuzenlenenId=null;_trfGoruntuleme=false;_trfSaltOkunur(false);_trfBaslikYaz(false,false);
  trfSatirListesi=[];
  for(let i=0;i<15;i++)trfSatirListesi.push({stokId:'',birimId:'',miktar:''});
  document.getElementById('trf-tarih').value=bugun();
  document.getElementById('trf-tip').value='ana_depo_cikis';
  document.getElementById('trf-not').value='';
  trfTipDegis();
  document.getElementById('tp-sk-transfer-liste').style.display='none';
  document.getElementById('tp-sk-transfer-form').style.display='';
  document.body.classList.add('islem-form-acik');
};
function _trfDepoListe(){
  return (typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar).filter(d=>d.aktif!==false);
}
// Fiş tipine göre kaynak/hedef depo seçeneklerini kurar ve kuralı uygular:
// Ana Depo Çıkış → kaynak sabit Ana Depo; Ana Depoya İade → hedef sabit Ana Depo; Depolar Arası → ikisi de ana depo dışı.
window.trfTipDegis=function(seciliKaynak,seciliHedef){
  const tip=document.getElementById('trf-tip').value;
  const ana=anaDepoId();
  const hepsi=_trfDepoListe();
  const anaD=hepsi.find(d=>d.id===ana);
  const diger=hepsi.filter(d=>d.id!==ana);
  const opt=(l,sel)=>l.map(d=>`<option value="${d.id}"${d.id===sel?' selected':''}>${d.ad}</option>`).join('');
  const bos='<option value=""></option>';
  const anaOpt=anaD?opt([anaD],ana):'<option value="">Ana depo tanımlı değil!</option>';
  const k=document.getElementById('trf-kaynak'),h=document.getElementById('trf-hedef');
  if(tip==='ana_depo_cikis'){k.innerHTML=anaOpt;k.disabled=true;h.innerHTML=bos+opt(diger,seciliHedef);h.disabled=false;}
  else if(tip==='ana_depoya_iade'){k.innerHTML=bos+opt(diger,seciliKaynak);k.disabled=false;h.innerHTML=anaOpt;h.disabled=true;}
  else{k.innerHTML=bos+opt(diger,seciliKaynak);k.disabled=false;h.innerHTML=bos+opt(diger,seciliHedef);h.disabled=false;}
  trfSatirRender();
};
function trfSatirRender(){
  const el=document.getElementById('trf-satirlar');if(!el)return;
  const kaynak=document.getElementById('trf-kaynak')?.value||'';
  el.innerHTML=trfSatirListesi.map((s,i)=>{
    const secili=stoklar.find(x=>x.id===s.stokId);
    return `<tr data-tablo="trf">
      <td><div style="position:relative">
        <input type="text" data-satir-ana="1" autocomplete="off" value="${secili?secili.ad:''}"
          oninput="trfMalzemeAramaFiltrele(${i},this.value)"
          onfocus="trfMalzemeAramaFiltrele(${i},this.value)"
          onblur="setTimeout(()=>{const d=document.getElementById('trf-oneri-${i}');if(d)d.style.display='none';},150)"
          onkeydown="_oneriTusVurusu(event,'trf-oneri-${i}')" style="width:100%;padding:3px 6px;font-size:12px">
        <div id="trf-oneri-${i}" onmousedown="event.preventDefault()" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:240px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:2px"></div>
      </div></td>
      <td><select id="trf-birim-${i}" onchange="trfBirimSec(${i},this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)"><option value=""></option>${irsBirimOpts('stok',s.stokId,s.birimId)}</select></td>
      <td><input type="number" value="${s.miktar||''}" onblur="trfMiktar(${i},this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td id="trf-bak-${i}" style="text-align:right">${_trfBakiyeHtml(s,kaynak)}</td>
    </tr>`;
  }).join('');
  trfBakiyeleriGetir();
}
// Kaynak depodaki mevcut bakiye (düzenlemede kendi eski hareketleri hariç) ve aşım uyarısı.
let _trfBakCache={}; // "stok|kaynak|haric" → bakiye (veritabanından)
const _trfBakAnahtar=(sid,kaynak)=>`${sid}|${kaynak}|${_trfDuzenlenenId||''}`;
function _trfBakiyeHtml(s,kaynak){
  if(!s.stokId||!kaynak)return '';
  const st=stoklar.find(x=>x.id===s.stokId);
  const tb=birimler.find(b=>b.id===st?.birim_id);
  const bak=_trfBakCache[_trfBakAnahtar(s.stokId,kaynak)];
  if(bak===undefined)return '<span style="font-size:11px;color:var(--yazi3)">…</span>';
  const mik=(parseFloat(s.miktar)||0)*birimTemelCarp(s.birimId);
  const asildi=mik>bak+0.0005;
  return `<span style="font-size:12px;${asildi?'color:#c62828;font-weight:600':'color:var(--yazi3)'}">${_trfSayi(bak)} ${tb?.kisaltma||''}${asildi?' ⚠':''}</span>`;
}
function _trfBakiyeGuncelle(i){
  const kaynak=document.getElementById('trf-kaynak')?.value||'';
  const td=document.getElementById('trf-bak-'+i);if(td)td.innerHTML=_trfBakiyeHtml(trfSatirListesi[i],kaynak);
}
// Satırlardaki stokların kaynak depo bakiyelerini veritabanından getirir (eksik olanları, tek çağrıda).
async function trfBakiyeleriGetir(){
  const kaynak=document.getElementById('trf-kaynak')?.value||'';
  if(!kaynak)return;
  const eksik=[...new Set(trfSatirListesi.filter(s=>s.stokId).map(s=>s.stokId))].filter(id=>_trfBakCache[_trfBakAnahtar(id,kaynak)]===undefined);
  if(eksik.length){
    try{
      const m=await stokBakiyelerDb(kaynak,eksik,_trfDuzenlenenId);
      eksik.forEach(id=>{_trfBakCache[_trfBakAnahtar(id,kaynak)]=parseFloat(m[id])||0;});
    }catch(e){return;}
  }
  trfSatirListesi.forEach((s,i)=>_trfBakiyeGuncelle(i));
}
window.trfMalzemeAramaFiltrele=function(i,val){
  const kutu=document.getElementById('trf-oneri-'+i);if(!kutu)return;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const sec=_oneriSirala(q?kapsam.filter(x=>x.ad.toLocaleLowerCase('tr').includes(q)):kapsam,q,x=>x.ad);
  kutu.dataset.vurgu='-1';
  if(!sec.length){kutu.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--yazi3)">Sonuç bulunamadı</div>';kutu.style.display='block';return;}
  kutu.innerHTML=sec.map(x=>`<div class="oneri-item" onclick="trfMalzemeSecildi(${i},'${x.id}')" style="padding:8px 10px;font-size:12px">${x.ad}</div>`).join('');
  kutu.style.display='block';
};
window.trfMalzemeSecildi=function(i,stokId){
  const k=stoklar.find(x=>x.id===stokId);if(!k)return;
  const s=trfSatirListesi[i];
  s.stokId=stokId;s.birimId=k.varsayilan_birim_id||k.birim_id||'';
  if(i===trfSatirListesi.length-1)trfSatirListesi.push({stokId:'',birimId:'',miktar:''});
  trfSatirRender();
  document.getElementById('trf-birim-'+i)?.focus();
};
window.trfBirimSec=function(i,birimId){trfSatirListesi[i].birimId=birimId;_trfBakiyeGuncelle(i);};
window.trfMiktar=function(i,val){trfSatirListesi[i].miktar=val;_trfBakiyeGuncelle(i);};

// ===== KAYDET =====
window.kaydetTransfer=async function(){
  const tarih=document.getElementById('trf-tarih').value;
  const tip=document.getElementById('trf-tip').value;
  const kaynak=document.getElementById('trf-kaynak').value;
  const hedef=document.getElementById('trf-hedef').value;
  const not=document.getElementById('trf-not').value.trim()||null;
  const ana=anaDepoId();
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(!ana){bil('Ana depo tanımlı değil! Önce Depolar ekranından ana depoyu işaretleyin.','err');return;}
  if(!kaynak||!hedef){bil('Kaynak ve hedef depo seçimi zorunlu!','err');return;}
  if(kaynak===hedef){bil('Kaynak ve hedef depo aynı olamaz!','err');return;}
  if(tip==='ana_depo_cikis'&&kaynak!==ana){bil('Ana Depo Çıkış fişinde kaynak depo Ana Depo olmalı.','err');return;}
  if(tip==='ana_depoya_iade'&&hedef!==ana){bil('Ana Depoya İade fişinde hedef depo Ana Depo olmalı.','err');return;}
  if(tip==='depolar_arasi'&&(kaynak===ana||hedef===ana)){bil('Depolar arası transferde Ana Depo seçilemez. Ana Depo için "Ana Depo Çıkış" / "Ana Depoya İade" tiplerini kullanın.','err');return;}
  const gecerli=trfSatirListesi.filter(s=>s.stokId&&parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  if(gecerli.some(s=>!s.birimId)){bil('Tüm satırlarda birim seçilmeli!','err');return;}
  const haric=_trfDuzenlenenId;
  // Kaynak depoda yeterli stok ve eksiye düşme kontrolleri veritabanında yapılır (stok_fisi_yaz).
  const fisId=haric||crypto.randomUUID(); // düzenlemede aynı fiş kimliği korunur (log geçmişi kesilmez)
  const baz=Date.now();let n=0;const rows=[];
  gecerli.forEach(s=>{
    const kart=stoklar.find(x=>x.id===s.stokId);
    const mik=parseFloat(s.miktar)||0;
    const fiyat=(parseFloat(kart?.maliyet)||0)*birimTemelCarp(s.birimId); // seçili birim cinsinden maliyet
    const ortak={tarih,stok_id:s.stokId,birim_id:s.birimId,miktar:mik,fiyat,tutar:Math.round(mik*fiyat*100)/100,
      aciklama:`${kart?.ad||''} → ${_depoAd(hedef)}`,kat:TRF_TIP_ADLARI[tip],alt_tur:tip,aciklama_not:not,
      belge_id:fisId,hedef_depo_id:hedef,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null};
    rows.push({...ortak,tur:'transfer_cikis',depo_id:kaynak,ts:baz+(n++)});
    rows.push({...ortak,tur:'transfer_giris',depo_id:hedef,ts:baz+(n++)});
  });
  const toplamTutar=Math.round(rows.filter(r=>r.tur==='transfer_cikis').reduce((a,r)=>a+r.tutar,0)*100)/100;
  const baslikVeri={isyeri_id:aktifIsyeri?.id||null,fis_turu:'transfer',alt_tur:tip,tarih,depo_id:kaynak,hedef_depo_id:hedef,
    kalem_sayisi:gecerli.length,toplam_tutar:toplamTutar,aciklama:not};
  // Tek işlemde (transaction) yazılır; stok yetersizse/eksiye düşecekse veritabanı hata verir ve hiçbir şey kaydedilmez.
  try{await fisYazDb({id:fisId,...baslikVeri,kullanici:aktifKullanici?.ad||'',ts:baz},rows,haric,true);}
  catch(e){bil('Kaydedilemedi: '+e.message,'err');return;}
  await logYaz({islem:haric?'duzenle':'olustur',belgeTuru:'transfer',altTur:tip,belgeId:fisId,belgeTarihi:tarih,tutar:toplamTutar,
    eski:haric?_trfEskiSnapshot:null,yeni:transferSnapshotKur(tarih,tip,kaynak,hedef,not,gecerli)});
  await islemleriYenile();
  bil(`✓ Transfer fişi ${haric?'güncellendi':'kaydedildi'} (${gecerli.length} kalem)`);
  const tEl=document.getElementById('trf-liste-tarih');if(tEl)tEl.value=tarih;
  trfGorunumListe();
};

// ===== DÜZENLE / GÖRÜNTÜLE / SİL =====
window.trfDuzenleAc=async function(fisId,salt){
  const fis=_trfFisListesi.find(f=>f.id===fisId);
  if(!fis){bil('Fiş bulunamadı','err');return;}
  fis.satirlar=await trfSatirlariGetir(fisId);
  if(!salt&&(fis.irsaliye_id||fis.fatura_id)){
    bil(`Bu fiş bir ${fis.irsaliye_id?'irsaliye':'fatura'}dan oluştuğu için burada düzenlenemez. Düzenlemek için önce bu fişi silin, sonra ilgili ${fis.irsaliye_id?'irsaliyeyi':'faturayı'} düzenleyin.`,'err');return;
  }
  trfYeniBaslat();
  document.getElementById('trf-tarih').value=fis.tarih;
  document.getElementById('trf-tip').value=fis.alt_tur;
  document.getElementById('trf-not').value=fis.not;
  trfTipDegis(fis.kaynak,fis.hedef);
  _trfDuzenlenenId=salt?null:fisId;
  trfSatirListesi=fis.satirlar.map(r=>({stokId:r.stok_id,birimId:r.birim_id||'',miktar:r.miktar}));
  if(!salt)_trfEskiSnapshot=transferSnapshotKur(fis.tarih,fis.alt_tur,fis.kaynak,fis.hedef,fis.not,trfSatirListesi);
  if(!salt)for(let i=0;i<5;i++)trfSatirListesi.push({stokId:'',birimId:'',miktar:''});
  trfSatirRender();
  _trfBaslikYaz(true,!!salt);
  if(salt){_trfGoruntuleme=true;_trfSaltOkunur(true);}
};
window.trfSil=async function(fisId){
  const fis=_trfFisListesi.find(f=>f.id===fisId);if(!fis)return;
  fis.satirlar=await trfSatirlariGetir(fisId);
  const bagli=fis.irsaliye_id||fis.fatura_id;
  const mesaj=bagli
    ?`Bu fiş bir ${fis.irsaliye_id?'irsaliye':'fatura'}dan oluşmuş.<br><small>Silerseniz ilgili belgeyi düzenleyebilirsiniz; belgedeki çıkış depoları kayıtlı kalır.</small><br>Fiş silinsin mi?`
    :'Bu transfer fişi silinsin mi?';
  if(!(await onay(mesaj,'🗑️')))return;
  // Tek işlemde silinir; mal başka yere çıkmışsa (stok eksiye düşecekse) veritabanı hata verir.
  try{await fisSilDb(fisId,true);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  await islemleriYenile();
  _trfSeciliId=null;
  await logYaz({islem:'sil',belgeTuru:'transfer',altTur:fis.alt_tur,belgeId:fisId,belgeTarihi:fis.tarih,irsaliyeId:fis.irsaliye_id,faturaId:fis.fatura_id,
    eski:transferSnapshotKur(fis.tarih,fis.alt_tur,fis.kaynak,fis.hedef,fis.not,fis.satirlar.map(r=>({stokId:r.stok_id,birimId:r.birim_id,miktar:r.miktar})))});
  bil('Fiş silindi ✓');
  renderTransferListe();
};

// Satır tamamlanma kuralı: stok + birim + miktar>0 olmadan alt satıra geçilemez
if(typeof _satirKayitEkle==='function'){
  _satirKayitEkle('trf',
    (i)=>trfSatirListesi[i],
    (s)=>!!(s&&s.stokId&&s.birimId&&parseFloat(s.miktar)>0)
  );
}
