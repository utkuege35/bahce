// ===== ÜRÜN TEKLİFLERİ (aşçıdan şifresiz link üzerinden gelen öneriler) =====
let _teklifListesi=[];
let _teklifAcikId=null;
// Her teklif için çözüm durumu: { [teklifId]: { anaGrupId, altGrupId,
//   bilesenler: { [bilesenId]: { mod:'mevcut'|'yeni_kart', kaynakTuru, kaynakId, yeniGrupId } } } }
let _utCozum={};

async function teklifleriYukle(){
  const durum=document.getElementById('ut-durum-filtre')?.value||'bekliyor';
  let q=sb.from('urun_teklifleri').select('*').order('olusturma_ts',{ascending:false});
  if(durum!=='hepsi')q=q.eq('durum',durum);
  const {data:teklifler}=await q;
  if(!teklifler){_teklifListesi=[];return;}
  const ids=teklifler.map(t=>t.id);
  let bilesenler=[];
  if(ids.length){
    const {data}=await sb.from('urun_teklif_bilesenleri').select('*').in('teklif_id',ids).order('sira');
    bilesenler=data||[];
  }
  _teklifListesi=teklifler.map(t=>({...t,bilesenler:bilesenler.filter(b=>b.teklif_id===t.id)}));
}

window.renderUrunTeklifleri=async function(){
  const el=document.getElementById('ut-liste');if(!el)return;
  el.innerHTML='<div class="bos">Yükleniyor...</div>';
  await teklifleriYukle();
  if(!_teklifListesi.length){el.innerHTML='<div class="bos">Bu filtrede teklif yok.</div>';return;}
  el.innerHTML=_teklifListesi.map(t=>teklifKartHtml(t)).join('');
};

function teklifKartHtml(t){
  const acik=_teklifAcikId===t.id;
  const isyeriAd=(typeof isyerleri!=='undefined'?isyerleri.find(i=>i.id===t.isyeri_id):null)?.ad||'';
  const tipAd=t.tip==='ara_urun'?'Yarı Mamul':'Ürün';
  const durumRenk=t.durum==='bekliyor'?'var(--turuncu)':t.durum==='onaylandı'?'var(--yesil)':'var(--yazi3)';
  const tarihStr=t.olusturma_ts?new Date(t.olusturma_ts).toLocaleString('tr-TR'):'';
  return `<div class="card" style="margin-bottom:.75rem">
    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="teklifAc('${t.id}')">
      <div>
        <span class="badge ${t.tip==='ara_urun'?'m':'u'}">${tipAd}</span>
        <strong style="margin-left:6px">${t.urun_adi}</strong>
        <span style="font-size:11px;color:var(--yazi3);margin-left:8px">${isyeriAd} · ${t.olusturan_ad||'?'} · ${tarihStr}</span>
      </div>
      <span style="font-size:11px;font-weight:600;color:${durumRenk}">${t.durum}</span>
    </div>
    ${acik?teklifDetayHtml(t):''}
  </div>`;
}

window.teklifAc=function(id){
  _teklifAcikId=_teklifAcikId===id?null:id;
  if(_teklifAcikId&&!_utCozum[_teklifAcikId])_utCozum[_teklifAcikId]={anaGrupId:'',altGrupId:'',birimId:'',bilesenler:{}};
  renderUrunTeklifleriYerinde();
};
function renderUrunTeklifleriYerinde(){
  const el=document.getElementById('ut-liste');if(!el)return;
  el.innerHTML=_teklifListesi.map(t=>teklifKartHtml(t)).join('');
}

