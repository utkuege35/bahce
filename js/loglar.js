// ===== BELGE / KULLANICI LOGLARI =====
// Tüm oluşturma, düzenleme ve silme işlemleri "belge_loglari" tablosuna yazılır (sadece eklenir,
// değiştirilemez/silinemez). Her kayıtta işlemi yapan kullanıcı, zaman, belge bilgisi ve
// eski/yeni değerlerin anlık görüntüsü (snapshot) ile okunabilir "değişiklik" listesi bulunur.
const LOG_ISLEM_ADLARI={olustur:'Oluşturuldu',duzenle:'Düzenlendi',sil:'Silindi'};
const LOG_ISLEM_RENK={olustur:'var(--yesil)',duzenle:'var(--sari)',sil:'#c62828'};
const LOG_TUR_ADLARI={irsaliye:'İrsaliye',fatura:'Fatura',transfer:'Transfer',devir:'Devir',satis:'Satış',ikram:'İkram',odenmez:'Ödenmez',hasar:'Hasar',atik:'Atık',kasa:'Kasa'};
const _logEsc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Bir belgenin (irsaliye/fatura) o anki halinin okunabilir özeti.
// b: {tarih,no,cariId,not,odeme?,kasaId?}  satirlar: [{kaynakTur,kaynakId,birimId,miktar,fiyat,tutar,kdvOraniId,cikisDepoId}]
window.belgeSnapshotKur=function(b,satirlar){
  const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===b.cariId):null;
  const baslik={'Tarih':b.tarih||'','Belge No':b.no||'','Cari':cari?cari.ad:'','Not':b.not||''};
  if(b.odeme!==undefined){
    const kasa=typeof kasalar_list!=='undefined'?kasalar_list.find(k=>k.id===b.kasaId):null;
    baslik['Ödeme Tipi']=b.odeme==='cari'?'Cari':'Peşin';
    baslik['Kasa']=b.odeme==='pesin'?(kasa?.ad||''):'';
  }
  const kalemler=(satirlar||[]).filter(s=>s.kaynakId).map(s=>{
    const kart=s.kaynakTur==='stok'?stoklar.find(x=>x.id===s.kaynakId):urunler.find(x=>x.id===s.kaynakId);
    return {
      'Malzeme':kart?.ad||'',
      'Birim':birimAd(s.birimId)||'',
      'Miktar':+(parseFloat(s.miktar)||0),
      'Fiyat':+(parseFloat(s.fiyat)||0),
      'Tutar':+(parseFloat(s.tutar)||0),
      'KDV %':s.kdvOraniId?kdvOraniDegeri(s.kdvOraniId):'',
      'Çıkış Deposu':s.cikisDepoId?(depolar.find(d=>d.id===s.cikisDepoId)?.ad||''):''
    };
  });
  return {baslik,kalemler};
};
// Transfer fişinin özeti. satirlar: [{stokId,birimId,miktar}]
window.transferSnapshotKur=function(tarih,tip,kaynak,hedef,not,satirlar){
  const dAd=id=>depolar.find(d=>d.id===id)?.ad||'';
  return {
    baslik:{'Tarih':tarih||'','Fiş Tipi':(typeof TRF_TIP_ADLARI!=='undefined'&&TRF_TIP_ADLARI[tip])||tip||'','Kaynak Depo':dAd(kaynak),'Hedef Depo':dAd(hedef),'Not':not||''},
    kalemler:(satirlar||[]).filter(s=>s.stokId).map(s=>({
      'Malzeme':stoklar.find(x=>x.id===s.stokId)?.ad||'','Birim':birimAd(s.birimId)||'','Miktar':+(parseFloat(s.miktar)||0)
    }))
  };
};
// Devir fişinin özeti. satirlar: [{stokId,birimId,miktar,fiyat,tutar}]
window.devirSnapshotKur=function(tarih,depoId,not,satirlar){
  return {
    baslik:{'Tarih':tarih||'','Depo':depolar.find(d=>d.id===depoId)?.ad||'','Not':not||''},
    kalemler:(satirlar||[]).filter(s=>s.stokId).map(s=>({
      'Malzeme':stoklar.find(x=>x.id===s.stokId)?.ad||'','Birim':birimAd(s.birimId)||'','Miktar':+(parseFloat(s.miktar)||0),
      'Fiyat':+(parseFloat(s.fiyat)||0),'Tutar':+(parseFloat(s.tutar)||0)
    }))
  };
};
// Satış/İkram/Ödenmez/Hasar/Atık fişinin özeti. satirlar: [{kaynakTur,kaynakId,birimId,miktar,fiyat,tutar}]
window.stokCikisSnapshotKur=function(tarih,depoId,not,satirlar){
  return {
    baslik:{'Tarih':tarih||'','Depo':depolar.find(d=>d.id===depoId)?.ad||'','Not':not||''},
    kalemler:(satirlar||[]).filter(s=>s.kaynakId).map(s=>{
      const kart=s.kaynakTur==='stok'?stoklar.find(x=>x.id===s.kaynakId):urunler.find(x=>x.id===s.kaynakId);
      return {'Malzeme':kart?.ad||'','Tür':s.kaynakTur==='urun'?'Ürün':'Hammadde','Birim':birimAd(s.birimId)||'','Miktar':+(parseFloat(s.miktar)||0),
        'Fiyat':+(parseFloat(s.fiyat)||0),'Tutar':+(parseFloat(s.tutar)||0)};
    })
  };
};
// Kasa fişinin özeti (tek satırlı fiş: kalem yok, tüm bilgi başlıkta)
window.kasaSnapshotKur=function(o){
  const kasa=typeof kasalar_list!=='undefined'?kasalar_list.find(k=>k.id===o.kasaId):null;
  const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===o.cariId):null;
  return {baslik:{'Tarih':o.tarih||'','Kasa':kasa?.ad||'','Tür':(typeof KI_ALT_ADLARI!=='undefined'&&KI_ALT_ADLARI[o.tip])||o.tip||'',
    'Cari':cari?cari.ad:'','Belge No':o.belgeNo||'','Açıklama':o.aciklama||'','Tutar':+(parseFloat(o.tutar)||0)},kalemler:[]};
};
// İki özet arasındaki farkı okunabilir cümlelerle çıkarır.
window.belgeFarkiUret=function(eski,yeni){
  const f=[];
  const eb=eski.baslik||{},yb=yeni.baslik||{};
  new Set([...Object.keys(eb),...Object.keys(yb)]).forEach(k=>{
    const a=eb[k]??'',b=yb[k]??'';
    if(String(a)!==String(b))f.push(`${k}: ${a===''?'—':a} → ${b===''?'—':b}`);
  });
  const kalanYeni=[...(yeni.kalemler||[])];const silinen=[];
  (eski.kalemler||[]).forEach(e=>{
    const i=kalanYeni.findIndex(y=>y['Malzeme']===e['Malzeme']);
    if(i<0){silinen.push(e);return;}
    const y=kalanYeni.splice(i,1)[0];
    Object.keys(e).forEach(k=>{
      if(k==='Malzeme')return;
      if(String(e[k])!==String(y[k]))f.push(`${e['Malzeme']} — ${k}: ${e[k]===''?'—':e[k]} → ${y[k]===''?'—':y[k]}`);
    });
  });
  silinen.forEach(e=>f.push(`Satır silindi: ${e['Malzeme']} (${e['Miktar']} ${e['Birim']})`));
  kalanYeni.forEach(y=>f.push(`Satır eklendi: ${y['Malzeme']} (${y['Miktar']} ${y['Birim']})`));
  return f;
};
// Log kaydı yazar. Log yazılamazsa asıl işlemi engellemez ama kullanıcıyı uyarır.
// o: {islem,belgeTuru,altTur,belgeId,belgeNo,belgeTarihi,cariId,tutar,eski,yeni,irsaliyeId,faturaId}
window.logYaz=async function(o){
  try{
    let degisiklikler=[];
    if(o.islem==='duzenle'&&o.eski&&o.yeni)degisiklikler=belgeFarkiUret(o.eski,o.yeni);
    else if(o.islem==='olustur'&&o.yeni)degisiklikler=[(o.yeni.kalemler||[]).length?`${o.yeni.kalemler.length} kalem kaydedildi`:'Kayıt oluşturuldu'];
    else if(o.islem==='sil'&&o.eski)degisiklikler=[(o.eski.kalemler||[]).length?`${o.eski.kalemler.length} kalemli belge silindi`:'Kayıt silindi'];
    if(o.islem==='duzenle'&&!degisiklikler.length)return; // gerçek bir değişiklik yoksa log yazma
    const {error}=await sb.from('belge_loglari').insert({
      isyeri_id:aktifIsyeri?.id||null,
      kullanici:aktifKullanici?.ad?`${aktifKullanici.ad}${aktifKullanici.soyad?' '+aktifKullanici.soyad:''}`:'',
      kullanici_id:String(aktifKullanici?.id||aktifKullanici?.uid||''),
      islem:o.islem,belge_turu:o.belgeTuru,alt_tur:o.altTur||null,
      belge_id:o.belgeId,belge_no:o.belgeNo||null,belge_tarihi:o.belgeTarihi||null,
      cari_id:o.cariId||null,tutar:o.tutar!=null?+o.tutar:null,
      eski_deger:o.eski||null,yeni_deger:o.yeni||null,degisiklikler,
      irsaliye_id:o.irsaliyeId||null,fatura_id:o.faturaId||null
    });
    if(error)throw error;
  }catch(e){
    console.warn('Log yazılamadı',e);
    bil('Uyarı: işlem yapıldı ama log kaydı yazılamadı ('+(e.message||'hata')+')','err');
  }
};

