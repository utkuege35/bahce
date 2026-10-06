// ===== MÜKERRER BELGE KONTROLÜ =====
// Aynı işyeri + aynı tür + aynı cari + aynı belge numarası (büyük/küçük harf ve baştaki/sondaki
// boşluk farkı yok sayılır) ikinci kez işlenemez. Silinmiş kayıtlar sayılmaz; düzenlemede
// belgenin kendisi (haricId) hariç tutulur. Belge no veya cari boşsa kontrol yapılmaz.
window.belgeMukerrerMi=async function(tablo,noKolon,tur,cariId,no,haricId){
  const n=(no||'').trim();
  if(!n||!cariId)return null;
  let q=sb.from(tablo).select('id,tarih,'+noKolon).eq('tur',tur).eq('cari_id',cariId).eq('silindi',false).ilike(noKolon,n);
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data}=await q;
  return (data||[]).find(x=>x.id!==haricId&&(x[noKolon]||'').trim().toLowerCase()===n.toLowerCase())||null;
};
const MUKERRER_KISI={alis:'tedarikçiye',satis:'alıcıya',iade:'cariye'};

// ===== İRSALİYELER =====
// Üç sekme (Alış/Satış/İade) aynı yapıyı paylaştığı için tüm state ve
// render fonksiyonları "tur" parametresiyle genelleştirildi — kod üç kez
// tekrarlanmıyor.
let _aktifIrsTab='alis';
let irsSatirListesi={alis:[],satis:[],iade:[]};
let _irsHoverIndex={alis:null,satis:null,iade:null};
let _irsAcikId={alis:null,satis:null,iade:null};
let _irsDuzenlenenId={alis:null,satis:null,iade:null};
const IRS_FORM_BASLIK={alis:'Alış İrsaliyesi',satis:'Satış İrsaliyesi',iade:'İade İrsaliyesi'};
let _irsSeciliId={alis:null,satis:null,iade:null};      // listede seçili kayıt
let _irsListeVeri={alis:{},satis:{},iade:{}};            // listedeki kayıtlar (id → satır)
let _irsGoruntuleme={alis:false,satis:false,iade:false}; // form salt okunur (görüntüleme) modunda mı
let _irsGoruntulenenKayit={alis:null,satis:null,iade:null};
function _irsBaslikYaz(tur,duzenleme,salt){
  const el=document.querySelector('#tp-irs-'+tur+'-form .card-title');
  if(el&&el.firstChild)el.firstChild.textContent=IRS_FORM_BASLIK[tur]+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
// Formu salt okunur (görüntüleme) ya da düzenlenebilir yapar.
function _irsSaltOkunur(tur,salt){
  const form=document.getElementById('tp-irs-'+tur+'-form');if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{el.disabled=salt;});
  form.querySelectorAll('.fgrid button').forEach(b=>{b.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetIrsaliye"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="irsKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
  if(!salt)document.getElementById('irs-'+tur+'-goruntu-bilgi')?.remove();
}
// Görüntüleme modunda formun üstünde durum + bağlı çıkış fişleri (silme butonlu) bloğu.
window.irsBilgiBlokYenile=function(tur){
  const form=document.getElementById('tp-irs-'+tur+'-form');if(!form)return;
  let el=document.getElementById('irs-'+tur+'-goruntu-bilgi');
  if(!_irsGoruntuleme[tur]){el?.remove();return;}
  const x=_irsGoruntulenenKayit[tur];if(!x)return;
  if(!el){el=document.createElement('div');el.id='irs-'+tur+'-goruntu-bilgi';form.querySelector('.card-title').after(el);}
  const durumAd=x.durum==='faturalandi'?'Faturalandı':x.durum==='iptal'?'İptal':'Açık';
  el.innerHTML=`<div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">Durum: <strong>${durumAd}</strong></div>`+(tur==='alis'?bagliCikisFisleriHtml('irsaliye_id',x.id,'irs',tur):'');
};

const IRS_BASLIK={alis:'Alış İrsaliyeleri',satis:'Satış İrsaliyeleri',iade:'İade İrsaliyeleri'};

// Bu tür için malzeme aranırken hangi kaynaktan arama yapılacağını belirler.
// alış → hammadde (stoklar), satış → ürün (urunler), iade → ikisi birden.
function _irsKapsam(tur){
  const stokKapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const urunKapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(urunler):urunler).filter(u=>u.tip==='urun'&&u.aktif!==false);
  if(tur==='alis')return stokKapsam.map(x=>({kaynakTur:'stok',kaynak:x}));
  if(tur==='satis')return urunKapsam.map(x=>({kaynakTur:'urun',kaynak:x}));
  return [...stokKapsam.map(x=>({kaynakTur:'stok',kaynak:x})),...urunKapsam.map(x=>({kaynakTur:'urun',kaynak:x}))];
}

window.irsTab=function(tur,btn){
  document.querySelectorAll('#irsaliyeler .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#irsaliyeler .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tp-irs-'+tur)?.classList.add('active');
  btn.classList.add('active');
  _aktifIrsTab=tur;
  irsGorunumListe(tur);
};

// ===== GÖRÜNÜM GEÇİŞİ (liste ↔ form) — İşlem ekranıyla aynı kilit deseni =====
window.irsGorunumForm=function(tur){
  const listeEl=document.getElementById('tp-irs-'+tur+'-liste');
  const formEl=document.getElementById('tp-irs-'+tur+'-form');
  if(listeEl)listeEl.style.display='none';
  if(formEl)formEl.style.display='';
  document.body.classList.add('islem-form-acik');
};
window.irsGorunumListe=function(tur){
  _irsDuzenlenenId[tur]=null;_irsBaslikYaz(tur,false);
  _irsGoruntuleme[tur]=false;_irsSaltOkunur(tur,false);
  const listeEl=document.getElementById('tp-irs-'+tur+'-liste');
  const formEl=document.getElementById('tp-irs-'+tur+'-form');
  if(formEl)formEl.style.display='none';
  if(listeEl)listeEl.style.display='';
  document.body.classList.remove('islem-form-acik');
  if(typeof renderIrsGunSekmesi==='function')renderIrsGunSekmesi(tur);
};
window.irsKaydetmedenCik=async function(tur){
  if(_irsGoruntuleme[tur]){irsGorunumListe(tur);return;} // görüntülemede onay gerekmez
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)irsGorunumListe(tur);
};

