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
window.raporHedef=function(id){
  window._raporHedef=id;
  document.querySelectorAll('#rapor .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('rt-'+id)?.classList.add('active');
};
window.raporIsaretle=function(id){
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  const b=document.querySelector(`.nav button[data-rapor="${id}"]`);
  if(b){b.classList.add('active');const ic=b.closest('.nav-grup-icerik');if(ic){ic.classList.add('acik');ic.previousElementSibling?.classList.add('acik');}}
};
function renderRapor(){
  const h=window._raporHedef||'genel';
  if(h==='kasa')renderKasa();else if(h==='cari')renderCariHesap();else if(h==='mizan')renderCariMizan();else renderRaporGenel();
}

// ===== GRAFİK YARDIMCILARI (modern görünüm; açık/koyu temaya uyar) =====
const _rpRenk=['#14b8a6','#3b82f6','#8b5cf6','#f59e0b','#ec4899','#ef4444','#84cc16','#94a3b8'];
function _rpTema(){const cs=getComputedStyle(document.body);const v=n=>cs.getPropertyValue(n).trim();
  return {yazi:v('--yazi2')||'#667085',yazi3:v('--yazi3')||'#98a2b3',grid:v('--border')||'#e5e7eb',zemin:v('--beyaz')||'#fff',ana:v('--yazi')||'#111'};}
const _rpTL=v=>Math.round(v).toLocaleString('tr-TR');
function _rpSecenek(T,o){o=o||{};
  return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:!!o.legend,position:'top',align:'end',labels:{usePointStyle:true,pointStyle:'circle',boxWidth:8,boxHeight:8,color:T.yazi,font:{size:12}}},
      tooltip:{padding:10,cornerRadius:8,callbacks:{label:c=>` ${c.dataset.label}: ${_rpTL(c.raw)} ₺`}}},
    scales:{x:{grid:{display:false},border:{display:false},ticks:{autoSkip:true,maxTicksLimit:14,color:T.yazi3,font:{size:11}}},
      y:{grid:{color:T.grid,drawTicks:false},border:{display:false},ticks:{padding:8,color:T.yazi3,font:{size:11},callback:v=>v.toLocaleString('tr-TR')}}}};}
