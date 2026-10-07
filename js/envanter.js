// ===== STOK ENVANTER RAPORU =====
// Her stok için, seçilen tarih aralığında (ve isteğe bağlı depoda) tüm hareketlerin özeti:
// Dönem Öncesi + Devir + Giriş (dış alım) + Transfer(+/−) − Satış − Ödenmez − İkram − Hasar − Atık − Diğer = KALAN.
// Satış/Ödenmez/İkram/Hasar/Atık kolonları, ürünlerin reçetesinden açılan hammadde sarfiyatlarını da içerir.
// Sayım: aralıktaki son sayım; Fark = Sayım − o sayım tarihindeki sistem bakiyesi (− eksik, + fazla).
// Miktarlar stoğun temel birimi cinsindendir. Değerler "Tutar" görünümünde kayıtlı tutarlardan hesaplanır.
const ENV_KOLONLAR=[
  {k:'onceki',ad:'Dönem Öncesi'},{k:'devir',ad:'Devir'},{k:'giris',ad:'Giriş (Dış Alım)'},
  {k:'trfArti',ad:'+ Transfer'},{k:'trfEksi',ad:'− Transfer'},{k:'satis',ad:'Satış'},{k:'odenmez',ad:'Ödenmez'},
  {k:'ikram',ad:'İkram'},{k:'hasar',ad:'Hasar'},{k:'atik',ad:'Atık'},{k:'diger',ad:'Diğer Çıkış'}
];
// tür → [kolon, işaret]
const ENV_SINIF={
  devir:['devir',1],giris:['giris',1],transfer_giris:['trfArti',1],transfer_cikis:['trfEksi',-1],
  satis:['satis',-1],satis_sarfiyat:['satis',-1],odenmez:['odenmez',-1],odenmez_sarfiyat:['odenmez',-1],
  ikram:['ikram',-1],ikram_sarfiyat:['ikram',-1],hasar:['hasar',-1],hasar_sarfiyat:['hasar',-1],
  atik:['atik',-1],atik_sarfiyat:['atik',-1],cikis:['diger',-1],uretim_sarfiyat:['diger',-1]
};
const ENV_TUR_ADLARI={devir:'Devir',giris:'Giriş (Alış)',transfer_giris:'Transfer Giriş',transfer_cikis:'Transfer Çıkış',
  satis:'Satış',satis_sarfiyat:'Satış (reçeteden)',odenmez:'Ödenmez',odenmez_sarfiyat:'Ödenmez (reçeteden)',
  ikram:'İkram',ikram_sarfiyat:'İkram (reçeteden)',hasar:'Hasar',hasar_sarfiyat:'Hasar (reçeteden)',
  atik:'Atık',atik_sarfiyat:'Atık (reçeteden)',cikis:'Çıkış',uretim_sarfiyat:'Üretim Sarfiyatı',sayim:'Sayım'};
let _envSonSatirlar=[],_envSonGorunum='miktar';

const _envMaliyet=s=>{const f=typeof stokBirimMaliyet==='function'?stokBirimMaliyet(s.id):parseFloat(s.maliyet);return parseFloat(f)||0;};
const _envBos=()=>({onceki:0,devir:0,giris:0,trfArti:0,trfEksi:0,satis:0,odenmez:0,ikram:0,hasar:0,atik:0,diger:0});
const _envKalan=o=>o.onceki+o.devir+o.giris+o.trfArti-o.trfEksi-o.satis-o.odenmez-o.ikram-o.hasar-o.atik-o.diger;
const _envTutar=i=>{
  if(i.tutar!==null&&i.tutar!==undefined&&i.tutar!=='')return parseFloat(i.tutar)||0;
  return (parseFloat(i.miktar)||0)*(parseFloat(i.fiyat)||0);
};

