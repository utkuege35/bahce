// ===== STOK MİKTAR =====
// Hareket türlerinin stoğa etkisi (tek yerde tanımlı — raporlar da buna dayanır).
// Bileşen satırları "<tur>_sarfiyat" adıyla tutulur (ürün satılınca/ikram edilince
// reçetesinden düşen hammaddeler).
const STOK_ARTI=['giris','devir','transfer_giris'];
const STOK_EKSI=['cikis','satis','ikram','odenmez','hasar','atik',
  'uretim_sarfiyat','satis_sarfiyat','ikram_sarfiyat','odenmez_sarfiyat','hasar_sarfiyat','atik_sarfiyat',
  'transfer_cikis'];
// Ana depo: Depolar tanımında "ana_depo" işaretli depo. Depo bilgisi olmayan
// eski hareketler ve başlangıç stoğu ana depoya aittir.
window.anaDepoId=function(){
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  return kapsam.find(d=>d.ana_depo)?.id||null;
};
// depoId verilmezse tüm depoların toplamı (transferler birbirini götürdüğü için hesaba katılmaz).
// depoId verilirse sadece o deponun stoğu.
// haricBelgeId verilirse o belgenin (fişin) hareketleri hesaba katılmaz (düzenleme/silme öncesi kontroller için)
function stokMiktar(stokId,depoId,haricBelgeId){
  let m=0;const s=stoklar.find(x=>x.id===stokId);
  const ana=anaDepoId();
  if(s&&(!depoId||depoId===ana))m+=parseFloat(s.baslangic||0);
  islemler.forEach(i=>{
    if(i.stok_id!==stokId)return;
    if(haricBelgeId&&i.belge_id===haricBelgeId)return;
    const tr=i.tur;
    const arti=STOK_ARTI.includes(tr),eksi=STOK_EKSI.includes(tr);
    if(!arti&&!eksi)return;
    const efektifDepo=i.depo_id||ana;
    if(depoId){if(efektifDepo!==depoId)return;}
    else if(tr==='transfer_giris'||tr==='transfer_cikis')return;
    const mik=parseFloat(i.miktar||0)*birimTemelCarp(i.birim_id);
    m+=arti?mik:-mik;
  });
  return m;
}
// Depo seçim kutusunu doldurur (aktif depolar).
window.depoSecenekleri=function(selectId,seciliId){
  const el=document.getElementById(selectId);if(!el)return;
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  el.innerHTML='<option value="">— Depo seçin —</option>'+kapsam.filter(d=>d.aktif!==false).map(d=>`<option value="${d.id}"${d.id===seciliId?' selected':''}>${d.ad}${d.ana_depo?' (Ana Depo)':''}</option>`).join('');
};
// Alış belgelerinde "Giriş Deposu" alanı: her zaman Ana Depo, kilitli.
window.girisDepoAnaYaz=function(selectId){
  const el=document.getElementById(selectId);if(!el)return;
  const ana=depolar.find(d=>d.id===anaDepoId());
  el.innerHTML=ana?`<option value="${ana.id}">${ana.ad} (Ana Depo)</option>`:'<option value="">Ana depo tanımlı değil!</option>';
  el.disabled=true;
};
// "Çıkış Deposu" seçenekleri: Ana Depo hariç aktif depolar.
window.cikisDepoSecenekleri=function(selectId,seciliId){
  const el=document.getElementById(selectId);if(!el)return;
  el.innerHTML=cikisDepoOptHtml(seciliId);
};
window.cikisDepoOptHtml=function(seciliId){
  const kapsam=typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar;
  return '<option value=""></option>'+kapsam.filter(d=>d.aktif!==false&&!d.ana_depo).map(d=>`<option value="${d.id}"${d.id===seciliId?' selected':''}>${d.ad}</option>`).join('');
};
// Satırlarda çıkış deposu seçilmişse, her çıkış deposu için AYRI bir "Ana Depo Çıkış"
// fişi oluşturur: Ana Depo'dan çıkış (transfer_cikis) + hedef depoya giriş (transfer_giris).
// satirlar: [{kaynakTur,kaynakId,birimId,miktar,fiyat,tutar,cikisDepoId}]. Dönüş: oluşan fiş sayısı.
window.anaDepoCikisYaz=async function(satirlar,b){
  const ana=anaDepoId();if(!ana)return 0;
  const grup={};
  satirlar.forEach((x,idx)=>{
    if(x.kaynakTur==='stok'&&x.kaynakId&&x.cikisDepoId&&x.cikisDepoId!==ana&&parseFloat(x.miktar)>0)
      (grup[x.cikisDepoId]=grup[x.cikisDepoId]||[]).push({x,idx}); // idx = belgedeki kalem sırası
  });
  const hedefler=Object.keys(grup);
  if(!hedefler.length)return 0;
  const baz=Date.now()+1000;let n=0;const rows=[];const basliklar=[];
  hedefler.forEach(hedef=>{
    const fisId=crypto.randomUUID();
    const depoAd=depolar.find(d=>d.id===hedef)?.ad||'';
    let fisTutar=0;
    grup[hedef].forEach(({x,idx})=>{
      const kart=stoklar.find(k=>k.id===x.kaynakId);
      const mik=parseFloat(x.miktar)||0,fiy=parseFloat(x.fiyat)||0,tut=parseFloat(x.tutar)||(mik*fiy);
      const ortak={tarih:b.tarih,stok_id:x.kaynakId,birim_id:x.birimId||null,miktar:mik,fiyat:fiy,tutar:tut,
        aciklama:`${kart?.ad||''} → ${depoAd}`,kat:'Ana Depo Çıkış',alt_tur:'ana_depo_cikis',aciklama_not:b.not||null,
        belge_no:b.belgeNo||null,belge_id:fisId,irsaliye_id:b.irsaliyeId||null,fatura_id:b.faturaId||null,
        hedef_depo_id:hedef,kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null};
      fisTutar+=tut;
      rows.push({...ortak,tur:'transfer_cikis',depo_id:ana,ts:baz+(n++)});
      rows.push({...ortak,tur:'transfer_giris',depo_id:hedef,ts:baz+(n++)});
    });
    basliklar.push({id:fisId,isyeri_id:aktifIsyeri?.id||null,fis_turu:'transfer',alt_tur:'ana_depo_cikis',tarih:b.tarih,
      depo_id:ana,hedef_depo_id:hedef,irsaliye_id:b.irsaliyeId||null,fatura_id:b.faturaId||null,
      kalem_sayisi:grup[hedef].length,toplam_tutar:Math.round(fisTutar*100)/100,aciklama:b.not||null,
      kullanici:aktifKullanici?.ad||'',ts:baz});
  });
  // Önce fiş başlıkları, sonra satırlar; satırlar yazılamazsa başlıklar geri alınır.
  const {error:eb}=await sb.from('stok_fisleri').insert(basliklar);
  if(eb)throw eb;
  const {error}=await sb.from('islemler').insert(rows);
  if(error){await sb.from('stok_fisleri').delete().in('id',basliklar.map(x=>x.id));throw error;}
  const {data:id}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(id)islemler=id.filter(i=>!i.silindi);
  return hedefler.length;
};
// Dış alım (irsaliye / irsaliyesiz fatura) kalemlerini stoğa "giris" olarak yazar.
// satirlar: [{kaynakTur,kaynakId,birimId,miktar,fiyat,tutar}] — sadece stok kalemleri işlenir.
// b: {tarih,depoId,cariId,not,belgeNo,kat,belgeId,irsaliyeId,faturaId}
window.stokGirisYaz=async function(satirlar,b){
  const sat=satirlar.filter(x=>x.kaynakTur==='stok'&&x.kaynakId&&parseFloat(x.miktar)>0);
  if(!sat.length)return;
  const baz=Date.now();
  const rows=sat.map((x,i)=>{
    const kart=stoklar.find(k=>k.id===x.kaynakId);
    const mik=parseFloat(x.miktar)||0,fiy=parseFloat(x.fiyat)||0,tut=parseFloat(x.tutar)||(mik*fiy);
    return {tur:'giris',tarih:b.tarih,stok_id:x.kaynakId,birim_id:x.birimId||null,miktar:mik,fiyat:fiy,tutar:tut,
      aciklama:`${kart?.ad||''} alışı`,kat:b.kat,aciklama_not:b.not||null,belge_no:b.belgeNo||null,belge_id:b.belgeId,
      irsaliye_id:b.irsaliyeId||null,fatura_id:b.faturaId||null,cari_id:b.cariId||null,depo_id:b.depoId||null,
      kullanici:aktifKullanici?.ad||'',isyeri_id:aktifIsyeri?.id||null,ts:baz+i};
  });
  const {error}=await sb.from('islemler').insert(rows);
  if(error)throw error;
  // Ortalama maliyeti güncelle (eski Alış ekranındaki mantıkla aynı)
  for(const x of sat){
    const mik=parseFloat(x.miktar)||0,tut=parseFloat(x.tutar)||(mik*(parseFloat(x.fiyat)||0));
    const hFiy=mik>0?tut/mik:0;
    if(hFiy>0){
      const kart=stoklar.find(k=>k.id===x.kaynakId);
      const yeniM=hFiy/(birimTemelCarp(x.birimId)||1);
      const eski=parseFloat(kart?.maliyet||0);
      await sb.from('stoklar').update({maliyet:eski>0?(eski+yeniM)/2:yeniM}).eq('id',x.kaynakId);
    }
  }
  const {data:id}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(id)islemler=id.filter(i=>!i.silindi);
  const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
};
// Düzenlemede, belgenin giriş ve Ana Depo Çıkış hareketleri yeniden yazılacağı için
// stokların Ana Depo'da veya hedef depolarda EKSİYE düşüp düşmeyeceğini kontrol eder
// (mal çoktan başka yere çıkmış olabilir). Hata varsa açıklama metni, yoksa null döner.
// alan: 'irsaliye_id' | 'fatura_id'
window.belgeDegisimKontrol=function(alan,belgeId,yeniSatirlar){
  const ana=anaDepoId();if(!ana)return null;
  const carp=(mik,birim)=>(parseFloat(mik)||0)*birimTemelCarp(birim);
  const eskiG={},eskiC={};
  islemler.filter(i=>i[alan]===belgeId).forEach(i=>{
    const m=carp(i.miktar,i.birim_id);
    if(i.tur==='giris')eskiG[i.stok_id]=(eskiG[i.stok_id]||0)+m;
    else if(i.tur==='transfer_cikis'&&i.alt_tur==='ana_depo_cikis'){
      const o=eskiC[i.stok_id]=eskiC[i.stok_id]||{};
      o[i.hedef_depo_id]=(o[i.hedef_depo_id]||0)+m;
    }
  });
  const yeniG={},yeniC={};
  yeniSatirlar.filter(x=>x.kaynakTur==='stok'&&x.kaynakId).forEach(x=>{
    const m=carp(x.miktar,x.birimId);
    yeniG[x.kaynakId]=(yeniG[x.kaynakId]||0)+m;
    if(x.cikisDepoId&&x.cikisDepoId!==ana){
      const o=yeniC[x.kaynakId]=yeniC[x.kaynakId]||{};
      o[x.cikisDepoId]=(o[x.cikisDepoId]||0)+m;
    }
  });
  const ad=sid=>stoklar.find(x=>x.id===sid)?.ad||'';
  const f=n=>n.toLocaleString('tr-TR',{maximumFractionDigits:3});
  const topla=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
  for(const sid of new Set([...Object.keys(eskiG),...Object.keys(yeniG),...Object.keys(eskiC),...Object.keys(yeniC)])){
    // Ana Depo: giriş farkı eksi çıkış farkı
    const anaDelta=((yeniG[sid]||0)-(eskiG[sid]||0))-(topla(yeniC[sid])-topla(eskiC[sid]));
    if(anaDelta<0){
      const sonuc=stokMiktar(sid,ana)+anaDelta;
      if(sonuc<-0.0005)return `${ad(sid)}: bu değişiklikle Ana Depo stoğu eksiye düşer (${f(sonuc)}).`;
    }
    // Hedef depolar: çıkış azalıyorsa o depoda yeterli bakiye olmalı
    for(const h of new Set([...Object.keys(eskiC[sid]||{}),...Object.keys(yeniC[sid]||{})])){
      const d=((yeniC[sid]||{})[h]||0)-((eskiC[sid]||{})[h]||0);
      if(d<0&&stokMiktar(sid,h)+d<-0.0005){
        const dAd=depolar.find(x=>x.id===h)?.ad||'';
        return `${ad(sid)}: ${dAd} deposundaki mal başka yere çıkmış, çıkış miktarı bu kadar azaltılamaz.`;
      }
    }
  }
  return null;
};
// Bir transfer fişi kaldırılırsa (silme / düzenleme) hiçbir depoda stok eksiye düşmemeli.
// Fişin dokunduğu her (stok, depo) için fiş hariç bakiye >= 0 olmalı. Hata metni ya da null döner.
window.fisKaldirmaKontrol=function(fisId){
  const ana=anaDepoId();
  const satirlar=islemler.filter(i=>i.belge_id===fisId&&(i.tur==='transfer_cikis'||i.tur==='transfer_giris'));
  const ciftler=new Set(satirlar.map(i=>i.stok_id+'|'+(i.depo_id||ana)));
  for(const c of ciftler){
    const [sid,d]=c.split('|');
    const bak=stokMiktar(sid,d,fisId);
    if(bak<-0.0005){
      const ad=stoklar.find(x=>x.id===sid)?.ad||'';
      const dAd=depolar.find(x=>x.id===d)?.ad||'';
      return `${ad}: ${dAd} deposundaki mal başka yere çıkmış/kullanılmış, bu fiş kaldırılamaz.`;
    }
  }
  return null;
};
// Bir irsaliye/faturaya bağlı Ana Depo Çıkış fişlerini gösteren küçük blok (silme butonlu).
// alan: 'irsaliye_id' | 'fatura_id'; kind: 'irs' | 'fat'
window.bagliCikisFisleriHtml=function(alan,belgeIliskiId,kind,tur){
  const rows=islemler.filter(i=>i[alan]===belgeIliskiId&&i.alt_tur==='ana_depo_cikis'&&i.tur==='transfer_cikis');
  if(!rows.length)return '';
  const fisler={};
  rows.forEach(r=>{(fisler[r.belge_id]=fisler[r.belge_id]||[]).push(r);});
  return `<div style="padding:8px 12px;font-size:11px;color:var(--yazi2);border-top:1px solid var(--krem2)">
    🏬 <strong>Bağlı Ana Depo Çıkış fişleri</strong> <span style="color:var(--yazi3)">(düzenleme için önce silinmeli)</span>
    ${Object.entries(fisler).map(([fid,l])=>{
      const depoAd=depolar.find(d=>d.id===l[0].hedef_depo_id)?.ad||'?';
      return `<div style="display:flex;align-items:center;gap:8px;margin-top:4px"><span>→ ${depoAd} · ${l.length} kalem</span><button class="btn sm ghost" style="font-size:10px" onclick="event.stopPropagation();cikisFisiSilUI('${fid}','${kind}','${tur}')">✕ Fişi Sil</button></div>`;
    }).join('')}
  </div>`;
};
// Ana Depo Çıkış fişini siler. Hedef depodaki mal başka yere çıkmışsa (bakiye eksiye düşecekse) izin vermez.
window.cikisFisiSilUI=async function(fisId,kind,tur){
  const satirlar=islemler.filter(i=>i.belge_id===fisId&&i.alt_tur==='ana_depo_cikis');
  const giris=satirlar.filter(i=>i.tur==='transfer_giris');
  const hedef=giris[0]?.depo_id;
  const toplam={};
  giris.forEach(g=>{toplam[g.stok_id]=(toplam[g.stok_id]||0)+(parseFloat(g.miktar)||0)*birimTemelCarp(g.birim_id);});
  for(const [sid,mik] of Object.entries(toplam)){
    if(stokMiktar(sid,hedef)-mik<-0.0005){
      const ad=stoklar.find(x=>x.id===sid)?.ad||'';
      bil(`${ad}: hedef depoda yeterli stok kalmadığı için (başka yere çıkmış) bu fiş silinemez.`,'err');return;
    }
  }
  if(!(await onay('Bu Ana Depo Çıkış fişi silinsin mi?<br><small>Mallar Ana Depo\'ya geri döner.</small>','🗑️')))return;
  const {error}=await sb.from('islemler').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('belge_id',fisId).eq('alt_tur','ana_depo_cikis');
  if(error){bil('Silinemedi: '+error.message,'err');return;}
  await sb.from('stok_fisleri').update({silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()}).eq('id',fisId);
  const {data:id}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(id)islemler=id.filter(i=>!i.silindi);
  bil('Çıkış fişi silindi ✓');
  if(kind==='irs'){renderIrsGunSekmesi(tur);if(typeof irsBilgiBlokYenile==='function')irsBilgiBlokYenile(tur);}
  else{renderFatGunSekmesi(tur);if(typeof fatBilgiBlokYenile==='function')fatBilgiBlokYenile(tur);}
};
// Bir irsaliye/faturaya bağlı stok girişlerini geri alır (yumuşak silme).
window.stokHareketiGeriAl=async function(filtre){
  const guncel={silindi:true,silen:aktifKullanici?.ad||'',silinme_tarihi:new Date().toISOString()};
  let q=sb.from('islemler').update(guncel);
  if(filtre.irsaliyeId)q=q.eq('irsaliye_id',filtre.irsaliyeId);
  else if(filtre.faturaId)q=q.eq('fatura_id',filtre.faturaId);
  else return;
  await q;
  // Bu belgeye bağlı fiş başlıkları (Ana Depo Çıkış fişleri) da silinir
  let qb=sb.from('stok_fisleri').update(guncel);
  qb=filtre.irsaliyeId?qb.eq('irsaliye_id',filtre.irsaliyeId):qb.eq('fatura_id',filtre.faturaId);
  await qb;
  const {data:id}=await sb.from('islemler').select('*').order('ts',{ascending:false});if(id)islemler=id.filter(i=>!i.silindi);
};
function urunStok(urunId){
  const u=urunler.find(x=>x.id===urunId);return parseFloat(u?.stok||0);
}

