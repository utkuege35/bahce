// ===== İŞLEM EKRANLARI: ÜST ÖZET LİSTE + ALT DETAY =====
// Faturalar, İrsaliyeler, Kasa, Stok İşlemleri ve İşçilik listelerinde bir özet satıra tıklayınca
// kaydın detay satırları ekranın alt bölümünde görünür (İşlem Listesi raporundaki gibi).
(function(){
  const LISTE_ID=/^(fat|irs|ki|kt|dvr|trf|sc|sy|ur|isc)(-[a-z]+)?-liste-tb$/;
  const esc=s=>typeof _logEsc==='function'?_logEsc(s):String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tl=v=>{const n=parseFloat(v);return isNaN(n)?'':(typeof para==='function'?para(n):n.toLocaleString('tr-TR',{minimumFractionDigits:2}));};
  const sayi=v=>{const n=parseFloat(v);return isNaN(n)||!n?'':n.toLocaleString('tr-TR',{maximumFractionDigits:4});};
  const BOS='<div style="padding:1.5rem;text-align:center;color:var(--yazi3);font-size:13px">Detayını görmek için yukarıdaki listeden bir kayda tıklayın</div>';
  const th=(a,sag)=>`<th style="padding:5px 10px;${sag?'text-align:right':''}">${a}</th>`;
  const td=(a,sag,ek)=>`<td style="padding:5px 10px;font-size:12px;white-space:nowrap;${sag?'text-align:right;':''}${ek||''}">${a}</td>`;
  function ad(k){
    const st=typeof stoklar!=='undefined'?stoklar.find(x=>x.id===k.stok_id):null;
    const ur=typeof urunler!=='undefined'?urunler.find(x=>x.id===k.urun_id):null;
    const gk=typeof giderKalemleri!=='undefined'?giderKalemleri.find(x=>x.id===k.gider_kalem_id):null;
    return (st&&st.ad)||(ur&&ur.ad)||(gk&&gk.ad)||k.kalem_ad||k.aciklama||'—';
  }
  const birim=id=>id&&typeof birimAd==='function'?(birimAd(id)||''):'';
  function tablo(basliklar,satirlar,bosYazi){
    return `<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--krem2);font-size:10px;color:var(--yazi3)">${basliklar.join('')}</tr></thead><tbody>${satirlar.join('')||`<tr><td colspan="${basliklar.length}" class="bos">${bosYazi||'Satır yok'}</td></tr>`}</tbody></table>`;
  }
  function bilgi(parcalar){
    const p=parcalar.filter(Boolean);
    return p.length?`<div style="padding:8px 12px;font-size:12px;color:var(--yazi2);display:flex;gap:18px;flex-wrap:wrap;border-bottom:1px solid var(--border);background:var(--krem)">${p.join('')}</div>`:'';
  }
  const kv=(k,v)=>v?`<span>${k}: <b>${esc(v)}</b></span>`:'';
  const cariAd=id=>{const c=typeof cariListesi!=='undefined'?cariListesi.find(x=>x.id===id):null;return c?c.ad:'';};
  const kasaAd=id=>{const k=typeof kasalar_list!=='undefined'?kasalar_list.find(x=>x.id===id):null;return k?k.ad:'';};

  async function belgeKalemleri(tablo_,kalemTablo,alan,id,baslik){
    const [{data:h},{data:kl}]=await Promise.all([
      sb.from(tablo_).select('*').eq('id',id).maybeSingle(),
      sb.from(kalemTablo).select('*').eq(alan,id).order('sira')]);
    const rows=(kl||[]).map((k,i)=>`<tr style="border-bottom:1px solid var(--krem2)">${td(i+1,false,'color:var(--yazi3)')}${td(esc(ad(k)))}${td(esc(birim(k.birim_id)))}${td(sayi(k.miktar),true)}${td(tl(k.fiyat),true)}${td(tl(k.tutar),true)}${td(k.kdv_orani!=null&&k.kdv_orani!==''?'%'+k.kdv_orani:'',true)}${td(tl(k.kdv_tutar),true)}${td(tl(k.kdv_dahil_tutar),true,'font-weight:500')}${td(esc(k.aciklama||''))}</tr>`);
    const no=h?(h.fatura_no||h.irsaliye_no):'';
    return bilgi([kv(baslik+' No',no),kv('Cari',cariAd(h?.cari_id)),kv('Açıklama',h?.aciklama),kv('Ödeme',h?.odeme_tipi==='cari'?'Cari':h?.odeme_tipi==='pesin'?'Peşin':''),kv('Kasa',kasaAd(h?.kasa_id)),kv('Kaydeden',h?.kullanici),
        h?`<span style="margin-left:auto">Toplam: <b>${tl(h.toplam)}</b> · KDV: <b>${tl(h.kdv_toplam)}</b> · Genel: <b>${tl(h.genel_toplam)}</b></span>`:''])
      +tablo([th('#'),th('Malzeme / Hizmet'),th('Birim'),th('Miktar',1),th('Fiyat',1),th('Tutar',1),th('KDV %',1),th('KDV',1),th('KDV Dahil',1),th('Açıklama')],rows,'Kalem yok');
  }
  async function islemSatirlari(id){
    const {data}=await sb.from('islemler').select('*').or(`belge_id.eq.${id},id.eq.${id}`).or('silindi.is.null,silindi.eq.false').order('ts').order('id');
    const l=data||[];
    const kasali=l.some(x=>x.kasa_id);
    const rows=l.map((k,i)=>`<tr style="border-bottom:1px solid var(--krem2)">${td(i+1,false,'color:var(--yazi3)')}${td(esc(ad(k)))}${kasali?td(esc(kasaAd(k.kasa_id))):''}${td(esc(birim(k.birim_id)))}${td(sayi(k.miktar),true)}${td(tl(k.fiyat),true)}${td(tl(k.tutar),true,'font-weight:500')}${td(esc(k.satir_not||k.aciklama||''))}</tr>`);
    const f=l[0]||{};
    return bilgi([kv('Belge No',f.belge_no),kv('Cari',cariAd(f.cari_id)),kv('Kaydeden',f.kullanici),`<span style="margin-left:auto">${l.length} satır</span>`])
      +tablo([th('#'),th('Malzeme / Açıklama'),kasali?th('Kasa'):'',th('Birim'),th('Miktar',1),th('Fiyat',1),th('Tutar',1),th('Not')],rows);
  }
  async function isciSatirlari(id){
    const {data}=await sb.from('isci_belge_satirlari').select('*').eq('belge_id',id).order('sira');
    const rows=(data||[]).map((k,i)=>`<tr style="border-bottom:1px solid var(--krem2)">${td(i+1,false,'color:var(--yazi3)')}${td(esc(k.kisi_ad||''))}${td(esc(k.kalem_ad||''))}${td(sayi(k.adet),true)}${td(k.sure!=null&&k.sure!==''?sayi(k.sure)+' '+(k.birim==='gun'?'gün':'saat'):'')}${td(tl(k.birim_fiyat),true)}${td(tl(k.tutar),true,'font-weight:500')}${td(esc(k.aciklama||''))}</tr>`);
    return tablo([th('#'),th('Kişi'),th('Kalem'),th('Kişi sayısı',1),th('Süre'),th('Birim Fiyat',1),th('Tutar',1),th('Açıklama')],rows);
  }
  function kasaFisi(tbId,id){
    const tur=tbId.indexOf('tediye')>-1?'tediye':'tahsil';
    const l=(typeof _kiListe!=='undefined'?_kiListe[tur]:[])||[];
    const r=l.find(x=>(x.belge_id||x.id)===id);if(!r)return BOS;
    const ALT={alici_tahsilat:'Alıcı Tahsilatı',diger_giris:'Diğer Giriş',satici_odeme:'Satıcı Ödemesi',diger_cikis:'Diğer Çıkış'};
    return bilgi([kv('Tür',ALT[r.alt_tur]||'Kasa fişi'),kv('Tarih',r.tarih),kv('Kasa',kasaAd(r.kasa_id)),kv('Cari',cariAd(r.cari_id)),kv('Belge No',r.belge_no),kv('Kaydeden',r.kullanici),
      `<span style="margin-left:auto">Tutar: <b>${tl(Math.abs(parseFloat(r.kasa_etkisi)||0))}</b></span>`])
      +`<div style="padding:12px;font-size:13px;color:var(--yazi)"><div style="font-size:11px;color:var(--yazi3);margin-bottom:3px">AÇIKLAMA</div>${esc(r.aciklama||'—')}</div>`;
  }
  let token=0;
  async function goster(tb,id){
    const pane=document.querySelector(`.alt-detay[data-for="${tb.id}"]`);if(!pane)return;
    const my=++token;
    pane.innerHTML='<div style="padding:1.5rem;text-align:center;color:var(--yazi3)">Yükleniyor...</div>';
    let h;
    try{
      const p=tb.id.split('-')[0];
      if(p==='fat')h=await belgeKalemleri('faturalar','fatura_kalemleri','fatura_id',id,'Fatura');
      else if(p==='irs')h=await belgeKalemleri('irsaliyeler','irsaliye_kalemleri','irsaliye_id',id,'İrsaliye');
      else if(p==='isc')h=await isciSatirlari(id);
      else if(p==='ki')h=kasaFisi(tb.id,id);
      else h=await islemSatirlari(id);
    }catch(e){h=`<div class="bos">Detay okunamadı: ${esc(e.message)}</div>`;}
    if(my===token)pane.innerHTML=h;
  }
  function hazirla(tb){
    if(tb.classList.contains('alt-ust'))return;
    tb.classList.add('alt-ust');
    tb.insertAdjacentHTML('afterend',`<div class="alt-ayirici"></div><div class="alt-detay" data-for="${tb.id}">${BOS}</div>`);
    new MutationObserver(()=>{const p=document.querySelector(`.alt-detay[data-for="${tb.id}"]`);if(p){token++;p.innerHTML=BOS;}}).observe(tb,{childList:true});
  }
  function tara(){document.querySelectorAll('[id$="-liste-tb"]').forEach(el=>{if(LISTE_ID.test(el.id))hazirla(el);});}
  document.addEventListener('click',e=>{
    const tr=e.target.closest&&e.target.closest('tr[data-id]');if(!tr)return;
    const tb=tr.closest('.alt-ust');if(!tb)return;
    goster(tb,tr.dataset.id);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tara);else tara();
})();
