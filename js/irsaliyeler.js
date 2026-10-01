// ===== İRSALİYELER =====
// Üç sekme (Alış/Satış/İade) aynı yapıyı paylaştığı için tüm state ve
// render fonksiyonları "tur" parametresiyle genelleştirildi — kod üç kez
// tekrarlanmıyor.
let _aktifIrsTab='alis';
let irsSatirListesi={alis:[],satis:[],iade:[]};
let _irsHoverIndex={alis:null,satis:null,iade:null};
let _irsAcikId={alis:null,satis:null,iade:null};

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
  const listeEl=document.getElementById('tp-irs-'+tur+'-liste');
  const formEl=document.getElementById('tp-irs-'+tur+'-form');
  if(formEl)formEl.style.display='none';
  if(listeEl)listeEl.style.display='';
  document.body.classList.remove('islem-form-acik');
  if(typeof renderIrsGunSekmesi==='function')renderIrsGunSekmesi(tur);
};
window.irsKaydetmedenCik=async function(tur){
  const ok=await onay('Kaydetmeden çıkmak istiyor musunuz?','⚠️','Evet','Hayır');
  if(ok)irsGorunumListe(tur);
};

// ===== FORM BAŞLATMA =====
window.irsYeniBaslat=function(tur){
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
  irsGorunumForm(tur);
};

