// ===== FATURALAR =====
// Üç sekme (Alış/Satış/İade) aynı yapıyı paylaşır, tüm fonksiyonlar "tur"
// parametresiyle çalışır. Fatura şimdilik sadece BELGE kaydıdır: stok, kasa
// veya cari hareketi oluşturmaz. Ödeme tipi / kasa / cari bilgisi belgede
// saklanır; ileride "Muhasebeleştir" adımında kullanılacak.
// irsaliyeler.js'teki _irsKapsam, _irsKdvHesapla, irsBirimOpts ve _irsSayi
// yardımcıları burada da kullanılır (irsaliyeler.js bu dosyadan önce yüklenir).
let _aktifFatTab='alis';
let fatSatirListesi={alis:[],satis:[],iade:[]};
let _fatHoverIndex={alis:null,satis:null,iade:null};
let _fatAcikId={alis:null,satis:null,iade:null};
let _fatIrsaliyeIds={alis:[],satis:[],iade:[]};
let _fatModalTur=null;
let _fatDuzenlenenId={alis:null,satis:null,iade:null};
const FAT_FORM_BASLIK={alis:'Alış Faturası',satis:'Satış Faturası',iade:'İade Faturası'};
let _fatSeciliId={alis:null,satis:null,iade:null};
let _fatListeVeri={alis:{},satis:{},iade:{}};
let _fatGoruntuleme={alis:false,satis:false,iade:false};
let _fatGoruntulenenKayit={alis:null,satis:null,iade:null};
let _fatEskiSnapshot={alis:null,satis:null,iade:null}; // düzenleme öncesi hali (log için)
function _fatBaslikYaz(tur,duzenleme,salt){
  const el=document.querySelector('#tp-fat-'+tur+'-form .card-title');
  if(el&&el.firstChild)el.firstChild.textContent=FAT_FORM_BASLIK[tur]+(duzenleme?(salt?' — Görüntüleme':' — Düzenleme'):'');
}
function _fatSaltOkunur(tur,salt){
  const form=document.getElementById('tp-fat-'+tur+'-form');if(!form)return;
  form.querySelectorAll('input,select').forEach(el=>{el.disabled=salt;});
  form.querySelectorAll('.fgrid button').forEach(b=>{b.disabled=salt;});
  const kaydet=form.querySelector('button[onclick^="kaydetFatura"]');if(kaydet)kaydet.style.display=salt?'none':'';
  form.querySelectorAll('button[onclick^="fatKaydetmedenCik"]').forEach(b=>{
    if(b.textContent.includes('Kaydetmeden')||b.textContent==='Kapat')b.textContent=salt?'Kapat':'Kaydetmeden Çık';
  });
  if(!salt)document.getElementById('fat-'+tur+'-goruntu-bilgi')?.remove();
}
window.fatBilgiBlokYenile=function(tur){
  const form=document.getElementById('tp-fat-'+tur+'-form');if(!form)return;
  let el=document.getElementById('fat-'+tur+'-goruntu-bilgi');
  if(!_fatGoruntuleme[tur]){el?.remove();return;}
  const x=_fatGoruntulenenKayit[tur];if(!x)return;
  if(!el){el=document.createElement('div');el.id='fat-'+tur+'-goruntu-bilgi';form.querySelector('.card-title').after(el);}
  el.innerHTML=`<div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">Muhasebe durumu: <strong>${x.muhasebe_durumu==='bekliyor'?'Bekliyor':'Muhasebeleşti'}</strong></div>`+(tur==='alis'?bagliCikisFisleriHtml('fatura_id',x.id,'fat',tur):'');
};

// Yeni boş satır; Alış sekmesinde üstteki Çıkış Deposu seçimini devralır.
function _fatYeniSatir(tur){return {kaynakTur:'',kaynakId:'',birimId:'',miktar:'',fiyat:'',tutar:'',kdvOraniId:'',cikisDepoId:''};}
window.fatTab=function(tur,btn){
  document.querySelectorAll('#faturalar .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#faturalar .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tp-fat-'+tur)?.classList.add('active');
  btn.classList.add('active');
  _aktifFatTab=tur;
  fatGorunumListe(tur);
};
// Başka bir yerden (ör. irsaliye listesinden) belirli bir sekmeyi açmak için
window.fatTabSec=function(tur){
  const btn=document.querySelector(`#faturalar .tab[data-tur="${tur}"]`);
  if(btn)fatTab(tur,btn);
};

