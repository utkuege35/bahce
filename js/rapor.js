// ===== RAPOR =====
let aylikC=null,gelirP=null,giderP=null;
function renderRapor(){
  const yilSet=new Set(islemler.map(i=>i.tarih?.substring(0,4)).filter(Boolean));const curYil=new Date().getFullYear().toString();yilSet.add(curYil);
  const yilEl=document.getElementById('rapor-yil');const secYil=yilEl.value||curYil;
  yilEl.innerHTML=[...yilSet].sort().reverse().map(y=>`<option value="${y}"${y===secYil?' selected':''}>${y}</option>`).join('');
  const yv=islemler.filter(i=>i.tarih?.startsWith(secYil));
  const gelirT=yv.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);const giderT=yv.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);const karT=gelirT-giderT;
  document.getElementById('rapor-met').innerHTML=`<div class="met"><div class="ml">${secYil} gelir</div><div class="mv g">${para(gelirT)}</div></div><div class="met"><div class="ml">${secYil} gider</div><div class="mv d">${para(giderT)}</div></div><div class="met"><div class="ml">Net kar/zarar</div><div class="mv ${karT>=0?'k':'z'}">${para(karT)}</div></div><div class="met"><div class="ml">Kar marjı</div><div class="mv ${karT>=0?'k':'z'}">${gelirT>0?Math.round(karT/gelirT*100)+'%':'—'}</div></div>`;
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
  for(let m=0;m<12;m++){if(!ayG[m]&&!ayD[m])continue;const net=ayG[m]-ayD[m];html+=`<div style="background:var(--krem);border:1px solid var(--border);border-radius:10px;padding:.75rem"><div style="font-size:12px;font-weight:500;margin-bottom:6px">${AYLAR[m]} ${secYil}</div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Gelir</span><span style="color:var(--yesil);font-weight:500">${para(ayG[m])}</span></div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Gider</span><span style="color:var(--turuncu);font-weight:500">${para(ayD[m])}</span></div><div style="display:flex;justify-content:space-between;font-size:11px;font-weight:500;border-top:1px solid var(--border);padding-top:5px;margin-top:3px"><span>Net</span><span style="color:${net>=0?'var(--yesil)':'#c62828'}">${para(net)}</span></div></div>`;}
  document.getElementById('aylar-detay').innerHTML=html||'<p style="color:var(--yazi3);font-size:12px">Bu yıl kayıt yok</p>';
}

// PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('pwa-yukle').style.display='block';});
document.getElementById('pwa-yukle').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();const r=await deferredPrompt.userChoice;if(r.outcome==='accepted')bil('Uygulama yüklendi! ✓');deferredPrompt=null;document.getElementById('pwa-yukle').style.display='none';});
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
(async()=>{const hash=window.location.hash;if(hash.includes('type=recovery')){const params=new URLSearchParams(hash.substring(1));const at=params.get('access_token');if(at){await sb.auth.setSession({access_token:at,refresh_token:params.get('refresh_token')||''});document.getElementById('giris-wrap').style.display='none';document.getElementById('yenisifre-panel').classList.add('open');}}})();