function _rpDonut(canvasId,listId,map,eski,T){
  if(eski)eski.destroy();
  const ent=Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(ent.length>7){const dig=ent.splice(6).reduce((s,[,v])=>s+v,0);ent.push(['Diğer',dig]);}
  const top=ent.reduce((s,[,v])=>s+v,0);
  const liste=document.getElementById(listId);
  if(!top){if(liste)liste.innerHTML='<div class="rp-bos">Bu dönemde kayıt yok</div>';return null;}
  if(liste)liste.innerHTML=ent.map(([k,v],i)=>{const y=v/top*100;
    return `<div class="rp-s"><div class="rp-s1"><i style="background:${_rpRenk[i%_rpRenk.length]}"></i><span class="ad" title="${_logEsc(k)}">${_logEsc(k)}</span><span class="tt">${_rpTL(v)} ₺</span><b>${y<1?'<%1':'%'+Math.round(y)}</b></div><div class="rp-cubuk"><div style="width:${Math.max(2,y)}%;background:${_rpRenk[i%_rpRenk.length]}"></div></div></div>`;}).join('');
  return new Chart(document.getElementById(canvasId),{type:'doughnut',
    data:{labels:ent.map(([k])=>k),datasets:[{data:ent.map(([,v])=>Math.round(v)),backgroundColor:_rpRenk,borderColor:T.zemin,borderWidth:3,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},tooltip:{padding:10,cornerRadius:8,callbacks:{label:c=>` ${c.label}: ${_rpTL(c.raw)} ₺ (%${Math.round(c.raw/top*100)})`}}}},
    plugins:[{id:'orta',afterDraw(ch){const m=ch.getDatasetMeta(0).data[0];if(!m)return;const c=ch.ctx;c.save();c.textAlign='center';
      c.fillStyle=T.yazi3;c.font='11px sans-serif';c.fillText('Toplam',m.x,m.y-9);c.fillStyle=T.ana;c.font='bold 16px sans-serif';c.fillText(_rpTL(top),m.x,m.y+11);c.restore();}}]});
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
  const T=_rpTema();
  if(aylikC)aylikC.destroy();
  aylikC=new Chart(document.getElementById('aylik-chart'),{type:'bar',
    data:{labels:labels.map(k=>gunlukMu?k.substring(8,10)+'.'+k.substring(5,7):k),datasets:[
      {label:'Gelir',data:labels.map(k=>Math.round(veriMap[k].g)),backgroundColor:'#14b8a6',borderRadius:6,borderSkipped:false,maxBarThickness:28,order:2},
      {label:'Gider',data:labels.map(k=>Math.round(veriMap[k].d)),backgroundColor:'#f59e0b',borderRadius:6,borderSkipped:false,maxBarThickness:28,order:2},
      {label:'Net',type:'line',data:labels.map(k=>Math.round(veriMap[k].g-veriMap[k].d)),borderColor:'#6366f1',backgroundColor:'#6366f1',borderWidth:2.5,tension:.35,pointRadius:3,pointHoverRadius:5,order:1}
    ]},
    options:_rpSecenek(T,{legend:true})});

  // Dağılım grafikleri (halka + yüzdeli sıralı liste)
  const gelirKat={},giderKat={};
  yv.forEach(i=>{
    if(i.tur==='satis')gelirKat[i.kat||'Diğer']=(gelirKat[i.kat||'Diğer']||0)+hrkTutar(i);
    else if(i.tur==='gider')giderKat[i.kat||'Diğer']=(giderKat[i.kat||'Diğer']||0)+hrkTutar(i);
    else if(i.tur==='giris')giderKat['Hammadde']=(giderKat['Hammadde']||0)+hrkTutar(i);
  });
  gelirP=_rpDonut('gelir-pie','gelir-liste',gelirKat,gelirP,T);
  giderP=_rpDonut('gider-pie','gider-liste',giderKat,giderP,T);

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
  if(!basEl.value)basEl.value=yerel().slice(0,4)+'-01-01';
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
  const T=_rpTema();
  const kcv=document.getElementById('kasa-chart').getContext('2d');
  const grad=kcv.createLinearGradient(0,0,0,280);grad.addColorStop(0,'rgba(99,102,241,.35)');grad.addColorStop(1,'rgba(99,102,241,0)');
  const sec=_rpSecenek(T,{legend:true});
  kasaC=new Chart(document.getElementById('kasa-chart'),{
    type:'bar',
    data:{labels:gunler.map(g=>g.substring(8,10)+'.'+g.substring(5,7)),datasets:[
      {label:'Giriş',data:gunler.map(g=>Math.round(gunMap[g].gir)),backgroundColor:'#14b8a6',borderRadius:6,borderSkipped:false,maxBarThickness:24,order:2},
      {label:'Çıkış',data:gunler.map(g=>Math.round(gunMap[g].cik)),backgroundColor:'#f59e0b',borderRadius:6,borderSkipped:false,maxBarThickness:24,order:2},
      {label:'Bakiye',data:bakList,type:'line',borderColor:'#6366f1',backgroundColor:grad,borderWidth:2.5,tension:.35,pointRadius:2,pointHoverRadius:5,fill:true,order:1}
    ]},
    options:sec});
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
  const H=_cariMizanHesapla('cari-rap');
  const {liste:tumL}=H;
  const TIPAD=_CARI_TIPAD;
  const gor=n=>Math.abs(n)<0.005?'<span style="color:var(--yazi3)">—</span>':para(n);
  const devirGoster=(b,a)=>{const n=b-a;return Math.abs(n)<0.005?'<span style="color:var(--yazi3)">—</span>':`${para(Math.abs(n))} <span style="font-size:10px;color:var(--yazi3)">${n>0?'B':'A'}</span>`;};
  const topB=tumL.reduce((s,x)=>s+x.bakB,0),topA=tumL.reduce((s,x)=>s+x.bakA,0);
  document.getElementById('cari-rap-met').innerHTML=`
    <div class="met"><div class="ml">Toplam Borç Bakiye</div><div class="mv g">${para(topB)}</div></div>
    <div class="met"><div class="ml">Toplam Alacak Bakiye</div><div class="mv z">${para(topA)}</div></div>
    <div class="met"><div class="ml">Fark (Borç − Alacak)</div><div class="mv k">${para(Math.abs(topB-topA))} <span style="font-size:11px;font-weight:400">${Math.abs(topB-topA)<0.005?'':topB>topA?'Borç':'Alacak'}</span></div></div>`;
  const GRUP=[
    {tip:'alici',ad:'Alıcılar',ikon:'🛒',renk:'var(--yesil)'},
    {tip:'satici',ad:'Satıcılar',ikon:'🚚',renk:'var(--mavi)'},
    {tip:'personel',ad:'Personel',ikon:'👷',renk:'var(--mor)'}
  ];
  window._cariRapSatirlar=[];
  document.getElementById('cari-rap-gruplar').innerHTML=GRUP.map(g=>{
    const grupTum=cariListesi.filter(c=>c.aktif!==false&&c.tip===g.tip);
    const liste=tumL.filter(x=>x.c.tip===g.tip);
    const tB=liste.reduce((s,x)=>s+x.bakB,0),tA=liste.reduce((s,x)=>s+x.bakA,0);
    liste.sort((x,y)=>Math.abs(y.net)-Math.abs(x.net));
    const satirlar=liste.map(x=>{
      const c=x.c;
      window._cariRapSatirlar.push({Kod:c.kod||'',Ad:c.ad,Tür:TIPAD[c.tip]||c.tip,'Devir Borç':+x.dvB.toFixed(2),'Devir Alacak':+x.dvA.toFixed(2),'Borç Toplam':+x.B.toFixed(2),'Alacak Toplam':+x.A.toFixed(2),'Borç Bakiye':+x.bakB.toFixed(2),'Alacak Bakiye':+x.bakA.toFixed(2)});
      return `<tr style="cursor:pointer" onclick="cariDetayAc('${c.id}')" title="Ekstre için tıklayın">
        <td style="font-size:11px;color:var(--yazi3)">${_logEsc(c.kod||'')}</td>
        <td><span style="font-size:13px;font-weight:500">${_logEsc(c.ad)}</span>${c.telefon?` <span style="font-size:10px;color:var(--yazi3)">${_logEsc(c.telefon)}</span>`:''}</td>
        <td style="text-align:right;font-size:12px;color:var(--yazi2)">${devirGoster(x.dvB,x.dvA)}</td>
        <td style="text-align:right;font-size:12px">${gor(x.B)}</td>
        <td style="text-align:right;font-size:12px">${gor(x.A)}</td>
        <td style="text-align:right;font-weight:600;background:rgba(34,160,107,.06)">${gor(x.bakB)}</td>
        <td style="text-align:right;font-weight:600;background:rgba(198,40,40,.05)">${gor(x.bakA)}</td>
        <td style="width:90px"><button class="btn sm" style="white-space:nowrap" onclick="event.stopPropagation();cariDetayAc('${c.id}')">Ekstre →</button></td>
      </tr>`;}).join('');
    return `<details open style="margin-bottom:12px;border:1px solid var(--border);border-radius:12px;background:var(--beyaz);overflow:hidden">
      <summary style="cursor:pointer;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-left:5px solid ${g.renk};background:var(--krem)">
        <span style="font-size:15px;font-weight:600;color:var(--yazi)">${g.ikon} ${g.ad}</span>
        <span style="font-size:11px;color:var(--yazi3)">${liste.length} / ${grupTum.length} kart</span>
        <span style="margin-left:auto;display:flex;gap:16px;flex-wrap:wrap;font-size:12px">
          <span><span style="color:var(--yazi3)">Borç Bakiye</span> <b>${para(tB)}</b></span>
          <span><span style="color:var(--yazi3)">Alacak Bakiye</span> <b>${para(tA)}</b></span>
        </span>
      </summary>
      <div class="tw"><table>
        <thead><tr><th>Kod</th><th>Ad</th><th style="text-align:right">Devir (B/A)</th><th style="text-align:right">Borç Toplam</th><th style="text-align:right">Alacak Toplam</th><th style="text-align:right">Borç Bakiye</th><th style="text-align:right">Alacak Bakiye</th><th></th></tr></thead>
        <tbody>${satirlar||'<tr><td colspan="8" class="bos">Bu filtreyle kayıt yok</td></tr>'}</tbody>
      </table></div>
    </details>`;}).join('');
};
window.cariRapExcel=function(){
  const s=window._cariRapSatirlar||[];
  if(!s.length){bil('Aktarılacak kayıt yok','err');return;}
  _cariXlsx(s,'borc_alacak_listesi','Borç Alacak');
};
function _cariXlsx(s,dosya,sayfa){
  const t=k=>+s.reduce((x,r)=>x+(r[k]||0),0).toFixed(2);
  const veri=s.concat([{Kod:'',Ad:'TOPLAM',Tür:'','Devir Borç':t('Devir Borç'),'Devir Alacak':t('Devir Alacak'),'Borç Toplam':t('Borç Toplam'),'Alacak Toplam':t('Alacak Toplam'),'Borç Bakiye':t('Borç Bakiye'),'Alacak Bakiye':t('Alacak Bakiye')}]);
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.json_to_sheet(veri);ws['!cols']=[{wch:10},{wch:34},{wch:11},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws,sayfa);

  XLSX.writeFile(wb,`${dosya}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ===== CARİ MİZAN (muhasebe düzeni: Borç / Alacak toplamları ve bakiyeleri) =====
// Borç sütunu = kayıtlı 'alacak' hareketler, Alacak sütunu = kayıtlı 'borc' hareketler (muavin/ekstre ile aynı).
// Satıcıya yaptığımız alış → satıcının ALACAK'ı; tahsilat/ödeme → BORÇ. Bakiye = Borç − Alacak (pozitif: Borç bakiye, negatif: Alacak bakiye).
const _CARI_TIPAD={alici:'Alıcı',satici:'Satıcı',personel:'Personel'};
function _cariMizanHesapla(p){
  const ara=(document.getElementById(p+'-ara')?.value||'').toLocaleLowerCase('tr-TR');
  const tipFil=document.getElementById(p+'-tur')?.value||'';
  const bakFil=document.getElementById(p+'-bakiye')?.value??'var';
  const bE=document.getElementById(p+'-bas'),tE=document.getElementById(p+'-bit');
  if(bE&&!bE.dataset.ilk){bE.dataset.ilk='1';const d=new Date();bE.value=d.getFullYear()+'-01-01';tE.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  const bas=bE?.value||'',bit=tE?.value||'';
  const m={},dv={};
  cariHareketler.forEach(h=>{
    if(bit&&h.tarih>bit)return;
    const t=parseFloat(h.tutar||0),borc=h.tip==='alacak';
    const o=(bas&&h.tarih<bas)?(dv[h.cari_id]||(dv[h.cari_id]={b:0,a:0})):(m[h.cari_id]||(m[h.cari_id]={b:0,a:0,say:0}));
    if(borc)o.b+=t;else o.a+=t;
    if(o.say!==undefined)o.say++;
  });
  const liste=[];
  cariListesi.filter(c=>c.aktif!==false).forEach(c=>{
    if(tipFil&&c.tip!==tipFil)return;
    if(ara&&!((c.ad||'').toLocaleLowerCase('tr-TR').includes(ara)||(c.kod||'').toLocaleLowerCase('tr-TR').includes(ara)))return;
    const d=dv[c.id]||{b:0,a:0},v=m[c.id]||{b:0,a:0,say:0};
    const net=(d.b-d.a)+(v.b-v.a);
    const x={c,dvB:d.b,dvA:d.a,B:v.b,A:v.a,net,bakB:net>0.005?net:0,bakA:net<-0.005?-net:0};
    if(bakFil==='var'&&Math.abs(net)<0.005)return;
    if(bakFil==='borcb'&&!(net>0.005))return;
    if(bakFil==='alacakb'&&!(net<-0.005))return;
    if(bakFil==='sifir'&&!(Math.abs(net)<0.005&&(v.say>0||dv[c.id])))return;
    liste.push(x);
  });
  return {liste,bas,bit};
}
window.renderCariMizan=async function(){
  raporIsyeriDoldur();
  if(!cariHareketler.length||_cariHareketIsyeri!==raporIsyeri())await cariHareketYukle();
  const {liste}=_cariMizanHesapla('mz');
  liste.sort((x,y)=>String(x.c.kod||'').localeCompare(String(y.c.kod||''),'tr',{numeric:true})||String(x.c.ad).localeCompare(String(y.c.ad),'tr'));
  const gor=n=>Math.abs(n)<0.005?'':para(n);
  window._mizanSatirlar=liste.map(x=>({Kod:x.c.kod||'',Ad:x.c.ad,Tür:_CARI_TIPAD[x.c.tip]||x.c.tip||'','Devir Borç':+x.dvB.toFixed(2),'Devir Alacak':+x.dvA.toFixed(2),'Borç Toplam':+x.B.toFixed(2),'Alacak Toplam':+x.A.toFixed(2),'Borç Bakiye':+x.bakB.toFixed(2),'Alacak Bakiye':+x.bakA.toFixed(2)}));
  const t=f=>liste.reduce((s,x)=>s+x[f],0);
  const tdn='style="text-align:right;font-size:12px;white-space:nowrap"';
  document.getElementById('mz-tablo').innerHTML=`<div class="tw" style="max-height:calc(100vh - 290px);overflow:auto"><table style="width:100%">
    <thead style="position:sticky;top:0;z-index:2"><tr><th>Cari Kodu</th><th>Ad</th><th>Tür</th><th style="text-align:right">Devir Borç</th><th style="text-align:right">Devir Alacak</th><th style="text-align:right">Borç Toplam</th><th style="text-align:right">Alacak Toplam</th><th style="text-align:right">Borç Bakiye</th><th style="text-align:right">Alacak Bakiye</th></tr></thead>
    <tbody>${liste.map(x=>`<tr style="cursor:pointer" onclick="cariDetayAc('${x.c.id}')" title="Ekstre için tıklayın">
      <td style="font-size:12px;color:var(--yazi2)">${_logEsc(x.c.kod||'')}</td><td style="font-size:12px;font-weight:500">${_logEsc(x.c.ad)}</td><td style="font-size:12px">${_CARI_TIPAD[x.c.tip]||_logEsc(x.c.tip||'')}</td>
      <td ${tdn}>${gor(x.dvB)}</td><td ${tdn}>${gor(x.dvA)}</td><td ${tdn}>${gor(x.B)}</td><td ${tdn}>${gor(x.A)}</td>
      <td ${tdn.replace('">','font-weight:600">')}>${gor(x.bakB)}</td><td ${tdn.replace('">','font-weight:600">')}>${gor(x.bakA)}</td></tr>`).join('')||'<tr><td colspan="9" class="bos">Bu filtreyle kayıt yok</td></tr>'}</tbody>
    <tfoot style="position:sticky;bottom:0;z-index:2"><tr style="background:var(--krem2);font-weight:700">
      <td colspan="3" style="padding:8px 10px;font-size:12px">TOPLAM (${liste.length} cari)</td>
      <td ${tdn}>${para(t('dvB'))}</td><td ${tdn}>${para(t('dvA'))}</td><td ${tdn}>${para(t('B'))}</td><td ${tdn}>${para(t('A'))}</td><td ${tdn}>${para(t('bakB'))}</td><td ${tdn}>${para(t('bakA'))}</td></tr></tfoot>
  </table></div>`;
};
window.mizanExcel=function(){
  const s=window._mizanSatirlar||[];
  if(!s.length){bil('Aktarılacak kayıt yok','err');return;}
  _cariXlsx(s,'cari_mizan','Cari Mizan');
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