// ===== GÖRÜNÜM GEÇİŞİ (liste ↔ form) =====
window.fatGorunumForm=function(tur){
  const l=document.getElementById('tp-fat-'+tur+'-liste'),f=document.getElementById('tp-fat-'+tur+'-form');
  if(l)l.style.display='none';
  if(f)f.style.display='';
  document.body.classList.add('islem-form-acik');
};
window.fatGorunumListe=function(tur){
  _fatDuzenlenenId[tur]=null;_fatBaslikYaz(tur,false);
  _fatGoruntuleme[tur]=false;_fatSaltOkunur(tur,false);
  const l=document.getElementById('tp-fat-'+tur+'-liste'),f=document.getElementById('tp-fat-'+tur+'-form');
  if(f)f.style.display='none';
  if(l)l.style.display='';
  document.body.classList.remove('islem-form-acik');
  renderFatGunSekmesi(tur);
};
window.fatKaydetmedenCik=async function(tur){
  if(_fatGoruntuleme[tur]){fatGorunumListe(tur);return;} // görüntülemede onay gerekmez
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)fatGorunumListe(tur);
};

// ===== FORM BAŞLATMA =====
window.fatYeniBaslat=async function(tur,irsaliyeIds){
  _fatDuzenlenenId[tur]=null;_fatBaslikYaz(tur,false);
  _fatGoruntuleme[tur]=false;_fatSaltOkunur(tur,false);
  fatSatirListesi[tur]=[];
  _fatIrsaliyeIds[tur]=[];
  fatSatirListesiDoldur(tur);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  set('fat-'+tur+'-tarih',bugun());
  set('fat-'+tur+'-no','');
  set('fat-'+tur+'-not','');
  set('fat-'+tur+'-odeme','pesin');
  const cariSel=document.getElementById('fat-'+tur+'-cari');
  if(cariSel){
    const tip=tur==='alis'?'satici':tur==='satis'?'alici':'';
    cariSel.innerHTML='<option value="">— Seçin —</option>'+(typeof cariOpts==='function'?cariOpts(tip,''):'');
  }
  if(typeof kasaSelectDoldur==='function')kasaSelectDoldur('fat-'+tur+'-kasa',true);
  fatOdemeDegis(tur);
  if(tur==='alis'){girisDepoAnaYaz('fat-alis-depo');cikisDepoSecenekleri('fat-alis-cikis','');}
  fatGorunumForm(tur);
  if(irsaliyeIds&&irsaliyeIds.length)await fatIrsaliyeleriYukle(tur,irsaliyeIds);
};
window.fatOdemeDegis=function(tur){
  const odeme=document.getElementById('fat-'+tur+'-odeme')?.value||'pesin';
  const fg=document.getElementById('fat-'+tur+'-kasa-fg');
  if(fg)fg.style.display=odeme==='cari'?'none':'';
};
window.fatSatirListesiDoldur=function(tur,n){
  n=n||15;
  for(let i=0;i<n;i++)fatSatirListesi[tur].push(_fatYeniSatir(tur));
  fatSatirRender(tur);
};

