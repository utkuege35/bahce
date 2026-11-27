window.hrkTutar=i=>(parseFloat(i.tutar)||0)+(parseFloat(i.kdv_tutar)||0); // gelir/gider raporlarında KDV dahil tutar
// ===== RAPOR =====
// ===== İŞYERİ SEÇİMİ (Finans Raporları) =====
// Varsayılan: giriş yapılan işyeri. Kullanıcı yetkili olduğu başka bir işyerini seçebilir.
let _raporIsyeriKim=null;
window.raporIsyeri=function(){return document.getElementById('rapor-isyeri')?.value||aktifIsyeri?.id||null;};
window.raporIsyeriDoldur=function(){
  const sel=document.getElementById('rapor-isyeri'),bar=document.getElementById('rapor-isyeri-bar');
  if(!sel||!aktifIsyeri)return;
  const liste=(window._yetkiliIsyerleri&&window._yetkiliIsyerleri.length?window._yetkiliIsyerleri:[aktifIsyeri]);
  if(_raporIsyeriKim===aktifIsyeri.id&&sel.options.length===liste.length)return; // zaten hazır
  sel.innerHTML=liste.map(iy=>`<option value="${iy.id}">${_logEsc(iy.ad)}</option>`).join('');
  sel.value=aktifIsyeri.id;_raporIsyeriKim=aktifIsyeri.id;
  if(bar)bar.style.display=liste.length>1?'flex':'none'; // tek işyeri varsa seçim gösterilmez
};
window.raporIsyeriDegis=function(){
  cariHareketler=[];_kasaSecId=null;_kasaListeCache=null;
  const aktif=document.querySelector('#rapor .tab-panel.active')?.id||'rt-genel';
  if(aktif==='rt-kasa')renderKasa();else if(aktif==='rt-cari')renderCariHesap();else renderRaporGenel();
};
let _kasaListeCache=null;
async function _raporKasalar(){
  const iy=raporIsyeri();
  if(iy===aktifIsyeri?.id)return (typeof kasalar_list!=='undefined'?kasalar_list:[]).filter(k=>k.aktif!==false);
  if(_kasaListeCache&&_kasaListeCache.iy===iy)return _kasaListeCache.liste;
  const {data,error}=await sb.from('kasalar').select('*').eq('isyeri_id',iy).order('kod');
  if(error)throw error;
  const liste=(data||[]).filter(k=>k.aktif!==false);
  _kasaListeCache={iy,liste};return liste;
}

let aylikC=null,gelirP=null,giderP=null,kasaC=null;

