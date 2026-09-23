// ===== YENİ ÜRÜN/REÇETE ÖNER (aşçı ekranı — normal girişli kullanıcı) =====
let _utgTip='urun';
let _utgBilesenler=[]; // {id, tip:'stok'|'ara_urun'|'yeni', kaynakId, yeniAd, birimId, miktar}
let _utgSayac=0;
let _utgAnaGrupId='';
let _utgAltGrupId='';

window.utgBaslat=function(){
  _utgTip='urun';_utgBilesenler=[];_utgSayac=0;_utgAnaGrupId='';_utgAltGrupId='';
  document.getElementById('utg-tip-urun')?.classList.add('pri');
  document.getElementById('utg-tip-urun')?.classList.remove('sec');
  document.getElementById('utg-tip-ara_urun')?.classList.add('sec');
  document.getElementById('utg-tip-ara_urun')?.classList.remove('pri');
  document.getElementById('utg-urun-adi').value='';
  document.getElementById('utg-not').value='';
  document.getElementById('utg-hata').style.display='none';
  const btn=document.getElementById('utg-gonder-btn');if(btn){btn.disabled=false;btn.textContent='Gönder';}
  _utgGrupRender();
  utgBilesenEkle();
};
window.utgTipSec=function(t){
  _utgTip=t;
  document.getElementById('utg-tip-urun').classList.toggle('pri',t==='urun');
  document.getElementById('utg-tip-urun').classList.toggle('sec',t!=='urun');
  document.getElementById('utg-tip-ara_urun').classList.toggle('pri',t==='ara_urun');
  document.getElementById('utg-tip-ara_urun').classList.toggle('sec',t!=='ara_urun');
  _utgAnaGrupId='';_utgAltGrupId='';
  _utgGrupRender();
};

// Ana/Alt grup seçimi — opsiyonel: sistemde grup varsa göstermek/seçtirmek
// için, yoksa zaten boş kalır. Seçilmeden de gönderilebilir.
function _utgGrupRender(){
  const el=document.getElementById('utg-grup-alan');if(!el)return;
  const kok=_utgTip==='ara_urun'
    ? urunler.filter(u=>u.tip==='grup'&&u.agac_tip==='ara_urun'&&!u.ust_id)
    : urunler.filter(u=>u.tip==='grup'&&u.agac_tip==='urun'&&!u.ust_id);
  if(!kok.length){el.innerHTML='';return;} // sistemde hiç grup yoksa alanı hiç gösterme
  const altListe=(_utgTip==='urun'&&_utgAnaGrupId)
    ? urunler.filter(g=>g.tip==='grup'&&g.ust_id===_utgAnaGrupId)
    : [];
  el.innerHTML=`<div class="fgrid ${_utgTip==='urun'?'c2':'c1'}">
    <div class="fg"><label>Ana Grup <span style="font-weight:400;color:var(--yazi3)">(opsiyonel)</span></label>
      <select onchange="_utgAnaGrupDegis(this.value)">
        <option value="">Seçin... (boş bırakılabilir)</option>
        ${kok.map(g=>`<option value="${g.id}"${g.id===_utgAnaGrupId?' selected':''}>${g.ad}</option>`).join('')}
      </select>
    </div>
    ${_utgTip==='urun'?`<div class="fg"><label>Alt Grup <span style="font-weight:400;color:var(--yazi3)">(opsiyonel)</span></label>
      <select onchange="_utgAltGrupDegis(this.value)" ${!_utgAnaGrupId?'disabled':''}>
        <option value="">Seçin... (boş bırakılabilir)</option>
        ${altListe.map(g=>`<option value="${g.id}"${g.id===_utgAltGrupId?' selected':''}>${g.ad}</option>`).join('')}
      </select>
    </div>`:''}
  </div>`;
}
window._utgAnaGrupDegis=function(v){_utgAnaGrupId=v;_utgAltGrupId='';_utgGrupRender();};
window._utgAltGrupDegis=function(v){_utgAltGrupId=v;};
window.utgBilesenEkle=function(){
  _utgSayac++;
  _utgBilesenler.push({id:_utgSayac,tip:'stok',kaynakId:'',yeniAd:'',birimId:'',miktar:''});
  utgBilesenRender();
};
window.utgBilesenSil=function(id){
  _utgBilesenler=_utgBilesenler.filter(b=>b.id!==id);
  utgBilesenRender();
};
window.utgBilesenTipDegis=function(id,tip){
  const b=_utgBilesenler.find(x=>x.id===id);
  b.tip=tip;b.kaynakId='';b.yeniAd='';b.birimId='';
  utgBilesenRender();
};
window.utgBilesenAlanGuncelle=function(id,alan,deger){
  const b=_utgBilesenler.find(x=>x.id===id);
  b[alan]=deger;
};