// ===== STOK TREE =====
// ===== STOK EXCEL TOPLU YÜKLEME =====
// Excel formatı: Ana Grup | Alt Grup 1 | Alt Grup 2 | Stok Adı | Birim | Başlangıç Stok | Min Stok | Maliyet | Açıklama
// Aynı isimli gruplar tekrar oluşturulmaz — bulunup altına eklenir. Kodlar
// (10, 10.10, 10.10.10, 10.10.10.001...) otomatik ve hiyerarşiye uygun üretilir.
function stokGrupBulVeyaOlustur(ad,ustId,isyeriId,hedefListe){
  ad=(ad||'').trim();if(!ad)return null;
  const mevcut=stoklar.find(s=>s.tip==='grup'&&(s.ust_id||null)===(ustId||null)&&(s.isyeri_id||null)===(isyeriId||null)&&s.ad.trim().toLowerCase()===ad.toLowerCase());
  if(mevcut)return mevcut;
  const ust=ustId?stoklar.find(s=>s.id===ustId):null;
  const kod=kodOlusturStok(ustId,'grup');
  const yeni={id:uid(),ad,tip:'grup',kod,ust_id:ustId||null,seviye:ust?(ust.seviye||1)+1:1,isyeri_id:isyeriId,aktif:true};
  stoklar.push(yeni);
  hedefListe.push(yeni);
  return yeni;
}
window.stokExcelSecildi=async function(input){
  const file=input.files[0];if(!file)return;
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');input.value='';return;}
  const isyeriId=aktifIsyeri?.id||null;
  try{
    const data=await file.arrayBuffer();
    const wb=XLSX.read(data,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true});

    // ---- 1. AŞAMA: SADECE DOĞRULAMA — henüz gerçek listeye/DB'ye HİÇBİR ŞEY YAZILMAZ ----
    // Tüm grup/kart oluşturma işlemi, gerçek "stoklar" dizisinin bir KOPYASI
    // üzerinde simüle edilir. Tek bir satırda bile hata varsa, hiçbir şey
    // kaydedilmeden (tam ya da hiç) işlem durur.
    const simKapsam=stoklar.slice();
    const seviye1Yeni=[],seviye2Yeni=[],seviye3Yeni=[],stokYeni=[];
    const hatali=[];
    function simGrupBulVeyaOlustur(ad,ustId,hedefListe){
      ad=(ad||'').trim();if(!ad)return null;
      const mevcut=simKapsam.find(s=>s.tip==='grup'&&(s.ust_id||null)===(ustId||null)&&(s.isyeri_id||null)===isyeriId&&s.ad.trim().toLowerCase()===ad.toLowerCase());
      if(mevcut)return mevcut;
      const ust=ustId?simKapsam.find(s=>s.id===ustId):null;
      const kod=kodOlusturHiyerarsik(simKapsam,ustId,'grup');
      const yeni={id:uid(),ad,tip:'grup',kod,ust_id:ustId||null,seviye:ust?(ust.seviye||1)+1:1,isyeri_id:isyeriId,aktif:true};
      simKapsam.push(yeni);
      hedefListe.push(yeni);
      return yeni;
    }
    for(const row of rows){
      if(!row||!row.length)continue;
      const anaGrup=(row[0]===undefined||row[0]===null)?'':String(row[0]).trim();
      if(!anaGrup||anaGrup.toLowerCase()==='ana grup')continue; // boş veya başlık satırı
      const altGrup1=(row[1]===undefined||row[1]===null)?'':String(row[1]).trim();
      const altGrup2=(row[2]===undefined||row[2]===null)?'':String(row[2]).trim();
      const stokAdi=(row[3]===undefined||row[3]===null)?'':String(row[3]).trim();
      const birimKisa=(row[4]===undefined||row[4]===null)?'':String(row[4]).trim().toLowerCase();
      if(!altGrup1||!altGrup2||!stokAdi||!birimKisa){hatali.push(`${stokAdi||anaGrup} (Ana Grup/Alt Grup 1/Alt Grup 2/Stok Adı/Birim zorunlu)`);continue;}
      const birim=birimler.find(b=>b.temel!==false&&(b.kisaltma||'').toLowerCase()===birimKisa);
      if(!birim){hatali.push(`${stokAdi} (birim "${birimKisa}" bulunamadı — temel birim olmalı: kg, lt, adet vb.)`);continue;}
      const ana=simGrupBulVeyaOlustur(anaGrup,null,seviye1Yeni);
      const alt1=simGrupBulVeyaOlustur(altGrup1,ana.id,seviye2Yeni);
      const alt2=simGrupBulVeyaOlustur(altGrup2,alt1.id,seviye3Yeni);
      if((alt2.seviye||1)!==3){hatali.push(`${stokAdi} (grup zinciri hatalı)`);continue;}
      const dupAd=simKapsam.find(s=>(s.isyeri_id||null)===isyeriId&&(s.seviye||1)===4&&s.ad.trim().toLowerCase()===stokAdi.toLowerCase());
      if(dupAd){hatali.push(`${stokAdi} (bu isimde zaten bir kayıt var)`);continue;}
      const kod=kodOlusturHiyerarsik(simKapsam,alt2.id,'stok');
      const yeniStok={id:uid(),ad:stokAdi,kod,tip:'stok',ust_id:alt2.id,seviye:4,isyeri_id:isyeriId,birim_id:birim.id,baslangic:0,min_stok:0,maliyet:0,aciklama:null,aktif:true};
      simKapsam.push(yeniStok);
      stokYeni.push(yeniStok);
    }

    // ---- Hata varsa: HİÇBİR ŞEY KAYDETME, sadece raporla ----
    if(hatali.length){
      bil(`❌ Yükleme iptal edildi — hiçbir satır kaydedilmedi. ${hatali.length} satırda hata var: ${hatali.slice(0,10).join(', ')}${hatali.length>10?` (+${hatali.length-10} satır daha)`:''}`,'err');
      input.value='';
      return;
    }
    if(!stokYeni.length){
      bil('Excel dosyasında geçerli satır bulunamadı.','err');
      input.value='';
      return;
    }

    // ---- 2. AŞAMA: HER ŞEY GEÇERLİ — şimdi gerçekten kaydet ----
    stoklar.push(...seviye1Yeni,...seviye2Yeni,...seviye3Yeni,...stokYeni);
    if(seviye1Yeni.length)await sb.from('stoklar').insert(seviye1Yeni);
    if(seviye2Yeni.length)await sb.from('stoklar').insert(seviye2Yeni);
    if(seviye3Yeni.length)await sb.from('stoklar').insert(seviye3Yeni);
    if(stokYeni.length)await sb.from('stoklar').insert(stokYeni);
    const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
    renderStoklar();doldurStokFil();kontolUyari();
    const grupSayisi=seviye1Yeni.length+seviye2Yeni.length+seviye3Yeni.length;
    bil(`✓ ${stokYeni.length} stok kartı, ${grupSayisi} yeni grupla birlikte eklendi`);
  }catch(e){
    bil('Excel okunamadı: '+e.message,'err');
  }
  input.value='';
};

