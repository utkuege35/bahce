// ===== STOK İŞLEMLERİ — SAYIM SEKMESİ =====
// Sayım fişi formu (sy* fonksiyonları: Excel'den içe aktarma, YM/Ürün sayımından yansıtma, kaynak dökümü) islemler.js'tedir;
// burada liste / görüntüle / düzenle / sil / log ile Stok İşlemleri çatısına bağlanır.
// SAYIM STOĞU DEĞİŞTİRMEZ (bilgi amaçlıdır). Fiş başlığı stok_fisleri'nde (fis_turu='sayim'), satırlar islemler'de aynı belge_id ile durur.
// Kayıt TEK işlemde yazılır (kaydetSayim → fisYazDb); düzenlemede eski satırlar silinmez, geri alınmış olarak saklanır.
// Aynı işyeri + depo + gün için tek sayım fişi olabilir (veritabanı da zorlar).
let _syFisListesi=[],_sySeciliId=null,_syGoruntuleme=false,_syEskiSnapshot=null;

function _syFisNesnesi(h){
  return {id:h.id,fisNo:h.fis_no||'',tarih:h.tarih,depo:h.depo_id,kalem:h.kalem_sayisi||0,tutar:parseFloat(h.toplam_tutar)||0,not:h.aciklama||'',kullanici:h.kullanici||''};
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
    <th>Tarih</th><th>Fiş No</th><th>Depo</th><th style="text-align:right">Kalem</th><th style="text-align:right">Tutar</th><th>Not</th><th>Kullanıcı</th>
  </tr></thead><tbody>${fisler.map(f=>`<tr data-id="${f.id}" onclick="sySec('${f.id}')" ondblclick="sayimFisiDuzenleAc('${f.id}',true)" style="cursor:pointer;${_sySeciliId===f.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${f.tarih}</td>
      <td style="font-size:12px;white-space:nowrap;font-weight:500;color:var(--yesil)">${f.fisNo||'—'}</td>
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
  if(typeof fisNoRozetYaz==='function')fisNoRozetYaz('#tp-sk-sayim-form',''); // (loglar.js güncel değilse rozet atlanır; form yine açılır)
  sayimDuzenlemeIptal();_syEskiSnapshot=null;
  syFormAc();
  _syGoruntuleme=false;_sySaltOkunur(false);_syBaslikYaz(false,false);
  const t=document.getElementById('sy-tarih');if(t&&!t.value)t.value=bugun();
  syTarihDegisti(); // kalan hesabı başlangıcı = sayım tarihinin ay başı
  sySatirRender();
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

// ===== KALANLARI GETİR / SAYIMA AKTAR =====
// Seçili depoda, sayım tarihinde görünen KALAN miktar ve tutarı getirir. Hesap Stok Envanter Raporu ile AYNIDIR
// (envanterVeriGetir + _envKalan: Devir [sadece başlangıç tarihindeki devir fişi] + Alım + Transfer(+) − Transfer(−) − Satış − Ödenmez
// − İkram − Hasar − Atık), tek depo için. Aralık: "kalan hesabı başlangıcı" (varsayılan sayım tarihinin ay başı) → sayım tarihi.
// Sayım fişine sadece SAYIM sütunu yazılır; kalan değerleri bilgi amaçlıdır ve kaydedilmez.
let _syKalanAnahtar='',_syKalanMesaj='',_syHesapBasOto=true;
const _syAyBasi=t=>t?t.slice(0,7)+'-01':'';
function _syKalanTemizle(){
  _syKalanAnahtar='';_syKalanMesaj='';_syHesapBasOto=true;
  const b=document.getElementById('sy-hesap-bas');if(b)b.value='';
  const bi=document.getElementById('sy-kalan-bilgi');if(bi){bi.textContent='';bi.style.color='';}
}
function syKalanBilgiGuncelle(){
  const bi=document.getElementById('sy-kalan-bilgi');if(!bi||!_syKalanAnahtar)return;
  const sim=[document.getElementById('sy-depo')?.value,document.getElementById('sy-hesap-bas')?.value,document.getElementById('sy-tarih')?.value].join('|');
  if(sim!==_syKalanAnahtar){bi.textContent='⚠ Depo ya da tarih değişti — görünen kalanlar eski seçime göre. Yeniden "Kalanları Getir"e basın.';bi.style.color='#c62828';}
  else{bi.textContent=_syKalanMesaj;bi.style.color='';}
}
window.syTarihDegisti=function(){
  if(_syHesapBasOto){const b=document.getElementById('sy-hesap-bas');if(b)b.value=_syAyBasi(document.getElementById('sy-tarih')?.value);}
  syKalanBilgiGuncelle();syFisKontrol();
};
window.syDepoDegisti=function(){syKalanBilgiGuncelle();syFisKontrol();};
window.syHesapBasElle=function(){_syHesapBasOto=false;syKalanBilgiGuncelle();};
window.syKalanlariGetir=async function(){
  const tarih=document.getElementById('sy-tarih')?.value,depo=document.getElementById('sy-depo')?.value;
  if(!depo){bil('Önce depoyu seçin!','err');return;}
  if(!tarih){bil('Önce sayım tarihini seçin!','err');return;}
  if(typeof envanterVeriGetir!=='function'||typeof _envKalan!=='function'){bil('Envanter hesabı yüklenemedi, sayfayı yenileyin.','err');return;}
  const bas=document.getElementById('sy-hesap-bas')?.value||_syAyBasi(tarih);
  if(bas>tarih){bil('Hesap başlangıcı sayım tarihinden sonra olamaz!','err');return;}
  const btn=document.getElementById('btn-sy-kalan');const btnYazi=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Hesaplanıyor...';}
  let veri;
  try{veri=await envanterVeriGetir(bas,tarih,[depo]);}
  catch(e){bil('Kalanlar hesaplanamadı: '+e.message,'err');return;}
  finally{if(btn){btn.disabled=false;btn.textContent=btnYazi;}}
  // Önceki "Kalanları Getir"in sayım girilmemiş satırları ve eski kalan değerleri temizlenir (depo/tarih değişmiş olabilir)
  sayimSatirListesi=sayimSatirListesi.filter(s=>!(s.otoKalan&&!(s.direkt>0)&&!(s.kaynaklar||[]).length));
  sayimSatirListesi.forEach(s=>{delete s.kalanM;delete s.kalanT;});
  const kapsam=isyeriFiltre(stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  let adet=0,toplamT=0,devirVar=false;
  kapsam.forEach(st=>{
    const o=veri[st.id];if(!o)return;
    const kalanM=_envKalan(o.m),kalanT=_envKalan(o.t);
    if(o.m.devir>0)devirVar=true;
    if(!o.hareket&&Math.abs(kalanM)<0.0005&&Math.abs(kalanT)<0.005)return; // depoda hiç hareketi olmayan stok listelenmez
    let satir=sayimSatirListesi.find(x=>x.stokId===st.id);
    if(!satir){satir={stokId:st.id,birimId:st.birim_id||'',direkt:0,kaynaklar:[],otoKalan:true};sayimSatirListesi.push(satir);}
    satir.kalanM=Math.round(kalanM*1000)/1000;satir.kalanT=Math.round(kalanT*100)/100;
    adet++;toplamT+=satir.kalanT;
  });
  sayimSatirListesi.sort((a,b)=>{const ka=stoklar.find(x=>x.id===a.stokId)?.kod||'',kb=stoklar.find(x=>x.id===b.stokId)?.kod||'';return ka.localeCompare(kb,'tr',{numeric:true});});
  const depoAd=depolar.find(d=>d.id===depo)?.ad||'';
  _syKalanAnahtar=[depo,bas,tarih].join('|');
  _syKalanMesaj=`📊 ${depoAd} · ${bas} – ${tarih} · ${adet} kalem · Kalan toplam tutar: ${para(toplamT)}`+(devirVar?'':' · ⚠ Başlangıç tarihinde devir fişi yok; kalanlar sadece aralıktaki hareketlerden hesaplandı (Stok Envanter Raporu ile aynı kural).');
  syKalanBilgiGuncelle();
  sySatirRender();
  bil(adet?`${adet} kalem için kalan getirildi ✓`:'Bu depoda seçilen aralıkta hareket görünmüyor.',adet?'ok':'uyari');
};
// KALAN miktarlarını SAYIM sütununa toplu yazar (negatif kalan atlanır). Sayım tutarı otomatik oluşur.
window.syKalanlariSayimaYaz=async function(){
  const satirlar=sayimSatirListesi.filter(s=>s.kalanM!==undefined&&s.kalanM!==null);
  if(!satirlar.length){bil('Önce "Kalanları Getir"e basın.','err');return;}
  const dolu=satirlar.filter(s=>(s.direkt>0)||(s.kaynaklar||[]).length);
  if(dolu.length&&!(await onay(`${dolu.length} satırda daha önce girilmiş sayım var; bunların üzerine KALAN miktarı yazılacak.<br>Devam edilsin mi?`,'⚠️','Evet','Hayır')))return;
  let yazilan=0,atlanan=0;
  satirlar.forEach(s=>{
    if(!(s.kalanM>0)){atlanan++;return;} // sıfır/negatif kalan sayıma yazılmaz
    const kaynaklarToplam=(s.kaynaklar||[]).reduce((t,k)=>t+(parseFloat(k.miktar)||0),0);
    s.direkt=Math.max(0,Math.round((s.kalanM-kaynaklarToplam)*1000)/1000); // sayım toplamı = kalan (YM kaynaklı kısım sabit kalır)
    yazilan++;
  });
  sySatirRender();
  bil(`${yazilan} satırın sayımına kalan yazıldı ✓`+(atlanan?` (${atlanan} satır atlandı: kalan sıfır ya da eksi)`:''));
};
// Bu depoda listelenmeyen bir stoğu sayıma eklemek için alttaki arama kutusuna gider
window.sySatirEkle=function(){
  const k=document.getElementById('sy-bos-hammadde-arama');
  if(!k){bil('Sayım formu açık değil','err');return;}
  if(k.scrollIntoView)k.scrollIntoView({block:'center',behavior:'smooth'});
  k.focus();
};
