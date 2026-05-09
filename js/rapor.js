// ===== RAPOR =====
let aylikC=null,gelirP=null,giderP=null,kasaC=null;

window.raporTab=function(id,btn){
  document.querySelectorAll('#rapor .tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#rapor .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('rt-'+id)?.classList.add('active');
  btn.classList.add('active');
  if(id==='genel')renderRaporGenel();
  if(id==='kasa')renderKasa();
  if(id==='personel')renderPersonelRapor();
};

function renderRapor(){renderRaporGenel();}

// ===== GENEL =====
function renderRaporGenel(){
  const yilSet=new Set(islemler.map(i=>i.tarih?.substring(0,4)).filter(Boolean));
  const curYil=new Date().getFullYear().toString();yilSet.add(curYil);
  const yilEl=document.getElementById('rapor-yil');const secYil=yilEl.value||curYil;
  yilEl.innerHTML=[...yilSet].sort().reverse().map(y=>`<option value="${y}"${y===secYil?' selected':''}>${y}</option>`).join('');
  const yv=islemler.filter(i=>i.tarih?.startsWith(secYil));
  const gelirT=yv.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const giderT=yv.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const karT=gelirT-giderT;
  document.getElementById('rapor-met').innerHTML=`
    <div class="met"><div class="ml">${secYil} gelir</div><div class="mv g">${para(gelirT)}</div></div>
    <div class="met"><div class="ml">${secYil} gider</div><div class="mv d">${para(giderT)}</div></div>
    <div class="met"><div class="ml">Net kar/zarar</div><div class="mv ${karT>=0?'k':'z'}">${para(karT)}</div></div>
    <div class="met"><div class="ml">Kar marjı</div><div class="mv ${karT>=0?'k':'z'}">${gelirT>0?Math.round(karT/gelirT*100)+'%':'—'}</div></div>`;
  const ayG=Array(12).fill(0),ayD=Array(12).fill(0);
  yv.forEach(i=>{const m=parseInt(i.tarih?.substring(5,7)||1)-1;if(i.tur==='satis')ayG[m]+=parseFloat(i.tutar||0);else if(['gider','giris'].includes(i.tur))ayD[m]+=parseFloat(i.tutar||0);});
  if(aylikC)aylikC.destroy();
  aylikC=new Chart(document.getElementById('aylik-chart'),{type:'bar',data:{labels:AYLAR.map(a=>a.substring(0,3)),datasets:[{label:'Gelir',data:ayG.map(v=>Math.round(v)),backgroundColor:'#52b788',borderRadius:3},{label:'Gider',data:ayD.map(v=>Math.round(v)),backgroundColor:'#f4a261',borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{autoSkip:false,font:{size:10}}},y:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:10}}}}}});
  const gelirKat={},giderKat={};
  yv.forEach(i=>{if(i.tur==='satis')gelirKat[i.kat||'Diğer']=(gelirKat[i.kat||'Diğer']||0)+parseFloat(i.tutar||0);else if(i.tur==='gider')giderKat[i.kat||'Diğer']=(giderKat[i.kat||'Diğer']||0)+parseFloat(i.tutar||0);else if(i.tur==='giris')giderKat['Hammadde']=(giderKat['Hammadde']||0)+parseFloat(i.tutar||0);});
  if(gelirP)gelirP.destroy();
  gelirP=new Chart(document.getElementById('gelir-pie'),{type:'doughnut',data:{labels:Object.keys(gelirKat),datasets:[{data:Object.values(gelirKat).map(v=>Math.round(v)),backgroundColor:['#2d6a4f','#52b788','#95d5b2','#b7e4c7','#1d4e89']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:8,padding:6}}}}});
  if(giderP)giderP.destroy();
  giderP=new Chart(document.getElementById('gider-pie'),{type:'doughnut',data:{labels:Object.keys(giderKat),datasets:[{data:Object.values(giderKat).map(v=>Math.round(v)),backgroundColor:['#bc4a0e','#f4a261','#1d4e89','#a8dadc','#6f3fa0','#856404']}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:8,padding:6}}}}});
  let html='';
  for(let m=0;m<12;m++){
    if(!ayG[m]&&!ayD[m])continue;const net=ayG[m]-ayD[m];
    html+=`<div style="background:var(--krem);border:1px solid var(--border);border-radius:10px;padding:.75rem">
      <div style="font-size:12px;font-weight:500;margin-bottom:6px">${AYLAR[m]} ${secYil}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Gelir</span><span style="color:var(--yesil);font-weight:500">${para(ayG[m])}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Gider</span><span style="color:var(--turuncu);font-weight:500">${para(ayD[m])}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:500;border-top:1px solid var(--border);padding-top:5px;margin-top:3px"><span>Net</span><span style="color:${net>=0?'var(--yesil)':'#c62828'}">${para(net)}</span></div>
    </div>`;
  }
  document.getElementById('aylar-detay').innerHTML=html||'<p style="color:var(--yazi3);font-size:12px">Bu yıl kayıt yok</p>';
}