// ===== LOG KARTLARI (hem belge logu hem log ekranı detayı kullanır) =====
function _logKartHtml(l,detayliBaslik){
  const tarihSaat=new Date(l.ts).toLocaleString('tr-TR');
  const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===l.cari_id):null;
  const turAd=(LOG_TUR_ADLARI[l.belge_turu]||l.belge_turu)+(l.alt_tur?` (${(typeof TRF_TIP_ADLARI!=='undefined'&&TRF_TIP_ADLARI[l.alt_tur])||({alis:'Alış',satis:'Satış',iade:'İade',manuel:'Manuel',donem_devri:'Dönem Devri',alici_tahsilat:'Alıcı Tahsilatı',diger_giris:'Diğer Giriş',satici_odeme:'Satıcı Ödemesi',diger_cikis:'Diğer Çıkış'}[l.alt_tur])||l.alt_tur})`:'');
  const d=(l.degisiklikler||[]);
  return `<div style="border:1px solid var(--krem2);border-radius:8px;padding:10px 12px;margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;gap:8px;flex-wrap:wrap">
      <span><strong>${_logEsc(l.kullanici||'?')}</strong> · <span style="font-weight:600;color:${LOG_ISLEM_RENK[l.islem]||'inherit'}">${LOG_ISLEM_ADLARI[l.islem]||l.islem}</span></span>
      <span style="color:var(--yazi3)">${tarihSaat}</span>
    </div>
    <div style="font-size:11px;color:var(--yazi2);margin-top:4px">${detayliBaslik?_logEsc(turAd)+' · ':''}No: ${_logEsc(l.belge_no||'—')} · Belge tarihi: ${_logEsc(l.belge_tarihi||'—')}${cari?' · '+_logEsc(cari.ad):''}${l.tutar!=null?' · Tutar: '+para(l.tutar):''}</div>
    ${d.length?`<ul style="margin:6px 0 0 16px;padding:0;font-size:12px;line-height:1.55">${d.map(x=>`<li>${_logEsc(x)}</li>`).join('')}</ul>`:''}
  </div>`;
}
// Bir belgenin (veya bağlı çıkış fişlerinin) tüm işlem geçmişi
window.belgeLogGoster=async function(belgeTuru,id,baslik){
  if(!id){bil('Önce listeden bir kayıt seçin','err');return;}
  document.getElementById('bl-title').textContent=baslik||'Belge Logu';
  const el=document.getElementById('bl-icerik');
  el.innerHTML='<div class="bos">Yükleniyor...</div>';
  modalAc('modal-belge-log');
  const {data,error}=await sb.from('belge_loglari').select('*')
    .or(`belge_id.eq.${id},irsaliye_id.eq.${id},fatura_id.eq.${id}`).order('ts',{ascending:true});
  if(error){el.innerHTML='<div class="bos">Loglar okunamadı: '+_logEsc(error.message)+'</div>';return;}
  el.innerHTML=(data&&data.length)?data.map(l=>_logKartHtml(l,true)).join(''):'<div class="bos">Bu kayda ait log bulunamadı. (Log kaydı tutulmaya başlamadan önceki işlemler listelenmez.)</div>';
};

