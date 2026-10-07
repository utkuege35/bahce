// ===== STOK İŞLEMLERİ — DEVİR SEKMESİ =====
// Devir fişi: seçilen depoya açılış (devir) stoğu girer. Her kalem "devir" hareketi (stoğu artırır) üretir;
// fiş başlığı "stok_fisleri" tablosunda (fis_turu='devir', alt_tur='manuel') tutulur.
// İleride dönem devri (sayımdan otomatik üretim) aynı yapıyla alt_tur='donem_devri' olarak eklenecek.
let dvrSatirListesi=[];
let _dvrDuzenlenenId=null,_dvrGoruntuleme=false,_dvrSeciliId=null,_dvrEskiSnapshot=null,_dvrFisListesi=[];
const DVR_ALT_ADLARI={manuel:'Manuel',donem_devri:'Dönem Devri'};

function _dvrFisNesnesi(h){
  const satirlar=islemler.filter(i=>i.belge_id===h.id&&i.tur==='devir').sort((a,b)=>(a.ts||0)-(b.ts||0));
  return {id:h.id,tarih:h.tarih,alt_tur:h.alt_tur||'manuel',depo:h.depo_id||anaDepoId(),satirlar,kalem:h.kalem_sayisi||satirlar.length,
    tutar:parseFloat(h.toplam_tutar)||0,not:h.aciklama||'',kullanici:h.kullanici||''};
}
// ===== LİSTE =====
window.dvrGorunumListe=function(){
  _dvrDuzenlenenId=null;_dvrGoruntuleme=false;_dvrSaltOkunur(false);_dvrBaslikYaz(false,false);
  const l=document.getElementById('tp-sk-devir-liste'),f=document.getElementById('tp-sk-devir-form');
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderDevirListe();
};
window.renderDevirListe=async function(){
  const tarihEl=document.getElementById('dvr-liste-tarih');
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tb=document.getElementById('dvr-liste-tb');if(!tb)return;
  let q=sb.from('stok_fisleri').select('*').eq('fis_turu','devir').eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data}=await q;
  const fisler=(data||[]).map(_dvrFisNesnesi);
  _dvrFisListesi=fisler;
  const oz=document.getElementById('dvr-liste-ozet');
  if(oz)oz.textContent=fisler.length?`${fisler.length} fiş · ${_irsSayi(fisler.reduce((a,f)=>a+f.tutar,0))}`:'';
  if(!fisler.length){tb.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';_dvrSeciliId=null;return;}
  if(!fisler.some(f=>f.id===_dvrSeciliId))_dvrSeciliId=null;
  tb.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Depo</th><th style="text-align:right">Kalem</th><th style="text-align:right">Tutar</th><th>Tür</th><th>Kullanıcı</th>
  </tr></thead><tbody>${fisler.map(f=>`<tr data-id="${f.id}" onclick="dvrSec('${f.id}')" ondblclick="dvrDuzenleAc('${f.id}',true)" style="cursor:pointer;${_dvrSeciliId===f.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${f.tarih}</td>
      <td style="font-size:12px">${_depoAd(f.depo)}</td>
      <td style="text-align:right">${f.kalem}</td>
      <td style="text-align:right;font-weight:500">${_irsSayi(f.tutar)}</td>
      <td style="font-size:11px;color:var(--yazi2)">${DVR_ALT_ADLARI[f.alt_tur]||f.alt_tur}</td>
      <td style="font-size:11px;color:var(--yazi3)">${f.kullanici}</td>
    </tr>`).join('')}</tbody></table></div>`;
};
window.dvrSec=function(id){
  _dvrSeciliId=id;
  document.querySelectorAll('#dvr-liste-tb tr[data-id]').forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.dvrListeIslem=function(islem){
  if(!_dvrSeciliId){bil('Önce listeden bir kayıt seçin','err');return;}
  if(islem==='goruntule')dvrDuzenleAc(_dvrSeciliId,true);
  else if(islem==='duzenle')dvrDuzenleAc(_dvrSeciliId,false);
  else if(islem==='sil')dvrSil(_dvrSeciliId);
  else if(islem==='log')belgeLogGoster('devir',_dvrSeciliId,'Devir Fişi Logu');
};
// ===== FORM =====
function _dvrBaslikYaz(duzenleme,salt){
  const el=document.querySelector('#tp-sk-devir-form .card-title');
  if(el&&el.firstChild)el.firstChild.textContent='Devir Fişi'+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _dvrSaltOkunur(salt){
  const form=document.getElementById('tp-sk-devir-form');if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{el.disabled=salt;});
  form.querySelectorAll('.dvr-araclar button').forEach(b=>{b.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetDevirFisi"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="dvrKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
}
window.dvrKaydetmedenCik=async function(){
  if(_dvrGoruntuleme){dvrGorunumListe();return;}
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)dvrGorunumListe();
};
window.dvrYeniBaslat=function(){
  _dvrDuzenlenenId=null;_dvrGoruntuleme=false;_dvrSaltOkunur(false);_dvrBaslikYaz(false,false);
  dvrSatirListesi=[];
  for(let i=0;i<15;i++)dvrSatirListesi.push({stokId:'',birimId:'',miktar:'',fiyat:'',tutar:''});
  document.getElementById('dvr-tarih').value=bugun();
  document.getElementById('dvr-not').value='';
  depoSecenekleri('dvr-depo',anaDepoId()||''); // Ana Depo varsayılan, istenirse başka depo seçilebilir
  dvrSatirRender();
  document.getElementById('tp-sk-devir-liste').style.display='none';
  document.getElementById('tp-sk-devir-form').style.display='';
  document.body.classList.add('islem-form-acik');
};
function dvrSatirRender(){
  const el=document.getElementById('dvr-satirlar');if(!el)return;
  el.innerHTML=dvrSatirListesi.map((s,i)=>{
    const secili=stoklar.find(x=>x.id===s.stokId);
    return `<tr data-tablo="dvr">
      <td><div style="position:relative">
        <input type="text" data-satir-ana="1" autocomplete="off" value="${secili?secili.ad:''}"
          oninput="dvrMalzemeAramaFiltrele(${i},this.value)"
          onfocus="dvrMalzemeAramaFiltrele(${i},this.value)"
          onblur="setTimeout(()=>{const d=document.getElementById('dvr-oneri-${i}');if(d)d.style.display='none';},150)"
          onkeydown="_oneriTusVurusu(event,'dvr-oneri-${i}')" style="width:100%;padding:3px 6px;font-size:12px">
        <div id="dvr-oneri-${i}" onmousedown="event.preventDefault()" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:240px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:2px"></div>
      </div></td>
      <td><select id="dvr-birim-${i}" onchange="dvrBirimSec(${i},this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)"><option value=""></option>${irsBirimOpts('stok',s.stokId,s.birimId)}</select></td>
      <td><input type="number" value="${s.miktar||''}" onblur="dvrSatirHesapla(${i},'miktar',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.fiyat||''}" onblur="dvrSatirHesapla(${i},'fiyat',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.tutar||''}" onblur="dvrSatirHesapla(${i},'tutar',this.value)" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;font-weight:500;color:var(--yesil);text-align:right"></td>
    </tr>`;
  }).join('');
  dvrToplamGuncelle();
}
function dvrToplamGuncelle(){
  const t=dvrSatirListesi.reduce((a,r)=>a+(parseFloat(r.tutar)||0),0);
  const el=document.getElementById('dvr-toplam');if(el)el.textContent=_irsSayi(t);
}
window.dvrMalzemeAramaFiltrele=function(i,val){
  const kutu=document.getElementById('dvr-oneri-'+i);if(!kutu)return;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const sec=_oneriSirala(q?kapsam.filter(x=>x.ad.toLocaleLowerCase('tr').includes(q)):kapsam,q,x=>x.ad);
  kutu.dataset.vurgu='-1';
  if(!sec.length){kutu.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--yazi3)">Sonuç bulunamadı</div>';kutu.style.display='block';return;}
  kutu.innerHTML=sec.map(x=>`<div class="oneri-item" onclick="dvrMalzemeSecildi(${i},'${x.id}')" style="padding:8px 10px;font-size:12px">${x.ad}</div>`).join('');
  kutu.style.display='block';
};
window.dvrMalzemeSecildi=function(i,stokId){
  const k=stoklar.find(x=>x.id===stokId);if(!k)return;
  const s=dvrSatirListesi[i];
  s.stokId=stokId;s.birimId=k.varsayilan_birim_id||k.birim_id||'';
  const m=parseFloat(k.maliyet)||0;
  if(m>0&&!s.fiyat)s.fiyat=(m*birimTemelCarp(s.birimId)).toFixed(2); // stok maliyetini öneri olarak getir
  if(i===dvrSatirListesi.length-1)dvrSatirListesi.push({stokId:'',birimId:'',miktar:'',fiyat:'',tutar:''});
  dvrSatirRender();
  document.getElementById('dvr-birim-'+i)?.focus();
};
window.dvrBirimSec=function(i,birimId){dvrSatirListesi[i].birimId=birimId;};
window.dvrSatirHesapla=function(i,kaynak,val){
  const s=dvrSatirListesi[i];s[kaynak]=val;
  const mik=parseFloat(s.miktar)||0,fiy=parseFloat(s.fiyat)||0,tut=parseFloat(s.tutar)||0;
  const row=document.querySelectorAll('#dvr-satirlar tr')[i];if(!row)return;
  const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);s.tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);s.fiyat=y;if(inputs[1])inputs[1].value=y;}}
  dvrToplamGuncelle();
};
// ===== KAYDET =====
window.kaydetDevirFisi=async function(){
  const tarih=document.getElementById('dvr-tarih').value;
  const depo=document.getElementById('dvr-depo').value;
  const not=document.getElementById('dvr-not').value.trim()||null;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(!depo){bil('Depo seçimi zorunlu!','err');return;}
  const gecerli=dvrSatirListesi.filter(s=>s.stokId&&parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  if(gecerli.some(s=>!s.birimId)){bil('Tüm satırlarda birim seçilmeli!','err');return;}
  const haric=_dvrDuzenlenenId;
  // Düzenlemede eski devir miktarı kaldırılınca stok eksiye düşüyorsa veritabanı reddeder (stok_fisi_yaz).
  const fisId=haric||crypto.randomUUID();
  const baz=Date.now();
  const rows=gecerli.map((s,n)=>{
    const kart=stoklar.find(x=>x.id===s.stokId);
    const mik=parseFloat(s.miktar)||0,fiy=parseFloat(s.fiyat)||0,tut=parseFloat(s.tutar)||(mik*fiy);
    return {tur:'devir',tarih,stok_id:s.stokId,birim_id:s.birimId,miktar:mik,fiyat:fiy,tutar:tut,
      aciklama:`${kart?.ad||''} devir`,kat:'Devir',alt_tur:'manuel',aciklama_not:not,belge_id:fisId,depo_id:depo,
      kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:baz+n};
  });
  const toplamTutar=Math.round(rows.reduce((a,r)=>a+r.tutar,0)*100)/100;
  const baslikVeri={isyeri_id:aktifIsyeri?.id||null,fis_turu:'devir',alt_tur:'manuel',tarih,depo_id:depo,
    kalem_sayisi:gecerli.length,toplam_tutar:toplamTutar,aciklama:not};
  // Tek işlemde yazılır; stok eksiye düşecekse veritabanı hata verir ve hiçbir şey kaydedilmez.
  try{await fisYazDb({id:fisId,...baslikVeri,kullanici:aktifKullanici?.ad||'',ts:baz},rows,haric,true);}
  catch(e){bil('Kaydedilemedi: '+e.message,'err');return;}
  await logYaz({islem:haric?'duzenle':'olustur',belgeTuru:'devir',altTur:'manuel',belgeId:fisId,belgeTarihi:tarih,tutar:toplamTutar,
    eski:haric?_dvrEskiSnapshot:null,yeni:devirSnapshotKur(tarih,depo,not,gecerli)});
  await islemleriYenile();
  bil(`✓ Devir fişi ${haric?'güncellendi':'kaydedildi'} (${gecerli.length} kalem)`);
  const tEl=document.getElementById('dvr-liste-tarih');if(tEl)tEl.value=tarih;
  dvrGorunumListe();
};
// ===== DÜZENLE / GÖRÜNTÜLE / SİL =====
window.dvrDuzenleAc=function(fisId,salt){
  const fis=_dvrFisListesi.find(f=>f.id===fisId);
  if(!fis){bil('Fiş bulunamadı','err');return;}
  dvrYeniBaslat();
  document.getElementById('dvr-tarih').value=fis.tarih;
  document.getElementById('dvr-not').value=fis.not;
  depoSecenekleri('dvr-depo',fis.depo);
  _dvrDuzenlenenId=salt?null:fisId;
  dvrSatirListesi=fis.satirlar.map(r=>({stokId:r.stok_id,birimId:r.birim_id||'',miktar:r.miktar,fiyat:r.fiyat||'',tutar:r.tutar||''}));
  if(!salt)_dvrEskiSnapshot=devirSnapshotKur(fis.tarih,fis.depo,fis.not,dvrSatirListesi);
  if(!salt)for(let i=0;i<5;i++)dvrSatirListesi.push({stokId:'',birimId:'',miktar:'',fiyat:'',tutar:''});
  dvrSatirRender();
  _dvrBaslikYaz(true,!!salt);
  if(salt){_dvrGoruntuleme=true;_dvrSaltOkunur(true);}
};
window.dvrSil=async function(fisId){
  const fis=_dvrFisListesi.find(f=>f.id===fisId);if(!fis)return;
  if(!(await onay('Bu devir fişi silinsin mi?<br><small>Devir ile girilen stok miktarları geri alınır.</small>','🗑️')))return;
  // Tek işlemde silinir; devir ile girilen mal başka yere çıkmışsa (stok eksiye düşecekse) veritabanı hata verir.
  try{await fisSilDb(fisId,true);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  await logYaz({islem:'sil',belgeTuru:'devir',altTur:fis.alt_tur,belgeId:fisId,belgeTarihi:fis.tarih,tutar:fis.tutar,
    eski:devirSnapshotKur(fis.tarih,fis.depo,fis.not,fis.satirlar.map(r=>({stokId:r.stok_id,birimId:r.birim_id,miktar:r.miktar,fiyat:r.fiyat,tutar:r.tutar})))});
  await islemleriYenile();
  _dvrSeciliId=null;
  bil('Devir fişi silindi ✓');
  renderDevirListe();
};
// ===== EXCEL: İÇE / DIŞA AKTAR =====
// İçe aktarma kolonları: Kod | Miktar | Birim | Birim Fiyat. "Tam ya da hiç": tek satırda hata varsa hiçbir satır eklenmez.
window.dvrExcelSecildi=async function(input){
  const file=input.files[0];if(!file)return;
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true});
    const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar;
    const yeni=[],hatali=[];
    for(const row of rows){
      if(!row||!row.length)continue;
      const kod=(row[0]===undefined||row[0]===null)?'':String(row[0]).trim();
      if(!kod||kod.toLowerCase()==='kod')continue;
      const miktar=parseFloat(row[1]);
      if(!(miktar>0)){hatali.push(`${kod} (miktar geçersiz)`);continue;}
      const birimKisa=(row[2]===undefined||row[2]===null)?'':String(row[2]).trim().toLowerCase();
      const fiyat=parseFloat(row[3])||0;
      const stok=kapsam.find(s=>s.kod===kod&&s.tip==='stok');
      if(!stok){hatali.push(`${kod} (kod bulunamadı)`);continue;}
      const tbId=stok.birim_id;
      const uygun=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
      let birim=birimKisa?uygun.find(b=>(b.kisaltma||'').toLowerCase()===birimKisa):null;
      if(birimKisa&&!birim){hatali.push(`${kod} (birim "${birimKisa}" bu stok için uygun değil)`);continue;}
      if(!birim)birim=birimler.find(b=>b.id===(stok.varsayilan_birim_id||tbId))||uygun[0];
      yeni.push({stokId:stok.id,birimId:birim?.id||'',miktar,fiyat:fiyat||'',tutar:fiyat>0?(miktar*fiyat).toFixed(2):''});
    }
    if(hatali.length){
      bil(`❌ Yükleme iptal edildi — hiçbir satır eklenmedi. ${hatali.length} satırda hata var: ${hatali.slice(0,8).join(', ')}${hatali.length>8?` (+${hatali.length-8} satır daha)`:''}`,'err');
      input.value='';return;
    }
    if(!yeni.length){bil('Excel dosyasında geçerli satır bulunamadı.','err');input.value='';return;}
    dvrSatirListesi=dvrSatirListesi.filter(s=>s.stokId);
    dvrSatirListesi.push(...yeni);
    for(let i=0;i<5;i++)dvrSatirListesi.push({stokId:'',birimId:'',miktar:'',fiyat:'',tutar:''});
    dvrSatirRender();
    bil(`✓ ${yeni.length} satır Excel'den eklendi`);
  }catch(e){bil('Excel okunamadı: '+e.message,'err');}
  input.value='';
};
// Dışa aktarma, içe aktarma formatıyla aynı kolon sırasını kullanır (Kod | Miktar | Birim | Birim Fiyat), sonrasında bilgi kolonları gelir.
window.dvrExcelIndir=function(){
  const gecerli=dvrSatirListesi.filter(s=>s.stokId);
  if(!gecerli.length){bil('İndirilecek veri yok','err');return;}
  const data=gecerli.map(s=>{
    const st=stoklar.find(x=>x.id===s.stokId);
    return {'Kod':st?.kod||'','Miktar':parseFloat(s.miktar)||0,'Birim':birimAd(s.birimId)||'','Birim Fiyat':parseFloat(s.fiyat)||0,'Stok Adı':st?.ad||'','Tutar':parseFloat(s.tutar)||0};
  });
  const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Devir Fişi');
  XLSX.writeFile(wb,'devir_fisi.xlsx');
};
// Satır tamamlanma kuralı: stok + birim + miktar + fiyat + tutar tamamlanmadan alt satıra geçilemez
if(typeof _satirKayitEkle==='function'){
  _satirKayitEkle('dvr',(i)=>dvrSatirListesi[i],(s)=>!!(s&&s.stokId&&s.birimId&&parseFloat(s.miktar)>0&&parseFloat(s.fiyat)>0&&parseFloat(s.tutar)>0));
}