// ===== ÇİFT EXCEL (Grup Şablonu + Stok Şablonu) TOPLU YÜKLEME =====
// Dosya 1 (Grup Şablonu): Kod | Ad | Üst Grup — her satır bir grup tanımlar,
// "Üst Grup" o grubun BAĞLI OLDUĞU üst grubun ADINI taşır (kök gruplarda boş).
// Kod sütunu kullanılmaz (kendi hiyerarşik kodumuzu üretiriz). Derinlik sabit
// değildir — satırlar hangi sırada olursa olsun, üst grubu henüz oluşmamış
// satırlar bir sonraki tura bırakılıp tekrar denenir.
// Dosya 2 (Stok Şablonu): Stok Grup | Stok Adı | Birim — "Stok Grup", Dosya
// 1'deki bir grup adıyla birebir eşleşmeli; stok kartı SADECE 3. seviyedeki
// gruba eklenir (sistemin genel kuralı budur). Bazı gruplarda 2. ve 3. seviye
// adı aynı olabilir (örn. "Süt Ürünleri" → kendi altında yine "Süt Ürünleri"
// adlı bir 3. seviye alt grup) — böyle durumlarda isim aynı gruba iki kez
// (2. ve 3. seviyede) karşılık geldiği için, eşleştirme otomatik olarak en
// derindeki (3. seviye) gruba gider.
window.stokCiftExcelYukle=async function(){
  const grupDosya=document.getElementById('sce-grup-dosya').files[0];
  const stokDosya=document.getElementById('sce-stok-dosya').files[0];
  if(!grupDosya||!stokDosya){bil('İki dosyayı da seçin!','err');return;}
  if(typeof XLSX==='undefined'){bil('Excel okuma kütüphanesi yüklenemedi, sayfayı yenileyin.','err');return;}
  const isyeriId=aktifIsyeri?.id||null;
  try{
    // Tüm işlem, gerçek "stoklar" dizisinin bir KOPYASI üzerinde simüle
    // edilir. İki dosyadan herhangi birinde tek bir hata bile varsa hiçbir
    // şey kaydedilmez (tam ya da hiç).
    const simKapsam=stoklar.slice();

    // ---- 1) GRUP ŞABLONUNU OKU VE AĞACI SİMÜLE ET ----
    const gData=await grupDosya.arrayBuffer();
    const gWb=XLSX.read(gData,{type:'array'});
    const gWs=gWb.Sheets[gWb.SheetNames[0]];
    const gRows=XLSX.utils.sheet_to_json(gWs,{header:1,raw:true});
    let kalan=[];
    for(const row of gRows){
      if(!row||!row.length)continue;
      const ad=(row[1]===undefined||row[1]===null)?'':String(row[1]).trim();
      if(!ad||ad.toLowerCase()==='ad')continue; // başlık veya boş satır
      const ustAd=(row[2]===undefined||row[2]===null)?'':String(row[2]).trim();
      kalan.push({ad,ustAd});
    }
    const olusanGruplar={};
    const seviyeYeni=[[],[],[]];
    let ilerleme=true;
    const hatali=[];
    while(kalan.length&&ilerleme){
      ilerleme=false;
      const beklemede=[];
      for(const satir of kalan){
        let ustId=null,ustSeviye=0;
        if(satir.ustAd){
          const anahtar=satir.ustAd.toLowerCase();
          const ustKayit=olusanGruplar[anahtar]||simKapsam.find(s=>s.tip==='grup'&&(s.isyeri_id||null)===isyeriId&&s.ad.trim().toLowerCase()===anahtar);
          if(!ustKayit){beklemede.push(satir);continue;}
          ustId=ustKayit.id;ustSeviye=ustKayit.seviye||1;
        }
        if((ustId?ustSeviye:0)>=3){hatali.push(`${satir.ad} (üst grup "${satir.ustAd}" zaten 3. seviyede, daha derin grup açılamaz)`);ilerleme=true;continue;}
        let kayit=simKapsam.find(s=>s.tip==='grup'&&(s.ust_id||null)===(ustId||null)&&(s.isyeri_id||null)===isyeriId&&s.ad.trim().toLowerCase()===satir.ad.toLowerCase());
        if(!kayit){
          const seviye=ustId?ustSeviye+1:1;
          const kod=kodOlusturHiyerarsik(simKapsam,ustId,'grup');
          kayit={id:uid(),ad:satir.ad,tip:'grup',kod,ust_id:ustId,seviye,isyeri_id:isyeriId,aktif:true};
          simKapsam.push(kayit);
          seviyeYeni[seviye-1].push(kayit);
        }
        olusanGruplar[satir.ad.toLowerCase()]=kayit;
        ilerleme=true;
      }
      kalan=beklemede;
    }
    kalan.forEach(satir=>hatali.push(`${satir.ad} (üst grup "${satir.ustAd}" bulunamadı)`));

    // ---- 2) STOK ŞABLONUNU OKU VE KARTLARI SİMÜLE ET ----
    const sData=await stokDosya.arrayBuffer();
    const sWb=XLSX.read(sData,{type:'array'});
    const sWs=sWb.Sheets[sWb.SheetNames[0]];
    const sRows=XLSX.utils.sheet_to_json(sWs,{header:1,raw:true});
    const stokYeni=[];
    for(const row of sRows){
      if(!row||!row.length)continue;
      const grupAdi=(row[0]===undefined||row[0]===null)?'':String(row[0]).trim();
      if(!grupAdi||grupAdi.toLowerCase()==='stok grup')continue;
      const stokAdi=(row[1]===undefined||row[1]===null)?'':String(row[1]).trim();
      const birimKisa=(row[2]===undefined||row[2]===null)?'':String(row[2]).trim().toLowerCase();
      if(!stokAdi||!birimKisa){hatali.push(`${stokAdi||grupAdi} (Stok Adı/Birim eksik)`);continue;}
      const grup=olusanGruplar[grupAdi.toLowerCase()]||simKapsam.find(s=>s.tip==='grup'&&(s.isyeri_id||null)===isyeriId&&s.ad.trim().toLowerCase()===grupAdi.toLowerCase());
      if(!grup){hatali.push(`${stokAdi} (grup "${grupAdi}" bulunamadı — Grup Şablonu'nda tanımlı mı kontrol edin)`);continue;}
      if((grup.seviye||1)!==3){hatali.push(`${stokAdi} (grup "${grupAdi}" 3. seviyede değil — bu isimde bir 3. seviye alt grup Grup Şablonu'nda eksik olabilir)`);continue;}
      const birim=birimler.find(b=>b.temel!==false&&(b.kisaltma||'').toLowerCase()===birimKisa);
      if(!birim){hatali.push(`${stokAdi} (birim "${birimKisa}" bulunamadı — temel birim olmalı)`);continue;}
      const dupAd=simKapsam.find(s=>(s.isyeri_id||null)===isyeriId&&(s.seviye||1)===((grup.seviye||1)+1)&&s.ad.trim().toLowerCase()===stokAdi.toLowerCase());
      if(dupAd){hatali.push(`${stokAdi} (bu isimde zaten bir kayıt var)`);continue;}
      const kod=kodOlusturHiyerarsik(simKapsam,grup.id,'stok');
      const yeniStok={id:uid(),ad:stokAdi,kod,tip:'stok',ust_id:grup.id,seviye:(grup.seviye||1)+1,isyeri_id:isyeriId,birim_id:birim.id,baslangic:0,min_stok:0,maliyet:0,aciklama:null,aktif:true};
      simKapsam.push(yeniStok);
      stokYeni.push(yeniStok);
    }

    // ---- Hata varsa: HİÇBİR ŞEY KAYDETME, sadece raporla ----
    if(hatali.length){
      bil(`❌ Yükleme iptal edildi — hiçbir satır kaydedilmedi. ${hatali.length} satırda hata var: ${hatali.slice(0,10).join(', ')}${hatali.length>10?` (+${hatali.length-10} satır daha)`:''}`,'err');
      return;
    }
    if(!stokYeni.length){
      bil('Excel dosyasında geçerli satır bulunamadı.','err');
      return;
    }

    // ---- Her şey geçerli — şimdi gerçekten kaydet ----
    stoklar.push(...seviyeYeni[0],...seviyeYeni[1],...seviyeYeni[2],...stokYeni);
    for(const liste of seviyeYeni){if(liste.length)await sb.from('stoklar').insert(liste);}
    if(stokYeni.length)await sb.from('stoklar').insert(stokYeni);

    const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
    renderStoklar();if(typeof kontolUyari==='function')kontolUyari();
    modalKapat('modal-stok-cift-excel');
    document.getElementById('sce-grup-dosya').value='';document.getElementById('sce-stok-dosya').value='';

    const grupSayisi=seviyeYeni.reduce((a,l)=>a+l.length,0);
    bil(`✓ ${stokYeni.length} stok kartı, ${grupSayisi} grupla birlikte eklendi`);
  }catch(e){
    bil('Excel okunamadı: '+e.message,'err');
  }
};

