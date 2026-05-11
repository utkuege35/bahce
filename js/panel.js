// ===== PANEL / DASHBOARD =====
let _panelFiltre='bugun';
let _panelChart=null,_panelKasaChart=null;
let _ilSira='tarih-azalan',_ilSayfa=1;
const IL_SAYFA_BOY=25;
const ALAN_ADLARI={tarih:'Tarih',miktar:'Miktar',fiyat:'Birim Fiyat',tutar:'Tutar',satir_not:'Satır Notu',aciklama_not:'Genel Not'};

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

function renderPanel(){
  const {bas,bit}=_panelAralik();
  const aralik=islemler.filter(i=>i.tarih>=bas&&i.tarih<=bit);
  const gelir=aralik.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const gider=aralik.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const net=gelir-gider;
  const topKasa=islemler.reduce((s,i)=>s+parseFloat(i.kasa_etkisi||0),0);

  document.getElementById('panel-met').innerHTML=`
    <div class="met"><div class="ml">Gelir</div><div class="mv g">${para(gelir)}</div></div>
    <div class="met"><div class="ml">Gider</div><div class="mv d">${para(gider)}</div></div>
    <div class="met"><div class="ml">Net Kar/Zarar</div><div class="mv ${net>=0?'k':'z'}">${para(net)}</div></div>
    <div class="met"><div class="ml">Kasa Bakiyesi</div><div class="mv ${topKasa>=0?'k':'z'}">${para(topKasa)}</div></div>`;

  const gunlukMu=_panelFiltre!=='yil'&&_panelFiltre!=='ozel';
  const veriMap={};
  aralik.forEach(i=>{
    const key=gunlukMu?i.tarih:i.tarih?.substring(0,7);
    if(!key)return;
    if(!veriMap[key])veriMap[key]={gelir:0,gider:0,kasa:0};
    if(i.tur==='satis')veriMap[key].gelir+=parseFloat(i.tutar||0);
    else if(['gider','giris'].includes(i.tur))veriMap[key].gider+=parseFloat(i.tutar||0);
    veriMap[key].kasa+=parseFloat(i.kasa_etkisi||0);
  });
  const labels=Object.keys(veriMap).sort();
  const gelirData=labels.map(k=>Math.round(veriMap[k].gelir));
  const giderData=labels.map(k=>Math.round(veriMap[k].gider));

  if(_panelChart)_panelChart.destroy();_panelChart=null;
  const ctx1=document.getElementById('panel-chart');
  if(ctx1){
    if(labels.length){
      _panelChart=new Chart(ctx1,{type:'bar',data:{labels,datasets:[
        {label:'Gelir',data:gelirData,backgroundColor:'rgba(82,183,136,.75)',borderRadius:3},
        {label:'Gider',data:giderData,backgroundColor:'rgba(244,162,97,.75)',borderRadius:3}
      ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},
        scales:{x:{ticks:{font:{size:9},maxTicksLimit:14}},y:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:9}}}}}});
    }else{
      const c=ctx1.getContext('2d');c.clearRect(0,0,ctx1.width,ctx1.height);
      c.fillStyle='var(--yazi3)';c.font='12px sans-serif';c.textAlign='center';
      c.fillText('Bu dönem işlem yok',ctx1.width/2,100);
    }
  }

  if(_panelKasaChart)_panelKasaChart.destroy();_panelKasaChart=null;
  const ctx2=document.getElementById('panel-kasa-chart');
  if(ctx2&&labels.length){
    let kum=0;const kasaKum=labels.map(k=>{kum+=veriMap[k].kasa;return Math.round(kum);});
    _panelKasaChart=new Chart(ctx2,{type:'line',data:{labels,datasets:[
      {label:'Kasa',data:kasaKum,borderColor:'#1d4e89',backgroundColor:'rgba(29,78,137,.1)',borderWidth:2,pointRadius:2,fill:true}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},
      scales:{x:{ticks:{font:{size:9},maxTicksLimit:14}},y:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:9}}}}}});
  }

