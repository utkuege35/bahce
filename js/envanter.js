// ===== STOK ENVANTER RAPORU =====
// Seçilen DEPO için, seçilen tarih aralığında her stoğun hareketleri. Tarih aralığı ve depo seçilmeden rakam gelmez.
//  • "Dönem öncesi" yoktur: rapor sadece seçilen aralığın hareketlerini gösterir.
//  • DEVİR: sadece BAŞLANGIÇ TARİHİNDE devir fişi varsa görünür (önceki dönem sayımından üretilen devir); yoksa boştur.
//  • Her alan MİKTAR | TUTAR olarak yan yana gösterilir.
//  • KALAN = Devir + Giriş + Transfer(+) − Transfer(−) − Satış − Ödenmez − İkram − Hasar − Atık − Diğer  (bitiş tarihindeki bakiye)
//  • SAYIM: bitiş tarihinde yapılmış sayım; FARK = Sayım − Kalan (− eksik, + fazla). Bitiş tarihinde sayım yoksa ikisi de boştur.
// Satış/Ödenmez/İkram/Hasar/Atık kolonları, ürünlerin reçetesinden açılan hammadde sarfiyatlarını da içerir.
// Miktarlar stoğun temel birimi cinsindendir. Hesap veritabanında yapılır (stok_envanter fonksiyonu).
const ENV_KOLONLAR=[
  {k:'devir',ad:'Devir'},{k:'giris',ad:'Giriş (Dış Alım)'},
  {k:'trfArti',ad:'+ Transfer'},{k:'trfEksi',ad:'− Transfer'},{k:'satis',ad:'Satış'},{k:'odenmez',ad:'Ödenmez'},
  {k:'ikram',ad:'İkram'},{k:'hasar',ad:'Hasar'},{k:'atik',ad:'Atık'},{k:'diger',ad:'Diğer Çıkış'}
];
const ENV_TUR_ADLARI={devir:'Devir',giris:'Giriş (Alış)',transfer_giris:'Transfer Giriş',transfer_cikis:'Transfer Çıkış',
  satis:'Satış',satis_sarfiyat:'Satış (reçeteden)',odenmez:'Ödenmez',odenmez_sarfiyat:'Ödenmez (reçeteden)',
  ikram:'İkram',ikram_sarfiyat:'İkram (reçeteden)',hasar:'Hasar',hasar_sarfiyat:'Hasar (reçeteden)',
  atik:'Atık',atik_sarfiyat:'Atık (reçeteden)',cikis:'Çıkış',uretim_sarfiyat:'Üretim Sarfiyatı',sayim:'Sayım'};
let _envSonSatirlar=[],_envSonKolonlar=[];

const _envBos=()=>({devir:0,giris:0,trfArti:0,trfEksi:0,satis:0,odenmez:0,ikram:0,hasar:0,atik:0,diger:0});
const _envKalan=o=>o.devir+o.giris+o.trfArti-o.trfEksi-o.satis-o.odenmez-o.ikram-o.hasar-o.atik-o.diger;

// Hesap veritabanında yapılır; ekran sadece sonucu alır. Tarih/depo değişince yeniden sorgulanır,
// arama ve gizleme filtreleri önbellekten çalışır.
let _envVeri=null,_envAnahtar='';
async function envanterVeriGetir(bas,bit,depo){
  const {data,error}=await sb.rpc('stok_envanter',{p_isyeri:aktifIsyeri?.id||null,p_bas:bas,p_bit:bit,p_depo:depo});
  if(error)throw error;
  const n=x=>parseFloat(x)||0;
  const satir={};
  (data||[]).forEach(r=>{
    const m=_envBos(),t=_envBos();
    ['devir','giris','trf_arti','trf_eksi','satis','odenmez','ikram','hasar','atik','diger'].forEach(k=>{
      const kk=k==='trf_arti'?'trfArti':k==='trf_eksi'?'trfEksi':k;
      m[kk]=n(r[k+'_m']);t[kk]=n(r[k+'_t']);
    });
    satir[r.stok_id]={m,t,sayimM:n(r.sayim_m),sayimT:n(r.sayim_t),sayimVar:!!r.sayim_var,hareket:!!r.hareket,maliyet:n(r.maliyet)};
  });
  return satir;
}
// Bir stok satırının tüm hesaplanmış değerleri (miktar/tutar çiftleri)
function _envHesapla(o){
  const kalanM=_envKalan(o.m),kalanT=_envKalan(o.t);
  let farkM=null,farkT=null;
  if(o.sayimVar){
    farkM=o.sayimM-kalanM;
    // Tutar farkı: miktar farkı × birim değer (sayımın kendi birim değeri, yoksa stok maliyeti)
    const birim=o.sayimM>0?o.sayimT/o.sayimM:o.maliyet;
    farkT=farkM*birim;
  }
  return {kalanM,kalanT,farkM,farkT};
}
const _envM=v=>Math.abs(v)<0.0005?'':(+v).toLocaleString('tr-TR',{maximumFractionDigits:3});
const _envT=v=>Math.abs(v)<0.005?'':_irsSayi(v);