function teklifDetayHtml(t){
  const cozum=_utCozum[t.id]||{anaGrupId:'',altGrupId:'',bilesenler:{}};
  const kok=t.tip==='ara_urun'?urunler.filter(u=>u.tip==='grup'&&u.agac_tip==='ara_urun'&&!u.ust_id):urunler.filter(u=>u.tip==='grup'&&u.agac_tip==='urun'&&!u.ust_id);
  const grupSecimi=`<div class="fgrid ${t.tip==='ara_urun'?'c2':'c3'}" style="margin:.75rem 0">
    <div class="fg"><label>Ana Grup</label><select onchange="teklifGrupSecimiGuncelle('${t.id}','ana',this.value)">
      <option value="">Seçin...</option>${kok.map(g=>`<option value="${g.id}"${g.id===cozum.anaGrupId?' selected':''}>${g.ad}</option>`).join('')}
    </select></div>
    ${t.tip!=='ara_urun'?`<div class="fg"><label>Alt Grup</label><select onchange="teklifGrupSecimiGuncelle('${t.id}','alt',this.value)">
      <option value="">Seçin...</option>${cozum.anaGrupId?urunler.filter(g=>g.tip==='grup'&&g.ust_id===cozum.anaGrupId).map(g=>`<option value="${g.id}"${g.id===cozum.altGrupId?' selected':''}>${g.ad}</option>`).join(''):''}
    </select></div>`:''}
    <div class="fg"><label>${t.urun_adi} Birimi</label><select onchange="teklifBirimSecimiGuncelle('${t.id}',this.value)">
      <option value="">Seçin...</option>${birimler.filter(b=>b.temel!==false).map(b=>`<option value="${b.id}"${b.id===cozum.birimId?' selected':''}>${b.kisaltma}</option>`).join('')}
    </select></div>
  </div>`;

  const bilesenSatirlari=t.bilesenler.map(b=>teklifBilesenHtml(t,b,cozum)).join('');

  const hepsiCozuldu=t.bilesenler.every(b=>{
    if(b.kaynak_turu!=='yeni')return true;
    const c=cozum.bilesenler[b.id];
    return c&&((c.mod==='mevcut'&&c.kaynakId)||(c.mod==='yeni_kart'&&c.yeniGrupId));
  });
  const grupTamam=(t.tip==='ara_urun'?!!cozum.anaGrupId:!!(cozum.anaGrupId&&cozum.altGrupId))&&!!cozum.birimId;

  return `<div style="border-top:1px solid var(--border);margin-top:.75rem;padding-top:.75rem">
    ${t.not_?`<div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">📝 ${t.not_}</div>`:''}
    ${t.durum==='bekliyor'?grupSecimi:''}
    <table style="font-size:12px;width:100%"><thead><tr>
      <th style="text-align:left">Malzeme</th><th style="text-align:right">Miktar</th><th>Birim</th><th></th>
    </tr></thead><tbody>${bilesenSatirlari}</tbody></table>
    ${t.durum==='bekliyor'?`<div style="display:flex;gap:8px;margin-top:.75rem">
      <button class="btn pri sm" ${(hepsiCozuldu&&grupTamam)?'':'disabled style="opacity:.5"'} onclick="teklifIceriAktar('${t.id}')">✓ İçeri Aktar</button>
      <button class="btn ghost sm" onclick="teklifReddet('${t.id}')">✕ Reddet</button>
    </div>`:''}
  </div>`;
}

function teklifBilesenHtml(t,b,cozum){
  const birim=birimler.find(x=>x.id===b.birim_id);
  if(b.kaynak_turu!=='yeni'){
    const kalem=b.kaynak_turu==='stok'?stoklar.find(s=>s.id===b.kaynak_id):urunler.find(u=>u.id===b.kaynak_id);
    return `<tr>
      <td>${kalem?kalem.ad:'(bulunamadı)'} <span style="font-size:9px;color:var(--yazi3)">[${b.kaynak_turu==='stok'?'Hammadde':'Yarı Mamul'}]</span></td>
      <td style="text-align:right">${parseFloat(b.miktar).toLocaleString('tr-TR',{maximumFractionDigits:3})}</td>
      <td>${birim?.kisaltma||''}</td><td></td>
    </tr>`;
  }
  const c=cozum.bilesenler[b.id]||{mod:'mevcut',kaynakTuru:'',kaynakId:'',yeniGrupId:''};
  const grup3ler=stoklar.filter(g=>g.tip==='grup'&&(g.seviye||1)===3);
  return `<tr style="background:var(--turuncu-cok-ac)">
    <td colspan="4" style="padding:8px 4px">
      <div style="font-size:11px;font-weight:600;color:var(--turuncu);margin-bottom:4px">🆕 YENİ: "${b.yeni_ad}" — ${parseFloat(b.miktar).toLocaleString('tr-TR',{maximumFractionDigits:3})} ${birim?.kisaltma||''}</div>
      <div class="toggle-row" style="display:flex;gap:6px;margin-bottom:6px">
        <button class="btn sm ${c.mod==='mevcut'?'pri':'sec'}" onclick="teklifBilesenModDegis('${t.id}','${b.id}','mevcut')">Mevcut kartla eşleştir</button>
        <button class="btn sm ${c.mod==='yeni_kart'?'pri':'sec'}" onclick="teklifBilesenModDegis('${t.id}','${b.id}','yeni_kart')">Yeni kart oluştur</button>
      </div>
      ${c.mod==='mevcut'?`
        <input type="text" list="ut-hammadde-dl-${b.id}" placeholder="Yazarak arayın..." oninput="teklifBilesenAramaInput('${t.id}','${b.id}',this.value)" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
        <datalist id="ut-hammadde-dl-${b.id}">${stoklar.filter(s=>s.tip==='stok'&&s.aktif!==false).map(s=>`<option value="[${s.kod}] ${s.ad}">`).join('')}${urunler.filter(u=>u.tip==='ara_urun'&&u.aktif!==false).map(u=>`<option value="[${u.kod}] ${u.ad}">`).join('')}</datalist>
        ${c.kaynakId?`<div style="font-size:10px;color:var(--yesil);margin-top:3px">✓ Eşleşti</div>`:''}
      `:`
        <select onchange="teklifBilesenYeniGrup('${t.id}','${b.id}',this.value)" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--beyaz)">
          <option value="">Bu yeni stok hangi grubun altına açılsın?</option>
          ${grup3ler.map(g=>{
            const g2=stoklar.find(x=>x.id===g.ust_id);const g1=g2?stoklar.find(x=>x.id===g2.ust_id):null;
            return `<option value="${g.id}"${g.id===c.yeniGrupId?' selected':''}>${g1?.ad||''} / ${g2?.ad||''} / ${g.ad}</option>`;
          }).join('')}
        </select>
      `}
    </td>
  </tr>`;
}

window.teklifGrupSecimiGuncelle=function(teklifId,seviye,grupId){
  const c=_utCozum[teklifId];
  if(seviye==='ana'){c.anaGrupId=grupId;c.altGrupId='';}
  else c.altGrupId=grupId;
  renderUrunTeklifleriYerinde();
};
window.teklifBirimSecimiGuncelle=function(teklifId,birimId){
  _utCozum[teklifId].birimId=birimId;
};
window.teklifBilesenModDegis=function(teklifId,bilesenId,mod){
  const c=_utCozum[teklifId];
  c.bilesenler[bilesenId]={mod,kaynakTuru:'',kaynakId:'',yeniGrupId:''};
  renderUrunTeklifleriYerinde();
};
window.teklifBilesenAramaInput=function(teklifId,bilesenId,val){
  const s=stoklar.find(x=>`[${x.kod}] ${x.ad}`===val&&x.tip==='stok');
  const u=!s?urunler.find(x=>`[${x.kod}] ${x.ad}`===val&&x.tip==='ara_urun'):null;
  const eslesen=s||u;
  if(!eslesen)return;
  const c=_utCozum[teklifId];
  c.bilesenler[bilesenId]={mod:'mevcut',kaynakTuru:s?'stok':'ara_urun',kaynakId:eslesen.id,yeniGrupId:''};
};
window.teklifBilesenYeniGrup=function(teklifId,bilesenId,grupId){
  const c=_utCozum[teklifId];
  c.bilesenler[bilesenId]={mod:'yeni_kart',kaynakTuru:'',kaynakId:'',yeniGrupId:grupId};
};

window.teklifReddet=async function(teklifId){
  await sb.from('urun_teklifleri').update({durum:'reddedildi',onaylayan:aktifKullanici?.ad||'',onay_ts:Date.now()}).eq('id',teklifId);
  bil('Teklif reddedildi');
  renderUrunTeklifleri();
};

window.teklifIceriAktar=async function(teklifId){
  const t=_teklifListesi.find(x=>x.id===teklifId);
  const cozum=_utCozum[teklifId];
  if(!t||!cozum)return;
  const isyeriId=t.isyeri_id;

  // Mükerrer isim kontrolü (aynı seviyede)
  const hedefUstId=t.tip==='ara_urun'?cozum.anaGrupId:cozum.altGrupId;
  const hedefUst=urunler.find(u=>u.id===hedefUstId);
  const dup=urunler.find(u=>u.tip===t.tip&&(u.isyeri_id||null)===isyeriId&&(u.seviye||1)===((hedefUst?.seviye||1)+1)&&u.ad.trim().toLowerCase()===t.urun_adi.trim().toLowerCase());
  if(dup){bil('Bu isimde zaten bir ürün/YM kartı var! Önce onu kontrol edin.','err');return;}

  // 1) Çözülmemiş "yeni_kart" bileşenler için önce stok kartlarını oluştur
  const yeniStoklar={};
  for(const b of t.bilesenler){
    if(b.kaynak_turu!=='yeni')continue;
    const c=cozum.bilesenler[b.id];
    if(c.mod==='yeni_kart'){
      const grup=stoklar.find(g=>g.id===c.yeniGrupId);
      const kod=kodOlusturStok(c.yeniGrupId,'stok');
      const yeniKart={id:uid(),ad:b.yeni_ad,kod,tip:'stok',ust_id:c.yeniGrupId,seviye:4,isyeri_id:isyeriId,birim_id:b.birim_id,baslangic:0,min_stok:0,maliyet:0,aciklama:`"${t.urun_adi}" teklifinden otomatik açıldı`,aktif:true};
      stoklar.push(yeniKart);
      await sb.from('stoklar').insert(yeniKart);
      yeniStoklar[b.id]=yeniKart.id;
    }
  }

  // 2) Yeni ürün/YM kartını oluştur
  const yeniUrun={id:uid(),ad:t.urun_adi,kod:kodOlusturHiyerarsik(urunler,hedefUstId,t.tip,t.tip),tip:t.tip,ust_id:hedefUstId,seviye:(hedefUst?.seviye||1)+1,isyeri_id:isyeriId,agac_tip:t.tip,birim_id:cozum.birimId,aktif:true};
  urunler.push(yeniUrun);
  await sb.from('urunler').insert(yeniUrun);

  // 3) Reçete bileşenlerini oluştur
  const bilesenKayitlari=[];
  t.bilesenler.forEach((b,i)=>{
    let kaynakTuru=b.kaynak_turu,kaynakId=b.kaynak_id;
    if(b.kaynak_turu==='yeni'){
      const c=cozum.bilesenler[b.id];
      if(c.mod==='mevcut'){kaynakTuru=c.kaynakTuru;kaynakId=c.kaynakId;}
      else{kaynakTuru='stok';kaynakId=yeniStoklar[b.id];}
    }
    bilesenKayitlari.push({id:uid(),urun_id:yeniUrun.id,kaynak_tip:kaynakTuru,kaynak_id:kaynakId,miktar:b.miktar,birim_id:b.birim_id,fiyat:0,sira:i});
  });
  await sb.from('urun_bilesenleri').insert(bilesenKayitlari);
  urunBilesenleri.push(...bilesenKayitlari);

  // 4) Teklifi onaylandı olarak işaretle
  await sb.from('urun_teklifleri').update({durum:'onaylandı',onaylayan:aktifKullanici?.ad||'',onay_ts:Date.now()}).eq('id',teklifId);

  bil(`✓ "${t.urun_adi}" sisteme eklendi (${bilesenKayitlari.length} bileşenle)`);
  delete _utCozum[teklifId];
  _teklifAcikId=null;
  if(typeof renderStoklar==='function')renderStoklar();
  if(typeof renderUrunler==='function')renderUrunler();
  renderUrunTeklifleri();
};