window.irsSatirListesiDoldur=function(tur,n){
  n=n||15;
  for(let i=0;i<n;i++)irsSatirListesi[tur].push({kaynakTur:'',kaynakId:'',birimId:'',miktar:'',fiyat:'',tutar:'',kdvOraniId:''});
  irsSatirRender(tur);
};
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
        <div id="irs-oneri-${tur}-${i}" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:240px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:2px"></div>
      </div></td>
      <td><select id="irs-birim-${tur}-${i}" onchange="irsBirimSec('${tur}',${i},this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)"><option value=""></option>${irsBirimOpts(s.kaynakTur,s.kaynakId,s.birimId)}</select></td>
      <td><input type="number" value="${s.miktar||''}" onblur="irsSatirHesapla('${tur}',${i},'miktar',this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px"></td>
      <td><input type="number" value="${s.fiyat||''}" onblur="irsSatirHesapla('${tur}',${i},'fiyat',this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px"></td>
      <td><input type="number" value="${s.tutar||''}" onblur="irsSatirHesapla('${tur}',${i},'tutar',this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 5px;font-size:12px;font-weight:500;color:var(--yesil)"></td>
      ${tur==='alis'?_irsKdvHucreleri(tur,i,s):''}
      <td></td>
    </tr>`;
  }).join('');
  irsToplamGuncelle(tur);
};
// Sadece Alış sekmesinde gösterilen KDV Oran / KDV Tutar / KDV Dahil hücreleri.
function _irsKdvHucreleri(tur,i,s){
  const {kdvTutar,dahil}=_irsKdvHesapla(s);
  return `<td><select id="irs-kdv-${tur}-${i}" onchange="irsKdvSec('${tur}',${i},this.value)" onfocus="_irsHoverIndex['${tur}']=${i}" onkeydown="satirAsagiGec(event)" style="width:100%;padding:3px 4px;font-size:12px;background:var(--beyaz)">
      <option value=""></option>
      ${kdvOranlari.map(k=>`<option value="${k.id}"${k.id===s.kdvOraniId?' selected':''}>${k.ad} (%${k.oran})</option>`).join('')}
    </select></td>
    <td id="irs-kdvtutar-${tur}-${i}" style="text-align:right;color:var(--yazi3)">${kdvTutar>0?para(kdvTutar):'—'}</td>
    <td id="irs-kdvdahil-${tur}-${i}" style="text-align:right;font-weight:500">${dahil>0?para(dahil):'—'}</td>`;
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
  if(el)el.textContent='₺'+t.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(tur==='alis'){
    const dahilToplam=irsSatirListesi[tur].reduce((s,r)=>s+_irsKdvHesapla(r).dahil,0);
    const dEl=document.getElementById('irs-alis-kdv-dahil-toplam');
    if(dEl)dEl.textContent='₺'+dahilToplam.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
}
window.irsMalzemeAramaFiltrele=function(tur,i,val){
  const kutu=document.getElementById(`irs-oneri-${tur}-${i}`);if(!kutu)return;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kapsam=_irsKapsam(tur);
  const secenekler=(q?kapsam.filter(k=>k.kaynak.ad.toLocaleLowerCase('tr').includes(q)):kapsam).slice(0,30);
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
  if(kaynakTur==='stok'&&typeof stokKdvOraniId==='function')s.kdvOraniId=stokKdvOraniId(kaynakId)||'';
  const sonSatirMi=i===irsSatirListesi[tur].length-1;
  if(sonSatirMi)irsSatirListesi[tur].push({kaynakTur:'',kaynakId:'',birimId:'',miktar:'',fiyat:'',tutar:'',kdvOraniId:''});
  irsSatirRender(tur);
  document.getElementById(`irs-birim-${tur}-${i}`)?.focus();
};
window.irsBirimSec=function(tur,i,birimId){
  irsSatirListesi[tur][i].birimId=birimId;
};
window.irsKdvSec=function(tur,i,kdvOraniId){
  irsSatirListesi[tur][i].kdvOraniId=kdvOraniId;
  const {kdvTutar,dahil}=_irsKdvHesapla(irsSatirListesi[tur][i]);
  const tEl=document.getElementById(`irs-kdvtutar-${tur}-${i}`);if(tEl)tEl.textContent=kdvTutar>0?para(kdvTutar):'—';
  const dEl=document.getElementById(`irs-kdvdahil-${tur}-${i}`);if(dEl)dEl.textContent=dahil>0?para(dahil):'—';
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
    const tEl=document.getElementById(`irs-kdvtutar-${tur}-${i}`);if(tEl)tEl.textContent=kdvTutar>0?para(kdvTutar):'—';
    const dEl=document.getElementById(`irs-kdvdahil-${tur}-${i}`);if(dEl)dEl.textContent=dahil>0?para(dahil):'—';
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
  const toplam=gecerli.reduce((t,s)=>t+(parseFloat(s.tutar)||0),0);
  try{
    const {data:irs,error:e1}=await sb.from('irsaliyeler').insert({
      isyeri_id:aktifIsyeri?.id||null,tur,irsaliye_no:irsNo,tarih,cari_id:cariId,aciklama:an,
      durum:'acik',kullanici:aktifKullanici?.ad||'',ts:Date.now()
    }).select().single();
    if(e1)throw e1;
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
        sira:i
      };
    });
    const {error:e2}=await sb.from('irsaliye_kalemleri').insert(kalemler);
    if(e2)throw e2;
    bil(`✓ İrsaliye kaydedildi (${gecerli.length} kalem, ${para(toplam)})`);
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

  if(!irsListe||!irsListe.length){
    tbEl.innerHTML='<div class="bos">Bu tarihte kayıt yok.</div>';
    if(ozEl)ozEl.textContent='';
    return;
  }
  const ids=irsListe.map(x=>x.id);
  const {data:kalemler}=await sb.from('irsaliye_kalemleri').select('*').in('irsaliye_id',ids).order('sira');

  const toplam=irsListe.reduce((t,x)=>{
    const kl=(kalemler||[]).filter(k=>k.irsaliye_id===x.id);
    return t+kl.reduce((s,k)=>s+parseFloat(k.tutar||0),0);
  },0);
  if(ozEl)ozEl.textContent=`${irsListe.length} irsaliye · ${para(toplam)}`;

  const acikId=_irsAcikId[tur];
  tbEl.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Tarih</th><th>İrsaliye No</th><th>Cari</th><th style="text-align:right">Tutar</th><th>Durum</th><th></th>
  </tr></thead><tbody>${irsListe.map(x=>{
    const kl=(kalemler||[]).filter(k=>k.irsaliye_id===x.id);
    const xToplam=kl.reduce((s,k)=>s+parseFloat(k.tutar||0),0);
    const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===x.cari_id):null;
    const acik=acikId===x.id;
    const durumRenk=x.durum==='faturalandi'?'var(--yesil)':x.durum==='iptal'?'var(--yazi3)':'var(--turuncu)';
    const durumAd=x.durum==='faturalandi'?'Faturalandı':x.durum==='iptal'?'İptal':'Açık';
    const kdvGoster=tur==='alis';
    const detay=acik?`<tr><td colspan="6" style="padding:0">
      <div style="background:var(--krem);border-top:2px solid var(--yesil-ac)">
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:var(--krem2);font-size:10px;color:var(--yazi3)">
            <th style="padding:4px 8px;text-align:left">MALZEME/ÜRÜN</th><th style="padding:4px 8px;text-align:right">MİKTAR</th><th style="padding:4px 8px;text-align:right">FİYAT</th><th style="padding:4px 8px;text-align:right">TUTAR</th>${kdvGoster?'<th style="padding:4px 8px;text-align:right">KDV</th><th style="padding:4px 8px;text-align:right">KDV DAHİL</th>':''}
          </tr>
          ${kl.map(k=>{
            const stok=stoklar.find(s=>s.id===k.stok_id);const urun=urunler.find(u=>u.id===k.urun_id);
            const ad=stok?stok.ad:urun?urun.ad:'(bulunamadı)';
            return `<tr style="font-size:11px"><td style="padding:5px 8px">${ad}</td><td style="padding:5px 8px;text-align:right">${parseFloat(k.miktar).toLocaleString('tr-TR',{maximumFractionDigits:3})} ${birimAd(k.birim_id)}</td><td style="padding:5px 8px;text-align:right;color:var(--yazi3)">${k.fiyat?para(k.fiyat):'—'}</td><td style="padding:5px 8px;text-align:right;font-weight:500">${para(k.tutar)}</td>${kdvGoster?`<td style="padding:5px 8px;text-align:right;color:var(--yazi3)">${k.kdv_tutar?para(k.kdv_tutar)+' (%'+(k.kdv_orani||0)+')':'—'}</td><td style="padding:5px 8px;text-align:right;font-weight:500">${k.kdv_dahil_tutar?para(k.kdv_dahil_tutar):'—'}</td>`:''}</tr>`;
          }).join('')}
        </table>
        ${x.durum==='acik'?`<div style="padding:8px 12px"><button class="btn sm ghost" onclick="event.stopPropagation();irsSil('${tur}','${x.id}')">✕ Sil</button></div>`:''}
      </div>
    </td></tr>`:'';
    return `<tr style="cursor:pointer;${acik?'background:var(--yesil-cok-ac);':''}" onclick="irsToggle('${tur}','${x.id}')">
      <td style="font-size:12px">${x.tarih}</td>
      <td style="font-size:12px">${x.irsaliye_no||'—'}</td>
      <td style="font-size:12px">${cari?cari.ad:'—'}</td>
      <td style="text-align:right;font-weight:500">${para(xToplam)}</td>
      <td style="font-size:11px;font-weight:600;color:${durumRenk}">${durumAd}</td>
      <td style="text-align:right;font-size:12px;color:var(--yazi3)">${acik?'▲':'▼'}</td>
    </tr>${detay}`;
  }).join('')}</tbody></table></div>`;
};
window.irsToggle=function(tur,id){
  _irsAcikId[tur]=_irsAcikId[tur]===id?null:id;
  renderIrsGunSekmesi(tur);
};
window.irsSil=async function(tur,id){
  if(!(await onay('Bu irsaliyeyi silmek istiyor musunuz?','🗑️')))return;
  await sb.from('irsaliyeler').update({silindi:true}).eq('id',id);
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