// ===== FORM BAŞLATMA =====
window.irsYeniBaslat=function(tur){
  _irsDuzenlenenId[tur]=null;_irsBaslikYaz(tur,false);
  _irsGoruntuleme[tur]=false;_irsSaltOkunur(tur,false);
  irsSatirListesi[tur]=[];
  irsSatirListesiDoldur(tur);
  const tarihEl=document.getElementById('irs-'+tur+'-tarih');if(tarihEl)tarihEl.value=bugun();
  const noEl=document.getElementById('irs-'+tur+'-no');if(noEl)noEl.value='';
  const notEl=document.getElementById('irs-'+tur+'-not');if(notEl)notEl.value='';
  const cariSel=document.getElementById('irs-'+tur+'-cari');
  if(cariSel){
    const tip=tur==='alis'?'satici':tur==='satis'?'alici':'';
    cariSel.innerHTML='<option value="">— Seçin —</option>'+(typeof cariOpts==='function'?cariOpts(tip,''):'');
  }
  if(tur==='alis'){girisDepoAnaYaz('irs-alis-depo');cikisDepoSecenekleri('irs-alis-cikis','');}
  irsGorunumForm(tur);
};

window.irsSatirListesiDoldur=function(tur,n){
  n=n||15;
  for(let i=0;i<n;i++)irsSatirListesi[tur].push(_irsYeniSatir(tur));
  irsSatirRender(tur);
};
// Giriş tablosunda para birimi sembolü olmadan, 2 ondalıklı gösterim
function _irsSayi(n){return (parseFloat(n)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});}
// Yeni boş satır; Alış sekmesinde üstteki Çıkış Deposu seçimini devralır.
function _irsYeniSatir(tur){return {kaynakTur:'',kaynakId:'',birimId:'',miktar:'',fiyat:'',tutar:'',kdvOraniId:'',cikisDepoId:''};}
// Satırın tutarı ve seçili KDV oranına göre KDV tutarı/KDV dahil tutarı hesaplar.
function _irsKdvHesapla(s){
  const tutar=parseFloat(s.tutar)||0;
  const oran=typeof kdvOraniDegeri==='function'?kdvOraniDegeri(s.kdvOraniId):0;
  const kdvTutar=tutar*oran/100;
  return {kdvTutar,dahil:tutar+kdvTutar};
}

