// ===== KASA İŞLEMLERİ — TAHSİL / TEDİYE =====
// Her fiş TEK satırdır (islemler: tur='kasa'): fişin kendisi özet satırdır, ayrı bir detay satırı yoktur.
//  Tahsil (kasaya giriş, +): Alıcı Tahsilatı (cari seçilir, cari "borç" hareketi yazılır) | Diğer Kasa Girişi
//  Tediye (kasadan çıkış, −): Satıcı Ödemesi (cari seçilir, cari "alacak" hareketi yazılır) | Diğer Kasa Çıkışı
// Kasa hareketi ve cari hareketi veritabanında TEK İŞLEMDE yazılır/silinir ve birbirine bağlanır (kasa_fisi_yaz / kasa_fisi_sil).
// secenekler: [alt_tur, etiket, cari türü (null: cari yok), cari hareket tipi, varsayılan açıklama]
const KI_TURLER={
  tahsil:{ad:'Tahsil',isaret:1,secenekler:[
    ['alici_tahsilat','💰 Alıcı Tahsilatı (cariden tahsil)','alici','borc','Alıcı tahsilatı'],
    ['diger_giris','➕ Diğer Kasa Girişi',null,null,'Kasa girişi']]},
  tediye:{ad:'Tediye',isaret:-1,secenekler:[
    ['satici_odeme','💸 Satıcı Ödemesi (cariye ödeme)','satici','alacak','Satıcı ödemesi'],
    ['diger_cikis','➖ Diğer Kasa Çıkışı',null,null,'Kasa çıkışı']]}
};
const KI_ALT_ADLARI={alici_tahsilat:'Alıcı Tahsilatı',diger_giris:'Diğer Giriş',satici_odeme:'Satıcı Ödemesi',diger_cikis:'Diğer Çıkış'};
const KI_TURLER_LISTE=['tahsil','tediye'];
let _aktifKiTab='tahsil';
let _kiDuz={tahsil:null,tediye:null},_kiGor={tahsil:false,tediye:false},_kiSecili={tahsil:null,tediye:null};
let _kiListe={tahsil:[],tediye:[]},_kiEski={tahsil:null,tediye:null},_kiBakiyeler={};
const _kiAnahtar=r=>r.belge_id||r.id;

window.kiTab=function(id,btn){
  document.querySelectorAll('#kasa-islemleri .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#kasa-islemleri .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tp-ki-'+id)?.classList.add('active');
  btn.classList.add('active');
  _aktifKiTab=id;kiGorunumListe(id);
};
window.kiAcilis=function(){kiGorunumListe(_aktifKiTab);};

