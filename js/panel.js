// ===== PANEL =====
window.idHesapla=function(kaynak){
  const mik=parseFloat(document.getElementById('id-miktar').value)||0;
  const fiy=parseFloat(document.getElementById('id-fiyat').value)||0;
  const tut=parseFloat(document.getElementById('id-tutar').value)||0;
  if(kaynak==='miktar'||kaynak==='fiyat'){
    if(mik>0&&fiy>0)document.getElementById('id-tutar').value=(mik*fiy).toFixed(2);
  }else if(kaynak==='tutar'){
    if(mik>0&&tut>0)document.getElementById('id-fiyat').value=(tut/mik).toFixed(2);
    else if(fiy>0&&tut>0)document.getElementById('id-miktar').value=(tut/fiy).toFixed(4);
  }
};
function renderPanel(){
  const gun=bugun();const gv=islemler.filter(i=>i.tarih===gun);
  const gelirB=gv.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const giderB=gv.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const ay=gun.substring(0,7);const av=islemler.filter(i=>i.tarih?.startsWith(ay));
  const gelirA=av.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const giderA=av.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  document.getElementById('panel-met').innerHTML=`
    <div class="met"><div class="ml">Bugün gelir</div><div class="mv g">${para(gelirB)}</div></div>
    <div class="met"><div class="ml">Bugün gider</div><div class="mv d">${para(giderB)}</div></div>
    <div class="met"><div class="ml">Bu ay gelir</div><div class="mv g">${para(gelirA)}</div></div>
    <div class="met"><div class="ml">Bu ay net</div><div class="mv ${gelirA-giderA>=0?'k':'z'}">${para(gelirA-giderA)}</div></div>`;
  const rows=islemler.slice(0,20).map(i=>`<tr>
    <td>${i.tarih||''}</td>
    <td><span class="badge ${i.tur==='satis'?'g':['gider','giris'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${{satis:'Satış',gider:'Gider',giris:'Giriş',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat'}[i.tur]||i.tur}</span></td>
    <td style="font-size:11px">${i.aciklama||i.kat||''}</td>
    <td style="font-weight:500;color:${i.tur==='satis'?'var(--yesil)':['gider','giris'].includes(i.tur)?'var(--turuncu)':'var(--yazi2)'}">${i.tutar?para(i.tutar):''}</td>
    <td style="font-size:11px;color:var(--yazi3)">${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+birimAd(i.birim_id):''}</td>
  </tr>`).join('');
  document.getElementById('son-tb').innerHTML=rows||'<tr><td colspan="5" class="bos">Henüz işlem yok</td></tr>';
}

// ===== İŞLEM GEÇMİŞİ =====
const ALAN_ADLARI={tarih:'Tarih',miktar:'Miktar',fiyat:'Birim Fiyat',tutar:'Tutar',satir_not:'Satır Notu',aciklama_not:'Genel Not'};