// ===== SATIR RENDER =====
window.irsSatirRender=function(tur){
  const el=document.getElementById('irs-'+tur+'-satirlar');if(!el)return;
  const kapsam=_irsKapsam(tur);
  el.innerHTML=irsSatirListesi[tur].map((s,i)=>{
    const secili=kapsam.find(k=>k.kaynakTur===s.kaynakTur&&k.kaynak.id===s.kaynakId)?.kaynak;
    return `<tr data-tablo="irs-${tur}">
      <td><div style="position:relative">
        <input type="text" data-satir-ana="1" autocomplete="off" value="${secili?secili.ad:''}"
          oninput="irsMalzemeAramaFiltrele('${tur}',${i},this.value)"
          onfocus="_irsHoverIndex['${tur}']=${i};irsMalzemeAramaFiltrele('${tur}',${i},this.value)"
          onblur="setTimeout(()=>{const d=document.getElementById('irs-oneri-${tur}-${i}');if(d)d.style.display='none';},150)"
          onkeydown="_oneriTusVurusu(event,'irs-oneri-${tur}-${i}')" style="width:100%;padding:3px 6px;font-size:12px">
        <div id="irs-oneri-${tur}-${i}" onmousedown="event.preventDefault()" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:240px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:2px"></div>
      </div></td>
      <td><select id="irs-birim-${tur}-${i}" onchange="irsBirimSec('${tur}',${i},this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)"><option value=""></option>${irsBirimOpts(s.kaynakTur,s.kaynakId,s.birimId)}</select></td>
      <td><input type="number" value="${s.miktar||''}" onblur="irsSatirHesapla('${tur}',${i},'miktar',this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.fiyat||''}" onblur="irsSatirHesapla('${tur}',${i},'fiyat',this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.tutar||''}" onblur="irsSatirHesapla('${tur}',${i},'tutar',this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;font-weight:500;color:var(--yesil);text-align:right"></td>
      ${tur==='alis'?_irsKdvHucreleri(tur,i,s)+_irsCikisHucre(tur,i,s):''}
    </tr>`;
  }).join('');
  irsToplamGuncelle(tur);
};
// Alış sekmesinde satır bazlı Çıkış Deposu hücresi
function _irsCikisHucre(tur,i,s){
  return `<td><select onchange="irsCikisSec('${tur}',${i},this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)">${cikisDepoOptHtml(s.cikisDepoId)}</select></td>`;
}
window.irsCikisSec=function(tur,i,depoId){irsSatirListesi[tur][i].cikisDepoId=depoId;};
// Üstteki Çıkış Deposu seçilince tüm satırlara uygulanır (satırda tek tek değiştirilebilir).
window.irsCikisUstDegis=function(tur){
  const v=document.getElementById('irs-'+tur+'-cikis')?.value||'';
  irsSatirListesi[tur].forEach(s=>{if(s.kaynakId)s.cikisDepoId=v;}); // sadece dolu satırlara uygula
  irsSatirRender(tur);
};
// Sadece Alış sekmesinde gösterilen KDV Oran / KDV Tutar / KDV Dahil hücreleri.
function _irsKdvHucreleri(tur,i,s){
  const {kdvTutar,dahil}=_irsKdvHesapla(s);
  return `<td><select id="irs-kdv-${tur}-${i}" onchange="irsKdvSec('${tur}',${i},this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz);text-align:right;text-align-last:right">
      <option value=""></option>
      ${kdvOranlari.map(k=>`<option value="${k.id}"${k.id===s.kdvOraniId?' selected':''}>%${k.oran}</option>`).join('')}
    </select></td>
    <td id="irs-kdvtutar-${tur}-${i}" style="text-align:right;color:var(--yazi3)">${kdvTutar>0?_irsSayi(kdvTutar):''}</td>
    <td id="irs-kdvdahil-${tur}-${i}" style="text-align:right;font-weight:500">${dahil>0?_irsSayi(dahil):''}</td>`;
}
function irsBirimOpts(kaynakTur,kaynakId,seciliId){
  let tbId=null;
  if(kaynakTur==='stok'){const s=stoklar.find(x=>x.id===kaynakId);tbId=s?.birim_id;}
  else if(kaynakTur==='urun'){const u=urunler.find(x=>x.id===kaynakId);tbId=u?.birim_id;}
  const list=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
  return list.map(b=>`<option value="${b.id}"${b.id===seciliId?' selected':''}>${b.kisaltma}</option>`).join('');
}
function irsToplamGuncelle(tur){
  const t=irsSatirListesi[tur].reduce((s,r)=>s+parseFloat(r.tutar||0),0);
  const el=document.getElementById('irs-'+tur+'-toplam');
  if(el)el.textContent=_irsSayi(t);
  if(tur==='alis'){
    const dahilToplam=irsSatirListesi[tur].reduce((s,r)=>s+_irsKdvHesapla(r).dahil,0);
    const dEl=document.getElementById('irs-alis-kdv-dahil-toplam');
    if(dEl)dEl.textContent=_irsSayi(dahilToplam);
  }
}
window.irsMalzemeAramaFiltrele=function(tur,i,val){
  const kutu=document.getElementById(`irs-oneri-${tur}-${i}`);if(!kutu)return;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kapsam=_irsKapsam(tur);
  const secenekler=_oneriSirala(q?kapsam.filter(k=>k.kaynak.ad.toLocaleLowerCase('tr').includes(q)):kapsam,q,k=>k.kaynak.ad);
  kutu.dataset.vurgu='-1';
  if(!secenekler.length){kutu.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--yazi3)">Sonuç bulunamadı</div>';kutu.style.display='block';return;}
  kutu.innerHTML=secenekler.map(k=>`<div class="oneri-item" onclick="irsMalzemeSecildi('${tur}',${i},'${k.kaynakTur}','${k.kaynak.id}')" style="padding:8px 10px;font-size:12px;border-bottom:1px solid var(--krem2)">${k.kaynak.ad}${tur==='iade'?` <span style="font-size:9px;color:var(--yazi3)">[${k.kaynakTur==='stok'?'Hammadde':'Ürün'}]</span>`:''}</div>`).join('');
  kutu.style.display='block';
};
window.irsMalzemeSecildi=function(tur,i,kaynakTur,kaynakId){
  const kaynak=kaynakTur==='stok'?stoklar.find(x=>x.id===kaynakId):urunler.find(x=>x.id===kaynakId);
  if(!kaynak)return;
  const s=irsSatirListesi[tur][i];
  s.kaynakTur=kaynakTur;s.kaynakId=kaynakId;
  s.birimId=kaynak.varsayilan_birim_id||kaynak.birim_id||'';
  // Satır dolunca üstteki Çıkış Deposu seçimini devral (satırda daha önce seçilmediyse)
  if(tur==='alis'&&!s.cikisDepoId)s.cikisDepoId=document.getElementById('irs-alis-cikis')?.value||'';
  if(kaynakTur==='stok'&&typeof stokKdvOraniId==='function')s.kdvOraniId=stokKdvOraniId(kaynakId)||'';
  const sonSatirMi=i===irsSatirListesi[tur].length-1;
  if(sonSatirMi)irsSatirListesi[tur].push(_irsYeniSatir(tur));
  irsSatirRender(tur);
  document.getElementById(`irs-birim-${tur}-${i}`)?.focus();
};
window.irsBirimSec=function(tur,i,birimId){
  irsSatirListesi[tur][i].birimId=birimId;
};
window.irsKdvSec=function(tur,i,kdvOraniId){
  irsSatirListesi[tur][i].kdvOraniId=kdvOraniId;
  const {kdvTutar,dahil}=_irsKdvHesapla(irsSatirListesi[tur][i]);
  const tEl=document.getElementById(`irs-kdvtutar-${tur}-${i}`);if(tEl)tEl.textContent=kdvTutar>0?_irsSayi(kdvTutar):'';
  const dEl=document.getElementById(`irs-kdvdahil-${tur}-${i}`);if(dEl)dEl.textContent=dahil>0?_irsSayi(dahil):'';
};
window.irsSatirHesapla=function(tur,i,kaynak,val){
  const s=irsSatirListesi[tur][i];
  s[kaynak]=val;
  const mik=parseFloat(s.miktar)||0;const fiy=parseFloat(s.fiyat)||0;const tut=parseFloat(s.tutar)||0;
  const row=document.querySelectorAll(`#irs-${tur}-satirlar tr`)[i];if(!row)return;const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);s.tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);s.fiyat=y;if(inputs[1])inputs[1].value=y;}}
  if(tur==='alis'){
    const {kdvTutar,dahil}=_irsKdvHesapla(s);
    const tEl=document.getElementById(`irs-kdvtutar-${tur}-${i}`);if(tEl)tEl.textContent=kdvTutar>0?_irsSayi(kdvTutar):'';
    const dEl=document.getElementById(`irs-kdvdahil-${tur}-${i}`);if(dEl)dEl.textContent=dahil>0?_irsSayi(dahil):'';
  }
  irsToplamGuncelle(tur);
};