function envanterHesapla(bas,bit,depoF){
  const ana=anaDepoId();
  const satir={};
  const al=sid=>satir[sid]||(satir[sid]={m:_envBos(),t:_envBos(),sayimM:0,sayimT:0,sayimVar:false,farkM:0,hareket:false});
  // Başlangıç stoğu Ana Depo'ya aittir (dönem öncesi sayılır)
  if(!depoF||depoF===ana){
    stoklar.forEach(s=>{
      if(s.tip!=='stok')return;
      const b=parseFloat(s.baslangic||0);
      if(b){const o=al(s.id);o.m.onceki+=b;o.t.onceki+=b*_envMaliyet(s);}
    });
  }
  const sayimlar={}; // "stok|depo" → {tarih: {m,t}}
  islemler.forEach(i=>{
    if(!i.stok_id)return;
    const depo=i.depo_id||ana;
    if(depoF&&depo!==depoF)return;
    if(i.tur==='sayim'){
      if(i.tarih<bas||i.tarih>bit)return;
      const k=i.stok_id+'|'+depo;
      const g=sayimlar[k]||(sayimlar[k]={});
      const d=g[i.tarih]||(g[i.tarih]={m:0,t:0});
      d.m+=(parseFloat(i.miktar)||0)*birimTemelCarp(i.birim_id);d.t+=_envTutar(i);
      return;
    }
    const sn=ENV_SINIF[i.tur];if(!sn)return;
    const [kol,isaret]=sn;
    const mik=(parseFloat(i.miktar)||0)*birimTemelCarp(i.birim_id);
    const tut=_envTutar(i);
    const o=al(i.stok_id);
    if(i.tarih<bas){o.m.onceki+=isaret*mik;o.t.onceki+=isaret*tut;}
    else if(i.tarih<=bit){o.m[kol]+=mik;o.t[kol]+=tut;o.hareket=true;}
  });
  // Sayım: her (stok, depo) için aralıktaki SON sayım tarihi ve o tarihteki sistem bakiyesi
  const sayimTarih={},bakiye={};
  Object.entries(sayimlar).forEach(([k,g])=>{sayimTarih[k]=Object.keys(g).sort().pop();bakiye[k]=0;});
  if(Object.keys(sayimTarih).length){
    islemler.forEach(i=>{
      if(!i.stok_id)return;
      const sn=ENV_SINIF[i.tur];if(!sn)return;
      const depo=i.depo_id||ana;
      const k=i.stok_id+'|'+depo;
      if(!(k in sayimTarih)||i.tarih>sayimTarih[k])return;
      bakiye[k]+=sn[1]*(parseFloat(i.miktar)||0)*birimTemelCarp(i.birim_id);
    });
    stoklar.forEach(s=>{ // başlangıç stoğu ana depo bakiyesine dahil
      const k=s.id+'|'+ana;
      if(k in bakiye)bakiye[k]+=parseFloat(s.baslangic||0);
    });
    Object.entries(sayimlar).forEach(([k,g])=>{
      const sid=k.split('|')[0];const d=g[sayimTarih[k]];
      const o=al(sid);
      o.sayimVar=true;o.sayimM+=d.m;o.sayimT+=d.t;o.farkM+=d.m-bakiye[k];
    });
  }
  return satir;
}
const _envFmt=(v,gorunum)=>{
  if(Math.abs(v)<0.0005)return '';
  return gorunum==='tutar'?_irsSayi(v):(+v).toLocaleString('tr-TR',{maximumFractionDigits:3});
};