// ===== SATIR RENDER =====
window.fatSatirRender=function(tur){
  const el=document.getElementById('fat-'+tur+'-satirlar');if(!el)return;
  const kapsam=_irsKapsam(tur);
  el.innerHTML=fatSatirListesi[tur].map((s,i)=>{
    const secili=kapsam.find(k=>k.kaynakTur===s.kaynakTur&&k.kaynak.id===s.kaynakId)?.kaynak;
    return `<tr data-tablo="fat-${tur}">
      <td><div style="position:relative">
        <input type="text" data-satir-ana="1" autocomplete="off" value="${secili?secili.ad:''}"
          oninput="fatMalzemeAramaFiltrele('${tur}',${i},this.value)"
          onfocus="_fatHoverIndex['${tur}']=${i};fatMalzemeAramaFiltrele('${tur}',${i},this.value)"
          onblur="setTimeout(()=>{const d=document.getElementById('fat-oneri-${tur}-${i}');if(d)d.style.display='none';},150)"
          onkeydown="_oneriTusVurusu(event,'fat-oneri-${tur}-${i}')" style="width:100%;padding:3px 6px;font-size:12px">
        <div id="fat-oneri-${tur}-${i}" onmousedown="event.preventDefault()" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:240px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:2px"></div>
      </div></td>
      <td><select id="fat-birim-${tur}-${i}" onchange="fatBirimSec('${tur}',${i},this.value)" onfocus="_fatHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)"><option value=""></option>${irsBirimOpts(s.kaynakTur,s.kaynakId,s.birimId)}</select></td>
      <td><input type="number" value="${s.miktar||''}" onblur="fatSatirHesapla('${tur}',${i},'miktar',this.value)" onfocus="_fatHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.fiyat||''}" onblur="fatSatirHesapla('${tur}',${i},'fiyat',this.value)" onfocus="_fatHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;text-align:right"></td>
      <td><input type="number" value="${s.tutar||''}" onblur="fatSatirHesapla('${tur}',${i},'tutar',this.value)" onfocus="_fatHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;font-weight:500;color:var(--yesil);text-align:right"></td>
      ${_fatKdvHucreleri(tur,i,s)}${tur==='alis'?_fatCikisHucre(tur,i,s):''}
    </tr>`;
  }).join('');
  fatToplamGuncelle(tur);
};
function _fatCikisHucre(tur,i,s){
  return `<td><select onchange="fatCikisSec('${tur}',${i},this.value)" onfocus="_fatHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)">${cikisDepoOptHtml(s.cikisDepoId)}</select></td>`;
}
window.fatCikisSec=function(tur,i,depoId){fatSatirListesi[tur][i].cikisDepoId=depoId;};
window.fatCikisUstDegis=function(tur){
  const v=document.getElementById('fat-'+tur+'-cikis')?.value||'';
  fatSatirListesi[tur].forEach(s=>{if(s.kaynakId)s.cikisDepoId=v;}); // sadece dolu satırlara uygula
  fatSatirRender(tur);
};
function _fatKdvHucreleri(tur,i,s){
  const {kdvTutar,dahil}=_irsKdvHesapla(s);
  return `<td><select id="fat-kdv-${tur}-${i}" onchange="fatKdvSec('${tur}',${i},this.value)" onfocus="_fatHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz);text-align:right;text-align-last:right">
      <option value=""></option>
      ${kdvOranlari.map(k=>`<option value="${k.id}"${k.id===s.kdvOraniId?' selected':''}>%${k.oran}</option>`).join('')}
    </select></td>
    <td id="fat-kdvtutar-${tur}-${i}" style="text-align:right;color:var(--yazi3)">${kdvTutar>0?_irsSayi(kdvTutar):''}</td>
    <td id="fat-kdvdahil-${tur}-${i}" style="text-align:right;font-weight:500">${dahil>0?_irsSayi(dahil):''}</td>`;
}
function fatToplamGuncelle(tur){
  let net=0,kdv=0;
  fatSatirListesi[tur].forEach(r=>{net+=parseFloat(r.tutar)||0;kdv+=_irsKdvHesapla(r).kdvTutar;});
  const yaz=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=_irsSayi(v);};
  yaz('fat-'+tur+'-toplam',net);
  yaz('fat-'+tur+'-kdvtoplam',kdv);
  yaz('fat-'+tur+'-dahiltoplam',net+kdv);
}
window.fatMalzemeAramaFiltrele=function(tur,i,val){
  const kutu=document.getElementById(`fat-oneri-${tur}-${i}`);if(!kutu)return;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kapsam=_irsKapsam(tur);
  const secenekler=_oneriSirala(q?kapsam.filter(k=>k.kaynak.ad.toLocaleLowerCase('tr').includes(q)):kapsam,q,k=>k.kaynak.ad);
  kutu.dataset.vurgu='-1';
  if(!secenekler.length){kutu.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--yazi3)">Sonuç bulunamadı</div>';kutu.style.display='block';return;}
  kutu.innerHTML=secenekler.map(k=>`<div class="oneri-item" onclick="fatMalzemeSecildi('${tur}',${i},'${k.kaynakTur}','${k.kaynak.id}')" style="padding:8px 10px;font-size:12px;border-bottom:1px solid var(--krem2)">${k.kaynak.ad}${tur==='iade'?` <span style="font-size:9px;color:var(--yazi3)">[${k.kaynakTur==='stok'?'Hammadde':'Ürün'}]</span>`:''}</div>`).join('');
  kutu.style.display='block';
};
window.fatMalzemeSecildi=function(tur,i,kaynakTur,kaynakId){
  const kaynak=kaynakTur==='stok'?stoklar.find(x=>x.id===kaynakId):urunler.find(x=>x.id===kaynakId);
  if(!kaynak)return;
  const s=fatSatirListesi[tur][i];
  s.kaynakTur=kaynakTur;s.kaynakId=kaynakId;
  s.birimId=kaynak.varsayilan_birim_id||kaynak.birim_id||'';
  // Satır dolunca üstteki Çıkış Deposu seçimini devral (satırda daha önce seçilmediyse)
  if(tur==='alis'&&!s.cikisDepoId)s.cikisDepoId=document.getElementById('fat-alis-cikis')?.value||'';
  // Stoklarda KDV oranı kart/gruptan gelir; ürünlerde varsayılan yok, elle seçilir.
  s.kdvOraniId=(kaynakTur==='stok'&&typeof stokKdvOraniId==='function')?(stokKdvOraniId(kaynakId)||''):'';
  if(i===fatSatirListesi[tur].length-1)fatSatirListesi[tur].push(_fatYeniSatir(tur));
  fatSatirRender(tur);
  document.getElementById(`fat-birim-${tur}-${i}`)?.focus();
};
window.fatBirimSec=function(tur,i,birimId){fatSatirListesi[tur][i].birimId=birimId;};
function _fatKdvHucreGuncelle(tur,i){
  const {kdvTutar,dahil}=_irsKdvHesapla(fatSatirListesi[tur][i]);
  const t=document.getElementById(`fat-kdvtutar-${tur}-${i}`);if(t)t.textContent=kdvTutar>0?_irsSayi(kdvTutar):'';
  const d=document.getElementById(`fat-kdvdahil-${tur}-${i}`);if(d)d.textContent=dahil>0?_irsSayi(dahil):'';
}
window.fatKdvSec=function(tur,i,kdvOraniId){
  fatSatirListesi[tur][i].kdvOraniId=kdvOraniId;
  const kdvEl=document.getElementById(`fat-kdv-${tur}-${i}`);if(kdvEl&&kdvOraniId)kdvEl.style.outline='';
  _fatKdvHucreGuncelle(tur,i);
  fatToplamGuncelle(tur);
};
window.fatSatirHesapla=function(tur,i,kaynak,val){
  const s=fatSatirListesi[tur][i];
  s[kaynak]=val;
  const mik=parseFloat(s.miktar)||0,fiy=parseFloat(s.fiyat)||0,tut=parseFloat(s.tutar)||0;
  const row=document.querySelectorAll(`#fat-${tur}-satirlar tr`)[i];if(!row)return;
  const inputs=row.querySelectorAll('input[type="number"]');
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0){const y=(mik*fiy).toFixed(2);s.tutar=y;if(inputs[2])inputs[2].value=y;}}
  else if(kaynak==='tutar'){if(mik>0&&tut>0){const y=(tut/mik).toFixed(2);s.fiyat=y;if(inputs[1])inputs[1].value=y;}}
  _fatKdvHucreGuncelle(tur,i);
  fatToplamGuncelle(tur);
};

