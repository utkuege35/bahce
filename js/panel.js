// ===== PANEL / DASHBOARD =====
let _panelFiltre='bugun';
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
  const alisCount=aralik.filter(i=>i.tur==='giris').length;
  const satisCount=aralik.filter(i=>i.tur==='satis').length;
  const giderCount=aralik.filter(i=>i.tur==='gider').length;
  const alisTutar=aralik.filter(i=>i.tur==='giris').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const satisTutar=aralik.filter(i=>i.tur==='satis').reduce((s,i)=>s+parseFloat(i.tutar||0),0);
  const giderTutar=aralik.filter(i=>i.tur==='gider').reduce((s,i)=>s+parseFloat(i.tutar||0),0);

  // Kar marjı
  const marj=gelir>0?Math.round(net/gelir*100):0;

  document.getElementById('panel-met').innerHTML=`
    <div class="met"><div class="ml">Gelir</div><div class="mv g">${para(gelir)}</div></div>
    <div class="met"><div class="ml">Gider</div><div class="mv d">${para(gider)}</div></div>
    <div class="met"><div class="ml">Net Kar/Zarar</div><div class="mv ${net>=0?'k':'z'}">${para(net)}</div></div>
    <div class="met"><div class="ml">Kasa Bakiyesi</div><div class="mv ${topKasa>=0?'k':'z'}">${para(topKasa)}</div></div>`;

  // Grafik verisi
  // Grafik — tek gelir / tek gider kolonu (seçilen dönem toplamı)
  if(_panelChart)_panelChart.destroy();_panelChart=null;
  const ctx1=document.getElementById('panel-chart');
  if(ctx1){
    if(gelir>0||gider>0){
      _panelChart=new Chart(ctx1,{type:'bar',data:{
        labels:['Gelir','Gider'],
        datasets:[{
          data:[Math.round(gelir),Math.round(gider)],
          backgroundColor:['rgba(82,183,136,.8)','rgba(244,162,97,.8)'],
          borderRadius:6,barThickness:60
        }]
      },options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},
          tooltip:{callbacks:{label:v=>'₺'+v.raw.toLocaleString('tr-TR')}}},
        scales:{
          x:{ticks:{font:{size:12}}},
          y:{ticks:{callback:v=>'₺'+v.toLocaleString('tr-TR'),font:{size:9}}}
        }
      },
      plugins:[{
        id:'barLabels',
        afterDatasetsDraw(chart){
          const {ctx,data}=chart;
          chart.getDatasetMeta(0).data.forEach((bar,i)=>{
            const val=data.datasets[0].data[i];
            ctx.save();
            ctx.fillStyle='#444';
            ctx.font='bold 13px sans-serif';
            ctx.textAlign='center';
            ctx.textBaseline='bottom';
            ctx.fillText('₺'+val.toLocaleString('tr-TR'),bar.x,bar.y-4);
            ctx.restore();
          });
        }
      }]
      });
    }else{
      const c=ctx1.getContext('2d');c.clearRect(0,0,ctx1.width,ctx1.height);
      c.fillStyle='#bbb';c.font='13px sans-serif';c.textAlign='center';
      c.fillText('Bu dönemde işlem yok',ctx1.width/2,ctx1.height/2);
    }
  }

  // Yardımcı pasta grafik fonksiyon yukarıda tanımlı (_doughnut)

  // En çok satılan, alınan, gider — canvas render sonrası çiz
  setTimeout(()=>{
    // En çok satılan
    const satisMap={};
    aralik.filter(i=>i.tur==='satis').forEach(i=>{
      let ad='Diğer';
      if(i.urun_id){const u=urunler.find(x=>x.id===i.urun_id);ad=u?.ad||'Ürün';}
      else if(i.stok_id){const s=stoklar.find(x=>x.id===i.stok_id);ad=s?.ad||'Stok';}
      else ad=i.aciklama||'Diğer';
      satisMap[ad]=(satisMap[ad]||0)+parseFloat(i.tutar||0);
    });
    _doughnut('panel-satis-chart',satisMap,['#2d6a4f','#52b788','#95d5b2','#b7e4c7','#1b4332'],'Bu dönem satış yok');

    // En çok alınan
    const alisMap={};
    aralik.filter(i=>i.tur==='giris').forEach(i=>{
      let ad='Diğer';
      if(i.stok_id){const s=stoklar.find(x=>x.id===i.stok_id);ad=s?.ad||'Stok';}
      else ad=i.aciklama||'Diğer';
      alisMap[ad]=(alisMap[ad]||0)+parseFloat(i.tutar||0);
    });
    _doughnut('panel-alis-chart',alisMap,['#1d4e89','#4a90d9','#74b9ff','#a8d8ff','#d0ecff'],'Bu dönem alış yok');

    // En çok gider
    const giderMap={};
    aralik.filter(i=>i.tur==='gider').forEach(i=>{
      let ad='Diğer';
      if(i.gider_kalem_id){const k=giderKalemleri.find(x=>x.id===i.gider_kalem_id);ad=k?.ad||'Gider';}
      else ad=i.aciklama||i.kat||'Diğer';
      giderMap[ad]=(giderMap[ad]||0)+parseFloat(i.tutar||0);
    });
    _doughnut('panel-gider-chart',giderMap,['#bc4a0e','#f4a261','#ffc8a0','#e76f51','#ffe0cc'],'Bu dönem gider yok');
  },50);

  // Alt bilgi kartları — stok uyarıları, işlem sayıları, en çok satan
  const dusukStoklar=stoklar.filter(s=>s.tip==='stok'&&s.aktif!==false&&s.min_stok>0&&stokMiktar(s.id)<=s.min_stok);
  const topSatisUrun=(() => {
    const urunMap={};
    aralik.filter(i=>i.tur==='satis'&&i.urun_id).forEach(i=>{
      const u=urunler.find(x=>x.id===i.urun_id);const ad=u?.ad||i.urun_id;
      urunMap[ad]=(urunMap[ad]||0)+parseFloat(i.tutar||0);
    });
    const sirali=Object.entries(urunMap).sort((a,b)=>b[1]-a[1]);
    return sirali.slice(0,3);
  })();

  const altEl=document.getElementById('panel-alt');
  if(altEl){
    let html='';
    // İşlem özeti
    html+=`<div class="card" style="margin-bottom:0">
      <div style="font-size:11px;font-weight:600;color:var(--yazi3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">İşlem Özeti</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><span style="font-size:12px;color:var(--yazi2)">Alış</span> <span style="font-size:10px;color:var(--yazi3)">(${alisCount} işlem)</span></div>
          <span style="font-size:13px;font-weight:600;color:var(--turuncu)">${alisTutar>0?para(alisTutar):'—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><span style="font-size:12px;color:var(--yazi2)">Satış</span> <span style="font-size:10px;color:var(--yazi3)">(${satisCount} işlem)</span></div>
          <span style="font-size:13px;font-weight:600;color:var(--yesil)">${satisTutar>0?para(satisTutar):'—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><span style="font-size:12px;color:var(--yazi2)">Gider</span> <span style="font-size:10px;color:var(--yazi3)">(${giderCount} işlem)</span></div>
          <span style="font-size:13px;font-weight:600;color:var(--turuncu)">${giderTutar>0?para(giderTutar):'—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--krem2)">
          <span style="font-size:12px;color:var(--yazi2)">Kar Marjı</span>
          <span style="font-size:13px;font-weight:600;color:${marj>=0?'var(--yesil)':'#c62828'}">${gelir>0?marj+'%':'—'}</span>
        </div>
      </div>
    </div>`;

    // En çok satan
    if(topSatisUrun.length){
      html+=`<div class="card" style="margin-bottom:0">
        <div style="font-size:11px;font-weight:600;color:var(--yazi3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">En Çok Satan</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${topSatisUrun.map(([ad,tutar],idx)=>`
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:18px;height:18px;border-radius:50%;background:${['var(--yesil)','var(--mavi)','var(--turuncu)'][idx]};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${idx+1}</span>
                <span style="font-size:12px;color:var(--yazi1)">${ad}</span>
              </div>
              <span style="font-size:12px;font-weight:500;color:var(--yesil)">${para(tutar)}</span>
            </div>`).join('')}
        </div>
      </div>`;
    }

    // Stok uyarıları
    html+=`<div class="card" style="margin-bottom:0">
      <div style="font-size:11px;font-weight:600;color:var(--yazi3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Stok Durumu</div>
      ${dusukStoklar.length
        ?dusukStoklar.slice(0,5).map(s=>{
            const mik=stokMiktar(s.id);const tb=birimler.find(b=>b.id===s.birim_id);
            return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:12px;color:var(--yazi1)">${s.ad}</span>
              <span style="font-size:11px;font-weight:500;color:${mik<=0?'#c62828':'var(--sari)'};background:${mik<=0?'#fdecea':'var(--sari-ac)'};padding:2px 8px;border-radius:10px">${mik<=0?'Tükendi':'⚠ '+mik.toLocaleString('tr-TR',{maximumFractionDigits:1})+' '+(tb?.kisaltma||'')}</span>
            </div>`;
          }).join('')
        :`<div style="font-size:12px;color:var(--yesil);display:flex;align-items:center;gap:6px"><span>✓</span> Tüm stoklar yeterli</div>`}
      ${dusukStoklar.length>5?`<div style="font-size:11px;color:var(--yazi3);margin-top:6px">+${dusukStoklar.length-5} daha... <span style="cursor:pointer;color:var(--yesil)" onclick="gp('stok')">Stoklar →</span></div>`:''}
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
      <td><button class="btn sm" onclick="islemDetayAc('${i.id}')" title="Detay">🔍</button></td>
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

window.islemDetayAc=function(id){
  const i=islemler.find(x=>x.id===id);if(!i)return;
  const turAd={giris:'Alış',satis:'Satış',uretim:'Üretim',uretim_sarfiyat:'Sarfiyat',gider:'Gider',kasa:'Kasa'}[i.tur]||i.tur;
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
      ${satir('Tür',`<span class="badge ${i.tur==='satis'?'g':['gider','giris'].includes(i.tur)?'d':i.tur==='uretim'?'m':'u'}">${turAd}</span>`)}
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
