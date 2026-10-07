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
// (Sınıflandırma artık veritabanındaki stok_hareket_turleri tablosundadır; burası sadece etiketler için)
const ENV_SINIF_ESKI={
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

// Envanter hesabı veritabanında (stok_envanter fonksiyonu) yapılır; ekran sadece sonucu alır.
// Tarih/depo değişince yeniden sorgulanır, arama/görünüm/gizleme filtreleri önbellekten çalışır.
let _envVeri=null,_envAnahtar='';
async function envanterVeriGetir(bas,bit,depoF){
  const {data,error}=await sb.rpc('stok_envanter',{p_isyeri:aktifIsyeri?.id||null,p_bas:bas,p_bit:bit,p_depo:depoF||null});
  if(error)throw error;
  const n=x=>parseFloat(x)||0;
  const satir={};
  (data||[]).forEach(r=>{
    const m=_envBos(),t=_envBos();
    ['onceki','devir','giris','trf_arti','trf_eksi','satis','odenmez','ikram','hasar','atik','diger'].forEach(k=>{
      const kk=k==='trf_arti'?'trfArti':k==='trf_eksi'?'trfEksi':k;
      m[kk]=n(r[k+'_m']);t[kk]=n(r[k+'_t']);
    });
    satir[r.stok_id]={m,t,sayimM:n(r.sayim_m),sayimT:n(r.sayim_t),sayimVar:!!r.sayim_var,farkM:n(r.fark_m),hareket:!!r.hareket};
  });
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
  renderEnvanter(true);
};
window.renderEnvanter=async function(yenile){
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
  const anahtar=`${aktifIsyeri?.id||''}|${bas}|${bit}|${seciliDepo}`;
  if(yenile===true||_envVeri===null||_envAnahtar!==anahtar){
    thEl.innerHTML='';tbEl.innerHTML='<tr><td class="bos">Hesaplanıyor...</td></tr>';
    try{_envVeri=await envanterVeriGetir(bas,bit,seciliDepo);_envAnahtar=anahtar;}
    catch(err){tbEl.innerHTML=`<tr><td class="bos">Rapor hesaplanamadı: ${_logEsc(err.message)}. Veritabanı fonksiyonları kurulu mu?</td></tr>`;return;}
  }
  const hesap=_envVeri;
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
window.envanterDetayAc=async function(stokId){
  const bas=document.getElementById('env-bas').value,bit=document.getElementById('env-bit').value;
  const depoF=document.getElementById('env-depo').value;
  const stok=stoklar.find(s=>s.id===stokId);if(!stok)return;
  const tb=birimler.find(b=>b.id===stok.birim_id);const bk=tb?.kisaltma||'';
  document.getElementById('env-detay-baslik').textContent=`${stok.ad} — Hareket Dökümü`;
  const kutu=document.getElementById('env-detay-icerik');
  kutu.innerHTML='<div class="bos">Yükleniyor...</div>';
  modalAc('modal-envanter-detay');
  try{
    const g=new Date(bas+'T12:00:00');g.setDate(g.getDate()-1);
    const oncekiTarih=g.toISOString().slice(0,10);
    const [dokum,oncekiMap]=await Promise.all([
      sb.rpc('stok_hareket_dokumu',{p_isyeri:aktifIsyeri?.id||null,p_stok:stokId,p_bas:bas,p_bit:bit,p_depo:depoF||null}),
      stokBakiyelerDb(depoF||null,[stokId],null,oncekiTarih)
    ]);
    if(dokum.error)throw dokum.error;
    const f=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});
    const onceki=parseFloat(oncekiMap[stokId])||0;
    let bakiye=onceki;
    const satirlar=(dokum.data||[]).map(r=>{
      const isaret=r.isaret||0,mik=parseFloat(r.temel_miktar)||0;
      if(isaret)bakiye+=isaret*mik;
      const urun=r.urun_id?urunler.find(u=>u.id===r.urun_id)?.ad:'';
      const kaynak=r.tur==='sayim'?(r.satir_not||''):(urun?`Ürün: ${urun}`:'');
      const belge=r.belge_no?`No: ${r.belge_no}`:'';
      return `<tr>
        <td style="font-size:11px;white-space:nowrap">${r.tarih}</td>
        <td style="font-size:12px">${ENV_TUR_ADLARI[r.tur]||r.tur}${r.alt_tur&&TRF_TIP_ADLARI[r.alt_tur]?` <span style="font-size:10px;color:var(--yazi3)">(${TRF_TIP_ADLARI[r.alt_tur]})</span>`:''}</td>
        <td style="font-size:12px">${_depoAd(r.depo_id)}</td>
        <td style="font-size:11px;color:var(--yazi2)">${_logEsc([kaynak,belge].filter(Boolean).join(' · '))}</td>
        <td style="text-align:right;${isaret<0?'color:#c62828':isaret>0?'color:var(--yesil)':''}">${isaret===0?f(mik)+' (sayım)':(isaret>0?'+':'−')+f(mik)}</td>
        <td style="text-align:right;color:var(--yazi3)">${isaret?_irsSayi(r.tutar):''}</td>
        <td style="text-align:right;font-weight:500">${isaret?f(bakiye):''}</td>
      </tr>`;
    }).join('');
    kutu.innerHTML=`
      <div style="font-size:12px;color:var(--yazi2);margin-bottom:.5rem">${bas} – ${bit}${depoF?' · '+_depoAd(depoF):' · Tüm depolar'} · Birim: ${bk}</div>
      <div class="tw" style="max-height:55vh;overflow-y:auto"><table>
        <thead><tr><th>Tarih</th><th>Hareket</th><th>Depo</th><th>Kaynak / Not</th><th style="text-align:right">Miktar</th><th style="text-align:right">Tutar</th><th style="text-align:right">Bakiye</th></tr></thead>
        <tbody>
          <tr style="background:var(--krem2)"><td colspan="6" style="font-size:12px">Dönem öncesi bakiye</td><td style="text-align:right;font-weight:600">${f(onceki)}</td></tr>
          ${satirlar||'<tr><td colspan="7" class="bos">Bu aralıkta hareket yok</td></tr>'}
        </tbody></table></div>`;
  }catch(err){kutu.innerHTML='<div class="bos">Hareket dökümü okunamadı: '+_logEsc(err.message)+'</div>';}
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