// ===== İRSALİYEDEN AKTARMA =====
// Seçilen açık irsaliyelerin kalemlerini faturaya ekler. Aynı cariye ait
// birden fazla irsaliye tek faturada birleştirilebilir.
window.fatIrsaliyeleriYukle=async function(tur,ids){
  ids=ids.filter(id=>!_fatIrsaliyeIds[tur].includes(id));
  if(!ids.length){bil('Seçilen irsaliyeler zaten faturada','err');return false;}
  const {data:irsler,error:e1}=await sb.from('irsaliyeler').select('*').in('id',ids).eq('tur',tur).eq('durum','acik').eq('silindi',false);
  if(e1||!irsler||!irsler.length){bil('Aktarılacak açık irsaliye bulunamadı','err');return false;}
  const mevcutCari=document.getElementById('fat-'+tur+'-cari')?.value||'';
  const cariler=[...new Set([...irsler.map(x=>x.cari_id||''),...(mevcutCari&&_fatIrsaliyeIds[tur].length?[mevcutCari]:[])])];
  if(cariler.length>1){bil('Farklı carilere ait irsaliyeler tek faturada birleştirilemez!','err');return false;}
  const {data:kl}=await sb.from('irsaliye_kalemleri').select('*').in('irsaliye_id',irsler.map(x=>x.id)).order('sira');
  const yeni=(kl||[]).map(k=>{
    const kaynakTur=k.stok_id?'stok':'urun';
    const kaynakId=k.stok_id||k.urun_id;
    let kdv=k.kdv_orani_id||'';
    if(!kdv&&kaynakTur==='stok'&&typeof stokKdvOraniId==='function')kdv=stokKdvOraniId(kaynakId)||'';
    return {kaynakTur,kaynakId,birimId:k.birim_id||'',miktar:k.miktar,fiyat:k.fiyat,tutar:k.tutar,kdvOraniId:kdv};
  });
  fatSatirListesi[tur]=fatSatirListesi[tur].filter(s=>s.kaynakId);
  fatSatirListesi[tur].push(...yeni);
  for(let i=0;i<5;i++)fatSatirListesi[tur].push(_fatYeniSatir(tur));
  _fatIrsaliyeIds[tur]=[..._fatIrsaliyeIds[tur],...irsler.map(x=>x.id)];
  if(cariler[0]){const c=document.getElementById('fat-'+tur+'-cari');if(c)c.value=cariler[0];}
  const notEl=document.getElementById('fat-'+tur+'-not');
  if(notEl&&!notEl.value)notEl.value='İrsaliye: '+irsler.map(x=>x.irsaliye_no||x.tarih).join(', ');
  fatSatirRender(tur);
  bil(`✓ ${irsler.length} irsaliye faturaya aktarıldı`);
  return true;
};
window.fatIrsaliyeModalAc=async function(tur){
  _fatModalTur=tur;
  const cariId=document.getElementById('fat-'+tur+'-cari')?.value||'';
  let q=sb.from('irsaliyeler').select('*').eq('tur',tur).eq('durum','acik').eq('silindi',false).order('tarih',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  if(cariId)q=q.eq('cari_id',cariId);
  const {data:liste}=await q;
  const el=document.getElementById('fat-irs-liste');
  const ids=(liste||[]).filter(x=>!_fatIrsaliyeIds[tur].includes(x.id)).map(x=>x.id);
  const liste2=(liste||[]).filter(x=>ids.includes(x.id));
  if(!liste2.length){
    el.innerHTML='<div class="bos">'+(cariId?'Bu cariye ait':'Faturalanmamış')+' açık irsaliye yok.</div>';
  }else{
    const {data:kl}=await sb.from('irsaliye_kalemleri').select('irsaliye_id,tutar').in('irsaliye_id',ids);
    el.innerHTML=liste2.map(x=>{
      const t=(kl||[]).filter(k=>k.irsaliye_id===x.id).reduce((s,k)=>s+parseFloat(k.tutar||0),0);
      const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===x.cari_id):null;
      return `<label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid var(--krem2);cursor:pointer">
        <input type="checkbox" class="fat-irs-chk" value="${x.id}">
        <span style="font-size:12px;min-width:80px">${x.tarih}</span>
        <span style="font-size:12px;min-width:90px">${x.irsaliye_no||'—'}</span>
        <span style="font-size:12px;flex:1">${cari?cari.ad:'—'}</span>
        <span style="font-size:12px;font-weight:500">${_irsSayi(t)}</span>
      </label>`;
    }).join('');
  }
  modalAc('modal-fat-irsaliye');
};
window.fatIrsaliyeAktarSecilen=async function(){
  const ids=[...document.querySelectorAll('.fat-irs-chk:checked')].map(c=>c.value);
  if(!ids.length){bil('En az bir irsaliye seçin','err');return;}
  const ok=await fatIrsaliyeleriYukle(_fatModalTur,ids);
  if(ok)modalKapat('modal-fat-irsaliye');
};