window.raporTab=function(id,btn){
  document.querySelectorAll('#rapor .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#rapor .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('rt-'+id)?.classList.add('active');
  btn.classList.add('active');
  if(id==='genel')renderRaporGenel();
  if(id==='kasa')renderKasa();
  if(id==='cari')renderCariHesap();
};

// Sol menüden: Gelir/Gider, Kasa, Cari Hesap raporları ayrı menü seçenekleridir (üstteki sekmeler gizli)
window._raporHedef='genel';
window.raporGit=function(id){
  window._raporHedef=id;
  document.querySelectorAll('#rapor .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('rt-'+id)?.classList.add('active');
  gp('rapor');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  const b=document.querySelector(`.nav button[data-rapor="${id}"]`);
  if(b){b.classList.add('active');const ic=b.closest('.nav-grup-icerik');if(ic){ic.classList.add('acik');ic.previousElementSibling?.classList.add('acik');}}
};
function renderRapor(){
  const h=window._raporHedef||'genel';
  if(h==='kasa')renderKasa();else if(h==='cari')renderCariHesap();else renderRaporGenel();
}

// ===== GENEL =====
let _gelirFiltre='ay';
window.gelirFiltre=function(tip,btn){
  _gelirFiltre=tip;
  document.querySelectorAll('#rt-genel .btn.sm').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const ozelAlan=document.getElementById('gf-ozel-alan');
  if(ozelAlan)ozelAlan.style.display=tip==='ozel'?'inline-flex':'none';
  renderRaporGenel();
};
function _gelirAralik(){
  const b=d=>d.toISOString().split('T')[0];
  const bugun=new Date();
  if(_gelirFiltre==='bugun')return{bas:b(bugun),bit:b(bugun)};
  if(_gelirFiltre==='hafta'){const p=new Date(bugun);p.setDate(bugun.getDate()-((bugun.getDay()||7)-1));return{bas:b(p),bit:b(bugun)};}
  if(_gelirFiltre==='ay')return{bas:bugun.getFullYear()+'-'+String(bugun.getMonth()+1).padStart(2,'0')+'-01',bit:b(bugun)};
  if(_gelirFiltre==='yil')return{bas:bugun.getFullYear()+'-01-01',bit:b(bugun)};
  if(_gelirFiltre==='ozel')return{bas:document.getElementById('gf-bas')?.value||b(bugun),bit:document.getElementById('gf-bit')?.value||b(bugun)};
  return{bas:bugun.getFullYear()+'-'+String(bugun.getMonth()+1).padStart(2,'0')+'-01',bit:b(bugun)};
}
async function renderRaporGenel(){
  raporIsyeriDoldur();
  const {bas,bit}=_gelirAralik();
  // Panel ile aynı kaynak: seçili aralıktaki hareketler + işçilik kayıtları (veritabanından)
  let yv;
  try{yv=await islemlerAralik(bas,bit,raporIsyeri());}
  catch(e){const m=document.getElementById('rapor-met');if(m)m.innerHTML=`<div class="bos">Rapor verisi okunamadı: ${e.message}</div>`;return;}
  const gelirT=yv.filter(i=>i.tur==='satis').reduce((s,i)=>s+hrkTutar(i),0);
  const giderT=yv.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+hrkTutar(i),0);
  const karT=gelirT-giderT;
  document.getElementById('rapor-met').innerHTML=`
    <div class="met"><div class="ml">Gelir</div><div class="mv g">${para(gelirT)}</div></div>
    <div class="met"><div class="ml">Gider</div><div class="mv d">${para(giderT)}</div></div>
    <div class="met"><div class="ml">Net Kar/Zarar</div><div class="mv ${karT>=0?'k':'z'}">${para(karT)}</div></div>
    <div class="met"><div class="ml">Kar Marjı</div><div class="mv ${karT>=0?'k':'z'}">${gelirT>0?Math.round(karT/gelirT*100)+'%':'—'}</div></div>`;

  // Grafik — günlük veya aylık
  const gunlukMu=_gelirFiltre!=='yil'&&_gelirFiltre!=='ozel';
  const veriMap={};
  yv.forEach(i=>{
    const key=gunlukMu?i.tarih:i.tarih?.substring(0,7);if(!key)return;
    if(!veriMap[key])veriMap[key]={g:0,d:0};
    if(i.tur==='satis')veriMap[key].g+=hrkTutar(i);
    else if(['gider','giris'].includes(i.tur))veriMap[key].d+=hrkTutar(i);
  });
  const labels=Object.keys(veriMap).sort();
  if(aylikC)aylikC.destroy();
  aylikC=new Chart(document.getElementById('aylik-chart'),{type:'bar',
    data:{labels,datasets:[
      {label:'Gelir',data:labels.map(k=>Math.round(veriMap[k].g)),backgroundColor:'rgba(53,95,130,.75)',borderRadius:3},
      {label:'Gider',data:labels.map(k=>Math.round(veriMap[k].d)),backgroundColor:'rgba(244,162,97,.75)',borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},
      scales:{x:{ticks:{autoSkip:true,maxTicksLimit:14,font:{size:10}}},y:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:10}}}}}});

  // Pasta grafikler
  const gelirKat={},giderKat={};
  yv.forEach(i=>{
    if(i.tur==='satis')gelirKat[i.kat||'Diğer']=(gelirKat[i.kat||'Diğer']||0)+hrkTutar(i);
    else if(i.tur==='gider')giderKat[i.kat||'Diğer']=(giderKat[i.kat||'Diğer']||0)+hrkTutar(i);
    else if(i.tur==='giris')giderKat['Hammadde']=(giderKat['Hammadde']||0)+hrkTutar(i);
  });
  if(gelirP)gelirP.destroy();
  gelirP=new Chart(document.getElementById('gelir-pie'),{type:'doughnut',data:{labels:Object.keys(gelirKat),datasets:[{data:Object.values(gelirKat).map(v=>Math.round(v)),backgroundColor:['#284a65','#355f82','#a9c8e0','#cce0ef','#eaf2f8']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:8,padding:6}}}}});
  if(giderP)giderP.destroy();
  giderP=new Chart(document.getElementById('gider-pie'),{type:'doughnut',data:{labels:Object.keys(giderKat),datasets:[{data:Object.values(giderKat).map(v=>Math.round(v)),backgroundColor:['#bc4a0e','#f4a261','#355f82','#a8dadc','#6f3fa0','#856404']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:8,padding:6}}}}});

  // Dönem detayları
  let html='';
  labels.forEach(key=>{
    const g=veriMap[key].g,d=veriMap[key].d;if(!g&&!d)return;const net=g-d;
    html+=`<div style="background:var(--krem);border:1px solid var(--border);border-radius:10px;padding:.75rem">
      <div style="font-size:12px;font-weight:500;margin-bottom:6px">${key}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Gelir</span><span style="color:var(--yesil);font-weight:500">${para(g)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Gider</span><span style="color:var(--turuncu);font-weight:500">${para(d)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:500;border-top:1px solid var(--border);padding-top:5px;margin-top:3px"><span>Net</span><span style="color:${net>=0?'var(--yesil)':'#c62828'}">${para(net)}</span></div>
    </div>`;
  });
  document.getElementById('aylar-detay').innerHTML=html||'<p style="color:var(--yazi3);font-size:12px">Bu dönemde kayıt yok</p>';
}