// ===== LİSTE =====
window.kiGorunumListe=function(tur){
  _kiDuz[tur]=null;_kiGor[tur]=false;_kiSaltOkunur(tur,false);_kiBaslikYaz(tur,false,false);
  const l=document.getElementById(`tp-ki-${tur}-liste`),f=document.getElementById(`tp-ki-${tur}-form`);
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderKiListe(tur);
};
window.renderKiListe=async function(tur){
  const tarihEl=document.getElementById(`ki-${tur}-liste-tarih`);
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tb=document.getElementById(`ki-${tur}-liste-tb`);if(!tb)return;
  tb.innerHTML='<div class="bos">Yükleniyor...</div>';
  let liste;
  try{liste=await islemlerKasa(tarih,KI_TURLER[tur].isaret);}
  catch(e){tb.innerHTML=`<div class="bos">Liste okunamadı: ${_logEsc(e.message)}</div>`;return;}
  _kiListe[tur]=liste;
  const toplam=liste.reduce((a,r)=>a+Math.abs(parseFloat(r.kasa_etkisi)||0),0);
  const oz=document.getElementById(`ki-${tur}-liste-ozet`);
  if(oz)oz.textContent=liste.length?`${liste.length} fiş · ${_irsSayi(toplam)}`:'';
  if(!liste.length){tb.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';_kiSecili[tur]=null;return;}
  if(!liste.some(r=>_kiAnahtar(r)===_kiSecili[tur]))_kiSecili[tur]=null;
  tb.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Tür</th><th>Kasa</th><th>Cari</th><th>Belge No</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th>Kullanıcı</th>
  </tr></thead><tbody>${liste.map(r=>{
    const k=_kiAnahtar(r);
    const kasa=kasalar_list.find(x=>x.id===r.kasa_id);
    const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===r.cari_id):null;
    return `<tr data-id="${k}" onclick="kiSec('${tur}','${k}')" ondblclick="kiDuzenleAc('${tur}','${k}',true)" style="cursor:pointer;${_kiSecili[tur]===k?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${r.tarih}</td>
      <td style="font-size:12px">${KI_ALT_ADLARI[r.alt_tur]||'<span style="color:var(--yazi3)">Eski kayıt</span>'}</td>
      <td style="font-size:12px">${_logEsc(kasa?.ad||'—')}</td>
      <td style="font-size:12px">${_logEsc(cari?cari.ad:'—')}</td>
      <td style="font-size:12px">${_logEsc(r.belge_no||'—')}</td>
      <td style="font-size:11px;color:var(--yazi2);max-width:260px">${_logEsc(r.aciklama||'')}</td>
      <td style="text-align:right;font-weight:500;color:${KI_TURLER[tur].isaret>0?'var(--yesil)':'var(--turuncu)'}">${_irsSayi(Math.abs(parseFloat(r.kasa_etkisi)||0))}</td>
      <td style="font-size:11px;color:var(--yazi3)">${_logEsc(r.kullanici||'')}</td>
    </tr>`;}).join('')}</tbody></table></div>`;
};
window.kiSec=function(tur,id){
  _kiSecili[tur]=id;
  document.querySelectorAll(`#ki-${tur}-liste-tb tr[data-id]`).forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.kiListeIslem=function(tur,islem){
  const id=_kiSecili[tur];
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  const r=_kiListe[tur].find(x=>_kiAnahtar(x)===id);
  if((islem==='duzenle'||islem==='sil')&&r&&!r.belge_id){
    bil('Bu kayıt eski İşlem ekranından girilmiş. Düzenleme/silme İşlem Listesi\'nden yapılır.','err');return;
  }
  if(islem==='goruntule')kiDuzenleAc(tur,id,true);
  else if(islem==='duzenle')kiDuzenleAc(tur,id,false);
  else if(islem==='sil')kiSil(tur,id);
  else if(islem==='log')belgeLogGoster('kasa',id,`${KI_TURLER[tur].ad} Fişi Logu`);
};

