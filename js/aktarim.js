// ===== BAĞIMSIZ RAPORLAMA › VERİ YÜKLEME: ALIM HAREKETLERİ =====
// Excel/CSV'den toplu alım hareketi (tarih, stok kodu, miktar, birim, fiyat/tutar) aktarır.
// • Aktarılan veri STOK BAKİYESİNİ ETKİLEMEZ: ayrı analiz tablolarında "parti" olarak saklanır (aktarim_partileri / aktarim_alimlari);
//   Alış Fiyat Analizi gibi raporlar bunları okur. Parti silinince raporlardan çıkar.
// • Stoklar sistemde önceden tanımlı olmalıdır; dosyadaki STOK KODU ile eşleştirilir. Hata varsa HİÇBİR satır aktarılmaz.
// • Sütunlar BAŞLIK ADINA göre bulunur (sırası önemli değil): Tarih, Stok Kodu, Miktar, Birim, Birim Fiyat, Tutar, Tedarikçi, Belge No.
// • Miktar ve fiyat stoğun TEMEL birimine çevrilerek saklanır (kg/gr/koli gibi). Tutarlar KDV hariç kabul edilir.
const AKT_SABLON_BASLIK=['Tarih','Stok Kodu','Miktar','Birim','Birim Fiyat','Tutar','Tedarikçi','Belge No'];
const AKT_SUTUN_ADLARI={
  tarih:['tarih','islemtarihi','belgetarihi','fistarihi'],
  kod:['stokkodu','kod','stokkod','malzemekodu','urunkodu'],
  miktar:['miktar','adet','mik'],
  birim:['birim','olcubirimi'],
  fiyat:['birimfiyat','fiyat','birimfiyati','alisfiyati','netfiyat'],
  tutar:['tutar','toplam','toplamtutar','nettutar'],
  tedarikci:['tedarikci','tedarikciadi','cari','firma','satici'],
  belge:['belgeno','faturano','irsaliyeno','belge']
};
let _aktOnizleme=null;
const _aktNorm=s=>String(s==null?'':s).toLocaleLowerCase('tr').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]/g,'');
// Excel seri numarası, gg.aa.yyyy, gg/aa/yyyy, yyyy-aa-gg biçimlerini yyyy-aa-gg'ye çevirir; geçersizse null
function _aktTarih(v){
  if(v===undefined||v===null||v==='')return null;
  let y,m,d;
  if(typeof v==='number'){
    if(!(v>20000&&v<80000))return null;
    const t=new Date(Math.round((v-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate();
  }else{
    const s=String(v).trim();let r;
    if((r=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/))){d=+r[1];m=+r[2];y=+r[3];}
    else if((r=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))){y=+r[1];m=+r[2];d=+r[3];}
    else return null;
  }
  if(!(y>=2000&&y<=2100&&m>=1&&m<=12&&d>=1))return null;
  if(d>new Date(y,m,0).getDate())return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
// "1.234,56", "1234,56", "1,234.56", "₺12" gibi yazımları sayıya çevirir; boşsa NaN
function _aktSayi(v){
  if(typeof v==='number')return v;
  if(v===undefined||v===null)return NaN;
  let s=String(v).replace(/[₺\s]|tl/gi,'');
  if(s==='')return NaN;
  const nokta=s.includes('.'),virgul=s.includes(',');
  if(nokta&&virgul){s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');}
  else if(virgul)s=s.replace(',','.');
  else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,'');
  return /^-?\d*\.?\d+$/.test(s)?parseFloat(s):NaN;
}
// Satır dizisini (ilk sayfa) doğrular ve aktarılacak satırları üretir. Saf hesap: dosya okumadan test edilebilir.
function aktarimAlimAyristir(rows){
  const hatalar=[],satirlar=[];
  // başlık satırı: ilk 10 satırda Tarih + Stok Kodu + Miktar başlıklarını içeren satır
  let bas=-1,harita={};
  for(let i=0;i<Math.min(rows.length,10)&&bas<0;i++){
    const r=rows[i]||[];const h={};
    r.forEach((c,idx)=>{const n=_aktNorm(c);for(const [ad,liste] of Object.entries(AKT_SUTUN_ADLARI)){if(h[ad]===undefined&&liste.includes(n))h[ad]=idx;}});
    if(h.tarih!==undefined&&h.kod!==undefined&&h.miktar!==undefined){bas=i;harita=h;}
  }
  if(bas<0){hatalar.push({satir:0,kod:'',mesaj:'Başlık satırı bulunamadı. Şablondaki sütun adlarını kullanın: Tarih, Stok Kodu, Miktar, Birim Fiyat/Tutar'});return {satirlar,hatalar,bas:null,bit:null,toplam:0};}
  if(harita.fiyat===undefined&&harita.tutar===undefined){hatalar.push({satir:bas+1,kod:'',mesaj:'Birim Fiyat ya da Tutar sütunu bulunamadı'});return {satirlar,hatalar,bas:null,bit:null,toplam:0};}
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok');
  const kodHarita=new Map();kapsam.forEach(s=>{kodHarita.set(String(s.kod).trim().toLocaleLowerCase('tr'),s);});
  const hucre=(r,ad)=>harita[ad]===undefined?undefined:r[harita[ad]];
  let bsl=null,bts=null,toplam=0;
  for(let i=bas+1;i<rows.length;i++){
    const r=rows[i];
    if(!r||!r.some(c=>c!==undefined&&c!==null&&String(c).trim()!==''))continue; // boş satır
    const no=i+1;
    const kodHam=hucre(r,'kod');const kod=(kodHam===undefined||kodHam===null)?'':String(kodHam).trim();
    const hata=m=>hatalar.push({satir:no,kod,mesaj:m});
    const tarih=_aktTarih(hucre(r,'tarih'));
    if(!tarih){hata('Tarih geçersiz ya da boş');continue;}
    if(!kod){hata('Stok kodu boş');continue;}
    const stok=kodHarita.get(kod.toLocaleLowerCase('tr'));
    if(!stok){hata('Stok kodu sistemde bulunamadı');continue;}
    const miktar=_aktSayi(hucre(r,'miktar'));
    if(!(miktar>0)){hata('Miktar geçersiz');continue;}
    // birim: stoğun temel birimi ya da alt birimlerinden biri; boşsa temel birim
    const tbId=stok.birim_id;
    const uygun=tbId?birimler.filter(b=>b.id===tbId||b.temel_id===tbId):birimler;
    const birimKisa=String(hucre(r,'birim')??'').trim().toLocaleLowerCase('tr');
    let birim=null;
    if(birimKisa){birim=uygun.find(b=>(b.kisaltma||'').toLocaleLowerCase('tr')===birimKisa||(b.ad||'').toLocaleLowerCase('tr')===birimKisa);if(!birim){hata(`Birim "${birimKisa}" bu stok için uygun değil`);continue;}}
    else birim=birimler.find(b=>b.id===tbId)||uygun[0];
    const carpan=birim?birimTemelCarp(birim.id):1;
    const miktarTemel=miktar*(carpan||1);
    let tutar=_aktSayi(hucre(r,'tutar'));const fiyat=_aktSayi(hucre(r,'fiyat'));
    if(!(tutar>0)){if(fiyat>0)tutar=miktar*fiyat;else{hata('Birim fiyat ya da tutar gerekli');continue;}}
    const tedarikci=String(hucre(r,'tedarikci')??'').trim()||null;
    const belge=String(hucre(r,'belge')??'').trim()||null;
    satirlar.push({tarih,stok_id:stok.id,miktar:Math.round(miktarTemel*1000)/1000,birim_id:tbId||birim?.id||null,
      birim_fiyat:Math.round(tutar/miktarTemel*10000)/10000,tutar:Math.round(tutar*100)/100,tedarikci,belge_no:belge,_kod:kod,_ad:stok.ad});
    toplam+=Math.round(tutar*100)/100;
    if(!bsl||tarih<bsl)bsl=tarih;if(!bts||tarih>bts)bts=tarih;
  }
  if(!satirlar.length&&!hatalar.length)hatalar.push({satir:0,kod:'',mesaj:'Dosyada yüklenecek satır bulunamadı'});
  return {satirlar,hatalar,bas:bsl,bit:bts,toplam:Math.round(toplam*100)/100};
}
const _aktTr=t=>t?t.split('-').reverse().join('.'):'';
const _aktPara=n=>'₺'+(+n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
window.aktarimSablonIndir=function(){
  if(typeof XLSX==='undefined'){bil('Excel kütüphanesi yüklenemedi, sayfayı yenileyin.','err');return;}
  const ornek=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok').slice(0,2);
  const bugun_=new Date();const t=`${String(bugun_.getDate()).padStart(2,'0')}.${String(bugun_.getMonth()+1).padStart(2,'0')}.${bugun_.getFullYear()}`;
  const kisa=s=>birimler.find(b=>b.id===s?.birim_id)?.kisaltma||'kg';
  const satirlar=ornek.length?ornek.map((s,i)=>[t,s.kod,10+i*5,kisa(s),'',(100+i*50),'Tedarikçi Adı','F-100'+(i+1)]):[[t,'10.10.10.001',10,'kg',12.5,'','Tedarikçi Adı','F-1001']];
  const ws=XLSX.utils.aoa_to_sheet([AKT_SABLON_BASLIK,...satirlar]);
  ws['!cols']=[{wch:12},{wch:16},{wch:10},{wch:8},{wch:12},{wch:12},{wch:22},{wch:12}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Alım Hareketleri');
  XLSX.writeFile(wb,'alim_hareketleri_sablon.xlsx');
};
window.aktarimDosyaSecildi=async function(input){
  const dosya=input.files&&input.files[0];if(!dosya)return;
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
  try{
    const wb=XLSX.read(await dosya.arrayBuffer(),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true});
    const sonuc=aktarimAlimAyristir(rows);
    _aktOnizleme={...sonuc,dosyaAdi:dosya.name,ad:dosya.name.replace(/\.[^.]+$/,'')};
    aktarimOnizlemeCiz();
  }catch(e){bil('Dosya okunamadı: '+e.message,'err');}
  input.value='';
};
function aktarimOnizlemeCiz(){
  const kutu=document.getElementById('akt-onizleme');if(!kutu)return;
  const o=_aktOnizleme;if(!o){kutu.innerHTML='';return;}
  const toplamSatir=o.satirlar.length+o.hatalar.length;
  if(o.hatalar.length){
    kutu.innerHTML=`<div style="margin-top:.9rem">
      <div style="font-size:13px;font-weight:600;margin-bottom:.4rem">${_logEsc(o.dosyaAdi)} — ${o.hatalar.length} hata, ${o.satirlar.length} geçerli satır</div>
      <div class="tw" style="max-height:260px;overflow-y:auto"><table><thead><tr><th style="width:70px">Satır</th><th style="width:160px">Stok Kodu</th><th>Hata</th></tr></thead><tbody>
      ${o.hatalar.slice(0,60).map(h=>`<tr><td>${h.satir||'—'}</td><td>${_logEsc(h.kod)}</td><td>${_logEsc(h.mesaj)}</td></tr>`).join('')}
      ${o.hatalar.length>60?`<tr><td colspan="3" style="color:var(--yazi3)">… ve ${o.hatalar.length-60} hata daha</td></tr>`:''}
      </tbody></table></div></div>`;
    return;
  }
  kutu.innerHTML=`<div style="margin-top:.9rem">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:.6rem">
      <div class="fg" style="margin:0;min-width:220px"><label>Parti Adı</label><input type="text" id="akt-parti-ad" value="${_logEsc(o.ad)}"></div>
      <div style="font-size:13px;padding-bottom:8px"><strong>${o.satirlar.length}</strong> satır · ${_aktTr(o.bas)} – ${_aktTr(o.bit)} · <strong>${_aktPara(o.toplam)}</strong></div>
      <button class="btn pri" onclick="aktarimOnayla()">✔ Yükle</button>
      <button class="btn ghost" onclick="aktarimIptal()">Vazgeç</button>
    </div>
    <div class="tw"><table><thead><tr><th>Tarih</th><th>Stok</th><th style="text-align:right">Miktar</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Tutar</th><th>Tedarikçi</th><th>Belge No</th></tr></thead><tbody>
    ${o.satirlar.slice(0,8).map(s=>`<tr><td>${_aktTr(s.tarih)}</td><td>${_logEsc(s._ad)} <span style="font-size:10px;color:var(--yazi3)">[${_logEsc(s._kod)}]</span></td><td style="text-align:right">${(+s.miktar).toLocaleString('tr-TR',{maximumFractionDigits:3})}</td><td style="text-align:right">${_aktPara(s.birim_fiyat)}</td><td style="text-align:right">${_aktPara(s.tutar)}</td><td>${_logEsc(s.tedarikci||'')}</td><td>${_logEsc(s.belge_no||'')}</td></tr>`).join('')}
    ${o.satirlar.length>8?`<tr><td colspan="7" style="color:var(--yazi3)">… ve ${o.satirlar.length-8} satır daha</td></tr>`:''}
    </tbody></table></div></div>`;
}
window.aktarimIptal=function(){_aktOnizleme=null;aktarimOnizlemeCiz();};
window.aktarimOnayla=async function(){
  const o=_aktOnizleme;if(!o||o.hatalar.length||!o.satirlar.length)return;
  const ad=(document.getElementById('akt-parti-ad')?.value||o.ad).trim()||o.ad;
  // Aynı dönemde daha önce aktarılmış parti varsa çifte sayım uyarısı
  try{
    const {data:cakisan}=await sb.from('aktarim_partileri').select('ad,bas,bit').eq('isyeri_id',aktifIsyeri.id).eq('tur','alim').eq('silindi',false).lte('bas',o.bit).gte('bit',o.bas);
    if(cakisan&&cakisan.length&&!(await onay(`Bu tarih aralığında daha önce yüklenmiş parti var:<br>• ${cakisan.slice(0,4).map(p=>`${_logEsc(p.ad)} (${_aktTr(p.bas)} – ${_aktTr(p.bit)})`).join('<br>• ')}<br><br>Aynı veriyi iki kez yüklerseniz raporlarda çift sayılır. Yine de yüklensin mi?`,'⚠️','Evet','Hayır')))return;
  }catch(e){}
  const parti={id:crypto.randomUUID(),isyeri_id:aktifIsyeri.id,tur:'alim',ad,dosya_adi:o.dosyaAdi,kullanici:aktifKullanici?.ad||'',ts:Date.now()};
  const satirlar=o.satirlar.map(({_kod,_ad,...s})=>s);
  const btn=document.querySelector('#akt-onizleme .btn.pri');if(btn){btn.disabled=true;btn.textContent='Yükleniyor...';}
  const {error}=await sb.rpc('aktarim_alim_yaz',{p_parti:parti,p_satirlar:satirlar});
  if(error){bil('Yüklenemedi: '+error.message,'err');if(btn){btn.disabled=false;btn.textContent='✔ Yükle';}return;}
  await logYaz({islem:'olustur',belgeTuru:'aktarim',altTur:'alim',belgeId:parti.id,belgeNo:ad,belgeTarihi:o.bas,tutar:o.toplam,
    yeni:{baslik:{'Parti':ad,'Dosya':o.dosyaAdi,'Dönem':`${_aktTr(o.bas)} – ${_aktTr(o.bit)}`,'Satır':satirlar.length,'Tutar':o.toplam},kalemler:[]}});
  bil(`✓ ${satirlar.length} alım satırı yüklendi`);
  _aktOnizleme=null;aktarimOnizlemeCiz();aktarimListeYukle();
};
// ----- Parti listesi -----
async function aktarimListeYukle(){
  const kutu=document.getElementById('akt-liste');if(!kutu)return;
  const {data,error}=await sb.from('aktarim_partileri').select('*').eq('isyeri_id',aktifIsyeri.id).eq('silindi',false).order('ts',{ascending:false});
  if(error){kutu.innerHTML=`<div class="bos">Liste okunamadı: ${_logEsc(error.message)}</div>`;return;}
  if(!data||!data.length){kutu.innerHTML='<div class="bos">Henüz aktarım yok.</div>';return;}
  const silebilir=typeof yetkiVar==='function'?yetkiVar('bagimsiz_raporlama','sil'):true;
  kutu.innerHTML=`<div class="tw"><table><thead><tr><th>Parti</th><th>Tür</th><th>Dönem</th><th style="text-align:right">Satır</th><th style="text-align:right">Tutar</th><th>Yükleyen</th><th>Tarih</th><th></th></tr></thead><tbody>
  ${data.map(p=>`<tr><td>${_logEsc(p.ad||'')}</td><td>Alım</td><td style="white-space:nowrap">${_aktTr(p.bas)} – ${_aktTr(p.bit)}</td><td style="text-align:right">${p.satir_sayisi}</td><td style="text-align:right">${_aktPara(p.toplam_tutar)}</td><td style="font-size:12px">${_logEsc(p.kullanici||'')}</td><td style="font-size:12px;white-space:nowrap">${p.ts?new Date(+p.ts).toLocaleDateString('tr-TR'):''}</td>
    <td>${silebilir?`<button class="btn sm ghost" onclick="aktarimPartiSil('${p.id}')" title="Partiyi sil">✕</button>`:''}</td></tr>`).join('')}
  </tbody></table></div>`;
}
window.aktarimPartiSil=async function(id){
  const {data}=await sb.from('aktarim_partileri').select('*').eq('id',id).maybeSingle();
  if(!(await onay(`"${_logEsc(data?.ad||'Parti')}" partisi silinsin mi?<br><small>Raporlardan çıkar.</small>`,'🗑️')))return;
  const {error}=await sb.rpc('aktarim_parti_sil',{p_parti:id,p_kullanici:aktifKullanici?.ad||''});
  if(error){bil('Silinemedi: '+error.message,'err');return;}
  await logYaz({islem:'sil',belgeTuru:'aktarim',altTur:'alim',belgeId:id,belgeNo:data?.ad||null,belgeTarihi:data?.bas||null,tutar:data?.toplam_tutar||0,
    eski:{baslik:{'Parti':data?.ad||'','Dönem':data?`${_aktTr(data.bas)} – ${_aktTr(data.bit)}`:'','Satır':data?.satir_sayisi||0,'Tutar':data?.toplam_tutar||0},kalemler:[]}});
  bil('Parti silindi ✓');aktarimListeYukle();
};
window.aktarimAc=function(){
  const ekleyebilir=typeof yetkiVar==='function'?yetkiVar('bagimsiz_raporlama','ekle'):true;
  const kart=document.getElementById('akt-yukle-kart');if(kart)kart.style.display=ekleyebilir?'':'none';
  aktarimListeYukle();
};