// ===== KULLANICI LOG EKRANI (yönetici) =====
let _logLimit=200;
window.renderLogEkrani=async function(sifirla){
  if(sifirla===true)_logLimit=200;
  const tb=document.getElementById('lg-tb');if(!tb)return;
  // Kullanıcı filtre listesi (bir kez doldurulur)
  const kulEl=document.getElementById('lg-kullanici');
  if(kulEl&&kulEl.options.length<=1){
    const adlar=[...new Set((typeof kullanicilar!=='undefined'?kullanicilar:[]).map(k=>`${k.ad||''}${k.soyad?' '+k.soyad:''}`.trim()).filter(Boolean))].sort();
    kulEl.innerHTML='<option value="">Tüm kullanıcılar</option>'+adlar.map(a=>`<option value="${_logEsc(a)}">${_logEsc(a)}</option>`).join('');
  }
  const v=id=>document.getElementById(id)?.value||'';
  let q=sb.from('belge_loglari').select('*').order('ts',{ascending:false}).limit(_logLimit);
  if(aktifIsyeri?.id)q=q.eq('isyeri_id',aktifIsyeri.id);
  if(v('lg-kullanici'))q=q.eq('kullanici',v('lg-kullanici'));
  if(v('lg-islem'))q=q.eq('islem',v('lg-islem'));
  if(v('lg-tur'))q=q.eq('belge_turu',v('lg-tur'));
  if(v('lg-bas'))q=q.gte('ts',new Date(v('lg-bas')+'T00:00:00').toISOString());
  if(v('lg-bit'))q=q.lte('ts',new Date(v('lg-bit')+'T23:59:59.999').toISOString());
  if(v('lg-no').trim())q=q.ilike('belge_no','%'+v('lg-no').trim()+'%');
  tb.innerHTML='<tr><td colspan="8" class="bos">Yükleniyor...</td></tr>';
  const {data,error}=await q;
  if(error){tb.innerHTML=`<tr><td colspan="8" class="bos">Loglar okunamadı: ${_logEsc(error.message)}</td></tr>`;return;}
  window._logSonListe=data||[];
  const oz=document.getElementById('lg-ozet');
  if(oz)oz.textContent=`${_logSonListe.length} kayıt${_logSonListe.length>=_logLimit?' (daha fazlası olabilir)':''}`;
  tb.innerHTML=_logSonListe.map((l,i)=>{
    const turAd=(LOG_TUR_ADLARI[l.belge_turu]||l.belge_turu)+(l.alt_tur?` · ${(typeof TRF_TIP_ADLARI!=='undefined'&&TRF_TIP_ADLARI[l.alt_tur])||({alis:'Alış',satis:'Satış',iade:'İade',manuel:'Manuel',donem_devri:'Dönem Devri',alici_tahsilat:'Alıcı Tahsilatı',diger_giris:'Diğer Giriş',satici_odeme:'Satıcı Ödemesi',diger_cikis:'Diğer Çıkış'}[l.alt_tur])||l.alt_tur}`:'');
    const ozet=(l.degisiklikler||[]);
    return `<tr>
      <td style="font-size:11px;white-space:nowrap">${new Date(l.ts).toLocaleString('tr-TR')}</td>
      <td style="font-size:12px">${_logEsc(l.kullanici||'?')}</td>
      <td><span style="font-size:11px;font-weight:600;color:${LOG_ISLEM_RENK[l.islem]||'inherit'}">${LOG_ISLEM_ADLARI[l.islem]||l.islem}</span></td>
      <td style="font-size:12px">${_logEsc(turAd)}</td>
      <td style="font-size:12px">${_logEsc(l.belge_no||'—')}</td>
      <td style="font-size:12px">${_logEsc(l.belge_tarihi||'—')}</td>
      <td style="font-size:11px;color:var(--yazi2);max-width:320px">${_logEsc(ozet[0]||'')}${ozet.length>1?` <span style="color:var(--yazi3)">(+${ozet.length-1} değişiklik)</span>`:''}</td>
      <td><button class="btn sm" onclick="logDetayAc(${i})">Detay</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="8" class="bos">Kayıt bulunamadı</td></tr>';
  const daha=document.getElementById('lg-daha');
  if(daha)daha.innerHTML=_logSonListe.length>=_logLimit?`<button class="btn sm sec" onclick="_logLimit+=200;renderLogEkrani()">Daha fazla yükle</button>`:'';
};
window.logDetayAc=function(i){
  const l=(window._logSonListe||[])[i];if(!l)return;
  document.getElementById('bl-title').textContent='Log Detayı';
  document.getElementById('bl-icerik').innerHTML=_logKartHtml(l,true);
  modalAc('modal-belge-log');
};
window.logFiltreTemizle=function(){
  ['lg-kullanici','lg-islem','lg-tur','lg-bas','lg-bit','lg-no'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  renderLogEkrani(true);
};