// ===== KASA =====
// Üstte her kasanın güncel bakiyesi (kart); karta tıklayınca o kasanın hareketleri ve grafiği açılır.
let _kasaSecId=null;
const _KASA_IKON={nakit:'💵',banka:'🏦',pos:'💳'};
const _KASA_TUR_AD={alici_tahsilat:'Alıcı Tahsilatı',diger_giris:'Diğer Giriş',satici_odeme:'Satıcı Ödemesi',diger_cikis:'Diğer Çıkış',kasa_transfer:'Kasa Transferi'};
window.kasaSec=function(id){_kasaSecId=(_kasaSecId===id)?null:id;renderKasa();};
window.renderKasa=async function(){
  raporIsyeriDoldur();
  const iy=raporIsyeri();
  const yerel=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const basEl=document.getElementById('kasa-bas'),bitEl=document.getElementById('kasa-bit');
  if(!basEl.value)basEl.value=yerel().slice(0,8)+'01';
  if(!bitEl.value)bitEl.value=yerel();
  if(bitEl.value<basEl.value)bitEl.value=basEl.value;
  const bas=basEl.value,bit=bitEl.value;
  const kartlarEl=document.getElementById('kasa-kartlar'),detayEl=document.getElementById('kasa-detay');
  let liste;
  try{liste=await _raporKasalar();}catch(e){kartlarEl.innerHTML=`<div class="bos">Kasalar okunamadı: ${_logEsc(e.message)}</div>`;detayEl.style.display='none';return;}
  if(!liste.length){kartlarEl.innerHTML='<div class="bos">Bu işyerinde tanımlı kasa yok.</div>';detayEl.style.display='none';return;}
  let bak={};
  try{bak=await kasaBakiyelerDb(iy);}catch(e){kartlarEl.innerHTML=`<div class="bos">Bakiyeler okunamadı: ${_logEsc(e.message)}</div>`;return;}
  const bakiyeOf=k=>(parseFloat(k.baslangic_bakiye)||0)+(parseFloat(bak[k.id])||0);
  if(_kasaSecId&&!liste.some(k=>k.id===_kasaSecId))_kasaSecId=null;
  kartlarEl.innerHTML=liste.map(k=>{
    const b=bakiyeOf(k),sec=k.id===_kasaSecId;
    return `<div onclick="kasaSec('${k.id}')" style="cursor:pointer;border:2px solid ${sec?'var(--yesil)':'var(--border)'};background:${sec?'var(--yesil-cok-ac)':'var(--beyaz)'};border-radius:12px;padding:12px 14px;transition:.15s">
      <div style="font-size:12px;color:var(--yazi2);display:flex;align-items:center;gap:6px"><span style="font-size:15px">${_KASA_IKON[k.tip]||'💵'}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_logEsc(k.ad)}</span></div>
      <div style="font-size:calc(22px*var(--yazi-olcek,1));font-weight:600;margin-top:6px;font-family:'Lora',serif;color:${b>=0?'var(--mavi)':'#c62828'}">${para(b)}</div>
      <div style="font-size:10.5px;color:var(--yazi3);margin-top:2px">${sec?'▲ detay açık':'▼ detay için tıklayın'}</div>
    </div>`;}).join('');
  if(!_kasaSecId){detayEl.style.display='none';if(kasaC){kasaC.destroy();kasaC=null;}return;}
  detayEl.style.display='';
  const kasa=liste.find(k=>k.id===_kasaSecId);
  const tb=document.getElementById('kasa-tb');tb.innerHTML='<tr><td colspan="7" class="bos">Yükleniyor...</td></tr>';
  document.getElementById('kasa-detay-baslik').textContent=`${kasa.ad} — hareketler`;
  let hareket,onceki;
  try{
    [hareket,onceki]=await Promise.all([
      sbSayfali(()=>sb.from('islemler').select('*').eq('isyeri_id',iy).or('silindi.is.null,silindi.eq.false').eq('kasa_id',_kasaSecId).gte('tarih',bas).lte('tarih',bit).order('tarih').order('ts').order('id')),
      sbSayfali(()=>sb.from('islemler').select('kasa_etkisi').eq('isyeri_id',iy).eq('kasa_id',_kasaSecId).or('silindi.is.null,silindi.eq.false').lt('tarih',bas).order('id'))
    ]);
  }catch(e){tb.innerHTML=`<tr><td colspan="7" class="bos">Okunamadı: ${_logEsc(e.message)}</td></tr>`;return;}
  if(_kasaSecId!==kasa.id)return; // bu arada başka kasa seçildi
  const acilis=(parseFloat(kasa.baslangic_bakiye)||0)+onceki.reduce((s,r)=>s+(parseFloat(r.kasa_etkisi)||0),0);
  let bakiye=acilis,topG=0,topC=0;
  const gunMap={};
  const satirlar=hareket.map(h=>{
    const e=parseFloat(h.kasa_etkisi)||0;bakiye+=e;
    if(e>0)topG+=e;else topC+=-e;
    const g=h.tarih;(gunMap[g]=gunMap[g]||{gir:0,cik:0,bak:0});
    if(e>0)gunMap[g].gir+=e;else gunMap[g].cik+=-e;gunMap[g].bak=bakiye;
    const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===h.cari_id):null;
    return `<tr>
      <td style="white-space:nowrap">${h.tarih}</td>
      <td style="font-size:12px">${_KASA_TUR_AD[h.alt_tur]||'Kasa hareketi'}</td>
      <td style="font-size:12px">${_logEsc(cari?cari.ad:'')}</td>
      <td style="font-size:11px;color:var(--yazi2)">${_logEsc(h.aciklama||'')}${h.belge_no?` <span style="color:var(--yazi3)">· ${_logEsc(h.belge_no)}</span>`:''}</td>
      <td style="text-align:right;color:var(--yesil);font-weight:500">${e>0?para(e):''}</td>
      <td style="text-align:right;color:var(--turuncu);font-weight:500">${e<0?para(-e):''}</td>
      <td style="text-align:right;font-weight:600;color:${bakiye>=0?'var(--mavi)':'#c62828'}">${para(bakiye)}</td>
    </tr>`;}).join('');
  tb.innerHTML=(acilis||hareket.length?`<tr style="background:var(--krem)"><td>${bas}</td><td colspan="5" style="font-size:12px;color:var(--yazi2)">Açılış bakiyesi</td><td style="text-align:right;font-weight:600">${para(acilis)}</td></tr>`:'')+(satirlar||'<tr><td colspan="7" class="bos">Bu aralıkta işlem yok</td></tr>');
  document.getElementById('kasa-met').innerHTML=`
    <div class="met"><div class="ml">Açılış</div><div class="mv">${para(acilis)}</div></div>
    <div class="met"><div class="ml">Toplam Giriş</div><div class="mv g">${para(topG)}</div></div>
    <div class="met"><div class="ml">Toplam Çıkış</div><div class="mv d">${para(topC)}</div></div>
    <div class="met"><div class="ml">Kapanış Bakiyesi</div><div class="mv ${bakiye>=0?'k':'z'}">${para(bakiye)}</div></div>`;
  if(kasaC){kasaC.destroy();kasaC=null;}
  const gunler=Object.keys(gunMap).sort();
  if(!gunler.length)return;
  // Günlük giriş/çıkış sütunları + gün sonu bakiye çizgisi (boş günlerde bakiye taşınır)
  let son=acilis;const bakList=gunler.map(g=>{son=gunMap[g].bak;return Math.round(son);});
  kasaC=new Chart(document.getElementById('kasa-chart'),{
    type:'bar',
    data:{labels:gunler.map(g=>g.substring(8,10)+'.'+g.substring(5,7)),datasets:[
      {label:'Giriş',data:gunler.map(g=>Math.round(gunMap[g].gir)),backgroundColor:'rgba(82,183,136,.75)',borderRadius:3,order:2},
      {label:'Çıkış',data:gunler.map(g=>Math.round(gunMap[g].cik)),backgroundColor:'rgba(244,162,97,.75)',borderRadius:3,order:2},
      {label:'Bakiye',data:bakList,type:'line',borderColor:'#1d4e89',backgroundColor:'rgba(29,78,137,.1)',borderWidth:2,pointRadius:3,fill:true,order:1,yAxisID:'y1'}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},
      scales:{
        x:{ticks:{autoSkip:true,maxTicksLimit:15,font:{size:10}}},
        y:{ticks:{callback:v=>v.toLocaleString('tr-TR'),font:{size:10}},position:'left'},
        y1:{ticks:{callback:v=>v.toLocaleString('tr-TR'),font:{size:10}},position:'right',grid:{drawOnChartArea:false}}
      }}
  });
};