// ===== KAYDET =====
window.kaydetIrsaliye=async function(tur){
  const tarih=document.getElementById('irs-'+tur+'-tarih').value;
  const irsNo=document.getElementById('irs-'+tur+'-no').value.trim()||null;
  const cariId=document.getElementById('irs-'+tur+'-cari').value||null;
  const an=document.getElementById('irs-'+tur+'-not').value.trim()||null;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  const gecerli=irsSatirListesi[tur].filter(s=>s.kaynakId&&parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  const mukerrer=await belgeMukerrerMi('irsaliyeler','irsaliye_no',tur,cariId,irsNo,_irsDuzenlenenId[tur]);
  if(mukerrer){bil(`Bu ${MUKERRER_KISI[tur]} ait "${irsNo}" numaralı irsaliye zaten kayıtlı (${mukerrer.tarih}). Aynı belge ikinci kez işlenemez.`,'err');return;}
  const depoId=tur==='alis'?anaDepoId():null; // alım deposu her zaman Ana Depo
  if(tur==='alis'&&!depoId){bil('Ana depo tanımlı değil! Alış irsaliyesi Ana Depo\'ya stok girişi yapar.','err');return;}
  const toplam=gecerli.reduce((t,s)=>t+(parseFloat(s.tutar)||0),0);
  try{
    const duzenlenen=_irsDuzenlenenId[tur];
    let irs;
    if(duzenlenen){
      // Düzenleme: önce stok eksiye düşer mi kontrol et, sonra başlık/kalem/stok girişini yeniden yaz
      if(tur==='alis'){const hata=belgeDegisimKontrol('irsaliye_id',duzenlenen,gecerli);if(hata)throw new Error(hata);}
      const {error:eu}=await sb.from('irsaliyeler').update({irsaliye_no:irsNo,tarih,cari_id:cariId,aciklama:an}).eq('id',duzenlenen);
      if(eu)throw eu;
      const {error:ed}=await sb.from('irsaliye_kalemleri').delete().eq('irsaliye_id',duzenlenen);
      if(ed)throw ed;
      irs={id:duzenlenen};
      if(tur==='alis')await stokHareketiGeriAl({irsaliyeId:duzenlenen});
    }else{
      const {data:irsYeni,error:e1}=await sb.from('irsaliyeler').insert({
      isyeri_id:aktifIsyeri?.id||null,tur,irsaliye_no:irsNo,tarih,cari_id:cariId,aciklama:an,depo_id:tur==='alis'?depoId:null,
      durum:'acik',kullanici:aktifKullanici?.ad||'',ts:Date.now()
    }).select().single();
    if(e1)throw e1;
      irs=irsYeni;
    }
    const kalemler=gecerli.map((s,i)=>{
      const {kdvTutar,dahil}=_irsKdvHesapla(s);
      return {
        irsaliye_id:irs.id,
        stok_id:s.kaynakTur==='stok'?s.kaynakId:null,
        urun_id:s.kaynakTur==='urun'?s.kaynakId:null,
        birim_id:s.birimId||null,
        miktar:parseFloat(s.miktar)||0,
        fiyat:parseFloat(s.fiyat)||0,
        tutar:parseFloat(s.tutar)||(parseFloat(s.miktar)||0)*(parseFloat(s.fiyat)||0),
        kdv_orani_id:tur==='alis'?(s.kdvOraniId||null):null,
        kdv_orani:tur==='alis'?(typeof kdvOraniDegeri==='function'?kdvOraniDegeri(s.kdvOraniId):null):null,
        kdv_tutar:tur==='alis'?kdvTutar:null,
        kdv_dahil_tutar:tur==='alis'?dahil:null,
        cikis_depo_id:tur==='alis'?(s.cikisDepoId||null):null,
        sira:i
      };
    });
    const {error:e2}=await sb.from('irsaliye_kalemleri').insert(kalemler);
    if(e2)throw e2;
    // Alış irsaliyesi seçilen depoya stok girişi yapar
    let cikisFis=0;
    if(tur==='alis'){
      const b={tarih,depoId,cariId,not:an,belgeNo:irsNo,kat:'Alış İrsaliyesi',belgeId:irs.id,irsaliyeId:irs.id};
      await stokGirisYaz(gecerli,b);
      cikisFis=await anaDepoCikisYaz(gecerli,b);
    }
    bil(`✓ İrsaliye ${duzenlenen?'güncellendi':'kaydedildi'} (${gecerli.length} kalem, ${para(toplam)})${tur==='alis'?' — Ana Depo\'ya stok girişi yapıldı'+(cikisFis?`, ${cikisFis} Ana Depo Çıkış fişi oluştu`:''):''}`);
    irsGorunumListe(tur);
  }catch(err){
    bil('Kaydedilemedi: '+(err.message||'bilinmeyen hata'),'err');
  }
};

// ===== GÜNLÜK ÖZET LİSTESİ =====
window.renderIrsGunSekmesi=async function(tur){
  const tarihEl=document.getElementById('irs-'+tur+'-liste-tarih');
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tbEl=document.getElementById('irs-'+tur+'-liste-tb');
  if(!tbEl)return;
  tbEl.innerHTML='<div class="bos">Yükleniyor...</div>';
  let q=sb.from('irsaliyeler').select('*').eq('tur',tur).eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data:irsListe}=await q;
  const ozEl=document.getElementById('irs-'+tur+'-liste-ozet');
  _irsListeVeri[tur]={};
  if(!irsListe||!irsListe.length){
    tbEl.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';
    if(ozEl)ozEl.textContent='';
    _irsSeciliId[tur]=null;
    return;
  }
  irsListe.forEach(x=>{_irsListeVeri[tur][x.id]=x;});
  if(!_irsListeVeri[tur][_irsSeciliId[tur]])_irsSeciliId[tur]=null;
  const {data:kalemler}=await sb.from('irsaliye_kalemleri').select('irsaliye_id,tutar').in('irsaliye_id',irsListe.map(x=>x.id));
  const tutarOf=id=>(kalemler||[]).filter(k=>k.irsaliye_id===id).reduce((s,k)=>s+parseFloat(k.tutar||0),0);
  const toplam=irsListe.reduce((t,x)=>t+tutarOf(x.id),0);
  if(ozEl)ozEl.textContent=`${irsListe.length} irsaliye · ${para(toplam)}`;
  tbEl.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>İrsaliye No</th><th>Cari</th><th style="text-align:right">Tutar</th><th>Durum</th>
  </tr></thead><tbody>${irsListe.map(x=>{
    const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===x.cari_id):null;
    const durumRenk=x.durum==='faturalandi'?'var(--yesil)':x.durum==='iptal'?'var(--yazi3)':'var(--turuncu)';
    const durumAd=x.durum==='faturalandi'?'Faturalandı':x.durum==='iptal'?'İptal':'Açık';
    return `<tr data-id="${x.id}" onclick="irsSec('${tur}','${x.id}')" ondblclick="irsGoruntule('${tur}','${x.id}')" style="cursor:pointer;${_irsSeciliId[tur]===x.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${x.tarih}</td>
      <td style="font-size:12px">${x.irsaliye_no||'—'}</td>
      <td style="font-size:12px">${cari?cari.ad:'—'}</td>
      <td style="text-align:right;font-weight:500">${para(tutarOf(x.id))}</td>
      <td style="font-size:11px;font-weight:600;color:${durumRenk}">${durumAd}</td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
};
// Listede satıra tıklayınca seçer (vurgular); Görüntüle/Düzenle/Sil butonları seçili kayda uygulanır.
window.irsSec=function(tur,id){
  _irsSeciliId[tur]=id;
  document.querySelectorAll(`#irs-${tur}-liste-tb tr[data-id]`).forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.irsListeIslem=function(tur,islem){
  const id=_irsSeciliId[tur];
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  const x=_irsListeVeri[tur]?.[id];
  if(islem==='goruntule')irsGoruntule(tur,id);
  else if(islem==='duzenle'){
    if(x&&x.durum!=='acik'){bil('Faturalanmış irsaliye düzenlenemez. Önce faturayı silin.','err');return;}
    irsDuzenleAc(tur,id);
  }else if(islem==='sil')irsSil(tur,id);
  else if(islem==='fatura'){
    if(x&&x.durum!=='acik'){bil('Bu irsaliye zaten faturalandı','err');return;}
    irsFaturaDonustur(tur,id);
  }
};
window.irsSil=async function(tur,id){
  const x=_irsListeVeri[tur]?.[id];
  if(x&&x.durum!=='acik'){bil('Faturalanmış irsaliye silinemez. Önce faturayı silin.','err');return;}
  if(islemler.some(i=>i.irsaliye_id===id&&i.alt_tur==='ana_depo_cikis')){
    bil('Bu irsaliyeye bağlı Ana Depo Çıkış fişi var. Silmek için önce çıkış fişini silin (Görüntüle ekranından).','err');return;
  }
  if(tur==='alis'){const hata=belgeDegisimKontrol('irsaliye_id',id,[]);if(hata){bil(hata,'err');return;}}
  if(!(await onay('Bu irsaliyeyi silmek istiyor musunuz?','🗑️')))return;
  await sb.from('irsaliyeler').update({silindi:true}).eq('id',id);
  await stokHareketiGeriAl({irsaliyeId:id}); // bu irsaliyenin stok girişini geri al
  _irsSeciliId[tur]=null;
  bil('İrsaliye silindi ✓');
  renderIrsGunSekmesi(tur);
};

// ===== SATIR TAMAMLANMA KONTROLÜNE KAYIT =====
// islemler.js'teki genel _satirKayitEkle sistemine üç sekmeyi de kaydeder —
// malzeme/birim/miktar/fiyat/tutar tamamlanmadan alt satıra geçilemez.
['alis','satis','iade'].forEach(tur=>{
  if(typeof _satirKayitEkle==='function'){
    _satirKayitEkle('irs-'+tur,
      (i)=>irsSatirListesi[tur][i],
      (s)=>{
        if(!s)return false;
        const miktar=parseFloat(s.miktar)||0,fiyat=parseFloat(s.fiyat)||0,tutar=parseFloat(s.tutar)||0;
        return !!(s.kaynakId&&s.birimId&&miktar>0&&fiyat>0&&tutar>0);
      }
    );
  }
});

// Açık bir irsaliyeyi, aynı türdeki Faturalar sekmesinde yeni fatura olarak açar.
window.irsFaturaDonustur=function(tur,id){
  gp('faturalar');
  fatTabSec(tur);
  fatYeniBaslat(tur,[id]);
};

// Açık bir irsaliyeyi, KAYDEDİLDİĞİ HALİYLE (çıkış depoları dahil) düzenlemek üzere forma yükler.
// Bağlı Ana Depo Çıkış fişi varsa izin vermez; çıkış fişi silinince çıkış depoları kalemlerden geri gelir.
window.irsGoruntule=function(tur,id){return irsDuzenleAc(tur,id,true);};
window.irsDuzenleAc=async function(tur,id,salt){
  // Bağlı Ana Depo Çıkış fişi varsa düzenleme engellenir; önce çıkış fişi silinmeli. (Görüntülemede engel yok)
  if(!salt&&islemler.some(i=>i.irsaliye_id===id&&i.alt_tur==='ana_depo_cikis')){
    bil('Bu irsaliyeye bağlı Ana Depo Çıkış fişi var. Düzenlemek için önce çıkış fişini silin.','err');return;
  }
  const {data:irs}=await sb.from('irsaliyeler').select('*').eq('id',id).single();
  if(!irs){bil('Kayıt bulunamadı','err');return;}
  if(!salt&&irs.durum!=='acik'){bil('Sadece açık irsaliyeler düzenlenebilir','err');return;}
  const {data:kl}=await sb.from('irsaliye_kalemleri').select('*').eq('irsaliye_id',id).order('sira');
  irsYeniBaslat(tur);
  _irsDuzenlenenId[tur]=salt?null:id;
  _irsBaslikYaz(tur,true,!!salt);
  const set=(k,v)=>{const el=document.getElementById('irs-'+tur+'-'+k);if(el)el.value=v;};
  set('tarih',irs.tarih||'');set('no',irs.irsaliye_no||'');set('cari',irs.cari_id||'');set('not',irs.aciklama||'');
  const cikislar=(kl||[]).map(k=>k.cikis_depo_id||'');
  irsSatirListesi[tur]=(kl||[]).map((k,n)=>({kaynakTur:k.stok_id?'stok':'urun',kaynakId:k.stok_id||k.urun_id,birimId:k.birim_id||'',miktar:k.miktar,fiyat:k.fiyat,tutar:k.tutar,kdvOraniId:k.kdv_orani_id||'',cikisDepoId:cikislar[n]||''}));
  // Tüm kalemler aynı çıkış deposuna gidiyorsa üstteki Çıkış Deposu kutusunu da o depoya ayarla
  const farkli=[...new Set(cikislar.filter(Boolean))];
  const ustEl=document.getElementById('irs-alis-cikis');
  if(tur==='alis'&&ustEl&&farkli.length===1&&cikislar.every(Boolean))ustEl.value=farkli[0];
  if(!salt)for(let n=0;n<5;n++)irsSatirListesi[tur].push(_irsYeniSatir(tur));
  irsSatirRender(tur);
  if(salt){ // görüntüleme: tüm alanlar kilitli, kaydet yok, durum + çıkış fişleri bloğu
    _irsGoruntuleme[tur]=true;_irsGoruntulenenKayit[tur]=irs;
    _irsSaltOkunur(tur,true);
    irsBilgiBlokYenile(tur);
  }
};