// ===== KAYDET =====
window.kaydetFatura=async function(tur){
  const v=id=>document.getElementById('fat-'+tur+'-'+id)?.value||'';
  const tarih=v('tarih'),faturaNo=v('no').trim()||null,cariId=v('cari')||null,an=v('not').trim()||null;
  const odeme=v('odeme')||'pesin',kasaId=v('kasa')||null;
  if(!tarih){bil('Tarih zorunlu!','err');return;}
  if(!cariId){bil('Cari seçimi zorunlu!','err');return;}
  if(odeme==='pesin'&&!kasaId){bil('Peşin ödeme seçiliyse kasa seçimi zorunlu!','err');return;}
  const gecerli=fatSatirListesi[tur].filter(s=>s.kaynakId&&parseFloat(s.miktar)>0);
  if(!gecerli.length){bil('En az bir satır!','err');return;}
  // Mükerrer belge, düzenleme/silme kısıtları ve stok kontrolleri veritabanında (fatura_yaz) zorlanır.
  // İrsaliyesiz kesilen ALIŞ faturası stoğa girer (irsaliyeden dönüşenlerde stok zaten irsaliyede girmiştir)
  const depoId=tur==='alis'?anaDepoId():null; // alım deposu her zaman Ana Depo
  const stoguGirecek=tur==='alis'&&!_fatIrsaliyeIds[tur].length;
  if(stoguGirecek&&!depoId){bil('Ana depo tanımlı değil! İrsaliyesiz alış faturası Ana Depo\'ya stok girişi yapar.','err');return;}
  // KDV oranı her satırda zorunlu. KDV'siz (0) satır için KDV Tanımları'nda
  // "%0" bir oran tanımlanıp seçilmelidir. (Muafiyet nedeni seçimi ileride eklenecek.)
  document.querySelectorAll(`#fat-${tur}-satirlar select[id^="fat-kdv-"]`).forEach(el=>el.style.outline='');
  const kdvEksik=gecerli.filter(s=>!s.kdvOraniId);
  if(kdvEksik.length){
    kdvEksik.forEach(s=>{
      const idx=fatSatirListesi[tur].indexOf(s);
      const el=document.getElementById(`fat-kdv-${tur}-${idx}`);
      if(el)el.style.outline='2px solid #e76f51';
    });
    const ilkIdx=fatSatirListesi[tur].indexOf(kdvEksik[0]);
    document.getElementById(`fat-kdv-${tur}-${ilkIdx}`)?.focus();
    const adlar=kdvEksik.slice(0,3).map(s=>{const k=s.kaynakTur==='stok'?stoklar.find(x=>x.id===s.kaynakId):urunler.find(x=>x.id===s.kaynakId);return k?.ad||'?';}).join(', ');
    bil(`KDV oranı seçilmemiş ${kdvEksik.length} satır var: ${adlar}${kdvEksik.length>3?'...':''}. KDV'siz kalemler için KDV Tanımları'nda "%0" oranı tanımlayıp seçin.`,'err');
    return;
  }
  let net=0,kdv=0;
  gecerli.forEach(s=>{net+=parseFloat(s.tutar)||0;kdv+=_irsKdvHesapla(s).kdvTutar;});
  const duzenlenen=_fatDuzenlenenId[tur];
  const id=duzenlenen||crypto.randomUUID();
  const baslik={id,isyeri_id:aktifIsyeri?.id||null,tur,fatura_no:faturaNo,tarih,cari_id:cariId,aciklama:an,
    odeme_tipi:odeme,kasa_id:odeme==='pesin'?kasaId:null,depo_id:stoguGirecek?depoId:null,
    toplam:net,kdv_toplam:kdv,genel_toplam:net+kdv,kalem_sayisi:gecerli.length,kullanici:aktifKullanici?.ad||'',ts:Date.now()};
  const kalemler=gecerli.map((s,i)=>{
    const {kdvTutar,dahil}=_irsKdvHesapla(s);
    return {
      stok_id:s.kaynakTur==='stok'?s.kaynakId:null,
      urun_id:s.kaynakTur==='urun'?s.kaynakId:null,
      birim_id:s.birimId||null,
      miktar:parseFloat(s.miktar)||0,
      fiyat:parseFloat(s.fiyat)||0,
      tutar:parseFloat(s.tutar)||(parseFloat(s.miktar)||0)*(parseFloat(s.fiyat)||0),
      kdv_orani_id:s.kdvOraniId||null,
      kdv_orani:s.kdvOraniId?kdvOraniDegeri(s.kdvOraniId):null,
      kdv_tutar:kdvTutar,kdv_dahil_tutar:dahil,
      cikis_depo_id:stoguGirecek?(s.cikisDepoId||null):null,
      sira:i
    };
  });
  // İrsaliyesiz alış faturası Ana Depo'ya stok girişi yapar (+ çıkış deposu seçilmişse Ana Depo Çıkış fişleri).
  // İrsaliyeden dönüşen faturada stok zaten irsaliyede girmiştir; giriş/çıkış listeleri boş gönderilir.
  let giris=[],cikislar=[],maliyetler=[];
  if(stoguGirecek){
    const b={tarih,depoId,cariId,not:an,belgeNo:faturaNo,kat:'Alış Faturası',belgeId:id,faturaId:id};
    const g=stokGirisHazirla(gecerli,b);giris=g.rows;maliyetler=g.maliyetler;
    cikislar=anaDepoCikisHazirla(gecerli,b);
  }
  // Başlık, kalemler, bağlı irsaliyeler, stok hareketleri TEK işlemde yazılır.
  try{await faturaYazDb(baslik,kalemler,giris,cikislar,maliyetler,_fatIrsaliyeIds[tur],duzenlenen);}
  catch(err){bil('Kaydedilemedi: '+(err.message||'bilinmeyen hata'),'err');return;}
  await islemleriYenile();
  bil(`✓ Fatura ${duzenlenen?'güncellendi':'kaydedildi'} (${gecerli.length} kalem, ${_irsSayi(net+kdv)})${stoguGirecek?' — Ana Depo\'ya stok girişi yapıldı'+(cikislar.length?`, ${cikislar.length} Ana Depo Çıkış fişi oluştu`:''):''}`);
  await logYaz({islem:duzenlenen?'duzenle':'olustur',belgeTuru:'fatura',altTur:tur,belgeId:id,belgeNo:faturaNo,belgeTarihi:tarih,cariId,tutar:net+kdv,
    eski:duzenlenen?_fatEskiSnapshot[tur]:null,yeni:belgeSnapshotKur({tarih,no:faturaNo,cariId,not:an,odeme,kasaId},gecerli),faturaId:id});
  fatGorunumListe(tur);
};