window.envanterAc=function(){
  const bas=document.getElementById('env-bas'),bit=document.getElementById('env-bit');
  if(bas&&!bas.value)bas.value=`${new Date().getFullYear()}-01-01`;
  if(bit&&!bit.value)bit.value=bugun();
  renderEnvanter();
};
window.renderEnvanter=function(){
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const tbEl=document.getElementById('env-tb'),thEl=document.getElementById('env-th');
  if(!bas||!bit||bas>bit){thEl.innerHTML='';tbEl.innerHTML='<tr><td class="bos">Geçerli bir tarih aralığı seçin.</td></tr>';return;}
  // Depo filtresi
  const sel=document.getElementById('env-depo');const seciliDepo=sel.value;
  const depoKapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar).filter(d=>d.aktif!==false);
  sel.innerHTML='<option value="">Tüm depolar</option>'+depoKapsam.map(d=>`<option value="${d.id}"${d.id===seciliDepo?' selected':''}>${d.ad}${d.ana_depo?' (Ana Depo)':''}</option>`).join('');
  sel.value=seciliDepo;
  const gorunum=document.getElementById('env-gorunum').value; // miktar | tutar
  const ara=(document.getElementById('env-ara').value||'').trim().toLocaleLowerCase('tr');
  const gizle=document.getElementById('env-gizle').checked;
  const hesap=envanterHesapla(bas,bit,seciliDepo);
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const satirlar=[];
  kapsam.forEach(s=>{
    if(ara&&!(s.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(s.kod||'').toLowerCase().includes(ara))return;
    const o=hesap[s.id];
    if(!o){if(!gizle)satirlar.push({stok:s,o:{m:_envBos(),t:_envBos(),sayimM:0,sayimT:0,sayimVar:false,farkM:0,hareket:false}});return;}
    const kalanM=_envKalan(o.m);
    if(gizle&&!o.hareket&&Math.abs(kalanM)<0.0005&&!o.sayimVar&&Math.abs(o.m.onceki)<0.0005)return;
    satirlar.push({stok:s,o});
  });
  satirlar.sort((a,b)=>(a.stok.kod||'').localeCompare(b.stok.kod||''));
  _envSonSatirlar=satirlar;_envSonGorunum=gorunum;
  // Boş "Diğer Çıkış" kolonunu gizle
  const digerVar=satirlar.some(r=>Math.abs(r.o.m.diger)>=0.0005);
  const kolonlar=ENV_KOLONLAR.filter(c=>c.k!=='diger'||digerVar);
  const v=(o,k)=>gorunum==='tutar'?o.t[k]:o.m[k];
  thEl.innerHTML=`<tr><th style="width:100px">Kod</th><th style="min-width:180px">Stok</th><th style="width:55px">Birim</th>`
    +kolonlar.map(c=>`<th style="text-align:right">${c.ad}</th>`).join('')
    +`<th style="text-align:right">KALAN</th><th style="text-align:right">Sayım</th><th style="text-align:right">Fark</th></tr>`;
  const toplam={};kolonlar.forEach(c=>toplam[c.k]=0);let tKalan=0,tSayim=0,tFark=0;
  tbEl.innerHTML=satirlar.map(r=>{
    const {stok,o}=r;
    const tb=birimler.find(b=>b.id===stok.birim_id);
    const kalan=gorunum==='tutar'?_envKalan(o.t):_envKalan(o.m);
    const sayim=gorunum==='tutar'?o.sayimT:o.sayimM;
    const fark=gorunum==='tutar'?o.farkM*_envMaliyet(stok):o.farkM;
    kolonlar.forEach(c=>toplam[c.k]+=v(o,c.k));tKalan+=kalan;if(o.sayimVar){tSayim+=sayim;tFark+=fark;}
    const renkFark=fark<-0.0005?'color:#c62828;font-weight:600':fark>0.0005?'color:var(--yesil);font-weight:600':'';
    return `<tr onclick="envanterDetayAc('${stok.id}')" style="cursor:pointer" title="Hareket dökümü için tıklayın">
      <td class="tree-kod">${stok.kod||''}</td><td>${stok.ad}</td><td>${tb?.kisaltma||''}</td>
      ${kolonlar.map(c=>`<td style="text-align:right">${_envFmt(v(o,c.k),gorunum)}</td>`).join('')}
      <td style="text-align:right;font-weight:600;${kalan<-0.0005?'color:#c62828':''}">${_envFmt(kalan,gorunum)}</td>
      <td style="text-align:right">${o.sayimVar?(Math.abs(sayim)<0.0005?'0':_envFmt(sayim,gorunum)):''}</td>
      <td style="text-align:right;${renkFark}">${o.sayimVar?(Math.abs(fark)<0.0005?'0':_envFmt(fark,gorunum)):''}</td>
    </tr>`;
  }).join('')||`<tr><td colspan="${6+kolonlar.length}" class="bos">Kayıt yok</td></tr>`;
  // Toplam satırı sadece Tutar görünümünde anlamlı (farklı birimler toplanamaz)
  if(gorunum==='tutar'&&satirlar.length){
    tbEl.innerHTML+=`<tr style="background:var(--krem2);font-weight:600"><td></td><td>TOPLAM</td><td></td>
      ${kolonlar.map(c=>`<td style="text-align:right">${_envFmt(toplam[c.k],'tutar')}</td>`).join('')}
      <td style="text-align:right">${_envFmt(tKalan,'tutar')}</td><td style="text-align:right">${_envFmt(tSayim,'tutar')}</td><td style="text-align:right">${_envFmt(tFark,'tutar')}</td></tr>`;
  }
  const oz=document.getElementById('env-ozet');
  if(oz)oz.textContent=`${satirlar.length} stok kalemi · ${bas} – ${bit}`+(anaDepoId()?'':' · ⚠ Ana depo tanımlı değil');
};
// ===== HAREKET DÖKÜMÜ (bir stok için) =====
window.envanterDetayAc=function(stokId){
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const depoF=document.getElementById('env-depo').value;
  const ana=anaDepoId();
  const stok=stoklar.find(s=>s.id===stokId);if(!stok)return;
  const tb=birimler.find(b=>b.id===stok.birim_id);const bk=tb?.kisaltma||'';
  let onceki=(!depoF||depoF===ana)?(parseFloat(stok.baslangic||0)):0;
  const hareketler=[];
  islemler.forEach(i=>{
    if(i.stok_id!==stokId)return;
    const depo=i.depo_id||ana;
    if(depoF&&depo!==depoF)return;
    const sn=ENV_SINIF[i.tur];
    if(!sn&&i.tur!=='sayim')return;
    if(i.tur==='sayim'&&(i.tarih<bas||i.tarih>bit))return;
    const mik=(parseFloat(i.miktar)||0)*birimTemelCarp(i.birim_id);
    if(sn&&i.tarih<bas){onceki+=sn[1]*mik;return;}
    if(i.tarih>bit)return;
    hareketler.push({i,depo,mik,isaret:sn?sn[1]:0});
  });
  hareketler.sort((a,b)=>(a.i.tarih||'').localeCompare(b.i.tarih||'')||(a.i.ts||0)-(b.i.ts||0));
  const f=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});
  let bakiye=onceki;
  const satirlar=hareketler.map(({i,depo,mik,isaret})=>{
    if(isaret)bakiye+=isaret*mik;
    const urun=i.urun_id?urunler.find(u=>u.id===i.urun_id)?.ad:'';
    const kaynak=i.tur==='sayim'?(i.satir_not||''):(urun?`Ürün: ${urun}`:'');
    const belge=i.belge_no?`No: ${i.belge_no}`:'';
    return `<tr>
      <td style="font-size:11px;white-space:nowrap">${i.tarih}</td>
      <td style="font-size:12px">${ENV_TUR_ADLARI[i.tur]||i.tur}${i.alt_tur&&TRF_TIP_ADLARI[i.alt_tur]?` <span style="font-size:10px;color:var(--yazi3)">(${TRF_TIP_ADLARI[i.alt_tur]})</span>`:''}</td>
      <td style="font-size:12px">${_depoAd(depo)}</td>
      <td style="font-size:11px;color:var(--yazi2)">${_logEsc([kaynak,belge].filter(Boolean).join(' · '))}</td>
      <td style="text-align:right;${isaret<0?'color:#c62828':isaret>0?'color:var(--yesil)':''}">${isaret===0?f(mik)+' (sayım)':(isaret>0?'+':'−')+f(mik)}</td>
      <td style="text-align:right;color:var(--yazi3)">${isaret?_irsSayi(_envTutar(i)):''}</td>
      <td style="text-align:right;font-weight:500">${isaret?f(bakiye):''}</td>
    </tr>`;
  }).join('');
  document.getElementById('env-detay-baslik').textContent=`${stok.ad} — Hareket Dökümü`;
  document.getElementById('env-detay-icerik').innerHTML=`
    <div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">${bas} – ${bit}${depoF?' · '+_depoAd(depoF):' · Tüm depolar'} · Birim: ${bk}</div>
    <div class="tw" style="max-height:55vh;overflow-y:auto"><table>
      <thead><tr><th>Tarih</th><th>Hareket</th><th>Depo</th><th>Kaynak / Not</th><th style="text-align:right">Miktar</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>
      <tbody>
        <tr style="background:var(--krem2)"><td colspan="6" style="font-size:12px">Dönem öncesi bakiye</td><td style="text-align:right;font-weight:600">${f(onceki)}</td></tr>
        ${satirlar||'<tr><td colspan="7" class="bos">Bu aralıkta hareket yok</td></tr>'}
      </tbody></table></div>`;
  modalAc('modal-envanter-detay');
};
// ===== EXCEL =====
window.envanterExcelIndir=function(){
  if(!_envSonSatirlar.length){bil('İndirilecek veri yok','err');return;}
  const gorunum=_envSonGorunum;
  const digerVar=_envSonSatirlar.some(r=>Math.abs(r.o.m.diger)>=0.0005);
  const kolonlar=ENV_KOLONLAR.filter(c=>c.k!=='diger'||digerVar);
  const data=_envSonSatirlar.map(({stok,o})=>{
    const tb=birimler.find(b=>b.id===stok.birim_id);
    const r={'Kod':stok.kod||'','Stok':stok.ad,'Birim':tb?.kisaltma||''};
    kolonlar.forEach(c=>{r[c.ad]=+((gorunum==='tutar'?o.t[c.k]:o.m[c.k])).toFixed(3);});
    r['KALAN']=+(gorunum==='tutar'?_envKalan(o.t):_envKalan(o.m)).toFixed(3);
    r['Sayım']=o.sayimVar?+(gorunum==='tutar'?o.sayimT:o.sayimM).toFixed(3):'';
    r['Fark']=o.sayimVar?+(gorunum==='tutar'?o.farkM*_envMaliyet(stok):o.farkM).toFixed(3):'';
    return r;
  });
  const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Stok Envanter');
  XLSX.writeFile(wb,`stok_envanter_${gorunum}_${document.getElementById('env-bas').value}_${document.getElementById('env-bit').value}.xlsx`);
};