// Temel birim seçilince: hem işlem birimi hem de reçete birimi listesini,
// o temel birim ailesine göre doldurur (ikisi de temel birim veya onun alt birimleri).
window.stokTemelBirimDegis=function(birimId){
  _doldurVarsayilanBirim('sm-varsayilan-birim',birimId,null);
  _doldurVarsayilanBirim('sm-recete-birim',birimId,null);
};
window.stokModalAc=function(ustId,tip){
  // Seviyelendirme kuralı: en fazla 3 grup seviyesi, stok kartları
  // SADECE 3. seviye bir grubun altına eklenebilir.
  if(tip==='grup'&&ustId){
    const ust=stoklar.find(s=>s.id===ustId);
    if(ust&&(ust.seviye||1)>=3){bil('En fazla 3 seviye grup açılabilir!','err');return;}
  }
  if(tip==='stok'){
    const ust=ustId?stoklar.find(s=>s.id===ustId):null;
    if(!ust||(ust.seviye||0)!==3){bil('Stok kartı sadece 3. seviye bir grubun altına eklenebilir!','err');return;}
  }
  document.getElementById('sm-id').value='';
  document.getElementById('sm-tip-h').value=tip;
  document.getElementById('sm-ad').value='';

  document.getElementById('sm-kod').value=kodOlusturStok(ustId,tip);
  document.getElementById('sm-log').style.display='none';
  document.getElementById('sm-aktif-satir').style.display='none';
  document.getElementById('sm-min').value=0;
  document.getElementById('sm-aciklama').value='';
  document.getElementById('sm-recete-birim').value='';
  document.getElementById('sm-varsayilan-birim').value='';
  if(typeof doldurKdvOranSecenekleri==='function')doldurKdvOranSecenekleri('sm-kdv-orani',(typeof stokKdvOraniId==='function'&&ustId?stokKdvOraniId(ustId):'')||'');
  if(tip==='grup'){
    document.getElementById('sm-title').textContent=ustId?'Alt Grup Ekle':'Ana Grup Ekle';
    document.getElementById('sm-stok-alanlar').style.display='none';
    document.getElementById('sm-birim-fg').style.display='none';
    if(ustId){const ust=stoklar.find(s=>s.id===ustId);document.getElementById('sm-ust-bilgi').textContent=`Üst: ${ust?.ikon||''} ${ust?.ad||''} [${ust?.kod||''}]`;}
    else document.getElementById('sm-ust-bilgi').textContent='Ana stok grubu';
  }else{
    document.getElementById('sm-title').textContent='Yeni Stok Kartı';
    document.getElementById('sm-stok-alanlar').style.display='';
    document.getElementById('sm-birim-fg').style.display='';
    document.getElementById('sm-ust-bilgi').textContent=ustId?(()=>{const ust=stoklar.find(s=>s.id===ustId);return `Grup: ${ust?.ikon||''} ${ust?.ad||''} [${ust?.kod||''}]`;})():'Grup seçilmedi';
  }
  document.getElementById('sm-kod').disabled=false;
  doldurBirimSecleri();doldurMerkezSecleri();
  if(typeof stokKdvBilgiGuncelle==='function')setTimeout(stokKdvBilgiGuncelle,0);
  modalAc('modal-stok');
};
window.stokGoruntule=function(id){stokDuzenle(id,'goruntule');};
window.stokDuzenle=function(id,mod='duzenle'){
  const s=stoklar.find(x=>x.id===id);if(!s)return;
  const hv=islemler.some(i=>i.stok_id===id);
  document.getElementById('sm-id').value=s.id;document.getElementById('sm-tip-h').value=s.tip;
  document.getElementById('sm-title').textContent=s.tip==='grup'?'Grubu Düzenle':'Stok Kartını Düzenle';
  document.getElementById('sm-ad').value=s.ad;document.getElementById('sm-kod').value=s.kod;

  document.getElementById('sm-kod').disabled=hv;
  if(typeof doldurKdvOranSecenekleri==='function')doldurKdvOranSecenekleri('sm-kdv-orani',s.kdv_orani_id||(typeof stokKdvOraniId==='function'&&s.ust_id?stokKdvOraniId(s.ust_id):'')||'');
  if(s.tip==='grup'){
    document.getElementById('sm-stok-alanlar').style.display='none';document.getElementById('sm-birim-fg').style.display='none';
    document.getElementById('sm-aktif-satir').style.display='none';
  }else{
    document.getElementById('sm-stok-alanlar').style.display='';document.getElementById('sm-birim-fg').style.display='';
    document.getElementById('sm-min').value=s.min_stok||0;
    document.getElementById('sm-aciklama').value=s.aciklama||'';
    document.getElementById('sm-aktif-satir').style.display='';
    document.getElementById('sm-aktif').checked=s.aktif!==false;
    doldurBirimSecleri();doldurMerkezSecleri();
    setTimeout(()=>{
      document.getElementById('sm-birim').value=s.birim_id||'';
      // Varsayılan işlem birimi ve reçete birimi select'lerini temel birime göre doldur
      _doldurVarsayilanBirim('sm-varsayilan-birim',s.birim_id,s.varsayilan_birim_id);
      _doldurVarsayilanBirim('sm-recete-birim',s.birim_id,s.recete_birim_id);
    },100);
  }
  const ust=stoklar.find(x=>x.id===s.ust_id);
  document.getElementById('sm-ust-bilgi').textContent=ust?`Üst: ${ust.ikon||''} ${ust.ad} [${ust.kod}]`:'Ana grup';
  if(typeof stokKdvBilgiGuncelle==='function')setTimeout(stokKdvBilgiGuncelle,0);
  const loglar=isimLoglari.filter(l=>l.tablo==='stoklar'&&l.kayit_id===id);
  if(loglar.length){document.getElementById('sm-log').style.display='block';document.getElementById('sm-log-liste').innerHTML=loglar.map(l=>`<div class="log-item"><span class="log-eski">${l.eski_ad}</span> → <span class="log-yeni">${l.yeni_ad}</span><span style="color:var(--yazi3);font-size:10px;float:right">${new Date(l.tarih).toLocaleDateString('tr-TR')} — ${l.degistiren||'?'}</span></div>`).join('');}
  else document.getElementById('sm-log').style.display='none';
  modalAc('modal-stok');setTimeout(()=>modalMod('modal-stok',mod),50);
};
window.kaydetStok=async function(){
  const id=document.getElementById('sm-id').value||uid();
  const tip=document.getElementById('sm-tip-h').value;
  const ad=document.getElementById('sm-ad').value.trim();
  const kod=document.getElementById('sm-kod').value;
  if(!ad){bil('Ad zorunlu!','err');return;}
  if(!kod){bil('Kod oluşturulamadı, üst grup seçin','err');return;}
  const mevcut=stoklar.find(x=>x.id===id);
  const isyeriId=mevcut?mevcut.isyeri_id:(aktifIsyeri?.id||null);
  // Yeni kayıt için üst grubu ve seviyeyi şimdiden belirle (mükerrer kontrolde de lazım)
  let hedefUstId=mevcut?mevcut.ust_id:null,hedefSeviye=mevcut?mevcut.seviye:1;
  if(!mevcut){
    const ustBilgi=document.getElementById('sm-ust-bilgi').textContent;
    const ustKod=ustBilgi.match(/\[([^\]]+)\]/)?.[1];
    const ust=ustKod?stoklar.find(s=>s.kod===ustKod&&(s.isyeri_id||null)===(aktifIsyeri?.id||null)):null;
    hedefUstId=ust?.id||null;
    hedefSeviye=ust?(ust.seviye||1)+1:1;
  }
  // Mükerrer kontrol — aynı işyeri VE aynı seviye kapsamında (farklı seviyede aynı isim serbest)
  const kapsam=stoklar.filter(x=>(x.isyeri_id||null)===(isyeriId||null)&&(x.seviye||1)===hedefSeviye);
  const dupAd=kapsam.find(x=>x.id!==id&&x.ad.trim().toLowerCase()===ad.toLowerCase());
  if(dupAd){bil(`"${ad}" adında zaten aynı seviyede bir stok/grup var! [${dupAd.kod}]`,'err');return;}
  const dupKod=kapsam.find(x=>x.id!==id&&x.kod===kod);
  if(dupKod){bil(`"${kod}" kodu zaten kullanımda! [${dupKod.ad}]`,'err');return;}
  const hv=mevcut&&islemler.some(i=>i.stok_id===id);
  if(mevcut&&mevcut.ad!==ad)await sb.from('isim_loglari').insert({tablo:'stoklar',kayit_id:id,eski_ad:mevcut.ad,yeni_ad:ad,degistiren:aktifKullanici?.ad||''});
  const data={id,ad,tip};
  if(!hv)data.kod=kod;
  const secilenKdv=document.getElementById('sm-kdv-orani').value||'';
  const devralinanKdv=(typeof stokKdvOraniId==='function'&&hedefUstId?stokKdvOraniId(hedefUstId):'')||'';
  data.kdv_orani_id=(secilenKdv&&secilenKdv!==devralinanKdv)?secilenKdv:null;
  if(tip==='stok'){
    const bId=document.getElementById('sm-birim').value||null;
    if(!bId){bil('Birim zorunlu!','err');return;}
    data.birim_id=bId;
    data.varsayilan_birim_id=document.getElementById('sm-varsayilan-birim').value||null;
    data.min_stok=parseFloat(document.getElementById('sm-min').value)||0;
    data.aciklama=document.getElementById('sm-aciklama').value;
    data.recete_birim_id=document.getElementById('sm-recete-birim').value||null;
    data.aktif=document.getElementById('sm-aktif').checked;
  }
  if(!mevcut){
    data.ust_id=hedefUstId;
    data.seviye=hedefSeviye;
    data.isyeri_id=aktifIsyeri?.id||null;
    if(tip==='stok')data.aktif=true;
  }
  const {error:kayitHata}=mevcut?await sb.from('stoklar').update(data).eq('id',id):await sb.from('stoklar').insert(data);
  if(kayitHata){bil('Kaydedilemedi: '+kayitHata.message,'err');return;}
  const {data:sd}=await sb.from('stoklar').select('*').order('kod');if(sd)stoklar=sd;
  const {data:il}=await sb.from('isim_loglari').select('*').order('tarih',{ascending:false});if(il)isimLoglari=il;
  modalKapat('modal-stok');renderStoklar();doldurStokFil();doldurIslemSecleri();kontolUyari();bil('Stok kaydedildi ✓');
};
window.stokSil=async function(id){
  const hv=islemler.some(i=>i.stok_id===id);
  if(hv){
    if(await onay('Bu stokta hareket kaydı var, silinemez.<br><small>Tamam\'a basarsan pasife alınır (kullanım dışı olur).</small>','⚠️'))
      await sb.from('stoklar').update({aktif:false}).eq('id',id);
    else return;
  }else{
    const alts=tumAltlar(stoklar,id);if(alts.length){bil('Alt kayıtları silin!','err');return;}
    if(!(await onay('Kalıcı olarak silmek istiyor musunuz?','🗑️')))return;
    await sb.from('stoklar').delete().eq('id',id);
  }
  const {data}=await sb.from('stoklar').select('*').order('kod');if(data)stoklar=data;
  renderStoklar();doldurStokFil();doldurIslemSecleri();bil(hv?'Pasife alındı ✓':'Silindi ✓');
};
let _stokSeciliGrupId = null;
let _stokHoverKartId = null;
window.stokKartSec=function(id){_stokHoverKartId=id;renderStoklar();};
window.stokGoruntuleHover=function(){if(!_stokHoverKartId){bil('Önce bir satır seçin','err');return;}stokGoruntule(_stokHoverKartId);};
window.stokDuzenleHover=function(){if(!_stokHoverKartId){bil('Önce bir satır seçin','err');return;}stokDuzenle(_stokHoverKartId);};
window.stokSilHover=function(){if(!_stokHoverKartId){bil('Önce bir satır seçin','err');return;}stokSil(_stokHoverKartId);};
window.stokGrupSec = function(grupId){
  _stokSeciliGrupId = grupId;
  renderStoklar();
};
function renderStoklar(){
  const elGrup=document.getElementById('stok-grup-agac');
  const elKart=document.getElementById('stok-kart-liste');
  if(!elGrup||!elKart)return;
  const kapsam=isyeriFiltre(stoklar);
  const isAdmin=aktifKullanici?.rol==='admin';
  const btnYeniStok=document.getElementById('btn-yeni-stok');

  function grupSatiri(g,depth){
    const altGruplari=kapsam.filter(x=>x.ust_id===g.id&&x.tip==='grup');
    const secili=_stokSeciliGrupId===g.id;
    const grupRenkler=['#284a65','#355f82','#a9c8e0','#d4e6f1'];
    const satirRenk=grupRenkler[Math.min(depth,grupRenkler.length-1)];
    const grupBg=['var(--grup-bg-0)','var(--grup-bg-1)','var(--grup-bg-2)'][Math.min(depth,2)];
    let html=`<div class="grup-satir" onclick="stokGrupSec('${g.id}')" style="display:flex;align-items:center;gap:6px;padding:4px 10px;padding-left:${8+depth*16}px;cursor:pointer;border-left:4px solid ${satirRenk};background:${secili?'var(--yesil-cok-ac)':grupBg}">
      <span class="tree-kod" style="min-width:44px;font-size:10px">${g.kod}</span>
      <span style="flex:1;font-size:12px;font-weight:${secili?'700':'500'};color:${secili?'var(--yesil)':'var(--yazi1)'}">${g.ad}</span>
      ${isAdmin?`<div class="tree-actions" style="flex-shrink:0">
        ${(g.seviye||1)<3?`<button class="btn sm" onclick="event.stopPropagation();stokModalAc('${g.id}','grup')" title="Alt Grup">+G</button>`:''}
        <button class="btn sm" onclick="event.stopPropagation();stokDuzenle('${g.id}')">✏</button>
        <button class="btn sm ghost" onclick="event.stopPropagation();stokSil('${g.id}')">✕</button>
      </div>`:''}
    </div>`;
    altGruplari.forEach(ag=>{html+=grupSatiri(ag,depth+1);});
    return html;
  }

  const kokGruplar=kapsam.filter(g=>!g.ust_id&&g.tip==='grup');
  elGrup.innerHTML=kokGruplar.map(g=>grupSatiri(g,0)).join('')||'<div class="bos">Henüz grup yok. "+ Grup" ile başlayın.</div>';

  const baslikEl=document.getElementById('stok-kart-baslik');
  const btnGoruntule=document.getElementById('btn-stok-goruntule');
  const btnDuzenle=document.getElementById('btn-stok-duzenle');
  const btnSil=document.getElementById('btn-stok-sil');
  if(_stokSeciliGrupId){
    const seciliGrup=kapsam.find(g=>g.id===_stokSeciliGrupId);
    if(!seciliGrup){_stokSeciliGrupId=null;renderStoklar();return;}
    if(baslikEl)baslikEl.textContent=`${seciliGrup.ad} [${seciliGrup.kod}]`;
    if(btnYeniStok)btnYeniStok.style.display=(isAdmin&&(seciliGrup.seviye||1)===3)?'':'none';
    const kartlar=kapsam.filter(s=>s.ust_id===_stokSeciliGrupId&&s.tip==='stok'&&(isAdmin||s.aktif!==false));
    if(isAdmin&&kartlar.length){if(btnGoruntule)btnGoruntule.style.display='';if(btnDuzenle)btnDuzenle.style.display='';if(btnSil)btnSil.style.display='';}
    else{if(btnGoruntule)btnGoruntule.style.display='none';if(btnDuzenle)btnDuzenle.style.display='none';if(btnSil)btnSil.style.display='none';}
    elKart.innerHTML=kartlar.length?kartlar.map(s=>{
      const mik=stokMiktar(s.id);const tb=birimler.find(b=>b.id===s.birim_id);
      const dusuk=s.min_stok>0&&mik<=s.min_stok;
      const pasif=s.aktif===false;
      return `<div class="tree-row" onclick="stokKartSec('${s.id}')" style="border-left:2px solid var(--border);${_stokHoverKartId===s.id?'background:var(--yesil-cok-ac);':''}${pasif?'opacity:0.45;':''}">
        <span class="tree-kod" style="min-width:70px">${s.kod}</span>
        <span style="flex:1;font-size:12px">${s.ad}${pasif?' <span style="font-size:10px;color:var(--turuncu);font-weight:500">[PASİF]</span>':''}</span>
        <span style="font-size:12px;font-weight:500;color:${dusuk?'var(--sari)':'var(--yesil)'}">${mik.toLocaleString('tr-TR',{maximumFractionDigits:2})} ${tb?.kisaltma||''}</span>
        ${dusuk?'<span class="badge sari">⚠ Min</span>':''}
        <span class="tip-chip tip-stok">STOK</span>
      </div>`;
    }).join(''):'<div class="bos">Bu grupta henüz stok kartı yok.</div>';
  }else{
    if(baslikEl)baslikEl.textContent='← Soldan bir grup seçin';
    if(btnYeniStok)btnYeniStok.style.display='none';
    if(btnGoruntule)btnGoruntule.style.display='none';if(btnDuzenle)btnDuzenle.style.display='none';if(btnSil)btnSil.style.display='none';
    elKart.innerHTML='<div class="bos">← Soldan bir grup seçin</div>';
  }
}
// ===== STOK LİSTESİ (düz tablo — grup ağacı değil) =====
let _slSonListe=[];
// Son Alım Fiyatı: en son Alış (giriş) veya Devir fişindeki fiyatı, stoğun
// temel birimi cinsinden döner. Hiç alım/devir yoksa stok kartındaki kayıtlı
// maliyete düşer.
function stokSonAlimFiyati(stokId){
  const kayitlar=islemler.filter(i=>i.stok_id===stokId&&(i.tur==='giris'||i.tur==='devir')&&parseFloat(i.fiyat)>0);
  if(kayitlar.length){
    kayitlar.sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||'')||(b.ts||0)-(a.ts||0));
    const son=kayitlar[0];
    const carpan=birimTemelCarp(son.birim_id)||1;
    return (parseFloat(son.fiyat)||0)/carpan;
  }
  const s=stoklar.find(x=>x.id===stokId);
  return parseFloat(s?.maliyet||0);
}
window.renderStokListesi=function(){
  const el=document.getElementById('stok-liste-tb');if(!el)return;
  const kapsam=isyeriFiltre(stoklar);
  const isAdmin=aktifKullanici?.rol==='admin';
  const f=id=>(document.getElementById(id)?.value||'').toLowerCase();
  const fAna=f('sl-f-ana'),fAlt=f('sl-f-alt'),fAlt2=f('sl-f-alt2'),fKod=f('sl-f-kod'),fAd=f('sl-f-ad'),fTb=f('sl-f-tb'),fIb=f('sl-f-ib'),fRb=f('sl-f-rb');

  let liste=kapsam.filter(s=>s.tip==='stok'&&(isAdmin||s.aktif!==false)).map(s=>{
    const grup3=kapsam.find(g=>g.id===s.ust_id);
    const grup2=grup3?kapsam.find(g=>g.id===grup3.ust_id):null;
    const grup1=grup2?kapsam.find(g=>g.id===grup2.ust_id):null;
    const tb=birimler.find(b=>b.id===s.birim_id);
    const ib=birimler.find(b=>b.id===(s.varsayilan_birim_id||s.birim_id));
    const rb=birimler.find(b=>b.id===s.recete_birim_id);
    return {stok:s,anaGrup:grup1?.ad||'',altGrup:grup2?.ad||'',altGrup2:grup3?.ad||'',kod:s.kod||'',ad:s.ad||'',temelBirim:tb?.kisaltma||'',islemBirim:ib?.kisaltma||'',receteBirim:rb?.kisaltma||'',sonAlimFiyati:stokSonAlimFiyati(s.id)};
  });
  if(fAna)liste=liste.filter(r=>r.anaGrup.toLowerCase().includes(fAna));
  if(fAlt)liste=liste.filter(r=>r.altGrup.toLowerCase().includes(fAlt));
  if(fAlt2)liste=liste.filter(r=>r.altGrup2.toLowerCase().includes(fAlt2));
  if(fKod)liste=liste.filter(r=>r.kod.toLowerCase().includes(fKod));
  if(fAd)liste=liste.filter(r=>r.ad.toLowerCase().includes(fAd));
  if(fTb)liste=liste.filter(r=>r.temelBirim.toLowerCase().includes(fTb));
  if(fIb)liste=liste.filter(r=>r.islemBirim.toLowerCase().includes(fIb));
  if(fRb)liste=liste.filter(r=>r.receteBirim.toLowerCase().includes(fRb));
  liste.sort((a,b)=>a.kod.localeCompare(b.kod));
  _slSonListe=liste;

  el.innerHTML=liste.map(r=>{
    const s=r.stok;
    const pasif=s.aktif===false;
    return `<tr style="${pasif?'opacity:.5':''};cursor:pointer" onclick="stokGoruntule('${s.id}')">
      <td>${r.anaGrup}</td>
      <td>${r.altGrup}</td>
      <td>${r.altGrup2}</td>
      <td class="tree-kod">${r.kod}</td>
      <td style="font-weight:500">${r.ad}${pasif?' <span style="font-size:10px;color:var(--turuncu)">[PASİF]</span>':''}</td>
      <td>${r.temelBirim}</td>
      <td>${r.islemBirim}</td>
      <td>${r.receteBirim}</td>
      <td style="text-align:right;color:var(--yesil)">${r.sonAlimFiyati>0?r.sonAlimFiyati.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" class="bos">Kayıt yok</td></tr>';
};
window.stokListesiExcelIndir=function(){
  if(!_slSonListe.length){bil('İndirilecek veri yok','err');return;}
  const data=_slSonListe.map(r=>({
    'Ana Grup':r.anaGrup,'Alt Grup':r.altGrup,'Alt Grup 2':r.altGrup2,
    'Kod':r.kod,'Ad':r.ad,'Temel Birim':r.temelBirim,'İşlem Birimi':r.islemBirim,'Reçete Birim':r.receteBirim,
    'Son Alım Fiyatı':r.sonAlimFiyati
  }));
  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Stok Listesi');
  XLSX.writeFile(wb,'stok_listesi.xlsx');
};
function kontolUyari(){
  const kapsam=isyeriFiltre(stoklar);
  const d=kapsam.filter(s=>s.tip==='stok'&&s.min_stok>0&&stokMiktar(s.id)<=s.min_stok);
  const bant=document.getElementById('uyari-bant');
  if(d.length){bant.style.display='block';document.getElementById('uyari-txt').textContent=`${d.length} stok kritik: ${d.map(s=>s.ad).join(', ')}`;}
  else bant.style.display='none';
}
window.stokDetay=async function(id){
  const s=stoklar.find(x=>x.id===id);if(!s||s.tip==='grup')return;
  document.getElementById('sd-title').textContent=`[${s.kod}] ${s.ad}`;
  const mik=stokMiktar(id);const tb=birimler.find(b=>b.id===s.birim_id);
  document.getElementById('sd-ozet').innerHTML=`<div class="mg" style="grid-template-columns:repeat(3,1fr)"><div class="met"><div class="ml">Mevcut</div><div class="mv g">${mik.toLocaleString('tr-TR',{maximumFractionDigits:2})} ${tb?.kisaltma||''}</div></div><div class="met"><div class="ml">Ort. Maliyet</div><div class="mv k">${s.maliyet?para(s.maliyet):'—'}</div></div><div class="met"><div class="ml">Stok Değeri</div><div class="mv k">${s.maliyet?para(mik*(s.maliyet||0)):'—'}</div></div></div>`;
  const isAdmin=aktifKullanici?.rol==='admin';
  const thEl=document.getElementById('sd-islem-th');if(thEl)thEl.style.display=isAdmin?'':'none';
  const rows=islemler.filter(i=>i.stok_id===id).map(i=>`<tr>
    <td>${i.tarih}</td>
    <td><span class="badge ${i.tur==='giris'?'g':'d'}">${{giris:'Giriş',satis:'Satış',uretim_sarfiyat:'Sarfiyat',satis_sarfiyat:'Satış Sarfiyatı',sayim:'Sayım'}[i.tur]||i.tur}</span></td>
    <td style="color:${i.tur==='giris'?'var(--yesil)':'var(--turuncu)'}">${i.tur==='giris'?'+':'-'}${parseFloat(i.miktar).toLocaleString('tr-TR',{maximumFractionDigits:2})}</td>
    <td>${birimAd(i.birim_id)}</td>
    <td>${i.tutar?para(i.tutar):''}</td>
    <td style="font-size:11px;color:var(--yazi3)">${i.satir_not||i.aciklama_not||'—'}</td>
    ${isAdmin?`<td><button class="btn sm" onclick="islemDuzenleAc('${i.id}')">✏</button><button class="btn sm ghost" onclick="islemSil('${i.id}')">✕</button></td>`:'<td></td>'}
  </tr>`).join('');
  document.getElementById('sd-tb').innerHTML=rows||'<tr><td colspan="7" class="bos">Hareket yok</td></tr>';
  modalAc('modal-stok-detay');
};