// ===== KASA =====
window.renderKasa=function(){
  const basEl=document.getElementById('kasa-bas');
  const bitEl=document.getElementById('kasa-bit');
  if(!basEl.value){const bugun=new Date();basEl.value=bugun.getFullYear()+'-'+String(bugun.getMonth()+1).padStart(2,'0')+'-01';}
  if(!bitEl.value){bitEl.value=new Date().toISOString().split('T')[0];}
  const bas=basEl.value;const bit=bitEl.value;
  const aralik=islemler.filter(i=>i.tarih>=bas&&i.tarih<=bit);
  const gunMap={};
  aralik.forEach(i=>{
    const t=i.tarih;if(!t)return;
    if(!gunMap[t])gunMap[t]={gelir:0,gider:0};
    if(i.tur==='satis')gunMap[t].gelir+=parseFloat(i.tutar||0);
    else if(['gider','giris'].includes(i.tur))gunMap[t].gider+=parseFloat(i.tutar||0);
  });
  const gunler=Object.keys(gunMap).sort();
  let bakiye=0;
  const bakiyeList=[],gelirList=[],giderList=[];
  const rows=gunler.map(g=>{
    const {gelir,gider}=gunMap[g];const net=gelir-gider;bakiye+=net;
    gelirList.push(Math.round(gelir));giderList.push(Math.round(gider));bakiyeList.push(Math.round(bakiye));
    return `<tr>
      <td>${g}</td>
      <td style="color:var(--yesil);font-weight:500">${gelir?para(gelir):''}</td>
      <td style="color:var(--turuncu);font-weight:500">${gider?para(gider):''}</td>
      <td style="color:${net>=0?'var(--yesil)':'#c62828'};font-weight:500">${para(net)}</td>
      <td style="color:${bakiye>=0?'var(--mavi)':'#c62828'};font-weight:600">${para(bakiye)}</td>
    </tr>`;
  }).join('');
  document.getElementById('kasa-tb').innerHTML=rows||'<tr><td colspan="5" class="bos">Bu aralıkta işlem yok</td></tr>';
  const topGelir=aralik.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const topGider=aralik.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  document.getElementById('kasa-met').innerHTML=`
    <div class="met"><div class="ml">Toplam Gelir</div><div class="mv g">${para(topGelir)}</div></div>
    <div class="met"><div class="ml">Toplam Gider</div><div class="mv d">${para(topGider)}</div></div>
    <div class="met"><div class="ml">Net</div><div class="mv ${topGelir-topGider>=0?'k':'z'}">${para(topGelir-topGider)}</div></div>
    <div class="met"><div class="ml">Kasa Bakiyesi</div><div class="mv ${bakiye>=0?'k':'z'}">${para(bakiye)}</div></div>`;
  if(kasaC)kasaC.destroy();
  if(!gunler.length)return;
  const labels=gunler.map(g=>g.substring(5));
  kasaC=new Chart(document.getElementById('kasa-chart'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'Gelir',data:gelirList,backgroundColor:'rgba(82,183,136,.7)',borderRadius:3,order:2},
      {label:'Gider',data:giderList,backgroundColor:'rgba(244,162,97,.7)',borderRadius:3,order:2},
      {label:'Bakiye',data:bakiyeList,type:'line',borderColor:'#1d4e89',backgroundColor:'rgba(29,78,137,.1)',borderWidth:2,pointRadius:3,fill:true,order:1,yAxisID:'y1'}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},
      scales:{
        x:{ticks:{autoSkip:true,maxTicksLimit:15,font:{size:10}}},
        y:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:10}},position:'left'},
        y1:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:10}},position:'right',grid:{drawOnChartArea:false}}
      }}
  });
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