const alisCount=aralik.filter(i=>i.tur==='giris').length;
  const satisCount=aralik.filter(i=>i.tur==='satis').length;
  const giderCount=aralik.filter(i=>i.tur==='gider').length;
  const marj=gelir>0?Math.round(net/gelir*100):0;
  const dusukStoklar=stoklar.filter(s=>s.tip==='stok'&&s.aktif!==false&&s.min_stok>0&&stokMiktar(s.id)<=s.min_stok);
  const urunMap={};
  aralik.filter(i=>i.tur==='satis'&&i.urun_id).forEach(i=>{const u=urunler.find(x=>x.id===i.urun_id);const ad=u?.ad||'?';urunMap[ad]=(urunMap[ad]||0)+parseFloat(i.tutar||0);});
  const topSatis=Object.entries(urunMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const altEl=document.getElementById('panel-alt');
  if(altEl){
    let html=`<div class="card" style="margin-bottom:0">
      <div style="font-size:11px;font-weight:600;color:var(--yazi3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">İşlem Özeti</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--yazi2)">Alış</span><span style="font-size:13px;font-weight:600;color:var(--mavi)">${alisCount}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--yazi2)">Satış</span><span style="font-size:13px;font-weight:600;color:var(--yesil)">${satisCount}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="font-size:12px;color:var(--yazi2)">Gider</span><span style="font-size:13px;font-weight:600;color:var(--turuncu)">${giderCount}</span></div>
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--krem2)"><span style="font-size:12px;color:var(--yazi2)">Kar Marjı</span><span style="font-size:13px;font-weight:600;color:${marj>=0?'var(--yesil)':'#c62828'}">${gelir>0?marj+'%':'—'}</span></div>
      </div>
    </div>`;
    if(topSatis.length)html+=`<div class="card" style="margin-bottom:0">
      <div style="font-size:11px;font-weight:600;color:var(--yazi3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">En Çok Satan</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${topSatis.map(([ad,tutar],idx)=>`<div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:6px"><span style="width:18px;height:18px;border-radius:50%;background:${['var(--yesil)','var(--mavi)','var(--turuncu)'][idx]};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${idx+1}</span><span style="font-size:12px">${ad}</span></div><span style="font-size:12px;font-weight:500;color:var(--yesil)">${para(tutar)}</span></div>`).join('')}
      </div>
    </div>`;
    html+=`<div class="card" style="margin-bottom:0">
      <div style="font-size:11px;font-weight:600;color:var(--yazi3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Stok Durumu</div>
      ${dusukStoklar.length?dusukStoklar.slice(0,5).map(s=>{const mik=stokMiktar(s.id);const tb=birimler.find(b=>b.id===s.birim_id);return`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px">${s.ad}</span><span style="font-size:11px;font-weight:500;color:${mik<=0?'#c62828':'var(--sari)'};background:${mik<=0?'#fdecea':'var(--sari-ac)'};padding:2px 8px;border-radius:10px">${mik<=0?'Tükendi':'⚠ '+mik.toLocaleString('tr-TR',{maximumFractionDigits:1})+' '+(tb?.kisaltma||'')}</span></div>`;}).join(''):`<div style="font-size:12px;color:var(--yesil)">✓ Tüm stoklar yeterli</div>`}
    </div>`;
    altEl.innerHTML=html;
  }
}

// ===== İŞLEM LİSTESİ =====
window.renderIslemListe=function(){
  const isAdmin=aktifKullanici?.rol==='admin';
  const th=document.getElementById('il-islem-th');if(th)th.style.display=isAdmin?'':'none';
  const ara=(document.getElementById('il-ara')?.value||'').toLowerCase();
  const tur=document.getElementById('il-tur')?.value||'';
  const bas=document.getElementById('il-bas')?.value||'';
  const bit=document.getElementById('il-bit')?.value||'';
  let liste=[...islemler];
  if(tur)liste=liste.filter(i=>i.tur===tur);
  if(bas)liste=liste.filter(i=>i.tarih>=bas);
  if(bit)liste=liste.filter(i=>i.tarih<=bit);
  if(ara)liste=liste.filter(i=>(i.aciklama||'').toLowerCase().includes(ara)||(i.kat||'').toLowerCase().includes(ara)||(i.kullanici||'').toLowerCase().includes(ara)||(i.satir_not||'').toLowerCase().includes(ara));
  if(_ilSira==='tarih-artan')liste.sort((a,b)=>a.tarih>b.tarih?1:-1);
  else liste.sort((a,b)=>b.tarih>a.tarih?1:-1);

  const topGelir=liste.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const topGider=liste.filter(i=>['gider','giris'].includes(i.tur)).reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const ozEl=document.getElementById('il-ozet');
  if(ozEl)ozEl.innerHTML=`${liste.length} işlem &nbsp;·&nbsp; <span style="color:var(--yesil)">${para(topGelir)}</span> &nbsp;·&nbsp; <span style="color:var(--turuncu)">${para(topGider)}</span>`;

  const topSayfa=Math.max(1,Math.ceil(liste.length/IL_SAYFA_BOY));
  if(_ilSayfa>topSayfa)_ilSayfa=1;
  const pListe=liste.slice((_ilSayfa-1)*IL_SAYFA_BOY,_ilSayfa*IL_SAYFA_BOY);

  const rows=pListe.map(i=>{
    const cari=typeof cariListesi!=='undefined'?cariListesi.find(c=>c.id===i.cari_id):null;
    const logSayisi=(typeof islemLoglari!=='undefined'?islemLoglari:[]).filter(l=>l.islem_id===i.id).length;
    return `<tr>
      <td style="white-space:nowrap;font-size:12px">${i.tarih||''}</td>
      <td><span class="badge ${i.tur==='satis'?'g':['gider','giris'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${{satis:'Satış',gider:'Gider',giris:'Giriş',uretim:'Üretim',kasa:'Kasa',uretim_sarfiyat:'Sarfiyat'}[i.tur]||i.tur}</span></td>
      <td style="font-size:11px;max-width:180px">
        <div>${i.aciklama||i.kat||''}</div>
        ${i.satir_not?`<div style="color:var(--yazi3);font-size:10px">${i.satir_not}</div>`:''}
        ${i.aciklama_not?`<div style="color:var(--yazi3);font-size:10px;font-style:italic">${i.aciklama_not}</div>`:''}
      </td>
      <td style="font-size:11px">${cari?`<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:var(--krem2);white-space:nowrap">${cari.ad}</span>`:''}</td>
      <td style="text-align:right;font-size:11px;white-space:nowrap">${i.miktar?parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})+' '+birimAd(i.birim_id):''}</td>
      <td style="text-align:right;font-weight:500;white-space:nowrap;color:${i.tur==='satis'?'var(--yesil)':['gider','giris'].includes(i.tur)?'var(--turuncu)':'var(--yazi2)'}">${i.tutar?para(i.tutar):''}</td>
      <td style="font-size:10px;white-space:nowrap">${i.odeme_tipi==='cari'?'📋 Cari':i.odeme_tipi==='pesin'?'💵 Peşin':''}</td>
      <td style="font-size:11px;color:var(--yazi3);white-space:nowrap">${i.kullanici||''}</td>
      <td><button class="btn sm" onclick="islemGecmisAc('${i.id}')">📋${logSayisi>0?` <span style="background:var(--sari-ac);color:var(--sari);border-radius:10px;padding:0 4px;font-size:10px">${logSayisi}</span>`:''}</button></td>
      ${isAdmin?`<td style="white-space:nowrap"><button class="btn sm" onclick="islemDuzenleAc('${i.id}')">✏</button> <button class="btn sm ghost" onclick="islemSilListe('${i.id}')">✕</button></td>`:'<td></td>'}
    </tr>`;
  }).join('');
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

window.ilSirala=function(alan){_ilSira=_ilSira===alan+'-azalan'?alan+'-artan':alan+'-azalan';renderIslemListe();};
window.ilFiltreTemizle=function(){
  ['il-ara','il-bas','il-bit'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const t=document.getElementById('il-tur');if(t)t.value='';
  _ilSayfa=1;renderIslemListe();
};
window.islemSilListe=async function(id){
  if(!confirm('Bu işlemi silmek istiyor musunuz?\n(Veritabanında kalır, ekranda görünmez.)'))return;
  await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',id);
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});
  if(data)islemler=data.filter(i=>!i.silindi);
  renderIslemListe();renderPanel();kontolUyari();bil('İşlem silindi ✓');
};

// ===== İŞLEM GEÇMİŞİ =====
function islemGecmisHtml(id){
  const islem=islemler.find(x=>x.id===id);if(!islem)return '';
  const loglar=(typeof islemLoglari!=='undefined'?islemLoglari:[]).filter(l=>l.islem_id===id).sort((a,b)=>a.tarih>b.tarih?1:-1);
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

window.islemGecmisAc=function(id){
  const islem=islemler.find(x=>x.id===id);if(!islem)return;
  const turAd={giris:'Alış',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',gider:'Gider',kasa:'Kasa'}[islem.tur]||islem.tur;
  document.getElementById('ig-title').textContent=`${turAd} — ${islem.tarih} — ${islem.aciklama||''}`;
  document.getElementById('ig-icerik').innerHTML=islemGecmisHtml(id);
  modalAc('modal-islem-gecmis');
};

window.islemDuzenleAc=function(id){
  const i=islemler.find(x=>x.id===id);if(!i)return;
  document.getElementById('id-islem-id').value=id;
  const turAd={giris:'Alış',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',gider:'Gider',kasa:'Kasa'}[i.tur]||i.tur;
  document.getElementById('id-bilgi').textContent=`${turAd} — ${i.tarih} — ${i.aciklama||''} — Oluşturan: ${i.kullanici||'?'}`;
  document.getElementById('id-tarih').value=i.tarih||'';
  document.getElementById('id-miktar').value=i.miktar||'';
  document.getElementById('id-fiyat').value=i.fiyat||'';
  document.getElementById('id-tutar').value=i.tutar||'';
  document.getElementById('id-satir-not').value=i.satir_not||'';
  document.getElementById('id-not').value=i.aciklama_not||'';
  const loglar=(typeof islemLoglari!=='undefined'?islemLoglari:[]).filter(l=>l.islem_id===id);
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
  const islem=islemler.find(x=>x.id===id);if(!islem)return;
  const yeni={tarih:document.getElementById('id-tarih').value,miktar:parseFloat(document.getElementById('id-miktar').value)||null,fiyat:parseFloat(document.getElementById('id-fiyat').value)||null,tutar:parseFloat(document.getElementById('id-tutar').value)||null,satir_not:document.getElementById('id-satir-not').value||null,aciklama_not:document.getElementById('id-not').value||null};
  const eski={tarih:islem.tarih,miktar:islem.miktar,fiyat:islem.fiyat,tutar:islem.tutar,satir_not:islem.satir_not,aciklama_not:islem.aciklama_not};
  const degisti=Object.keys(yeni).some(k=>JSON.stringify(eski[k])!==JSON.stringify(yeni[k]));
  if(degisti){
    await sb.from('islem_loglari').insert({islem_id:id,degistiren:aktifKullanici?.ad||'',eski_deger:eski,yeni_deger:yeni});
    await sb.from('islemler').update(yeni).eq('id',id);
    const {data:ilog}=await sb.from('islem_loglari').select('*').order('tarih',{ascending:false});if(ilog)islemLoglari=ilog;
  }
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  modalKapat('modal-islem-duzenle');renderPanel();
  if(document.getElementById('islem-liste')?.classList.contains('active'))renderIslemListe();
  kontolUyari();bil(degisti?'İşlem güncellendi ✓':'Değişiklik yok');
};

window.islemSil=async function(id){
  if(!confirm('Bu işlemi silmek istiyor musunuz?'))return;
  await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',id);
  const {data}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(data)islemler=data.filter(i=>!i.silindi);
  renderPanel();if(document.getElementById('islem-liste')?.classList.contains('active'))renderIslemListe();kontolUyari();bil('İşlem silindi ✓');
};

window.renderPanelIslemler=function(){gp('islem-liste');};