// ===== CARİ HESAP =====
let cariHareketler=[];
let _cariHareketIsyeri=null;
async function cariHareketYukle(){
  const iy=raporIsyeri();
  try{
    cariHareketler=await sbSayfali(()=>sb.rpc('cari_hareketler_isyeri',{p_isyeri:iy}).order('tarih',{ascending:true}).order('id'));
    _cariHareketIsyeri=iy;
  }catch(e){console.warn('Cari hareketler okunamadı:',e.message);}
}
window.renderCariHesap=async function(){
  raporIsyeriDoldur();
  if(!cariHareketler.length||_cariHareketIsyeri!==raporIsyeri())await cariHareketYukle();
  const ara=(document.getElementById('cari-rap-ara')?.value||'').toLocaleLowerCase('tr-TR');
  const bakiyeFil=document.getElementById('cari-rap-bakiye')?.value??'var';
  const _bE=document.getElementById('cari-rap-bas'),_tE=document.getElementById('cari-rap-bit');
  if(_bE&&!_bE.dataset.ilk){_bE.dataset.ilk='1';const d=new Date();_bE.value=d.getFullYear()+'-01-01';_tE.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  const bas=_bE?.value||'';
  const bit=_tE?.value||'';
  // Muavin düzeni (ekstre ile aynı): kayıtlı 'alacak' → BORÇ sütunu, kayıtlı 'borc' → ALACAK sütunu.
  // Bakiye: alıcıda Borç−Alacak (+ = bize borçlu), satıcı/personelde Alacak−Borç (+ = borcumuz).
  const m={};
  cariHareketler.forEach(h=>{
    if(bas&&h.tarih<bas)return;if(bit&&h.tarih>bit)return;
    const v=m[h.cari_id]||(m[h.cari_id]={borc:0,alacak:0,say:0});
    const t=parseFloat(h.tutar||0);
    if(h.tip==='alacak')v.borc+=t;else v.alacak+=t;
    v.say++;
  });
  const GRUP=[
    {tip:'alici',ad:'Alıcılar',ikon:'🛒',renk:'var(--yesil)',pozAd:'alacağımız',negAd:'fazla tahsilat',pozRenk:'var(--yesil)'},
    {tip:'satici',ad:'Satıcılar',ikon:'🚚',renk:'var(--mavi)',pozAd:'borcumuz',negAd:'fazla ödeme',pozRenk:'#c62828'},
    {tip:'personel',ad:'Personel',ikon:'👷',renk:'var(--mor)',pozAd:'borcumuz',negAd:'fazla ödeme',pozRenk:'#c62828'}
  ];
  const bak=c=>{const v=m[c.id]||{borc:0,alacak:0};return c.tip==='alici'?v.borc-v.alacak:v.alacak-v.borc;};
  const bakGoster=(b,g)=>Math.abs(b)<0.005
    ?'<span style="font-size:11px;color:var(--yazi3)">Kapalı</span>'
    :`<span style="font-weight:600;color:${b>0?g.pozRenk:'var(--yazi3)'}">${para(Math.abs(b))}</span> <span style="font-size:10px;color:${b>0?g.pozRenk:'var(--yazi3)'}">${b>0?g.pozAd:g.negAd}</span>`;
  const tum=cariListesi.filter(c=>c.aktif!==false);
  const gorunur=c=>{
    if(ara&&!((c.ad||'').toLocaleLowerCase('tr-TR').includes(ara)||(c.kod||'').toLocaleLowerCase('tr-TR').includes(ara)))return false;
    const b=bak(c),v=m[c.id];
    if(bakiyeFil==='var')return Math.abs(b)>=0.005;
    if(bakiyeFil==='borc')return c.tip==='alici'?b<-0.005:b>0.005;
    if(bakiyeFil==='alacak')return c.tip==='alici'?b>0.005:b<-0.005;
    if(bakiyeFil==='sifir')return Math.abs(b)<0.005&&v&&v.say>0;
    return true;
  };
  // Üst özet (arama/bakiye filtresinden bağımsız, tüm aktif cariler)
  const topla=tp=>tum.filter(c=>(tp==='alici')===(c.tip==='alici')).reduce((s,c)=>s+Math.max(0,bak(c)),0);
  const alacagimiz=topla('alici'),borcumuz=topla('diger');
  document.getElementById('cari-rap-met').innerHTML=`
    <div class="met"><div class="ml">Toplam Alacağımız</div><div class="mv g">${para(alacagimiz)}</div><div style="font-size:10.5px;color:var(--yazi3);margin-top:2px">alıcılardan</div></div>
    <div class="met"><div class="ml">Toplam Borcumuz</div><div class="mv z">${para(borcumuz)}</div><div style="font-size:10.5px;color:var(--yazi3);margin-top:2px">satıcı ve personele</div></div>
    <div class="met"><div class="ml">Net Bakiye</div><div class="mv ${alacagimiz-borcumuz>=0?'k':'z'}">${para(Math.abs(alacagimiz-borcumuz))}</div><div style="font-size:10.5px;color:var(--yazi3);margin-top:2px">${Math.abs(alacagimiz-borcumuz)<0.005?'denk':alacagimiz>borcumuz?'net alacağımız':'net borcumuz'}</div></div>`;
  document.getElementById('cari-rap-gruplar').innerHTML=GRUP.map(g=>{
    const grupTum=tum.filter(c=>c.tip===g.tip);
    const liste=grupTum.filter(gorunur).sort((a,b)=>Math.abs(bak(b))-Math.abs(bak(a)));
    let tB=0,tA=0,tBak=0;
    grupTum.forEach(c=>{const v=m[c.id]||{borc:0,alacak:0};tB+=v.borc;tA+=v.alacak;tBak+=bak(c);});
    const satirlar=liste.map(c=>{
      const v=m[c.id]||{borc:0,alacak:0},b=bak(c);
      return `<tr style="cursor:pointer" onclick="cariDetayAc('${c.id}')" title="Ekstre için tıklayın">
        <td><div style="font-size:13px;font-weight:500">${_logEsc(c.ad)}</div><div style="font-size:10px;color:var(--yazi3)">${_logEsc(c.kod||'')}${c.telefon?' · '+_logEsc(c.telefon):''}</div></td>
        <td style="text-align:right;font-size:13px">${v.borc?para(v.borc):'<span style="color:var(--yazi3)">—</span>'}</td>
        <td style="text-align:right;font-size:13px">${v.alacak?para(v.alacak):'<span style="color:var(--yazi3)">—</span>'}</td>
        <td style="text-align:right;white-space:nowrap">${bakGoster(b,g)}</td>
        <td style="width:90px"><button class="btn sm" style="white-space:nowrap" onclick="event.stopPropagation();cariDetayAc('${c.id}')">Ekstre →</button></td>
      </tr>`;}).join('');
    return `<details open style="margin-bottom:12px;border:1px solid var(--border);border-radius:12px;background:var(--beyaz);overflow:hidden">
      <summary style="cursor:pointer;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-left:5px solid ${g.renk};background:var(--krem)">
        <span style="font-size:15px;font-weight:600;color:var(--yazi)">${g.ikon} ${g.ad}</span>
        <span style="font-size:11px;color:var(--yazi3)">${grupTum.length} kart</span>
        <span style="margin-left:auto;display:flex;gap:16px;flex-wrap:wrap;font-size:12px">
          <span><span style="color:var(--yazi3)">Borç</span> <b>${para(tB)}</b></span>
          <span><span style="color:var(--yazi3)">Alacak</span> <b>${para(tA)}</b></span>
          <span><span style="color:var(--yazi3)">Bakiye</span> ${bakGoster(tBak,g)}</span>
        </span>
      </summary>
      <div class="tw"><table>
        <thead><tr><th style="min-width:180px">Cari</th><th style="text-align:right">Borç</th><th style="text-align:right">Alacak</th><th style="text-align:right">Bakiye</th><th></th></tr></thead>
        <tbody>${satirlar||'<tr><td colspan="5" class="bos">Bu filtreyle kayıt yok</td></tr>'}</tbody>
      </table></div>
    </details>`;}).join('');
};

// Ekstredeki açıklama: faturaya / işçilik kaydına yazılan açıklama (belge_id ile bulunur)
let _cariBelgeAcik={};
async function _cariBelgeAciklamaYukle(cariId){
  const hs=cariHareketler.filter(h=>h.cari_id===cariId&&h.belge_id);
  const fat=[...new Set(hs.filter(h=>h.kaynak==='fatura'||h.kaynak==='fatura_odeme').map(h=>String(h.belge_id)))];
  const isc=[...new Set(hs.filter(h=>h.kaynak==='iscilik'||h.kaynak==='iscilik_odeme').map(h=>String(h.belge_id)))];
  const oku=async(tablo,ids)=>{
    for(let i=0;i<ids.length;i+=100){
      const {data}=await sb.from(tablo).select('id,aciklama').in('id',ids.slice(i,i+100));
      (data||[]).forEach(x=>{if(x.aciklama)_cariBelgeAcik[String(x.id)]=x.aciklama;});
    }
  };
  try{await Promise.all([oku('faturalar',fat),oku('isci_belgeleri',isc)]);}
  catch(e){console.warn('Belge açıklamaları okunamadı:',e.message);}
}
window.cariDetayAc=async function(cariId){
  if(!cariHareketler.length||_cariHareketIsyeri!==raporIsyeri())await cariHareketYukle();
  await _cariBelgeAciklamaYukle(cariId);
  const c=cariListesi.find(x=>x.id===cariId);if(!c)return;
  document.getElementById('cd-title').textContent=c.ad;
  document.getElementById('cd-ozet').textContent=`${c.kod} · ${c.tip==='alici'?'Alıcı':c.tip==='satici'?'Satıcı':'Personel'}${c.telefon?' · '+c.telefon:''}`;
  _cariDetayRender(cariId);
  modalAc('modal-cari-detay');
};

function _cariDetayRender(cariId){
  const c=cariListesi.find(x=>x.id===cariId);
  const alici=c.tip==='alici';
  const hareketler=cariHareketler.filter(h=>h.cari_id===cariId).sort((a,b)=>a.tarih>b.tarih?1:a.tarih<b.tarih?-1:(a.ts||0)-(b.ts||0));
  // Muavin (ekstre) düzeni: Borç / Alacak sütunları standart muhasebe yönündedir.
  // Kayıtlı 'alacak' = alıcıya satış / satıcıya ödeme → BORÇ sütunu; 'borc' = alıcıdan tahsilat / satıcıdan alış → ALACAK sütunu.
  // Bakiye: alıcıda Borç−Alacak (+ = bize borçlu, B), satıcıda Alacak−Borç (+ = borcumuz, A).
  const belgeAd=h=>{
    if(h.kaynak==='fatura')return (alici?'Satış Faturası':'Alış Faturası')+(h.belge_no?' '+h.belge_no:'');
    if(h.kaynak==='iscilik')return 'İşçilik Kaydı';
    if(h.kaynak==='iscilik_odeme')return 'İşçilik Ödemesi (Peşin)';
    if(h.kaynak==='fatura_odeme')return (alici?'Peşin Tahsilat':'Peşin Ödeme')+(h.belge_no?' · '+h.belge_no:'');
    if(h.belge_id)return h.tip==='alacak'?'Tediye (Kasa)':'Tahsil (Kasa)';
    return 'Cari Hareket';
  };
  let topB=0,topA=0,bakiye=0;
  const rows=hareketler.map(h=>{
    const t=parseFloat(h.tutar||0);
    const borc=h.tip==='alacak'?t:0,alacak=h.tip==='alacak'?0:t;
    topB+=borc;topA+=alacak;
    bakiye=alici?topB-topA:topA-topB;
    const bakiyeRenk=Math.abs(bakiye)<0.005?'var(--yazi3)':'var(--yazi)';
    return `<tr>
      <td style="white-space:nowrap">${h.tarih}</td>
      <td style="font-size:11px">${_logEsc(belgeAd(h))}</td>
      <td style="font-size:11px;color:var(--yazi2)">${_logEsc((h.belge_id&&_cariBelgeAcik[String(h.belge_id)])||h.aciklama||'')}</td>
      <td style="text-align:right;font-weight:500">${borc?para(borc):''}</td>
      <td style="text-align:right;font-weight:500">${alacak?para(alacak):''}</td>
      <td style="text-align:right;font-weight:600;color:${bakiyeRenk};white-space:nowrap">${para(Math.abs(bakiye))} ${Math.abs(bakiye)<0.005?'':(bakiye>0?(alici?'B':'A'):(alici?'A':'B'))}</td>
    </tr>`;
  }).join('');
  document.getElementById('cd-tb').innerHTML=rows||'<tr><td colspan="6" class="bos">Hareket yok</td></tr>';
  const net=alici?topB-topA:topA-topB;
  const aciklama=Math.abs(net)<0.005?'Hesap Kapalı':net>0?(alici?'Alıcı Borcu (bize borçlu)':'Bizim Borcumuz'):(alici?'Fazla Tahsilat':'Fazla Ödeme');
  document.getElementById('cd-met').innerHTML=`
    <div class="met"><div class="ml">Toplam Borç</div><div class="mv">${para(topB)}</div></div>
    <div class="met"><div class="ml">Toplam Alacak</div><div class="mv">${para(topA)}</div></div>
    <div class="met"><div class="ml">${aciklama}</div><div class="mv ${net>0.005?'z':'k'}">${para(Math.abs(net))}</div></div>`;
}

window.cariOdemeEkle=async function(){
  const tarihEl=document.getElementById('cd-odeme-tarih');
  const cariId=tarihEl.dataset.cariId;
  const tarih=tarihEl.value;
  const tutar=parseFloat(document.getElementById('cd-odeme-tutar').value)||0;
  const not=document.getElementById('cd-odeme-not').value;
  if(!cariId||!tarih||tutar<=0){bil('Tarih ve tutar zorunlu!','err');return;}
  const c=cariListesi.find(x=>x.id===cariId);
  // Ödeme: satıcıya ödedik (alacak - borcumuzu kapattı), alıcıdan tahsil (borc - alıcının borcunu kapattı)
  const tip=c.tip==='alici'?'borc':'alacak'; // alıcıdan tahsilat = borc; satıcı/personele ödeme = alacak
  const aciklama=not||(c.tip==='alici'?'Tahsilat':'Ödeme yapıldı');
  await sb.from('cari_hareketler').insert({cari_id:cariId,tarih,tip,tutar,aciklama,kullanici:aktifKullanici?.ad||'',isyeri_id:raporIsyeri(),ts:Date.now()});
  await cariHareketYukle();
  _cariDetayRender(cariId);
  renderCariHesap();
  document.getElementById('cd-odeme-tutar').value='';
  document.getElementById('cd-odeme-not').value='';
  bil('Kaydedildi ✓');
};

// ===== PERSONEL =====
window.renderPersonelRapor=function(){
  const basEl=document.getElementById('per-bas');
  const bitEl=document.getElementById('per-bit');
  if(!basEl.value){const bugun=new Date();basEl.value=bugun.getFullYear()+'-01-01';}
  if(!bitEl.value){bitEl.value=new Date().toISOString().split('T')[0];}
  const bas=basEl.value;const bit=bitEl.value;
  const secPersonel=document.getElementById('per-personel').value;
  const personeller=cariListesi.filter(c=>c.tip==='personel'&&c.aktif!==false);
  const perEl=document.getElementById('per-personel');
  const curPer=perEl.value;
  perEl.innerHTML='<option value="">Tüm personel</option>'+personeller.map(p=>`<option value="${p.id}"${p.id===curPer?' selected':''}>${p.ad}</option>`).join('');
  const perIds=new Set(personeller.map(p=>p.id));
  let islemFiltre=islemler.filter(i=>i.tur==='gider'&&i.tarih>=bas&&i.tarih<=bit&&i.cari_id&&perIds.has(i.cari_id));
  if(secPersonel)islemFiltre=islemFiltre.filter(i=>i.cari_id===secPersonel);
  const perMap={};
  islemFiltre.forEach(i=>{
    const p=cariListesi.find(c=>c.id===i.cari_id);if(!p)return;
    if(!perMap[i.cari_id])perMap[i.cari_id]={ad:p.ad,kod:p.kod,toplamTutar:0,toplamMiktar:{},isler:[]};
    perMap[i.cari_id].toplamTutar+=parseFloat(i.tutar||0);
    const bAd=birimAd(i.birim_id)||'adet';
    const mik=parseFloat(i.miktar||0);
    if(mik>0)perMap[i.cari_id].toplamMiktar[bAd]=(perMap[i.cari_id].toplamMiktar[bAd]||0)+mik;
    perMap[i.cari_id].isler.push(i);
  });
  const topTutar=islemFiltre.reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const perSayisi=Object.keys(perMap).length;
  document.getElementById('per-met').innerHTML=`
    <div class="met"><div class="ml">Toplam İşçilik</div><div class="mv d">${para(topTutar)}</div></div>
    <div class="met"><div class="ml">Aktif Personel</div><div class="mv k">${perSayisi}</div></div>
    <div class="met"><div class="ml">İşlem Sayısı</div><div class="mv k">${islemFiltre.length}</div></div>`;
  document.getElementById('per-kartlar').innerHTML=Object.values(perMap).map(p=>{
    const miktarStr=Object.entries(p.toplamMiktar).map(([b,m])=>`${m.toLocaleString('tr-TR',{maximumFractionDigits:2})} ${b}`).join(' · ')||'—';
    return `<div class="card" style="margin-bottom:0">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--mor);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;flex-shrink:0">${(p.ad||'?')[0].toUpperCase()}</div>
        <div><div style="font-size:13px;font-weight:500">${p.ad}</div><div style="font-size:10px;color:var(--yazi3)">${p.kod}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-top:1px solid var(--krem2)"><span style="color:var(--yazi2)">Toplam çalışma</span><span style="font-weight:500">${miktarStr}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-top:1px solid var(--krem2)"><span style="color:var(--yazi2)">Toplam ücret</span><span style="font-weight:600;color:var(--turuncu)">${para(p.toplamTutar)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-top:1px solid var(--krem2)"><span style="color:var(--yazi2)">İşlem sayısı</span><span>${p.isler.length}</span></div>
    </div>`;
  }).join('')||'<div class="bos">Bu aralıkta personel gideri yok.</div>';
  const rows=islemFiltre.sort((a,b)=>a.tarih<b.tarih?1:-1).map(i=>{
    const p=cariListesi.find(c=>c.id===i.cari_id);
    const kalem=giderKalemleri.find(k=>k.id===i.gider_kalem_id);
    return `<tr>
      <td>${i.tarih}</td>
      <td><span style="font-size:10px;color:var(--mor);background:var(--mor-ac);padding:1px 6px;border-radius:10px">${p?.ad||'—'}</span></td>
      <td style="font-size:11px">${kalem?.ad||i.kat||'—'}</td>
      <td style="font-size:11px">${birimAd(i.birim_id)||'—'}</td>
      <td>${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2}):''}</td>
      <td style="font-weight:500;color:var(--turuncu)">${i.tutar?para(i.tutar):''}</td>
      <td style="font-size:11px;color:var(--yazi3)">${i.satir_not||i.aciklama_not||''}</td>
    </tr>`;
  }).join('');
  document.getElementById('per-tb').innerHTML=rows||'<tr><td colspan="7" class="bos">İşlem yok</td></tr>';
};

// PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('pwa-yukle').style.display='block';});
document.getElementById('pwa-yukle').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();const r=await deferredPrompt.userChoice;if(r.outcome==='accepted')bil('Uygulama yüklendi! ✓');deferredPrompt=null;document.getElementById('pwa-yukle').style.display='none';});
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
(async()=>{const hash=window.location.hash;if(hash.includes('type=recovery')){const params=new URLSearchParams(hash.substring(1));const at=params.get('access_token');if(at){await sb.auth.setSession({access_token:at,refresh_token:params.get('refresh_token')||''});document.getElementById('giris-wrap').style.display='none';document.getElementById('yenisifre-panel').classList.add('open');}}})();