// ===== FORM =====
function _kiBaslikYaz(tur,duzenleme,salt){
  const el=document.querySelector(`#tp-ki-${tur}-form .card-title`);
  if(el&&el.firstChild)el.firstChild.textContent=`${KI_TURLER[tur].ad} Fişi`+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _kiSaltOkunur(tur,salt){
  const form=document.getElementById(`tp-ki-${tur}-form`);if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{el.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetKasaFisi"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="kiKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
}
window.kiKaydetmedenCik=async function(tur){
  if(_kiGor[tur]){kiGorunumListe(tur);return;}
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)kiGorunumListe(tur);
};
window.kiYeniBaslat=async function(tur){
  _kiDuz[tur]=null;_kiGor[tur]=false;_kiEski[tur]=null;_kiSaltOkunur(tur,false);_kiBaslikYaz(tur,false,false);
  const v=(id,val)=>{const el=document.getElementById(`ki-${tur}-${id}`);if(el)el.value=val;};
  v('tarih',bugun());v('tutar','');v('belgeno','');v('aciklama','');
  document.getElementById(`ki-${tur}-tip`).innerHTML=KI_TURLER[tur].secenekler.map(s=>`<option value="${s[0]}">${s[1]}</option>`).join('');
  kiTipDegis(tur);
  document.getElementById(`tp-ki-${tur}-liste`).style.display='none';
  document.getElementById(`tp-ki-${tur}-form`).style.display='';
  document.body.classList.add('islem-form-acik');
  if(typeof kasaSelectDoldur==='function')await kasaSelectDoldur(`ki-${tur}-kasa`,true);
  await kiBakiyeleriYukle(tur);
};
// Seçilen işlem türüne göre cari alanını göster/gizle
window.kiTipDegis=function(tur){
  const tip=document.getElementById(`ki-${tur}-tip`).value;
  const sec=KI_TURLER[tur].secenekler.find(s=>s[0]===tip);
  const fg=document.getElementById(`ki-${tur}-cari-fg`),sel=document.getElementById(`ki-${tur}-cari`);
  if(sec&&sec[2]){
    fg.style.display='';
    document.getElementById(`ki-${tur}-cari-label`).textContent=sec[2]==='satici'?'Satıcı':'Alıcı';
    sel.innerHTML=`<option value="">— ${sec[2]==='satici'?'Satıcı':'Alıcı'} seçin —</option>`+cariOpts(sec[2]);
  }else{fg.style.display='none';sel.innerHTML='<option value=""></option>';}
};
async function kiBakiyeleriYukle(tur){
  try{_kiBakiyeler=await kasaBakiyelerDb();}catch(e){_kiBakiyeler={};}
  kiKasaBilgi(tur);
}
window.kiKasaBilgi=function(tur){
  const kasaId=document.getElementById(`ki-${tur}-kasa`)?.value;
  const el=document.getElementById(`ki-${tur}-bakiye`);if(!el)return;
  if(!kasaId){el.textContent='';return;}
  const b=parseFloat(_kiBakiyeler[kasaId])||0;
  el.innerHTML=`Kasa bakiyesi: <strong style="${b<0?'color:#c62828':''}">${_irsSayi(b)}</strong>`;
};
// ===== KAYDET =====
window.kaydetKasaFisi=async function(tur){
  const g=id=>document.getElementById(`ki-${tur}-${id}`)?.value||'';
  const tarih=g('tarih'),kasaId=g('kasa')||null,tip=g('tip'),cariId=g('cari')||null;
  const tutar=Math.round((parseFloat(g('tutar'))||0)*100)/100;
  const belgeNo=g('belgeno').trim()||null,aciklama=g('aciklama').trim();
  const sec=KI_TURLER[tur].secenekler.find(s=>s[0]===tip);
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(!kasaId){bil('Kasa seçin!','err');return;}
  if(tutar<=0){bil('Tutar sıfırdan büyük olmalı!','err');return;}
  if(sec[2]&&!cariId){bil(`${sec[2]==='satici'?'Satıcı':'Alıcı'} seçin!`,'err');return;}
  const haric=_kiDuz[tur];
  const isaret=KI_TURLER[tur].isaret;
  // Tediyede kasa bakiyesi yetersizse uyar (engellemez, onay ister)
  if(isaret<0){
    try{
      const bak=await kasaBakiyelerDb();
      let mevcut=parseFloat(bak[kasaId])||0;
      const eski=_kiEski[tur];
      if(haric&&eski&&eski.kasa_id===kasaId)mevcut-=parseFloat(eski.kasa_etkisi)||0; // düzenlenen fişin kendi çıkışı iade edilir
      if(mevcut-tutar<0&&!(await onay(`Kasada yeterli bakiye yok (mevcut ${_irsSayi(mevcut)}, çıkış ${_irsSayi(tutar)}).<br>Kasa bakiyesi eksiye düşecek. Yine de kaydedilsin mi?`,'⚠️','Evet','Hayır')))return;
    }catch(e){/* bakiye okunamazsa kontrol atlanır */}
  }
  const id=haric||crypto.randomUUID();
  const satir={id,tarih,tutar,aciklama:aciklama||sec[4],alt_tur:tip,belge_no:belgeNo,kasa_etkisi:isaret*tutar,kasa_id:kasaId,cari_id:cariId,
    kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:Date.now()};
  const cari=sec[2]?{cari_id:cariId,tarih,tip:sec[3],tutar,aciklama:aciklama||(sec[3]==='alacak'?'Ödeme yapıldı':'Tahsilat yapıldı'),
    kullanici:aktifKullanici?.ad||'',ts:Date.now()}:null;
  try{await kasaFisiYazDb(satir,cari,haric);}
  catch(e){bil('Kaydedilemedi: '+e.message,'err');return;}
  if(typeof cariHareketler!=='undefined'){ // cari ekstresi önbelleğini tazele (eski ekranla aynı)
    const {data:ch}=await sb.from('cari_hareketler').select('*').order('tarih',{ascending:true});if(ch)cariHareketler=ch;
  }
  await logYaz({islem:haric?'duzenle':'olustur',belgeTuru:'kasa',altTur:tip,belgeId:id,belgeNo,belgeTarihi:tarih,cariId,tutar,
    eski:haric?_kiEski[tur]?.snapshot:null,yeni:kasaSnapshotKur({tarih,kasaId,tip,cariId,belgeNo,aciklama:satir.aciklama,tutar})});
  bil(`✓ ${KI_TURLER[tur].ad} fişi ${haric?'güncellendi':'kaydedildi'} (${_irsSayi(tutar)})`);
  renderPanel();
  const tEl=document.getElementById(`ki-${tur}-liste-tarih`);if(tEl)tEl.value=tarih;
  kiGorunumListe(tur);
};
// ===== DÜZENLE / GÖRÜNTÜLE / SİL =====
window.kiDuzenleAc=async function(tur,id,salt){
  const r=_kiListe[tur].find(x=>_kiAnahtar(x)===id);
  if(!r){bil('Fiş bulunamadı','err');return;}
  if(!salt&&!r.belge_id){bil('Bu kayıt eski İşlem ekranından girilmiş. Düzenleme İşlem Listesi\'nden yapılır.','err');return;}
  await kiYeniBaslat(tur);
  const v=(k,val)=>{const el=document.getElementById(`ki-${tur}-${k}`);if(el)el.value=val;};
  // Eski kayıtlarda alt_tur yoktur: cari varsa cariye ait, yoksa doğrudan kasa işlemi sayılır
  const tip=r.alt_tur||(r.cari_id?KI_TURLER[tur].secenekler[0][0]:KI_TURLER[tur].secenekler[1][0]);
  v('tip',tip);kiTipDegis(tur);
  v('tarih',r.tarih);v('kasa',r.kasa_id||'');v('cari',r.cari_id||'');
  v('tutar',Math.abs(parseFloat(r.kasa_etkisi)||parseFloat(r.tutar)||0));v('belgeno',r.belge_no||'');v('aciklama',r.aciklama||'');
  kiKasaBilgi(tur);
  _kiDuz[tur]=salt?null:id;
  _kiEski[tur]={kasa_id:r.kasa_id,kasa_etkisi:r.kasa_etkisi,
    snapshot:kasaSnapshotKur({tarih:r.tarih,kasaId:r.kasa_id,tip,cariId:r.cari_id,belgeNo:r.belge_no,aciklama:r.aciklama,tutar:Math.abs(parseFloat(r.kasa_etkisi)||0)})};
  _kiBaslikYaz(tur,true,!!salt);
  if(salt){_kiGor[tur]=true;_kiSaltOkunur(tur,true);}
};
window.kiSil=async function(tur,id){
  const r=_kiListe[tur].find(x=>_kiAnahtar(x)===id);if(!r)return;
  const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===r.cari_id):null;
  if(!(await onay(`Bu ${KI_TURLER[tur].ad.toLowerCase()} fişi silinsin mi?<br><small>Kasa bakiyesi geri alınır${r.cari_id?' ve cari hareketi de silinir':''}.</small>`,'🗑️')))return;
  try{await kasaFisiSilDb(id);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  if(typeof cariHareketler!=='undefined'){
    const {data:ch}=await sb.from('cari_hareketler').select('*').order('tarih',{ascending:true});if(ch)cariHareketler=ch;
  }
  const tip=r.alt_tur||(r.cari_id?KI_TURLER[tur].secenekler[0][0]:KI_TURLER[tur].secenekler[1][0]);
  await logYaz({islem:'sil',belgeTuru:'kasa',altTur:tip,belgeId:id,belgeNo:r.belge_no,belgeTarihi:r.tarih,cariId:r.cari_id,tutar:Math.abs(parseFloat(r.kasa_etkisi)||0),
    eski:kasaSnapshotKur({tarih:r.tarih,kasaId:r.kasa_id,tip,cariId:r.cari_id,belgeNo:r.belge_no,aciklama:r.aciklama,tutar:Math.abs(parseFloat(r.kasa_etkisi)||0)})});
  _kiSecili[tur]=null;
  renderPanel();
  bil('Fiş silindi ✓');
  renderKiListe(tur);
};
