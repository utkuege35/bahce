window.hrkTutar=i=>(parseFloat(i.tutar)||0)+(parseFloat(i.kdv_tutar)||0); // gelir/gider raporlarında KDV dahil tutar
// ===== PANEL / DASHBOARD =====
let _panelFiltre='ay';
let _panelChart=null,_panelGrafikler={};

function _doughnut(canvasId,dataMap,renkler,bosYazi){
  const el=document.getElementById(canvasId);
  if(!el)return;
  if(_panelGrafikler[canvasId]){try{_panelGrafikler[canvasId].destroy();}catch(e){}_panelGrafikler[canvasId]=null;}
  const entries=Object.entries(dataMap).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const toplam=entries.reduce((s,[,v])=>s+v,0);
  if(!entries.length||toplam<=0){
    el.style.display='none';
    let msg=el.parentNode.querySelector('.bos-mesaj');
    if(!msg){msg=document.createElement('div');msg.className='bos-mesaj';msg.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;font-size:12px;color:#bbb';el.parentNode.appendChild(msg);}
    msg.textContent=bosYazi;
    return;
  }
  el.style.display='';
  const msg=el.parentNode.querySelector('.bos-mesaj');if(msg)msg.remove();
  _panelGrafikler[canvasId]=new Chart(el,{
    type:'doughnut',
    data:{
      labels:entries.map(([k])=>k),
      datasets:[{
        data:entries.map(([,v])=>Math.round(v)),
        backgroundColor:renkler,
        borderWidth:2,
        borderColor:'#fff'
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{position:'right',labels:{font:{size:10},boxWidth:10,padding:5}},
        tooltip:{callbacks:{label:ctx=>{const pct=Math.round(ctx.raw/toplam*100);return ` ${ctx.label}: ₺${ctx.raw.toLocaleString('tr-TR')} (%${pct})`;}}},
        datalabels:{
          display:ctx=>ctx.dataset.data[ctx.dataIndex]/toplam>0.05,
          color:'#fff',
          font:{size:10,weight:'bold'},
          formatter:(val)=>{
            const pct=Math.round(val/toplam*100);
            return `%${pct}\n₺${val.toLocaleString('tr-TR')}`;
          },
          textAlign:'center'
        }
      }
    },
    plugins:[{
      id:'customDatalabels',
      afterDatasetsDraw(chart){
        const {ctx,data}=chart;
        const meta=chart.getDatasetMeta(0);
        meta.data.forEach((arc,i)=>{
          const val=data.datasets[0].data[i];
          const pct=Math.round(val/toplam*100);
          if(pct<6)return;
          const pos=arc.tooltipPosition();
          ctx.save();
          ctx.fillStyle='#fff';
          ctx.font='bold 12px sans-serif';
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.fillText(`%${pct}`,pos.x,pos.y-7);
          ctx.font='11px sans-serif';
          ctx.fillText(`₺${val.toLocaleString('tr-TR')}`,pos.x,pos.y+8);
          ctx.restore();
        });
      }
    }]
  });
}
let _ilSira='tarih-azalan',_ilSayfa=1,_ilAcikId=null;
const IL_SAYFA_BOY=25;
const ALAN_ADLARI={tarih:'Tarih',miktar:'Miktar',fiyat:'Birim Fiyat',tutar:'Tutar',satir_not:'Satır Notu',aciklama_not:'Genel Not'};
const ISLEM_TUR_ADLARI={giris:'Alış',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',satis_sarfiyat:'Satış Sarfiyatı',sayim:'Sayım',gider:'Gider',kasa:'Kasa',devir:'Devir',transfer_cikis:'Transfer Çıkış',transfer_giris:'Transfer Giriş',ikram:'İkram',odenmez:'Ödenmez',hasar:'Hasar',atik:'Atık',ikram_sarfiyat:'İkram Sarfiyatı',odenmez_sarfiyat:'Ödenmez Sarfiyatı',hasar_sarfiyat:'Hasar Sarfiyatı',atik_sarfiyat:'Atık Sarfiyatı'};

window.idHesapla=function(kaynak){
  const mik=parseFloat(document.getElementById('id-miktar').value)||0;
  const fiy=parseFloat(document.getElementById('id-fiyat').value)||0;
  const tut=parseFloat(document.getElementById('id-tutar').value)||0;
  if(kaynak==='miktar'||kaynak==='fiyat'){if(mik>0&&fiy>0)document.getElementById('id-tutar').value=(mik*fiy).toFixed(2);}
  else if(kaynak==='tutar'){if(mik>0&&tut>0)document.getElementById('id-fiyat').value=(tut/mik).toFixed(2);else if(fiy>0&&tut>0)document.getElementById('id-miktar').value=(tut/fiy).toFixed(4);}
};

function _panelAralik(){
  const b=d=>d.toISOString().split('T')[0];
  const bugun=new Date();
  if(_panelFiltre==='bugun')return{bas:b(bugun),bit:b(bugun)};
  if(_panelFiltre==='hafta'){const p=new Date(bugun);p.setDate(bugun.getDate()-((bugun.getDay()||7)-1));return{bas:b(p),bit:b(bugun)};}
  if(_panelFiltre==='ay')return{bas:bugun.getFullYear()+'-'+String(bugun.getMonth()+1).padStart(2,'0')+'-01',bit:b(bugun)};
  if(_panelFiltre==='yil')return{bas:bugun.getFullYear()+'-01-01',bit:b(bugun)};
  if(_panelFiltre==='ozel')return{bas:document.getElementById('pf-bas')?.value||b(bugun),bit:document.getElementById('pf-bit')?.value||b(bugun)};
  return{bas:b(bugun),bit:b(bugun)};
}

window.panelFiltre=function(tip,btn){
  _panelFiltre=tip;
  document.querySelectorAll('#panel .btn.sm').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const ozelAlan=document.getElementById('pf-ozel-alan');
  if(ozelAlan)ozelAlan.style.display=tip==='ozel'?'inline-flex':'none';
  renderPanel();
};

const _PN_YAZI='#cfe6ff',_PN_IZGARA='rgba(120,170,230,.12)';
function _pnGrad(ctx,c1,c2){
  const ch=ctx.chart,a=ch.chartArea;if(!a)return c1;
  const g=ch.ctx.createLinearGradient(0,a.top,0,a.bottom);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;
}
function _pnBos(canvas,yazi){
  canvas.style.display='none';
  let d=canvas.parentNode.querySelector('.pn-bos');
  if(!d){d=document.createElement('div');d.className='pn-bos';canvas.parentNode.appendChild(d);}
  d.textContent=yazi;
}
const _pnCizgiAd={id:'cizgiad',afterDatasetsDraw(ch){
  const c=ch.ctx;
  const yerler=[];
  ch.data.datasets.forEach((d,i)=>{
    const m=ch.getDatasetMeta(i);if(!m.data.length||m.hidden)return;
    const n=m.data.length-1,pt=m.data[n];
    yerler.push({d,x:pt.x,y:pt.y,v:d.data[n]});
  });
  yerler.sort((a,b)=>a.y-b.y);
  for(let i=1;i<yerler.length;i++)if(yerler[i].y-yerler[i-1].y<16)yerler[i].y=yerler[i-1].y+16; // üst üste binmesin
  c.save();c.font='bold 12px sans-serif';c.textAlign='right';c.textBaseline='bottom';
  yerler.forEach(o=>{
    c.fillStyle=o.d.borderColor;
    c.shadowColor=o.d.borderColor;c.shadowBlur=8;
    c.fillText(o.d.label,o.x,o.y-8);
  });c.restore();}};
function _pnDolu(canvas){canvas.style.display='';const d=canvas.parentNode.querySelector('.pn-bos');if(d)d.remove();}
function _pnBaslik(s){
  s=String(s||'').trim();
  if(s.length>3&&s===s.toLocaleUpperCase('tr-TR'))
    return s.toLocaleLowerCase('tr-TR').replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase('tr-TR'));
  return s;
}
function _pnDonut(id,map,bosYazi){
  const el=document.getElementById(id);if(!el)return;
  if(_panelGrafikler[id]){try{_panelGrafikler[id].destroy();}catch(e){}_panelGrafikler[id]=null;}
  const ent=Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(ent.length>8){const dig=ent.splice(7).reduce((s,[,v])=>s+v,0);ent.push(['Diğer',dig]);}
  const top=ent.reduce((s,[,v])=>s+v,0);
  const liste=document.getElementById(id.replace('-chart','-liste'));
  if(!top){_pnBos(el,bosYazi);if(liste)liste.innerHTML='';return;}
  _pnDolu(el);
  const renk=['#22d3ee','#3b82f6','#8b5cf6','#f59e0b','#10b981','#ec4899','#f43f5e','#a3e635','#94a3b8'];
  if(liste)liste.innerHTML=ent.map(([k,v],i)=>{const y=v/top*100;
    return `<div class="pn-gs"><div class="s1"><i class="nk" style="background:${renk[i%renk.length]}"></i><span class="ad" title="${_logEsc(k)}">${_logEsc(k)}</span><span class="tt">${para(v)}</span><span class="yz">${y<1?'<%1':'%'+Math.round(y)}</span></div><div class="pn-cubuk"><i style="width:${Math.max(2,y)}%;background:${renk[i%renk.length]}"></i></div></div>`;}).join('');
  _panelGrafikler[id]=new Chart(el,{type:'doughnut',
    data:{labels:ent.map(([k])=>k),datasets:[{data:ent.map(([,v])=>Math.round(v)),backgroundColor:renk,borderColor:'#071334',borderWidth:3,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'70%',
      plugins:{legend:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.label}: ₺${c.raw.toLocaleString('tr-TR')} (%${Math.round(c.raw/top*100)})`}}}},
    plugins:[{id:'yuzde',afterDatasetsDraw(ch){
      const c=ch.ctx,m=ch.getDatasetMeta(0);
      c.save();c.textAlign='center';c.textBaseline='middle';c.font='bold 13px sans-serif';c.fillStyle='#fff';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=4;
      m.data.forEach((arc,i)=>{
        const v=ch.data.datasets[0].data[i],y=v/top*100;if(y<6)return;
        const a=(arc.startAngle+arc.endAngle)/2,r=(arc.innerRadius+arc.outerRadius)/2;
        c.fillText('%'+Math.round(y),arc.x+Math.cos(a)*r,arc.y+Math.sin(a)*r);});
      c.restore();}},{id:'orta',afterDraw(ch){
      const m=ch.getDatasetMeta(0).data[0];if(!m)return;const x=m.x,y=m.y,c=ch.ctx;
      c.save();c.textAlign='center';c.fillStyle='#8fb4d9';c.font='11px sans-serif';c.fillText('Toplam',x,y-10);
      c.fillStyle='#fff';c.font='bold 16px sans-serif';c.fillText('₺'+Math.round(top).toLocaleString('tr-TR'),x,y+10);c.restore();}}]});
}
function _pnRing(id,oran,renk){
  const el=document.getElementById(id);if(!el)return;
  if(_panelGrafikler[id]){try{_panelGrafikler[id].destroy();}catch(e){}}
  const o=Math.max(0,Math.min(100,oran));
  _panelGrafikler[id]=new Chart(el,{type:'doughnut',data:{datasets:[{data:[o,100-o],backgroundColor:[renk,'rgba(120,170,230,.15)'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'74%',events:[],plugins:{legend:{display:false},tooltip:{enabled:false}}}});
}

async function renderPanel(){
  const {bas,bit}=_panelAralik();
  const tr=d=>d?d.split('-').reverse().join('.'):'';
  const dn=document.getElementById('pn-donem');if(dn)dn.textContent=tr(bas)+' – '+tr(bit);
  let aralik,bakiye=[];
  try{
    aralik=await islemlerAralik(bas,bit);
    const r=await sb.rpc('panel_cari_bakiyeler',{p_isyeri:aktifIsyeri?.id||null});
    if(!r.error)bakiye=r.data||[];
  }catch(e){const m=document.getElementById('panel-met');if(m)m.innerHTML=`<div class="pn-bos">Panel verisi okunamadı: ${e.message}</div>`;return;}
  const gelir=aralik.filter(i=>i.tur==='satis').reduce((s,i)=>s+hrkTutar(i),0);
  const gider=aralik.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+hrkTutar(i),0);
  const net=gelir-gider;
  const marj=(gelir>0&&net>=0)?Math.round(net/gelir*100):null;
  document.getElementById('panel-met').innerHTML=`
    <div class="pn-k"><div><div class="pn-kl">Gelir</div><div class="pn-kv g">${para(gelir)}</div><div class="pn-ks">KDV dahil</div></div></div>
    <div class="pn-k"><div><div class="pn-kl">Gider</div><div class="pn-kv d">${para(gider)}</div><div class="pn-ks">KDV dahil</div></div></div>
    <div class="pn-k"><div><div class="pn-kl">${net>=0?'Kâr':'Zarar'}</div><div class="pn-kv ${net>=0?'n':'z'}">${para(Math.abs(net))}</div><div class="pn-ks">${marj===null?'Gelir – Gider':'Kâr marjı %'+marj}</div></div>
      <div class="pn-ring"><canvas id="pn-ring"></canvas><b>${marj===null?'—':'%'+marj}</b></div></div>`;
  _pnRing('pn-ring',marj||0,'#22d3ee');

  // Gelir/Gider akışı
  const gunSay=Math.round((new Date(bit)-new Date(bas))/864e5)+1;
  const aylik=gunSay>62;
  const anahtar=t=>aylik?String(t).slice(0,7):String(t).slice(0,10);
  const gm={},dm={};
  aralik.forEach(i=>{
    const k=anahtar(i.tarih);
    if(i.tur==='satis')gm[k]=(gm[k]||0)+hrkTutar(i);
    else if(['gider','giris'].includes(i.tur))dm[k]=(dm[k]||0)+hrkTutar(i);
  });
  const etk=[...new Set([...Object.keys(gm),...Object.keys(dm)])].sort();
  const AYLAR=['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const etiket=k=>aylik?AYLAR[parseInt(k.slice(5,7),10)-1]+' '+k.slice(0,4):k.slice(8,10)+'.'+k.slice(5,7);
  if(_panelChart){_panelChart.destroy();_panelChart=null;}
  const c1=document.getElementById('panel-chart');
  if(c1){
    if(etk.length){
      _pnDolu(c1);
      const ds=(ad,m,ust,alt,kenar)=>({label:ad,data:etk.map(k=>Math.round(m[k]||0)),borderColor:kenar,backgroundColor:c=>_pnGrad(c,ust,alt),fill:true,tension:.35,borderWidth:2.5,pointRadius:3,pointBackgroundColor:kenar,pointBorderColor:'#071334'});
      _panelChart=new Chart(c1,{type:'line',data:{labels:etk.map(etiket),datasets:[
        ds('Gelir',gm,'rgba(34,211,238,.55)','rgba(34,211,238,.02)','#22d3ee'),
        ds('Gider',dm,'rgba(245,158,11,.45)','rgba(245,158,11,.02)','#f59e0b')]},
        plugins:[_pnCizgiAd],
        options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},layout:{padding:{top:22,right:14}},
          plugins:{legend:{position:'bottom',labels:{color:_PN_YAZI,boxWidth:10,font:{size:12}}},tooltip:{callbacks:{label:v=>' '+v.dataset.label+': ₺'+v.raw.toLocaleString('tr-TR')}}},
          scales:{x:{grid:{color:_PN_IZGARA},ticks:{color:_PN_YAZI,font:{size:11}}},y:{beginAtZero:true,grid:{color:_PN_IZGARA},ticks:{color:_PN_YAZI,font:{size:11},callback:v=>'₺'+v.toLocaleString('tr-TR')}}}}});
    }else _pnBos(c1,'Bu dönemde işlem yok');
  }

  // Gider dağılımı
  const giderMap={};
  aralik.filter(i=>i.tur==='gider').forEach(i=>{
    let ad='Diğer';
    if(i.gider_kalem_id){const k=giderKalemleri.find(x=>x.id===i.gider_kalem_id);ad=k?.ad||'Gider';}
    else ad=i.aciklama||i.kat||'Diğer';
    ad=_pnBaslik(ad);
    giderMap[ad]=(giderMap[ad]||0)+hrkTutar(i);
  });
  const alisT=aralik.filter(i=>i.tur==='giris').reduce((s,i)=>s+hrkTutar(i),0);
  if(alisT>0)giderMap['Malzeme alışı']=alisT;
  setTimeout(()=>{_pnDonut('panel-gider-chart',giderMap,'Bu dönem gider yok');const g=_panelGrafikler['panel-gider-chart'];if(g)g.resize();},60);

  // Bekleyen borç / alacak
  const alac=bakiye.filter(x=>x.tip==='alici'&&x.bakiye>0.005).sort((a,b)=>b.bakiye-a.bakiye);
  const borc=bakiye.filter(x=>x.tip!=='alici'&&x.bakiye>0.005).sort((a,b)=>b.bakiye-a.bakiye);
  const kart=(baslik,liste,renk,bos)=>{
    const top=liste.reduce((s,x)=>s+parseFloat(x.bakiye),0);
    const mx=liste.length?parseFloat(liste[0].bakiye):1;
    return `<div class="pn-kart"><div class="pn-kt">${baslik}</div>
      <div class="pn-toplam" style="color:${renk}">${para(top)}</div>
      ${liste.length?liste.slice(0,6).map(x=>`<div class="pn-sat"><div class="s1"><span>${_logEsc(x.ad||'')}</span><span style="font-weight:600;color:${renk}">${para(parseFloat(x.bakiye))}</span></div><div class="pn-cubuk"><i style="width:${Math.max(4,parseFloat(x.bakiye)/mx*100)}%;background:${renk}"></i></div></div>`).join('')
        +(liste.length>6?`<div class="pn-bos" style="padding:8px 0 0">+${liste.length-6} kişi/firma daha</div>`:''):`<div class="pn-bos">${bos}</div>`}</div>`;
  };
  const bel=document.getElementById('panel-borc');
  if(bel)bel.innerHTML=kart('Ödenecek Borçlar (tedarikçi / personel)',borc,'#fbbf24','Bekleyen borç yok')+kart('Tahsil Edilecek Alacaklar (müşteri)',alac,'#5eead4','Bekleyen alacak yok');
}

// ===== ORTAK BELGE GRUPLAMA / SATIR ÇİZİMİ =====
// "İşlem Listesi" (renderIslemListe) belge gruplama ve satır html'i bu yardımcılarla çizilir.

function _belgeleriGrupla(liste){
  const belgeler = [];
  const belgeMap = {};
  liste.forEach(i => {
    const key = i.belge_id || i.id;
    if (!belgeMap[key]) {
      belgeMap[key] = {key, satirlar: [], tarih: i.tarih, tur: i.tur, cari_id: i.cari_id, odeme_tipi: i.odeme_tipi, kullanici: i.kullanici, aciklama: i.aciklama, belge_no: i.belge_no, aciklama_not: i.aciklama_not, ts: i.ts};
      belgeler.push(belgeMap[key]);
    }
    belgeMap[key].satirlar.push(i);
  });
  return belgeler;
}

// acikId: o an açık olan belge key'i (accordion). toggleFn: satıra
// tıklanınca çağrılacak JS ifadesi (string, onclick içine yazılır).
// Yeni ekranlarda (fiş başlığı + tek işlemde yazım + stok kontrolü + log) yönetilen kayıtlar İşlem Listesi'nden
// düzenlenemez/silinemez; bu, stok ve belge tutarlılığını korur. Eski ekranlardan kalan kayıtlar (alt_tur boş) eskisi gibi
// buradan düzenlenebilir. Yönetildiği ekranın adını döndürür; serbest kayıtta boş döner.
const _STOK_FIS_TURLERI=/^(devir|transfer_giris|transfer_cikis|satis|satis_sarfiyat|ikram|ikram_sarfiyat|odenmez|odenmez_sarfiyat|hasar|hasar_sarfiyat|atik|atik_sarfiyat|uretim|uretim_sarfiyat|cikis)$/;
window._islemYonetilenEkran=function(i){
  if(i.fatura_id)return 'Faturalar';
  if(i.irsaliye_id)return 'İrsaliyeler';
  if(i.tur==='sayim')return 'Stok İşlemleri › Sayım';
  if(i.tur==='kasa'&&['alici_tahsilat','satici_odeme','diger_giris','diger_cikis'].includes(i.alt_tur))return 'Kasa İşlemleri';
  if(i.alt_tur&&_STOK_FIS_TURLERI.test(i.tur||''))return 'Stok İşlemleri';
  return '';
};
function _belgeSatirHtml(belge, acikId, toggleFnAdi, isAdmin){
  const acik = acikId === belge.key;
  const satirlar = belge.satirlar;
  const turler = [...new Set(satirlar.map(i => i.tur))];
  let gosterimSatirlari = satirlar;
  if (turler.length === 1 && turler[0] === 'sayim') {
    const grup = {}; const sira = [];
    satirlar.forEach(i => {
      const key = i.stok_id || i.id;
      if (!grup[key]) { grup[key] = { ...i, miktar: 0, tutar: 0 }; sira.push(key); }
      grup[key].miktar += parseFloat(i.miktar || 0);
      grup[key].tutar += parseFloat(i.tutar || 0);
    });
    gosterimSatirlari = sira.map(k => grup[k]);
  }
  const topTutar = satirlar.reduce((s, i) => s + parseFloat(i.tutar || 0), 0);
  const topMiktar = gosterimSatirlari.length === 1 ? (gosterimSatirlari[0].miktar ? parseFloat(gosterimSatirlari[0].miktar).toLocaleString('tr-TR', {maximumFractionDigits:2}) + ' ' + birimAd(gosterimSatirlari[0].birim_id) : '') : gosterimSatirlari.length + ' kalem';
  const turAd = turler.length === 1 ? (ISLEM_TUR_ADLARI[turler[0]] || turler[0]) : 'Karma';
  const badgeCls = turler[0]==='satis'?'g':['gider','giris','satis_sarfiyat'].includes(turler[0])?'d':turler[0]==='uretim'?'m':'u';
  const yonetim = satirlar.map(i=>_islemYonetilenEkran(i)).find(Boolean) || '';
  const cari = typeof cariListesi!=='undefined' ? cariListesi.find(c=>c.id===belge.cari_id) : null;
  const aciklama = gosterimSatirlari.length === 1 ? (gosterimSatirlari[0].aciklama || gosterimSatirlari[0].kat || '') : (gosterimSatirlari[0].aciklama || '') + (gosterimSatirlari.length > 1 ? ` +${gosterimSatirlari.length-1}` : '');
  const tutarRenk = turler[0]==='satis'?'var(--yesil)':['gider','giris'].includes(turler[0])?'var(--turuncu)':'var(--yazi2)';

  const detaySatirlar = gosterimSatirlari.map((i, si) => {
    const stok = stoklar.find(s => s.id === i.stok_id);
    const urun = urunler.find(u => u.id === i.urun_id);
    const kalem = typeof giderKalemleri !== 'undefined' ? giderKalemleri.find(k => k.id === i.gider_kalem_id) : null;
    const ad = stok ? stok.ad : urun ? urun.ad : kalem ? kalem.ad : i.aciklama || '—';
    const iturRenk = i.tur==='satis'?'var(--yesil)':['gider','giris','satis_sarfiyat'].includes(i.tur)?'var(--turuncu)':'var(--yazi2)';
    const satirNotGoster = turler.length===1&&turler[0]==='sayim' ? '' : (i.satir_not||'');
    return `<tr style="background:var(--krem);font-size:11px">
      <td style="padding:6px 8px;color:var(--yazi3)">${si+1}</td>
      <td style="padding:6px 8px">${ad}</td>
      <td style="padding:6px 8px;text-align:right;white-space:nowrap;color:var(--yazi3)">${birimAd(i.birim_id)||'—'}</td>
      <td style="padding:6px 8px;text-align:right;white-space:nowrap">${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:4}):''}</td>
      <td style="padding:6px 8px;text-align:right;white-space:nowrap;color:var(--yazi2)">${i.fiyat?para(i.fiyat):'—'}</td>
      <td style="padding:6px 8px;text-align:right;font-weight:500;white-space:nowrap;color:${iturRenk}">${i.tutar?para(i.tutar):''}</td>
      <td style="padding:6px 8px;font-size:10px;color:var(--yazi3)">${satirNotGoster}</td>
      <td colspan="2" style="padding:6px 8px;text-align:right;white-space:nowrap">
        ${!_islemYonetilenEkran(i)&&(isAdmin||yetkiVar('islem_liste','duzenle'))?`<button class="btn sm" style="font-size:10px" onclick="event.stopPropagation();islemDuzenleAc('${i.id}')">✏</button>`:''}
        ${!_islemYonetilenEkran(i)&&(isAdmin||yetkiVar('islem_liste','sil'))?`<button class="btn sm ghost" style="font-size:10px" onclick="event.stopPropagation();islemSilListe('${i.id}')">✕</button>`:''}
      </td>
    </tr>`;
  }).join('');

  const logSayisi = satirlar.reduce((s,i) => s + (typeof islemLoglari!=='undefined'?islemLoglari:[]).filter(l=>l.islem_id===i.id).length, 0);
  const altSatir = acik ? `<tr><td colspan="10" style="padding:0">
    <div style="background:var(--krem);border-top:2px solid var(--yesil-ac);padding:0">
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:var(--krem2);font-size:10px;color:var(--yazi3)">
          <th style="padding:4px 8px;text-align:left;width:24px">#</th>
          <th style="padding:4px 8px;text-align:left">MALZEME / ÜRÜN</th>
          <th style="padding:4px 8px;text-align:right">BİRİM</th>
          <th style="padding:4px 8px;text-align:right">MİKTAR</th>
          <th style="padding:4px 8px;text-align:right">FİYAT</th>
          <th style="padding:4px 8px;text-align:right">TUTAR</th>
          <th style="padding:4px 8px">AÇIKLAMA</th>
          <th style="padding:4px 8px" colspan="2"></th>
        </tr>
        ${detaySatirlar}
      </table>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--yesil-cok-ac);border-top:1px solid var(--border)">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
<button class="btn sm" onclick="event.stopPropagation();islemGecmisAc('${satirlar[0].id}')">📋 Geçmiş${logSayisi>0?` (${logSayisi})`:''}</button>
          <button class="btn sm sec" onclick="event.stopPropagation();belgeExcelIndir('${belge.key}')">📤 Excel'e Aktar</button>
          ${turler.length===1&&turler[0]==='sayim'&&(isAdmin||yetkiVar('islem_liste','duzenle'))?`<button class="btn sm" onclick="event.stopPropagation();sayimFisiDuzenleAc('${belge.key}')">✏ Fişi Düzenle</button>`:''}
          ${!yonetim&&!(turler.length===1&&turler[0]==='sayim')&&(isAdmin||yetkiVar('islem_liste','duzenle'))?`<button class="btn sm" onclick="event.stopPropagation();islemDuzenleAc('${satirlar[0].id}')">✏ Düzenle</button>`:''}
          ${!yonetim&&(isAdmin||yetkiVar('islem_liste','sil'))?`<button class="btn sm ghost" onclick="event.stopPropagation();islemSilListe('${satirlar[0].id}')">✕ Sil</button>`:''}
          ${yonetim&&!(turler.length===1&&turler[0]==='sayim')?`<span style="font-size:11px;color:var(--yazi3);align-self:center">🔒 ${yonetim} ekranından yönetilir</span>`:''}
        </div>
        <span style="font-size:13px;font-weight:600;color:var(--yesil)">Toplam: ${para(topTutar)}</span>
      </div>
    </div>
  </td></tr>` : '';

  return `<tr style="cursor:pointer;${acik?'background:var(--yesil-cok-ac);':''}" onclick="${toggleFnAdi}('${belge.key}')">
    <td style="white-space:nowrap;font-size:12px">${belge.tarih||''}</td>
    <td><span class="badge ${badgeCls}">${turAd}</span></td>
    <td style="font-size:11px;max-width:180px">
      <div>${aciklama}</div>
      ${belge.belge_no?`<div style="color:var(--yazi3);font-size:10px">📄 ${belge.belge_no}</div>`:''}
      ${belge.aciklama_not?`<div style="color:var(--yazi3);font-size:10px;font-style:italic">${belge.aciklama_not}</div>`:''}
    </td>
    <td style="font-size:11px">${cari?`<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:var(--krem2);white-space:nowrap">${cari.ad}</span>`:''}</td>
    <td style="text-align:right;font-size:11px;white-space:nowrap">${topMiktar}</td>
    <td style="text-align:right;font-weight:500;white-space:nowrap;color:${tutarRenk}">${para(topTutar)}</td>
    <td style="font-size:10px;white-space:nowrap">${turler[0]==='sayim'?'':(belge.odeme_tipi==='cari'?'📋 Cari':belge.odeme_tipi==='pesin'?'💵 Peşin':'')}</td>
    <td style="font-size:11px;color:var(--yazi3);white-space:nowrap">${belge.kullanici||''}</td>
    <td colspan="2" style="text-align:right">
      ${yonetim?`<span title="${yonetim} ekranından yönetilir" style="font-size:12px;opacity:.7">🔒</span>`:''}
      ${!yonetim&&(isAdmin||yetkiVar('islem_liste','duzenle'))?`<button class="btn sm" style="font-size:10px" onclick="event.stopPropagation();islemDuzenleAc('${satirlar[0].id}')">✏</button>`:''}
      ${!yonetim&&(isAdmin||yetkiVar('islem_liste','sil'))?`<button class="btn sm ghost" style="font-size:10px" onclick="event.stopPropagation();islemBelgeSilListe('${satirlar.map(s=>s.id).join(',')}')" title="Tüm fişi sil">✕</button>`:''}
      ${satirlar.length>1?`<span style="font-size:10px;background:var(--krem2);padding:1px 6px;border-radius:10px;color:var(--yazi3)">${satirlar.length} satır</span> `:''}
      <span style="font-size:12px;color:var(--yazi3)">${acik?'▲':'▼'}</span>
    </td>
  </tr>${altSatir}`;
}

// ===== İŞLEM LİSTESİ =====
let _ilCache=null;
window.ilCacheSifirla=function(){_ilCache=null;};
window.renderIslemListe=async function(){
  const isAdmin=aktifKullanici?.rol==='admin';
  const th=document.getElementById('il-islem-th');if(th)th.style.display=isAdmin?'':'none';
  const ara=(document.getElementById('il-ara')?.value||'').toLowerCase();
  const tur=document.getElementById('il-tur')?.value||'';
  const bas=document.getElementById('il-bas')?.value||'';
  const bit=document.getElementById('il-bit')?.value||'';
  // Tarih seçilmediyse son 90 gün gösterilir (tüm geçmişi her seferinde çekmemek için).
  let basS=bas,not='';
  if(!bas&&!bit){const g=new Date();g.setDate(g.getDate()-90);basS=g.toISOString().slice(0,10);not=' &nbsp;·&nbsp; <span style="color:var(--yazi3)">tarih seçilmedi: son 90 gün</span>';}
  const anahtar=`${aktifIsyeri?.id}|${tur}|${basS}|${bit}`;
  const tb=document.getElementById('il-tb');
  if(!_ilCache||_ilCache.anahtar!==anahtar){
    if(tb)tb.innerHTML='<tr><td colspan="10" class="bos">Yükleniyor...</td></tr>';
    try{_ilCache={anahtar,veri:await islemlerListe({tur,bas:basS,bit})};}
    catch(e){if(tb)tb.innerHTML=`<tr><td colspan="10" class="bos">Liste okunamadı: ${e.message}</td></tr>`;return;}
  }
  let liste=_ilCache.veri.filter(i=>i.kat!=='YM Sayım Özeti'); // YM/Ürün seviyesi özet satırları burada gösterilmez, ayrı raporu var
  if(ara)liste=liste.filter(i=>(i.aciklama||'').toLowerCase().includes(ara)||(i.kat||'').toLowerCase().includes(ara)||(i.kullanici||'').toLowerCase().includes(ara)||(i.satir_not||'').toLowerCase().includes(ara));
  if(_ilSira==='tarih-artan')liste.sort((a,b)=>a.tarih>b.tarih?1:-1);
  else liste.sort((a,b)=>b.tarih>a.tarih?1:-1);

  const topGelir=liste.filter(i=>i.tur==='satis').reduce((s,i)=>s+hrkTutar(i),0);
  const topGider=liste.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+hrkTutar(i),0);
  const ozEl=document.getElementById('il-ozet');
  if(ozEl)ozEl.innerHTML=`${liste.length} işlem &nbsp;·&nbsp; <span style="color:var(--yesil)">${para(topGelir)}</span> &nbsp;·&nbsp; <span style="color:var(--turuncu)">${para(topGider)}</span>${not}`;

  // Belge bazlı gruplama — ÖNCE tüm filtrelenmiş listeyi belgelere ayır,
  // SONRA sayfalamayı belge sayısına göre uygula. (Sayfalama ham satırlara
  // uygulanırsa, çok satırlı tek bir fiş — örn. büyük bir sayım fişi — sayfa
  // sınırında ikiye bölünüp aynı fiş birden fazla özet satırı gibi görünür.)
  const belgeler = _belgeleriGrupla(liste);

  const topSayfa=Math.max(1,Math.ceil(belgeler.length/IL_SAYFA_BOY));
  if(_ilSayfa>topSayfa)_ilSayfa=1;
  const pBelgeler=belgeler.slice((_ilSayfa-1)*IL_SAYFA_BOY,_ilSayfa*IL_SAYFA_BOY);

  const rows = pBelgeler.map(belge => _belgeSatirHtml(belge,_ilAcikId,'ilToggle',isAdmin)).join('');
    document.getElementById('il-tb').innerHTML=rows||'<tr><td colspan="10" class="bos">İşlem bulunamadı</td></tr>';

  let sayf='';
  if(topSayfa>1){
    if(_ilSayfa>1)sayf+=`<button class="btn sm" onclick="_ilSayfa=${_ilSayfa-1};renderIslemListe()">‹</button>`;
    const s=Math.max(1,_ilSayfa-2),e=Math.min(topSayfa,_ilSayfa+2);
    for(let p=s;p<=e;p++)sayf+=`<button class="btn sm${p===_ilSayfa?' active':''}" onclick="_ilSayfa=${p};renderIslemListe()">${p}</button>`;
    if(_ilSayfa<topSayfa)sayf+=`<button class="btn sm" onclick="_ilSayfa=${_ilSayfa+1};renderIslemListe()">›</button>`;
    sayf+=`<span style="font-size:11px;color:var(--yazi3);align-self:center;margin-left:4px">${_ilSayfa}/${topSayfa} sayfa</span>`;
  }
  document.getElementById('il-sayfalama').innerHTML=sayf;
};

window.ilToggle=function(id){_ilAcikId=_ilAcikId===id?null:id;renderIslemListe();};
window.ilSirala=function(alan){_ilSira=_ilSira===alan+'-azalan'?alan+'-artan':alan+'-azalan';renderIslemListe();};
window.ilFiltreTemizle=function(){
  ['il-ara','il-bas','il-bit'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const t=document.getElementById('il-tur');if(t)t.value='';
  _ilSayfa=1;renderIslemListe();
};

// ===== SEKME İÇİ GÜNLÜK ÖZET (Alış/Satış/Kasa/Üretim/Sayım/Devir sekmeleri) =====
// Her sekme açıldığında, giriş formu yerine o güne ait fişlerin özet
// listesini gösterir. "+ Yeni Fiş" ile form görünümüne geçilir.
window.islemSilListe=async function(id){
  if(!(await onay('Bu işlemi silmek istiyor musunuz?<br><small>Veritabanında kalır, ekranda görünmez.</small>','🗑️')))return;
  await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',id);
  await stokBakiyeToplamYenile();
  renderIslemListe();renderPanel();kontolUyari();
  bil('İşlem silindi ✓');
};
window.islemBelgeSilListe=async function(idsCsv){
  const ids=idsCsv.split(',').filter(Boolean);
  if(!ids.length)return;
  const mesaj=ids.length>1?`Bu fişteki ${ids.length} kaydı topluca silmek istiyor musunuz?<br><small>Veritabanında kalır, ekranda görünmez.</small>`:'Bu işlemi silmek istiyor musunuz?<br><small>Veritabanında kalır, ekranda görünmez.</small>';
  if(!(await onay(mesaj,'🗑️')))return;
  const silinmeTarihi=new Date().toISOString();
  for(const id of ids){
    await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:silinmeTarihi}).eq('id',id);
  }
  await stokBakiyeToplamYenile();
  renderIslemListe();renderPanel();kontolUyari();
  bil(ids.length>1?'Fiş silindi ✓':'İşlem silindi ✓');
};

// ===== İŞLEM GEÇMİŞİ =====
function islemGecmisHtml(islem,loglar){
  loglar=[...(loglar||[])].sort((a,b)=>a.tarih>b.tarih?1:-1);
  let html=`<div style="padding-left:18px;border-left:2px solid var(--krem2)">
    <div style="margin-bottom:12px;position:relative">
      <div style="position:absolute;left:-22px;width:10px;height:10px;border-radius:50%;background:var(--yesil);top:3px"></div>
      <div style="background:var(--yesil-cok-ac);border:1px solid var(--yesil-ac);border-radius:8px;padding:8px 12px">
        <div style="font-size:12px;font-weight:600;color:var(--yesil)">✦ Kayıt Oluşturuldu</div>
        <div style="font-size:11px;color:var(--yazi2);margin-top:3px"><strong>${islem.kullanici||'Bilinmiyor'}</strong> tarafından oluşturuldu</div>
        <div style="font-size:10px;color:var(--yazi3);margin-top:2px">${islem.tarih||''} · ${islem.aciklama||''} · Tutar: ${islem.tutar?para(islem.tutar):'—'}</div>
      </div>
    </div>`;
  loglar.forEach((l,idx)=>{
    const eski=l.eski_deger||{};const yeni=l.yeni_deger||{};
    const degisikler=Object.keys(yeni).filter(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
    if(!degisikler.length)return;
    html+=`<div style="margin-bottom:12px;position:relative">
      <div style="position:absolute;left:-22px;width:10px;height:10px;border-radius:50%;background:var(--sari);top:3px"></div>
      <div style="background:var(--sari-ac);border:1px solid #ffd60a44;border-radius:8px;padding:8px 12px">
        <div style="font-size:12px;font-weight:600;color:#856404">✎ Düzenleme #${idx+1}</div>
        <div style="font-size:11px;color:var(--yazi2);margin-top:3px"><strong>${l.degistiren||'?'}</strong> · ${new Date(l.tarih).toLocaleString('tr-TR')}</div>
        <div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">
          ${degisikler.map(k=>`<div style="display:flex;align-items:center;gap:6px;font-size:11px">
            <span style="color:var(--yazi3);min-width:80px">${ALAN_ADLARI[k]||k}</span>
            <span style="background:var(--turuncu-cok-ac);color:var(--turuncu);padding:1px 7px;border-radius:4px;text-decoration:line-through">${formatDeger(k,eski[k])}</span>
            <span>→</span>
            <span style="background:var(--yesil-cok-ac);color:var(--yesil);padding:1px 7px;border-radius:4px;font-weight:500">${formatDeger(k,yeni[k])}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  });
  if(!loglar.length)html+=`<div style="font-size:12px;color:var(--yazi3);padding:6px 0">Değişiklik kaydı yok.</div>`;
  html+='</div>';return html;
}
function formatDeger(alan,deger){if(deger===null||deger===undefined||deger==='')return '—';if(alan==='tutar'||alan==='fiyat')return para(deger);return String(deger);}

window.islemGecmisAc=async function(id){
  const islem=await islemGetir(id);if(!islem)return;
  const loglar=await islemLoglariGetir(id);
  const turAd=ISLEM_TUR_ADLARI[islem.tur]||islem.tur;
  document.getElementById('ig-title').textContent=`${turAd} — ${islem.tarih} — ${islem.aciklama||''}`;
  document.getElementById('ig-icerik').innerHTML=islemGecmisHtml(islem,loglar);
  modalAc('modal-islem-gecmis');
};

window.islemDuzenleAc=async function(id){
  const i=await islemGetir(id);if(!i)return;
  document.getElementById('id-islem-id').value=id;
  const turAd=ISLEM_TUR_ADLARI[i.tur]||i.tur;
  document.getElementById('id-bilgi').textContent=`${turAd} — ${i.tarih} — ${i.aciklama||''} — Oluşturan: ${i.kullanici||'?'}`;
  document.getElementById('id-tarih').value=i.tarih||'';
  document.getElementById('id-miktar').value=i.miktar||'';
  document.getElementById('id-fiyat').value=i.fiyat||'';
  document.getElementById('id-tutar').value=i.tutar||'';
  document.getElementById('id-satir-not').value=i.satir_not||'';
  document.getElementById('id-not').value=i.aciklama_not||'';
  const loglar=await islemLoglariGetir(id);
  if(loglar.length){
    document.getElementById('id-log-wrap').style.display='block';
    document.getElementById('id-log-liste').innerHTML=loglar.sort((a,b)=>a.tarih>b.tarih?1:-1).map(l=>{
      const eski=l.eski_deger||{};const yeni=l.yeni_deger||{};
      const degisikler=Object.keys(yeni).filter(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
      if(!degisikler.length)return '';
      return `<div style="padding:5px 0;border-bottom:1px solid var(--krem2)"><span style="font-size:10px;color:var(--yazi3)">${new Date(l.tarih).toLocaleString('tr-TR')}</span> <strong style="font-size:11px">${l.degistiren||'?'}</strong> <span style="font-size:11px;color:var(--yazi2)">→ ${degisikler.map(k=>`${ALAN_ADLARI[k]||k}: ${formatDeger(k,eski[k])} → ${formatDeger(k,yeni[k])}`).join(', ')}</span></div>`;
    }).join('');
  }else document.getElementById('id-log-wrap').style.display='none';
  modalAc('modal-islem-duzenle');
};

window.islemKaydet=async function(){
  const id=document.getElementById('id-islem-id').value;
  const islem=await islemGetir(id);if(!islem)return;
  const yeni={tarih:document.getElementById('id-tarih').value,miktar:parseFloat(document.getElementById('id-miktar').value)||null,fiyat:parseFloat(document.getElementById('id-fiyat').value)||null,tutar:parseFloat(document.getElementById('id-tutar').value)||null,satir_not:document.getElementById('id-satir-not').value||null,aciklama_not:document.getElementById('id-not').value||null};
  const eski={tarih:islem.tarih,miktar:islem.miktar,fiyat:islem.fiyat,tutar:islem.tutar,satir_not:islem.satir_not,aciklama_not:islem.aciklama_not};
  const degisti=Object.keys(yeni).some(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
  if(degisti){
    await sb.from('islem_loglari').insert({islem_id:id,degistiren:aktifKullanici?.ad||'',eski_deger:eski,yeni_deger:yeni});
    await sb.from('islemler').update(yeni).eq('id',id);
    const {data:ilog}=await sb.from('islem_loglari').select('*').order('tarih',{ascending:false});if(ilog)islemLoglari=ilog;
  }
  await stokBakiyeToplamYenile();
  modalKapat('modal-islem-duzenle');renderPanel();
  if(document.getElementById('islem-liste')?.classList.contains('active'))renderIslemListe();
  kontolUyari();bil(degisti?'İşlem güncellendi ✓':'Değişiklik yok');
};

window.islemSil=async function(id){
  if(!(await onay('Bu işlemi silmek istiyor musunuz?','🗑️')))return;
  await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',id);
  await stokBakiyeToplamYenile();
  renderPanel();if(document.getElementById('islem-liste')?.classList.contains('active'))renderIslemListe();kontolUyari();bil('İşlem silindi ✓');
};

// Bir fişin (belge) detay satırlarını — ekranda göründüğü kümülatif/toplamlı
// haliyle (sayım fişlerinde aynı stok tek satırda toplanmış) — Excel'e aktarır.
window.belgeExcelIndir=async function(belgeKey){
  const satirlar=(await belgeSatirlari(belgeKey)).filter(i=>i.kat!=='YM Sayım Özeti');
  if(!satirlar.length){bil('Veri bulunamadı','err');return;}
  const turler=[...new Set(satirlar.map(i=>i.tur))];
  let gosterim=satirlar;
  if(turler.length===1&&turler[0]==='sayim'){
    const grup={};const sira=[];
    satirlar.forEach(i=>{
      const key=i.stok_id||i.id;
      if(!grup[key]){grup[key]={...i,miktar:0,tutar:0};sira.push(key);}
      grup[key].miktar+=parseFloat(i.miktar||0);
      grup[key].tutar+=parseFloat(i.tutar||0);
    });
    gosterim=sira.map(k=>grup[k]);
  }
  const data=gosterim.map(i=>{
    const stok=stoklar.find(s=>s.id===i.stok_id);
    const urun=urunler.find(u=>u.id===i.urun_id);
    const ad=stok?stok.ad:urun?urun.ad:i.aciklama||'—';
    return {
      'Malzeme/Ürün':ad,'Kod':stok?.kod||urun?.kod||'','Birim':birimAd(i.birim_id)||'',
      'Miktar':i.miktar?+parseFloat(i.miktar).toFixed(3):'','Fiyat':i.fiyat||'','Tutar':i.tutar||''
    };
  });
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Fiş Detayı');
  const tarih=satirlar[0].tarih||'';
  const turAd=ISLEM_TUR_ADLARI[turler[0]]||turler[0]||'fis';
  XLSX.writeFile(wb,`${turAd}_${tarih}.xlsx`.replace(/\s+/g,'_'));
};
window.islemDetayAc=async function(id){
  const i=await islemGetir(id);if(!i)return;
  const turAd=ISLEM_TUR_ADLARI[i.tur]||i.tur;
  document.getElementById('idet-title').textContent=`${turAd} — ${i.tarih||''}`;
  document.getElementById('idet-alt').textContent=`${i.aciklama||i.kat||''} · ${i.kullanici||''}`;
  const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===i.cari_id):null;
  const stok=stoklar.find(s=>s.id===i.stok_id);
  const urun=urunler.find(u=>u.id===i.urun_id);
  const kalem=typeof giderKalemleri!=='undefined'?giderKalemleri.find(k=>k.id===i.gider_kalem_id):null;
  const birimAdi=birimAd(i.birim_id);
  function satir(label,val,renk){
    if(!val&&val!==0)return '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--krem2)">
      <span style="font-size:12px;color:var(--yazi3);min-width:120px">${label}</span>
      <span style="font-size:13px;font-weight:500;text-align:right;${renk?'color:'+renk:''}">${val}</span>
    </div>`;
  }
  document.getElementById('idet-icerik').innerHTML=`
    <div style="background:var(--krem);border-radius:8px;padding:.75rem 1rem">
      ${satir('Tarih',i.tarih)}
      ${satir('Tür',`<span class="badge ${i.tur==='satis'?'g':['gider','giris','satis_sarfiyat'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${turAd}</span>`)}
      ${stok?satir('Stok',`[${stok.kod}] ${stok.ad}`):''}
      ${urun?satir('Ürün',`[${urun.kod}] ${urun.ad}`):''}
      ${kalem?satir('Gider Kalemi',kalem.ad):''}
      ${i.miktar?satir('Miktar',`${parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:4})} ${birimAdi}`):''}
      ${i.fiyat?satir('Birim Fiyat',para(i.fiyat)):''}
      ${i.tutar?satir('Tutar',para(i.tutar),i.tur==='satis'?'var(--yesil)':'var(--turuncu)'):''}
      ${i.odeme_tipi?satir('Ödeme Tipi',i.odeme_tipi==='pesin'?'💵 Peşin':'📋 Cari'):''}
      ${cari?satir('Cari',`${cari.ad} (${cari.kod})`):''}
      ${i.belge_no?satir('Belge / Fatura No',i.belge_no):''}
      ${i.satir_not?satir('Satır Notu',i.satir_not):''}
      ${i.aciklama_not?satir('Genel Not',i.aciklama_not):''}
      ${satir('Oluşturan',i.kullanici||'—')}
    </div>`;
  modalAc('modal-islem-detay');
};