window.envanterAc=function(){renderEnvanter(true);};
window.renderEnvanter=async function(yenile){
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const thEl=document.getElementById('env-th'),tbEl=document.getElementById('env-tb'),oz=document.getElementById('env-ozet');
  // Depo seçim kutusu
  const sel=document.getElementById('env-depo');const seciliDepo=sel.value;
  const depoKapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar).filter(d=>d.aktif!==false);
  sel.innerHTML='<option value="">— Depo seçin —</option>'+depoKapsam.map(d=>`<option value="${d.id}"${d.id===seciliDepo?' selected':''}>${d.ad}${d.ana_depo?' (Ana Depo)':''}</option>`).join('');
  sel.value=seciliDepo;
  // Tarih aralığı VE depo seçilmeden rakam gelmez
  _envSonSatirlar=[];
  if(!bas||!bit||!seciliDepo){
    thEl.innerHTML='';
    tbEl.innerHTML='<tr><td class="bos">Raporu görmek için <strong>başlangıç tarihi</strong>, <strong>bitiş tarihi</strong> ve <strong>depo</strong> seçin.</td></tr>';
    if(oz)oz.textContent='';return;
  }
  if(bas>bit){thEl.innerHTML='';tbEl.innerHTML='<tr><td class="bos">Başlangıç tarihi bitiş tarihinden sonra olamaz.</td></tr>';if(oz)oz.textContent='';return;}
  const anahtar=`${aktifIsyeri?.id||''}|${bas}|${bit}|${seciliDepo}`;
  if(yenile===true||_envVeri===null||_envAnahtar!==anahtar){
    thEl.innerHTML='';tbEl.innerHTML='<tr><td class="bos">Hesaplanıyor...</td></tr>';
    try{_envVeri=await envanterVeriGetir(bas,bit,seciliDepo);_envAnahtar=anahtar;}
    catch(err){tbEl.innerHTML=`<tr><td class="bos">Rapor hesaplanamadı: ${_logEsc(err.message)}. Veritabanı fonksiyonları güncel mi?</td></tr>`;return;}
  }
  const ara=(document.getElementById('env-ara').value||'').trim().toLocaleLowerCase('tr');
  const gizle=document.getElementById('env-gizle').checked;
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const satirlar=[];
  kapsam.forEach(s=>{
    if(ara&&!(s.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(s.kod||'').toLowerCase().includes(ara))return;
    const o=_envVeri[s.id]||{m:_envBos(),t:_envBos(),sayimM:0,sayimT:0,sayimVar:false,hareket:false,maliyet:0};
    if(gizle&&!o.hareket&&!o.sayimVar)return;
    satirlar.push({stok:s,o,h:_envHesapla(o)});
  });
  satirlar.sort((a,b)=>(a.stok.kod||'').localeCompare(b.stok.kod||''));
  _envSonSatirlar=satirlar;
  const digerVar=satirlar.some(r=>Math.abs(r.o.m.diger)>=0.0005||Math.abs(r.o.t.diger)>=0.005);
  const kolonlar=ENV_KOLONLAR.filter(c=>c.k!=='diger'||digerVar);
  _envSonKolonlar=kolonlar;
  // İki satırlı başlık: alan adı (2 sütun) / Miktar | Tutar
  const grup=(ad,vurgu)=>`<th colspan="2" style="text-align:center;border-left:1px solid var(--border)${vurgu?';background:var(--krem2)':''}">${ad}</th>`;
  const alt=vurgu=>`<th style="text-align:right;font-size:10px;font-weight:500;border-left:1px solid var(--border)${vurgu?';background:var(--krem2)':''}">Miktar</th><th style="text-align:right;font-size:10px;font-weight:500${vurgu?';background:var(--krem2)':''}">Tutar</th>`;
  thEl.innerHTML=`<tr><th rowspan="2" style="width:90px">Kod</th><th rowspan="2" style="min-width:170px">Stok</th><th rowspan="2" style="width:50px">Birim</th>`
    +kolonlar.map(c=>grup(c.ad)).join('')+grup('KALAN',true)+grup('Sayım')+grup('Fark')+`</tr>`
    +`<tr>${kolonlar.map(()=>alt()).join('')}${alt(true)}${alt()}${alt()}</tr>`;
  const renkFark=v=>v===null?'':v<-0.0005?'color:#c62828;font-weight:600':v>0.0005?'color:var(--yesil);font-weight:600':'';
  const tops={};kolonlar.forEach(c=>tops[c.k]=0);let tKalanT=0,tSayimT=0,tFarkT=0;
  tbEl.innerHTML=satirlar.map(r=>{
    const {stok,o,h}=r;
    const tb=birimler.find(b=>b.id===stok.birim_id);
    kolonlar.forEach(c=>tops[c.k]+=o.t[c.k]);tKalanT+=h.kalanT;if(o.sayimVar){tSayimT+=o.sayimT;tFarkT+=h.farkT;}
    const hucre=(m,t,stil)=>`<td style="text-align:right;border-left:1px solid var(--krem2);${stil||''}">${m}</td><td style="text-align:right;color:var(--yazi2);${stil||''}">${t}</td>`;
    return `<tr onclick="envanterDetayAc('${stok.id}')" style="cursor:pointer" title="Hareket dökümü için tıklayın">
      <td class="tree-kod">${stok.kod||''}</td><td>${_logEsc(stok.ad)}</td><td>${tb?.kisaltma||''}</td>
      ${kolonlar.map(c=>hucre(_envM(o.m[c.k]),_envT(o.t[c.k]))).join('')}
      ${hucre(`<strong>${(+h.kalanM).toLocaleString('tr-TR',{maximumFractionDigits:3})}</strong>`,`<strong>${_irsSayi(h.kalanT)}</strong>`,'background:var(--krem2);'+(h.kalanM<-0.0005?'color:#c62828;':''))}
      ${hucre(o.sayimVar?(+o.sayimM).toLocaleString('tr-TR',{maximumFractionDigits:3}):'',o.sayimVar?_irsSayi(o.sayimT):'')}
      ${hucre(o.sayimVar?((+h.farkM).toLocaleString('tr-TR',{maximumFractionDigits:3})):'',o.sayimVar?_irsSayi(h.farkT):'',renkFark(h.farkM))}
    </tr>`;
  }).join('')||`<tr><td colspan="${3+kolonlar.length*2+6}" class="bos">Bu depo ve tarih aralığında hareket yok</td></tr>`;
  // Toplam satırı: sadece Tutar sütunlarında (farklı birimlerin miktarları toplanamaz)
  if(satirlar.length){
    tbEl.innerHTML+=`<tr style="background:var(--krem2);font-weight:600"><td></td><td>TOPLAM (tutar)</td><td></td>
      ${kolonlar.map(c=>`<td style="border-left:1px solid var(--border)"></td><td style="text-align:right">${_envT(tops[c.k])}</td>`).join('')}
      <td style="border-left:1px solid var(--border)"></td><td style="text-align:right">${_irsSayi(tKalanT)}</td>
      <td style="border-left:1px solid var(--border)"></td><td style="text-align:right">${_envT(tSayimT)}</td>
      <td style="border-left:1px solid var(--border)"></td><td style="text-align:right">${_envT(tFarkT)}</td></tr>`;
  }
  const depoAd=depolar.find(d=>d.id===seciliDepo)?.ad||'';
  if(oz)oz.textContent=`${satirlar.length} stok kalemi · ${depoAd} · ${bas} – ${bit}`;
};
// ===== HAREKET DÖKÜMÜ (bir stok için) — rapordaki kurallarla aynı =====
window.envanterDetayAc=async function(stokId){
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const depo=document.getElementById('env-depo').value;
  const stok=stoklar.find(s=>s.id===stokId);if(!stok||!depo)return;
  const tb=birimler.find(b=>b.id===stok.birim_id);const bk=tb?.kisaltma||'';
  document.getElementById('env-detay-baslik').textContent=`${stok.ad} — Hareket Dökümü`;
  const kutu=document.getElementById('env-detay-icerik');
  kutu.innerHTML='<div class="bos">Yükleniyor...</div>';
  modalAc('modal-envanter-detay');
  try{
    const {data,error}=await sb.rpc('stok_hareket_dokumu',{p_isyeri:aktifIsyeri?.id||null,p_stok:stokId,p_bas:bas,p_bit:bit,p_depo:depo});
    if(error)throw error;
    const f=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});
    let bakiye=0;
    const satirlar=(data||[]).map(r=>{
      const isaret=r.isaret||0,mik=parseFloat(r.temel_miktar)||0;
      if(isaret)bakiye+=isaret*mik;
      const urun=r.urun_id?urunler.find(u=>u.id===r.urun_id)?.ad:'';
      const kaynak=r.tur==='sayim'?(r.satir_not||''):(urun?`Ürün: ${urun}`:'');
      const belge=r.belge_no?`No: ${r.belge_no}`:'';
      return `<tr>
        <td style="font-size:11px;white-space:nowrap">${r.tarih}</td>
        <td style="font-size:12px">${ENV_TUR_ADLARI[r.tur]||r.tur}${r.alt_tur&&typeof TRF_TIP_ADLARI!=='undefined'&&TRF_TIP_ADLARI[r.alt_tur]?` <span style="font-size:10px;color:var(--yazi3)">(${TRF_TIP_ADLARI[r.alt_tur]})</span>`:''}</td>
        <td style="font-size:11px;color:var(--yazi2)">${_logEsc([kaynak,belge].filter(Boolean).join(' · '))}</td>
        <td style="text-align:right;${isaret<0?'color:#c62828':isaret>0?'color:var(--yesil)':''}">${isaret===0?f(mik)+' (sayım)':(isaret>0?'+':'−')+f(mik)}</td>
        <td style="text-align:right;color:var(--yazi3)">${isaret?_irsSayi(r.tutar):''}</td>
        <td style="text-align:right;font-weight:500">${isaret?f(bakiye):''}</td>
      </tr>`;
    }).join('');
    kutu.innerHTML=`
      <div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">${bas} – ${bit} · ${_logEsc(depolar.find(d=>d.id===depo)?.ad||'')} · Birim: ${bk}</div>
      <div class="tw" style="max-height:55vh;overflow-y:auto"><table>
        <thead><tr><th>Tarih</th><th>Hareket</th><th>Kaynak / Not</th><th style="text-align:right">Miktar</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>
        <tbody>${satirlar||'<tr><td colspan="6" class="bos">Bu aralıkta hareket yok</td></tr>'}</tbody></table></div>`;
  }catch(err){kutu.innerHTML='<div class="bos">Hareket dökümü okunamadı: '+_logEsc(err.message)+'</div>';}
};
// ===== EXCEL =====
window.envanterExcelIndir=function(){
  if(!_envSonSatirlar.length){bil('İndirilecek veri yok (tarih aralığı ve depo seçin)','err');return;}
  const data=_envSonSatirlar.map(({stok,o,h})=>{
    const tb=birimler.find(b=>b.id===stok.birim_id);
    const r={'Kod':stok.kod||'','Stok':stok.ad,'Birim':tb?.kisaltma||''};
    _envSonKolonlar.forEach(c=>{r[c.ad+' Miktar']=+o.m[c.k].toFixed(3);r[c.ad+' Tutar']=+o.t[c.k].toFixed(2);});
    r['KALAN Miktar']=+h.kalanM.toFixed(3);r['KALAN Tutar']=+h.kalanT.toFixed(2);
    r['Sayım Miktar']=o.sayimVar?+o.sayimM.toFixed(3):'';r['Sayım Tutar']=o.sayimVar?+o.sayimT.toFixed(2):'';
    r['Fark Miktar']=o.sayimVar?+h.farkM.toFixed(3):'';r['Fark Tutar']=o.sayimVar?+h.farkT.toFixed(2):'';
    return r;
  });
  const depoAd=(depolar.find(d=>d.id===document.getElementById('env-depo').value)?.ad||'depo').replace(/\s+/g,'_');
  const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Stok Envanter');
  XLSX.writeFile(wb,`stok_envanter_${depoAd}_${document.getElementById('env-bas').value}_${document.getElementById('env-bit').value}.xlsx`);
};