// ===== GÜNLÜK ÖZET LİSTESİ =====
window.renderFatGunSekmesi=async function(tur){
  const tarihEl=document.getElementById('fat-'+tur+'-liste-tarih');
  if(tarihEl&&!tarihEl.value)tarihEl.value=bugun();
  const tarih=tarihEl?.value||bugun();
  const tbEl=document.getElementById('fat-'+tur+'-liste-tb');if(!tbEl)return;
  tbEl.innerHTML='<div class="bos">Yükleniyor...</div>';
  let q=sb.from('faturalar').select('*').eq('tur',tur).eq('tarih',tarih).eq('silindi',false).order('ts',{ascending:false});
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  const {data:liste}=await q;
  const ozEl=document.getElementById('fat-'+tur+'-liste-ozet');
  _fatListeVeri[tur]={};
  if(!liste||!liste.length){tbEl.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';if(ozEl)ozEl.textContent='';_fatSeciliId[tur]=null;return;}
  liste.forEach(x=>{_fatListeVeri[tur][x.id]=x;});
  if(!_fatListeVeri[tur][_fatSeciliId[tur]])_fatSeciliId[tur]=null;
  const genel=liste.reduce((t,x)=>t+parseFloat(x.genel_toplam||0),0);
  if(ozEl)ozEl.textContent=`${liste.length} fatura · ${_irsSayi(genel)}`;
  tbEl.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>Fatura No</th><th>Cari</th><th style="text-align:right">Tutar</th><th style="text-align:right">KDV</th><th style="text-align:right">KDV Dahil</th><th>Ödeme</th><th>Muhasebe</th>
  </tr></thead><tbody>${liste.map(x=>{
    const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===x.cari_id):null;
    return `<tr data-id="${x.id}" onclick="fatSec('${tur}','${x.id}')" ondblclick="fatGoruntule('${tur}','${x.id}')" style="cursor:pointer;${_fatSeciliId[tur]===x.id?'background:var(--yesil-cok-ac);':''}">
      <td style="font-size:12px">${x.tarih}</td>
      <td style="font-size:12px">${x.fatura_no||'—'}</td>
      <td style="font-size:12px">${cari?cari.ad:'—'}</td>
      <td style="text-align:right">${_irsSayi(x.toplam)}</td>
      <td style="text-align:right;color:var(--yazi3)">${_irsSayi(x.kdv_toplam)}</td>
      <td style="text-align:right;font-weight:500">${_irsSayi(x.genel_toplam)}</td>
      <td style="font-size:11px">${x.odeme_tipi==='cari'?'Cari':'Peşin'}</td>
      <td style="font-size:11px;font-weight:600;color:${x.muhasebe_durumu==='bekliyor'?'var(--turuncu)':'var(--yesil)'}">${x.muhasebe_durumu==='bekliyor'?'Bekliyor':'Muhasebeleşti'}</td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
};
window.fatSec=function(tur,id){
  _fatSeciliId[tur]=id;
  document.querySelectorAll(`#fat-${tur}-liste-tb tr[data-id]`).forEach(tr=>{tr.style.background=tr.dataset.id===id?'var(--yesil-cok-ac)':'';});
};
window.fatListeIslem=function(tur,islem){
  const id=_fatSeciliId[tur];
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  const x=_fatListeVeri[tur]?.[id];
  if(islem==='goruntule')fatGoruntule(tur,id);
  else if(islem==='duzenle'){
    if(x&&x.muhasebe_durumu!=='bekliyor'){bil('Muhasebeleşmiş fatura düzenlenemez','err');return;}
    fatDuzenleAc(tur,id);
  }else if(islem==='sil')fatSil(tur,id);
  else if(islem==='log')belgeLogGoster('fatura',id,'Fatura Logu');
};
// Faturayı siler (yumuşak silme) ve bağlı irsaliyeleri tekrar "açık" duruma döndürür.
window.fatSil=async function(tur,id){
  const x=_fatListeVeri[tur]?.[id];
  if(x&&x.muhasebe_durumu!=='bekliyor'){bil('Muhasebeleşmiş fatura silinemez','err');return;}
  if(islemler.some(i=>i.fatura_id===id&&i.alt_tur==='ana_depo_cikis')){
    bil('Bu faturaya bağlı Ana Depo Çıkış fişi var. Silmek için önce Stok İşlemleri → Transfer ekranından çıkış fişini silin.','err');return;
  }
  if(!(await onay('Bu faturayı silmek istiyor musunuz?<br><small>Bağlı irsaliyeler tekrar açık duruma döner.</small>','🗑️')))return;
  const {data:silKl}=await sb.from('fatura_kalemleri').select('*').eq('fatura_id',id).order('sira');
  const silSnap=belgeSnapshotKur({tarih:x?.tarih,no:x?.fatura_no,cariId:x?.cari_id,not:x?.aciklama,odeme:x?.odeme_tipi,kasaId:x?.kasa_id},(silKl||[]).map(k=>({kaynakTur:k.stok_id?'stok':'urun',kaynakId:k.stok_id||k.urun_id,birimId:k.birim_id,miktar:k.miktar,fiyat:k.fiyat,tutar:k.tutar,kdvOraniId:k.kdv_orani_id,cikisDepoId:k.cikis_depo_id})));
  // Tek işlemde silinir (kalemler, stok girişi, irsaliye bağlantıları dahil); mal başka yere çıkmışsa veritabanı hata verir.
  try{await faturaSilDb(id);}catch(e){bil('Silinemedi: '+e.message,'err');return;}
  await islemleriYenile();
  _fatSeciliId[tur]=null;
  await logYaz({islem:'sil',belgeTuru:'fatura',altTur:tur,belgeId:id,belgeNo:x?.fatura_no,belgeTarihi:x?.tarih,cariId:x?.cari_id,tutar:x?.genel_toplam,eski:silSnap,faturaId:id});
  bil('Fatura silindi ✓');
  renderFatGunSekmesi(tur);
};

// ===== SATIR TAMAMLANMA KONTROLÜNE KAYIT =====
['alis','satis','iade'].forEach(tur=>{
  if(typeof _satirKayitEkle==='function'){
    _satirKayitEkle('fat-'+tur,
      (i)=>fatSatirListesi[tur][i],
      (s)=>{
        if(!s)return false;
        const miktar=parseFloat(s.miktar)||0,fiyat=parseFloat(s.fiyat)||0,tutar=parseFloat(s.tutar)||0;
        return !!(s.kaynakId&&s.birimId&&miktar>0&&fiyat>0&&tutar>0);
      }
    );
  }
});

// Muhasebeleşmemiş bir faturayı, KAYDEDİLDİĞİ HALİYLE (çıkış depoları dahil) düzenlemek üzere forma yükler.
// Bağlı Ana Depo Çıkış fişi varsa izin vermez; çıkış fişi silinince çıkış depoları kalemlerden geri gelir.
window.fatGoruntule=function(tur,id){return fatDuzenleAc(tur,id,true);};
window.fatDuzenleAc=async function(tur,id,salt){
  // Bağlı Ana Depo Çıkış fişi varsa düzenleme engellenir; önce çıkış fişi silinmeli. (Görüntülemede engel yok)
  if(!salt&&islemler.some(i=>i.fatura_id===id&&i.alt_tur==='ana_depo_cikis')){
    bil('Bu faturaya bağlı Ana Depo Çıkış fişi var. Düzenlemek için önce Stok İşlemleri → Transfer ekranından çıkış fişini silin.','err');return;
  }
  const {data:fat}=await sb.from('faturalar').select('*').eq('id',id).single();
  if(!fat){bil('Kayıt bulunamadı','err');return;}
  if(!salt&&fat.muhasebe_durumu!=='bekliyor'){bil('Muhasebeleşmiş fatura düzenlenemez','err');return;}
  const {data:kl}=await sb.from('fatura_kalemleri').select('*').eq('fatura_id',id).order('sira');
  const {data:bagli}=await sb.from('irsaliyeler').select('id').eq('fatura_id',id);
  await fatYeniBaslat(tur);
  _fatDuzenlenenId[tur]=salt?null:id;
  _fatBaslikYaz(tur,true,!!salt);
  _fatIrsaliyeIds[tur]=(bagli||[]).map(x=>x.id);
  const set=(k,v)=>{const el=document.getElementById('fat-'+tur+'-'+k);if(el)el.value=v;};
  set('tarih',fat.tarih||'');set('no',fat.fatura_no||'');set('cari',fat.cari_id||'');set('not',fat.aciklama||'');
  set('odeme',fat.odeme_tipi||'pesin');fatOdemeDegis(tur);
  if(typeof kasaSelectDoldur==='function')await kasaSelectDoldur('fat-'+tur+'-kasa',true);
  if(fat.kasa_id)set('kasa',fat.kasa_id);
  const cikislar=(kl||[]).map(k=>k.cikis_depo_id||'');
  fatSatirListesi[tur]=(kl||[]).map((k,n)=>({kaynakTur:k.stok_id?'stok':'urun',kaynakId:k.stok_id||k.urun_id,birimId:k.birim_id||'',miktar:k.miktar,fiyat:k.fiyat,tutar:k.tutar,kdvOraniId:k.kdv_orani_id||'',cikisDepoId:cikislar[n]||''}));
  if(!salt)_fatEskiSnapshot[tur]=belgeSnapshotKur({tarih:fat.tarih,no:fat.fatura_no,cariId:fat.cari_id,not:fat.aciklama,odeme:fat.odeme_tipi,kasaId:fat.kasa_id},fatSatirListesi[tur]);
  const farkli=[...new Set(cikislar.filter(Boolean))];
  const ustEl=document.getElementById('fat-alis-cikis');
  if(tur==='alis'&&ustEl&&farkli.length===1&&cikislar.every(Boolean))ustEl.value=farkli[0];
  if(!salt)for(let n=0;n<5;n++)fatSatirListesi[tur].push(_fatYeniSatir(tur));
  fatSatirRender(tur);
  if(salt){
    _fatGoruntuleme[tur]=true;_fatGoruntulenenKayit[tur]=fat;
    _fatSaltOkunur(tur,true);
    fatBilgiBlokYenile(tur);
  }
};