// Malzeme arama kutusu — native <datalist> yerine kendi filtrelememiz:
// datalist'in tarayıcıdaki eşleştirmesi sadece metnin BAŞINDAN arar,
// seçenekler "[kod] Ad" ile başladığı için isim ortasında geçen
// harflerle arama (ör. "maka") hiçbir sonuç döndürmüyordu.
window.utgBilesenAramaFiltrele=function(id,val){
  const b=_utgBilesenler.find(x=>x.id===id);if(!b)return;
  const kapsamStok=isyeriFiltre(stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const kapsamYm=isyeriFiltre(urunler).filter(u=>u.tip==='ara_urun'&&u.aktif!==false);
  const liste=b.tip==='stok'?kapsamStok:kapsamYm;
  const q=(val||'').trim().toLocaleLowerCase('tr');
  const kutu=document.getElementById('utg-oneri-'+id);if(!kutu)return;
  const eslesenler=(q
    ? liste.filter(x=>x.ad.toLocaleLowerCase('tr').includes(q)||(x.kod||'').toLocaleLowerCase('tr').includes(q))
    : liste
  ).slice(0,30);
  if(!eslesenler.length){
    kutu.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--yazi3)">Sonuç bulunamadı</div>';
    kutu.style.display='block';
    return;
  }
  kutu.innerHTML=eslesenler.map(x=>`<div onclick="utgBilesenSecildi(${id},'${x.id}')" style="padding:8px 10px;font-size:12px;cursor:pointer;border-bottom:1px solid var(--krem2)" onmouseover="this.style.background='var(--krem2)'" onmouseout="this.style.background=''">${x.ad}</div>`).join('');
  kutu.style.display='block';
};
window.utgBilesenSecildi=function(id,kaynakId){
  const b=_utgBilesenler.find(x=>x.id===id);if(!b)return;
  const kapsamStok=isyeriFiltre(stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const kapsamYm=isyeriFiltre(urunler).filter(u=>u.tip==='ara_urun'&&u.aktif!==false);
  const eslesen=(b.tip==='stok'?kapsamStok:kapsamYm).find(x=>x.id===kaynakId);
  if(!eslesen)return;
  b.kaynakId=kaynakId;
  // Birim: hammaddede Reçete Birimi, YM'de kendi temel birimi
  b.birimId=b.tip==='stok'?(eslesen.recete_birim_id||eslesen.birim_id||''):(eslesen.birim_id||'');
  utgBilesenRender();
};

function utgBilesenRender(){
  const el=document.getElementById('utg-bilesenler');if(!el)return;
  const kapsamStok=isyeriFiltre(stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const kapsamYm=isyeriFiltre(urunler).filter(u=>u.tip==='ara_urun'&&u.aktif!==false);
  if(!_utgBilesenler.length){el.innerHTML='<div class="bos">Henüz malzeme eklenmedi.</div>';return;}
  const inputStil='width:100%;border:none;border-bottom:1px solid transparent;background:transparent;color:var(--yazi);border-radius:0;transition:border-color .15s';
  const selectStil='width:100%;border:none;background:transparent;border-radius:0';
  const baslik=`<div style="display:flex;gap:6px;padding:0 2px 6px;font-size:9px;color:var(--yazi3);text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border);margin-bottom:2px">
    <div style="width:52px;flex-shrink:0">Tip</div>
    <div style="flex:1">Malzeme</div>
    <div style="width:48px;flex-shrink:0">Birim</div>
    <div style="width:56px;flex-shrink:0;text-align:right">Miktar</div>
    <div style="width:20px;flex-shrink:0"></div>
  </div>`;
  const satirlar=_utgBilesenler.map(b=>{
    const secBirim=birimler.find(x=>x.id===b.birimId);
    let malzemeAlan, birimAlan;
    if(b.tip==='yeni'){
      malzemeAlan=`<input type="text" value="${b.yeniAd}" oninput="utgBilesenAlanGuncelle(${b.id},'yeniAd',this.value)" placeholder="Yeni malzeme adı" style="${inputStil};padding:4px 2px;font-size:12px" onfocus="this.style.borderBottomColor='var(--yesil)'" onblur="this.style.borderBottomColor='transparent'">`;
      birimAlan=`<select onchange="utgBilesenAlanGuncelle(${b.id},'birimId',this.value)" style="${selectStil};padding:4px 0;font-size:11px;color:var(--yazi2)">
        <option value="">—</option>${birimler.filter(x=>['b2','mtwwejo6yszi','b5'].includes(x.id)).map(x=>`<option value="${x.id}"${x.id===b.birimId?' selected':''}>${x.kisaltma}</option>`).join('')}
      </select>`;
    }else{
      const liste=b.tip==='stok'?kapsamStok:kapsamYm;
      const secili=liste.find(x=>x.id===b.kaynakId);
      malzemeAlan=`<div style="position:relative">
        <input type="text" autocomplete="off" value="${secili?secili.ad:''}"
          oninput="utgBilesenAramaFiltrele(${b.id},this.value)"
          onfocus="utgBilesenAramaFiltrele(${b.id},this.value);this.style.borderBottomColor='var(--yesil)'"
          onblur="this.style.borderBottomColor='transparent';setTimeout(()=>{const d=document.getElementById('utg-oneri-${b.id}');if(d)d.style.display='none';},150)"
          placeholder="Yazarak arayın..." style="${inputStil};padding:4px 2px;font-size:12px">
        <div id="utg-oneri-${b.id}" style="display:none;position:absolute;z-index:80;top:100%;left:0;right:0;background:var(--beyaz);border:1px solid var(--border);border-radius:8px;max-height:260px;overflow-y:auto;box-shadow:0 6px 20px rgba(0,0,0,.25);margin-top:3px"></div>
      </div>`;
      birimAlan=`<div style="padding:4px 0;font-size:11px;color:var(--yazi2)">${secBirim?.kisaltma||'—'}</div>`;
    }
    return `<div class="excel-satir" style="display:flex;gap:6px;align-items:center;padding:4px 2px">
      <div style="width:52px;flex-shrink:0">
        <select onchange="utgBilesenTipDegis(${b.id},this.value)" style="${selectStil};padding:4px 0;font-size:10px;font-weight:600;color:${b.tip==='stok'?'var(--yesil)':b.tip==='ara_urun'?'var(--mor)':'var(--turuncu)'}">
          <option value="stok"${b.tip==='stok'?' selected':''}>HAM</option>
          <option value="ara_urun"${b.tip==='ara_urun'?' selected':''}>YM</option>
          <option value="yeni"${b.tip==='yeni'?' selected':''}>YENİ</option>
        </select>
      </div>
      <div style="flex:1;min-width:0">${malzemeAlan}</div>
      <div style="width:48px;flex-shrink:0">${birimAlan}</div>
      <div style="width:56px;flex-shrink:0"><input type="number" step="any" value="${b.miktar}" oninput="utgBilesenAlanGuncelle(${b.id},'miktar',this.value)" placeholder="0" style="${inputStil};padding:4px 2px;font-size:12px;text-align:right" onfocus="this.style.borderBottomColor='var(--yesil)'" onblur="this.style.borderBottomColor='transparent'"></div>
      <div style="width:20px;flex-shrink:0;text-align:center"><button type="button" onclick="utgBilesenSil(${b.id})" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:13px;padding:2px">✕</button></div>
    </div>`;
  }).join('');
  el.innerHTML=baslik+satirlar;
}

window.utgGonder=async function(){
  const hataEl=document.getElementById('utg-hata');
  hataEl.style.display='none';
  const urunAdi=document.getElementById('utg-urun-adi').value.trim();
  const not_=document.getElementById('utg-not').value.trim();
  if(!aktifIsyeri){hataEl.textContent='İşyeri bilgisi bulunamadı, sayfayı yenileyin.';hataEl.style.display='block';return;}
  if(!urunAdi){hataEl.textContent='Lütfen ürün/yarı mamul adını yaz.';hataEl.style.display='block';return;}
  const gecerli=_utgBilesenler.filter(b=>{
    if(!(parseFloat(b.miktar)>0))return false;
    if(b.tip==='yeni')return !!b.yeniAd.trim()&&!!b.birimId;
    return !!b.kaynakId; // birim boş olsa bile gönderilebilir, yönetici tamamlar
  });
  if(!gecerli.length){hataEl.textContent='En az bir malzeme eklemelisin (miktar girilmiş olmalı).';hataEl.style.display='block';return;}

  // Göndermeden önce özet göster ve onay iste — kaydet/kontrol et/gönder akışı
  const kapsamStok=isyeriFiltre(stoklar);
  const kapsamYm=isyeriFiltre(urunler).filter(u=>u.tip==='ara_urun');
  const anaGrupAdi=_utgAnaGrupId?(urunler.find(g=>g.id===_utgAnaGrupId)?.ad||''):'';
  const altGrupAdi=_utgAltGrupId?(urunler.find(g=>g.id===_utgAltGrupId)?.ad||''):'';
  const malzemeSatirlari=gecerli.map(b=>{
    let ad;
    if(b.tip==='yeni'){ad=b.yeniAd.trim()+' <span style="color:var(--turuncu)">(yeni)</span>';}
    else{
      const liste=b.tip==='stok'?kapsamStok:kapsamYm;
      const k=liste.find(x=>x.id===b.kaynakId);
      ad=k?k.ad:'?';
    }
    const birim=birimler.find(x=>x.id===b.birimId)?.kisaltma||'';
    return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px">
      <span>${ad}</span><span style="color:var(--yazi2)">${b.miktar} ${birim}</span>
    </div>`;
  }).join('');
  const ozetHtml=`<div style="text-align:left">
    <div style="font-weight:600;margin-bottom:4px">${urunAdi} <span style="font-size:11px;color:var(--yazi3);font-weight:400">(${_utgTip==='ara_urun'?'Yarı Mamul':'Ürün'})</span></div>
    ${anaGrupAdi?`<div style="font-size:12px;color:var(--yazi2);margin-bottom:6px">🗂 ${anaGrupAdi}${altGrupAdi?' / '+altGrupAdi:''}</div>`:''}
    ${malzemeSatirlari}
    ${not_?`<div style="margin-top:6px;font-size:12px;color:var(--yazi2)">📝 ${not_}</div>`:''}
    <div style="margin-top:8px;font-size:11px;color:var(--yazi3)">Bu bilgileri kontrol ettin mi? Onaylarsan yöneticine gönderilecek.</div>
  </div>`;
  const onaylandi=await onay(ozetHtml,'📝');
  if(!onaylandi)return;

  const btn=document.getElementById('utg-gonder-btn');
  btn.disabled=true;btn.textContent='Gönderiliyor...';
  try{
    const teklifId=uid();
    const {error:e1}=await sb.from('urun_teklifleri').insert({
      id:teklifId,isyeri_id:aktifIsyeri.id,urun_adi:urunAdi,tip:_utgTip,olusturan_ad:aktifKullanici?.ad||'',not_:not_||null,
      hedef_ana_grup_id:_utgAnaGrupId||null,hedef_alt_grup_id:(_utgTip==='urun'?(_utgAltGrupId||null):null),
      durum:'bekliyor',olusturma_ts:Date.now()
    });
    if(e1)throw e1;
    const bilesenKayitlari=gecerli.map((b,i)=>({
      id:uid(),teklif_id:teklifId,
      kaynak_turu:b.tip,
      kaynak_id:b.tip==='yeni'?null:b.kaynakId,
      yeni_ad:b.tip==='yeni'?b.yeniAd.trim():null,
      birim_id:b.birimId||null,
      miktar:parseFloat(b.miktar),sira:i
    }));
    const {error:e2}=await sb.from('urun_teklif_bilesenleri').insert(bilesenKayitlari);
    if(e2)throw e2;
    bil('✓ Teklif gönderildi, yönetici kontrol edecek');
    utgBaslat();
  }catch(err){
    hataEl.textContent='Gönderilemedi: '+(err.message||'bilinmeyen hata');
    hataEl.style.display='block';
    btn.disabled=false;btn.textContent='Gönder';
  }
};
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
  if(_teklifAcikId&&!_utCozum[_teklifAcikId]){
    const t=_teklifListesi.find(x=>x.id===_teklifAcikId);
    _utCozum[_teklifAcikId]={anaGrupId:t?.hedef_ana_grup_id||'',altGrupId:t?.hedef_alt_grup_id||'',birimId:'',bilesenler:{}};
  }
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

// ===== GÖNDERDİKLERİM (aşçı ekranı — kendi gönderdiklerini salt okunur görür) =====
// Nav butonu ve sayfa artık index.html içinde native olarak tanımlı
// ("nav-btn-utg-gonderdiklerim" ve "urun-teklif-gonderdiklerim").

async function _utgKendiTekliflerimYukle(){
  if(!aktifIsyeri||!aktifKullanici)return[];
  const {data:teklifler}=await sb.from('urun_teklifleri').select('*').eq('isyeri_id',aktifIsyeri.id).order('olusturma_ts',{ascending:false});
  const kendi=(teklifler||[]).filter(t=>t.olusturan_ad===(aktifKullanici.ad||''));
  const ids=kendi.map(t=>t.id);
  let bilesenler=[];
  if(ids.length){
    const {data}=await sb.from('urun_teklif_bilesenleri').select('*').in('teklif_id',ids).order('sira');
    bilesenler=data||[];
  }
  return kendi.map(t=>({...t,bilesenler:bilesenler.filter(b=>b.teklif_id===t.id)}));
}

window.renderUtgGonderdiklerim=async function(){
  const el=document.getElementById('utg-gonderdiklerim-liste');if(!el)return;
  el.innerHTML='<div class="bos">Yükleniyor...</div>';
  const liste=await _utgKendiTekliflerimYukle();
  if(!liste.length){el.innerHTML='<div class="bos">Henüz gönderdiğin bir ürün/reçete yok.</div>';return;}
  el.innerHTML=liste.map(t=>{
    const tipAd=t.tip==='ara_urun'?'Yarı Mamul':'Ürün';
    const durumRenk=t.durum==='bekliyor'?'var(--turuncu)':t.durum==='onaylandı'?'var(--yesil)':'var(--yazi3)';
    const tarihStr=t.olusturma_ts?new Date(t.olusturma_ts).toLocaleString('tr-TR'):'';
    const bilesenSatirlari=t.bilesenler.map(b=>{
      const birim=birimler.find(x=>x.id===b.birim_id)?.kisaltma||'';
      let ad;
      if(b.kaynak_turu==='yeni')ad=(b.yeni_ad||'?')+' (yeni)';
      else{
        const kaynak=b.kaynak_turu==='stok'?stoklar.find(x=>x.id===b.kaynak_id):urunler.find(x=>x.id===b.kaynak_id);
        ad=kaynak?kaynak.ad:'(bulunamadı)';
      }
      return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;border-bottom:1px solid var(--krem2)">
        <span>${ad}</span><span style="color:var(--yazi2)">${parseFloat(b.miktar).toLocaleString('tr-TR',{maximumFractionDigits:3})} ${birim}</span>
      </div>`;
    }).join('');
    return `<div class="card" style="margin-bottom:.75rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <span class="badge ${t.tip==='ara_urun'?'m':'u'}">${tipAd}</span>
          <strong style="margin-left:6px">${t.urun_adi}</strong>
          <span style="font-size:11px;color:var(--yazi3);margin-left:8px">${tarihStr}</span>
        </div>
        <span style="font-size:11px;font-weight:600;color:${durumRenk}">${t.durum}</span>
      </div>
      ${t.not_?`<div style="font-size:12px;color:var(--yazi2);margin-bottom:6px">📝 ${t.not_}</div>`:''}
      ${bilesenSatirlari}
    </div>`;
  }).join('');
};