function islemGecmisHtml(id){
  const islem=islemler.find(x=>x.id===id);
  if(!islem)return '';
  const loglar=islemLoglari.filter(l=>l.islem_id===id).sort((a,b)=>a.tarih>b.tarih?1:-1);
  let html=`
    <div style="position:relative;padding-left:20px">
      <!-- Oluşturma kaydı -->
      <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start">
        <div style="position:absolute;left:0;width:10px;height:10px;border-radius:50%;background:var(--yesil);margin-top:3px;flex-shrink:0"></div>
        <div style="background:var(--yesil-cok-ac);border:1px solid var(--yesil-ac);border-radius:8px;padding:8px 12px;width:100%">
          <div style="font-size:12px;font-weight:600;color:var(--yesil)">✦ Kayıt Oluşturuldu</div>
          <div style="font-size:11px;color:var(--yazi2);margin-top:3px">
            <strong>${islem.kullanici||'Bilinmiyor'}</strong> tarafından oluşturuldu
          </div>
          <div style="font-size:10px;color:var(--yazi3);margin-top:2px">
            ${islem.tarih||''} · Tutar: ${islem.tutar?para(islem.tutar):'—'} · Miktar: ${islem.miktar?parseFloat(islem.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+birimAd(islem.birim_id):'—'}
          </div>
        </div>
      </div>`;

  // Değişiklik logları
  loglar.forEach((l,idx)=>{
    const eski=l.eski_deger||{};const yeni=l.yeni_deger||{};
    const degisikler=Object.keys(yeni).filter(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
    if(!degisikler.length)return;
    html+=`
      <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start">
        <div style="position:absolute;left:0;width:10px;height:10px;border-radius:50%;background:var(--sari);margin-top:3px;flex-shrink:0"></div>
        <div style="background:var(--sari-ac);border:1px solid #ffd60a55;border-radius:8px;padding:8px 12px;width:100%">
          <div style="font-size:12px;font-weight:600;color:var(--sari)">✎ Düzenleme #${idx+1}</div>
          <div style="font-size:11px;color:var(--yazi2);margin-top:3px">
            <strong>${l.degistiren||'Bilinmiyor'}</strong> tarafından değiştirildi
          </div>
          <div style="font-size:10px;color:var(--yazi3);margin-top:2px">${new Date(l.tarih).toLocaleString('tr-TR')}</div>
          <div style="margin-top:6px;display:flex;flex-direction:column;gap:4px">
            ${degisikler.map(k=>`
              <div style="display:flex;align-items:center;gap:6px;font-size:11px">
                <span style="color:var(--yazi3);min-width:80px">${ALAN_ADLARI[k]||k}</span>
                <span style="background:var(--turuncu-cok-ac);color:var(--turuncu);padding:1px 7px;border-radius:4px;text-decoration:line-through">${formatDeger(k,eski[k])}</span>
                <span style="color:var(--yazi3)">→</span>
                <span style="background:var(--yesil-cok-ac);color:var(--yesil);padding:1px 7px;border-radius:4px;font-weight:500">${formatDeger(k,yeni[k])}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  });

  html+='</div>';
  return html;
}

function formatDeger(alan,deger){
  if(deger===null||deger===undefined||deger==='')return '—';
  if(alan==='tutar'||alan==='fiyat')return para(deger);
  return String(deger);
}

window.islemGecmisAc=function(id){
  const islem=islemler.find(x=>x.id===id);if(!islem)return;
  const turAd={giris:'Hammadde Girişi',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',gider:'Gider'}[islem.tur]||islem.tur;
  document.getElementById('ig-title').textContent=`${turAd} — ${islem.tarih}`;
  document.getElementById('ig-icerik').innerHTML=islemGecmisHtml(id);
  modalAc('modal-islem-gecmis');
};

// ===== İŞLEM DÜZENLE / SİL =====
window.islemDuzenleAc=function(id){
  const i=islemler.find(x=>x.id===id);if(!i)return;
  document.getElementById('id-islem-id').value=id;
  const turAd={giris:'Hammadde Girişi',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',gider:'Gider'}[i.tur]||i.tur;
  document.getElementById('id-bilgi').textContent=`${turAd} — ${i.tarih} — ${i.aciklama||''} — Oluşturan: ${i.kullanici||'?'}`;
  document.getElementById('id-tarih').value=i.tarih||'';
  document.getElementById('id-miktar').value=i.miktar||'';
  document.getElementById('id-fiyat').value=i.fiyat||'';
  document.getElementById('id-tutar').value=i.tutar||'';
  document.getElementById('id-satir-not').value=i.satir_not||'';
  document.getElementById('id-not').value=i.aciklama_not||'';
  // Log bölümü
  const loglar=islemLoglari.filter(l=>l.islem_id===id);
  if(loglar.length){
    document.getElementById('id-log-wrap').style.display='block';
    document.getElementById('id-log-liste').innerHTML=loglar.sort((a,b)=>a.tarih>b.tarih?1:-1).map(l=>{
      const eski=l.eski_deger||{};const yeni=l.yeni_deger||{};
      const degisikler=Object.keys(yeni).filter(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
      if(!degisikler.length)return '';
      return `<div style="padding:5px 0;border-bottom:1px solid var(--krem2)">
        <span style="font-size:10px;color:var(--yazi3)">${new Date(l.tarih).toLocaleString('tr-TR')}</span>
        <strong style="font-size:11px"> ${l.degistiren||'?'}</strong>
        <span style="font-size:11px;color:var(--yazi2)"> → ${degisikler.map(k=>`${ALAN_ADLARI[k]||k}: ${formatDeger(k,eski[k])} → ${formatDeger(k,yeni[k])}`).join(', ')}</span>
      </div>`;
    }).join('');
  }else document.getElementById('id-log-wrap').style.display='none';
  modalAc('modal-islem-duzenle');
};

window.islemKaydet=async function(){
  const id=document.getElementById('id-islem-id').value;
  const islem=islemler.find(x=>x.id===id);if(!islem)return;
  const yeni={
    tarih:document.getElementById('id-tarih').value,
    miktar:parseFloat(document.getElementById('id-miktar').value)||null,
    fiyat:parseFloat(document.getElementById('id-fiyat').value)||null,
    tutar:parseFloat(document.getElementById('id-tutar').value)||null,
    satir_not:document.getElementById('id-satir-not').value||null,
    aciklama_not:document.getElementById('id-not').value||null
  };
  const eski={tarih:islem.tarih,miktar:islem.miktar,fiyat:islem.fiyat,tutar:islem.tutar,satir_not:islem.satir_not,aciklama_not:islem.aciklama_not};
  // Değişiklik var mı kontrol et
  const degisti=Object.keys(yeni).some(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
  if(degisti){
    await sb.from('islem_loglari').insert({islem_id:id,degistiren:aktifKullanici?.ad||'',eski_deger:eski,yeni_deger:yeni});
    await sb.from('islemler').update(yeni).eq('id',id);
    const {data:ilog}=await sb.from('islem_loglari').select('*').order('tarih',{ascending:false});if(ilog)islemLoglari=ilog;
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});
  if(data)islemler=data.filter(i=>!i.silindi);
  modalKapat('modal-islem-duzenle');renderPanel();kontolUyari();
  bil(degisti?'İşlem güncellendi ✓':'Değişiklik yok');
};

window.islemSil=async function(id){
  if(!confirm('Bu işlemi silmek istiyor musunuz?\n(Veritabanında kalır, ekranda görünmez.)'))return;
  await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',id);
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});
  if(data)islemler=data.filter(i=>!i.silindi);
  renderPanel();kontolUyari();
  if(document.getElementById('modal-stok-detay').classList.contains('open')){
    const title=document.getElementById('sd-title').textContent;const kod=title.match(/\[([^\]]+)\]/)?.[1];
    const s=stoklar.find(x=>x.kod===kod);if(s)stokDetay(s.id);
  }
  if(document.getElementById('modal-panel-islemler').classList.contains('open'))renderPanelIslemler();
  bil('İşlem silindi ✓');
};

window.renderPanelIslemler=function(){
  const isAdmin=aktifKullanici?.rol==='admin';
  document.getElementById('pi-islem-th').style.display=isAdmin?'':'none';
  const tur=document.getElementById('pi-fil-tur')?.value||'';
  const bas=document.getElementById('pi-fil-bas')?.value||'';
  const bit=document.getElementById('pi-fil-bit')?.value||'';
  let liste=islemler;
  if(tur)liste=liste.filter(i=>i.tur===tur);
  if(bas)liste=liste.filter(i=>i.tarih>=bas);
  if(bit)liste=liste.filter(i=>i.tarih<=bit);
  const rows=liste.map(i=>{
    const logSayisi=islemLoglari.filter(l=>l.islem_id===i.id).length;
    return `<tr>
      <td style="white-space:nowrap">${i.tarih||''}</td>
      <td><span class="badge ${i.tur==='satis'?'g':['gider','giris'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${{satis:'Satış',gider:'Gider',giris:'Giriş',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat'}[i.tur]||i.tur}</span></td>
      <td style="font-size:11px">${i.aciklama||i.kat||''}</td>
      <td style="font-size:11px">${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+birimAd(i.birim_id):''}</td>
      <td style="font-weight:500;color:${i.tur==='satis'?'var(--yesil)':['gider','giris'].includes(i.tur)?'var(--turuncu)':'var(--yazi2)'}">${i.tutar?para(i.tutar):''}</td>
      <td style="font-size:11px;color:var(--yazi3);max-width:120px;overflow:hidden;text-overflow:ellipsis">${i.satir_not||i.aciklama_not||''}</td>
      <td style="font-size:11px;color:var(--yazi3);white-space:nowrap">${i.kullanici||''}</td>
      <td>
        <button class="btn sm" onclick="islemGecmisAc('${i.id}')" title="Geçmiş">
          📋${logSayisi>0?` <span style="background:var(--sari-ac);color:var(--sari);border-radius:10px;padding:0 5px;font-size:10px">${logSayisi}</span>`:''}
        </button>
      </td>
      ${isAdmin?`<td style="white-space:nowrap"><button class="btn sm" onclick="islemDuzenleAc('${i.id}')">✏</button> <button class="btn sm ghost" onclick="islemSil('${i.id}')">✕</button></td>`:'<td></td>'}
    </tr>`;
  }).join('');
  document.getElementById('pi-tb').innerHTML=rows||'<tr><td colspan="9" class="bos">İşlem yok</td></tr>';
};

