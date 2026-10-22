// ===== ANALİZ RAPORLARI (yönetici) =====
// Standart veri modelinden (an_* tabloları) hesaplanan raporlar: satış analizi (fiyat + birim maliyet + günlük adet) · ürün satış ve maliyet (reçeteli) · malzeme tüketim ve maliyet · aylık karşılaştırma · stok tüketim farkı.
// Raporu sunucu hazırlar (an_rapor_* işlevleri; satır güvenliği ile yalnızca bu işyerinin verisi), ekranda ortak çizici (rapor/cizim.js) gösterir.
// Örnek (SAHTE) veri: yöneticinin tek tıkla yükleyip silebildiği 4 aylık restoran verisi. Sunum / gönderim bu sayfanın konusu değil.
let _anOzet=null,_anTur='satis_analizi',_anNo=0;
const AN_TURLER=[['yuklu','Yüklü veriler'],['satis_analizi','Satış analizi'],['iki_ay','İki ay karşılaştır'],['yillik','Yıllık ciro'],['envanter','Envanter'],['alim','Alım analizi'],['urun_satis_maliyet','Ürün satış ve maliyet'],['malzeme_tuketim_maliyet','Malzeme tüketim ve maliyet'],['aylik_karsilastirma','Aylık karşılaştırma'],['stok_tuketim_fark','Stok tüketim farkı']];
const AN_AY=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const _anId=id=>document.getElementById(id);
const _anSayi=n=>Number(n||0).toLocaleString('tr-TR');
function _anHata(e){
  const m=String((e&&(e.message||e.details))||e||'');
  if(/Could not find the function|PGRST202|does not exist|relation .* does not exist/i.test(m)||(e&&e.code==='PGRST202'))return 'Analiz altyapısı kurulu değil: veritabani_analiz.sql dosyasını Supabase SQL Editor\'de çalıştırın.';
  if(/Yalnızca yönetici/i.test(m))return 'Bu işlem yalnızca yöneticiler içindir.';
  if(/statement timeout|canceling statement/i.test(m))return 'İşlem çok uzun sürdü; daha kısa bir dönem seçin.';
  return m||'Bilinmeyen hata';
}
function anStil(){
  if(document.getElementById('an-stil'))return;
  const s=document.createElement('style');s.id='an-stil';
  s.textContent=`
#analiz-raporlari{--k:var(--border,#e1ddd2);--y:var(--yazi,#1f2a33);--s:var(--yazi3,#8a96a0);--v:var(--yesil,#2d6a4f);--z:var(--beyaz,#fff);--a:var(--krem,#f4f1ea)}
#analiz-raporlari .an-ust{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px}
#analiz-raporlari .an-baslik{font-size:18px;font-weight:600;color:var(--y)}#analiz-raporlari .an-sol{font-size:12px;font-weight:400;color:var(--s)}
#analiz-raporlari .an-kart{background:var(--z);border:1px solid var(--k);border-radius:14px;padding:16px;margin-bottom:14px;color:var(--y)}
#analiz-raporlari .an-sekme{display:flex;gap:6px;overflow-x:auto;padding:3px;background:var(--a);border:1px solid var(--k);border-radius:12px;margin-bottom:12px;-webkit-overflow-scrolling:touch}
#analiz-raporlari .an-sekme button{flex:0 0 auto;border:none;background:transparent;color:var(--s);padding:8px 14px;border-radius:9px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap}
#analiz-raporlari .an-sekme button.on{background:var(--z);color:var(--y);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.22)}
#analiz-raporlari .an-kontrol{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px}
#analiz-raporlari .an-alan{display:flex;flex-direction:column;gap:5px;min-width:190px}
#analiz-raporlari .an-alan label{font-size:11px;color:var(--s);text-transform:uppercase;letter-spacing:.04em}
#analiz-raporlari .an-alan select{padding:9px 11px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:13px}
#analiz-raporlari .an-btn{padding:10px 22px;border:none;border-radius:10px;background:var(--v);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
#analiz-raporlari .an-btn2{padding:6px 12px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:12px;cursor:pointer}
#analiz-raporlari .an-btn2.kirmizi{color:var(--kirmizi,#c62828)}#analiz-raporlari button:disabled{opacity:.55;cursor:default}
#analiz-raporlari .an-alt{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:14px;font-size:12px;color:var(--s)}
#analiz-raporlari .an-rozet{display:inline-block;font-size:11px;font-weight:600;padding:2px 9px;border-radius:10px;border:1px solid currentColor;color:var(--turuncu,#d9822b);margin-right:8px}
#analiz-raporlari .an-bos{text-align:center;padding:26px 10px;color:var(--s)}#analiz-raporlari .an-bos b{display:block;color:var(--y);font-size:15px;margin-bottom:6px}
#analiz-raporlari .ay-kart .ay-bas{font-weight:600;margin-bottom:10px}
#analiz-raporlari .ay-satir{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0}
#analiz-raporlari .ay-dosya{cursor:pointer;display:inline-block}
#analiz-raporlari .ay-chip{font-size:13px;padding:5px 11px;border:1px solid var(--k);border-radius:999px;background:var(--a)}
#analiz-raporlari .ay-pano{width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:13px;margin-top:8px}
#analiz-raporlari .ay-yuklem{padding:8px 0;border-bottom:1px solid var(--k);font-size:13px}#analiz-raporlari .an-yuklu-panel{background:none;border:0;padding:0}
#analiz-raporlari .an-paylas-alan{margin-left:auto;align-self:flex-end}#analiz-raporlari .an-paylas-alan .an-btn2{white-space:nowrap}
#analiz-raporlari .ay-yuklu-satir{display:grid;grid-template-columns:20px 112px minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,1fr);gap:8px;align-items:center;padding:9px 0;border-top:1px solid var(--k);font-size:13px}
#analiz-raporlari .ay-yuklu-satir:first-child{border-top:0}
#analiz-raporlari .ay-yuklu-isaret{color:#34d399;font-weight:800}
#analiz-raporlari .ay-yuklu-satir.ay-yuklu-yok{opacity:.65}#analiz-raporlari .ay-yuklu-satir.ay-yuklu-yok .ay-yuklu-isaret{color:var(--y2,#94a3b8)}
#analiz-raporlari .ay-yuklu-ar,#analiz-raporlari .ay-yuklu-son{color:var(--y2,#94a3b8);font-size:12px}
@media (max-width:640px){#analiz-raporlari .ay-yuklu-satir{grid-template-columns:20px minmax(0,1fr)}#analiz-raporlari .ay-yuklu-ozet,#analiz-raporlari .ay-yuklu-ar,#analiz-raporlari .ay-yuklu-son{grid-column:2}}
#analiz-raporlari .ay-not{font-size:12px;color:var(--s)}#analiz-raporlari .ay-metin{font-size:14px;margin:4px 0}
#analiz-raporlari .ay-uyari{background:rgba(217,130,43,.12);border:1px solid rgba(217,130,43,.45);padding:8px 10px;border-radius:9px;font-size:13px;margin:8px 0}
#analiz-raporlari .ay-seg{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
#analiz-raporlari .ay-seg button{border:1px solid var(--k);background:var(--a);color:var(--s);padding:7px 12px;border-radius:9px;font:inherit;font-size:13px;cursor:pointer}
#analiz-raporlari .ay-seg button.on{background:var(--z);color:var(--y);font-weight:600;border-color:var(--v)}
#analiz-raporlari .ay-esles{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin:10px 0}
#analiz-raporlari .ay-alan{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--s)}
#analiz-raporlari .ay-sec{padding:8px 9px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:13px;max-width:100%}
#analiz-raporlari .ay-sayi{width:84px;padding:7px 9px;border:1px solid var(--k);border-radius:9px;background:var(--a);color:var(--y);font:inherit;font-size:13px}
#analiz-raporlari .ay-secenek{margin-top:10px}#analiz-raporlari .ay-onay{display:block;font-size:13px;margin:6px 0}
#analiz-raporlari .ay-ozet{font-size:14px;font-weight:600;margin-bottom:8px}
#analiz-raporlari .ay-tablo-sar{overflow-x:auto;margin:6px 0}#analiz-raporlari .ay-tablo{border-collapse:collapse;font-size:12px;width:100%}
#analiz-raporlari .ay-tablo th,#analiz-raporlari .ay-tablo td{padding:5px 9px;border-bottom:1px solid var(--k);text-align:left;white-space:nowrap}
#analiz-raporlari .ay-tablo th{color:var(--s);font-weight:600;font-size:11px;text-transform:uppercase}
#analiz-raporlari .ay-hatalar{font-size:12px;background:rgba(198,40,40,.07);border:1px solid rgba(198,40,40,.3);border-radius:9px;padding:8px 10px;margin:8px 0}
#analiz-raporlari .ay-ilerleme{margin:10px 0}#analiz-raporlari .ay-cubuk-iz{height:8px;background:var(--a);border-radius:4px;overflow:hidden;margin-top:5px}
#analiz-raporlari .ay-cubuk{height:100%;width:0;background:var(--v);transition:width .2s}
#analiz-raporlari .ay-iyi{border-color:var(--v)}#analiz-raporlari .ay-kotu{border-color:var(--kirmizi,#c62828)}
#analiz-raporlari .ay-gecmis .an-btn2{white-space:nowrap;flex:none}#analiz-raporlari .ay-gecmis{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--k)}
#analiz-raporlari .an-kucuk{margin-top:14px;font-size:12px}#analiz-raporlari .an-kucuk a{color:var(--s)}`;
  document.head.appendChild(s);
}
let _anSon=null;      // ekranda şu an görünen raporun paylaşılabilir özeti: {tur, args, baslik, bas, bit}
function anKontrolEkle(){
  const kont=document.querySelector('#analiz-raporlari .an-kontrol');if(!kont||_anId('an-alan-ay1'))return;
  const alan=(id,etiket,sid)=>{const d=document.createElement('div');d.className='an-alan';d.id=id;d.style.display='none';const l=document.createElement('label');l.textContent=etiket;const s=document.createElement('select');s.id=sid;s.addEventListener('change',()=>anGoster());d.appendChild(l);d.appendChild(s);kont.appendChild(d);};
  alan('an-alan-ay1','1. ay','an-ay1');alan('an-alan-ay2','2. ay','an-ay2');alan('an-alan-yil','Yıl','an-yil');alan('an-alan-sayim','Sayım tarihi','an-sayim');
  const pd=document.createElement('div');pd.className='an-alan an-paylas-alan';pd.id='an-alan-paylas';pd.style.display='none';
  const pb=document.createElement('button');pb.type='button';pb.className='an-btn2';pb.id='an-paylas-ac';pb.textContent='📤 Raporu paylaş';pb.addEventListener('click',()=>anPaylasAc());pd.appendChild(pb);kont.appendChild(pd);
  const kutu=document.createElement('div');kutu.id='an-paylas-kutu';kutu.style.display='none';const sn=_anId('an-sonuc');if(sn&&sn.parentNode)sn.parentNode.insertBefore(kutu,sn);
}
function anPaylasGoster(v){const e=_anId('an-alan-paylas');if(e)e.style.display=v?'':'none';if(!v){const k=_anId('an-paylas-kutu');if(k){k.style.display='none';k.replaceChildren();}}}
// Raporu paylaş: ekrandaki raporu DONDURULMUŞ olarak yayınlar (rapor_analiz_yayinla); sonra Rapor Paylaşımı'ndan alıcıya gönderilir
window.anPaylasAc=function(){
  if(!_anSon)return;const kutu=_anId('an-paylas-kutu');if(!kutu)return;kutu.replaceChildren();kutu.style.display='';
  const ad=Object.fromEntries(AN_TURLER)[_anSon.tur]||'Rapor',b=_anSon.bas?String(_anSon.bas).slice(0,10):'',s=_anSon.bit?String(_anSon.bit).slice(0,10):'',donem=b?(b===s?_ayTrTarih(b):`${_ayTrTarih(b)} – ${_ayTrTarih(s)}`):'';
  const k=ayKart('Raporu paylaş');
  k.appendChild(ayEl('div','ay-metin','Rapor, şu an ekranda gördüğünüz haliyle dondurulur: veri sonradan değişse de alıcı yayın anındaki halini görür. Yayınladıktan sonra alıcıya Rapor Paylaşımı ekranından göndereceksiniz.'));
  const l1=ayEl('label','ay-alan','Başlık (alıcı görür)'),i1=document.createElement('input');i1.id='an-paylas-bslk';i1.type='text';i1.maxLength=120;i1.value=`${ad}${donem?' · '+donem:''}`;i1.className='ay-pano';i1.style.marginTop='0';l1.appendChild(i1);k.appendChild(l1);
  const l2=ayEl('label','ay-alan','Açıklama (isteğe bağlı)'),i2=document.createElement('textarea');i2.id='an-paylas-acik';i2.rows=2;i2.maxLength=500;i2.className='ay-pano';l2.appendChild(i2);k.appendChild(l2);
  const sat=ayEl('div','ay-satir'),yb=ayBtn('Yayınla','an-btn',()=>anPaylasYayinla());yb.id='an-paylas-yayinla';sat.appendChild(yb);sat.appendChild(ayBtn('Vazgeç','an-btn2',()=>anPaylasGoster(true)));k.appendChild(sat);
  kutu.appendChild(k);
};
window.anPaylasYayinla=async function(){
  if(!_anSon)return;const b=_anId('an-paylas-yayinla'),baslik=(_anId('an-paylas-bslk').value||'').trim(),acik=(_anId('an-paylas-acik').value||'').trim()||null;
  if(!baslik){bil('Rapora bir başlık verin','err');return;}
  const a=_anSon.args,t=_anSon.tur;let p_bas,p_bit=null;
  if(t==='iki_ay'){p_bas=a.p_ay1;p_bit=a.p_ay2;}else if(t==='yillik'){p_bas=`${a.p_yil}-01-01`;}else if(t==='envanter'){p_bas=a.p_tarih;}else{p_bas=a.p_bas;p_bit=a.p_bit;}
  if(b)b.disabled=true;
  try{
    const {data,error}=await sb.rpc('rapor_analiz_yayinla',{p_isyeri:aktifIsyeri.id,p_rapor:t,p_baslik:baslik,p_aciklama:acik,p_bas,p_bit});
    if(error){bil(_anHata(error),'err');return;}
    const kutu=_anId('an-paylas-kutu');kutu.replaceChildren();const k=ayKart('✓ Rapor yayınlandı');
    k.appendChild(ayEl('div','ay-metin',`"${baslik}" dondurulmuş rapor olarak yayınlandı. Şimdi bir alıcıya gönderebilirsiniz.`));
    const sat=ayEl('div','ay-satir'),gb=ayBtn('Alıcıya gönder (Rapor Paylaşımı)','an-btn',()=>anPaylasGit(data.id));gb.id='an-paylas-git';sat.appendChild(gb);sat.appendChild(ayBtn('Kapat','an-btn2',()=>anPaylasGoster(true)));k.appendChild(sat);kutu.appendChild(k);
  }catch(e){bil(e.message||'Rapor yayınlanamadı','err');}
  finally{if(b)b.disabled=false;}
};
window.anPaylasGit=async function(id){
  gp('rapor-paylasim');
  try{await new Promise(r=>setTimeout(r,250));if(typeof rpYukle==='function')await rpYukle();if(typeof rpRaporAc==='function')await rpRaporAc(id);}catch(e){}
};
// Seçili sekmeye göre hangi seçicilerin görüneceği: İki ay → 1. ay + 2. ay; Yıllık → Yıl; diğerleri → Dönem
function anKontrolGoster(){
  anKontrolEkle();const iki=_anTur==='iki_ay',yil=_anTur==='yillik',env=_anTur==='envanter',yk=_anTur==='yuklu',d=_anId('an-donem'),w=d&&d.parentElement;
  if(w)w.style.display=(iki||yil||env||yk)?'none':'';
  const g=(id,v)=>{const e=_anId(id);if(e)e.style.display=v?'':'none';};g('an-alan-ay1',iki);g('an-alan-ay2',iki);g('an-alan-yil',yil);g('an-alan-sayim',env);
}
function anAyYilDoldur(ilk){
  anKontrolEkle();if(!_anOzet||!_anOzet.satis_bas)return;
  const aylar=anAylar(_anOzet.satis_bas,_anOzet.satis_bit).reverse(),yb=+String(_anOzet.satis_bas).slice(0,4),ys=+String(_anOzet.satis_bit).slice(0,4);
  const doldur=(id,degerler,varsayilan)=>{const s=_anId(id);if(!s)return;const onceki=s.value;s.innerHTML=degerler.map(([v,t])=>`<option value="${v}">${_rpEscAn(t)}</option>`).join('');s.value=(!ilk&&onceki&&degerler.some(x=>x[0]===onceki))?onceki:varsayilan;};
  const ayL=aylar.map(m=>[m,anAyAdi(m)]);
  doldur('an-ay2',ayL,aylar[0]);doldur('an-ay1',ayL,aylar[1]||aylar[0]);
  const yillar=[];for(let y=ys;y>=yb;y--)yillar.push([String(y),String(y)]);doldur('an-yil',yillar,String(ys));
}
// Sayım tarihleri (yeniden eskiye); varsayılan en son sayım
async function anSayimDoldur(ilk){
  anKontrolEkle();const s=_anId('an-sayim');if(!s)return;let L=[];
  try{const r=await sb.rpc('an_sayim_tarihleri',{p_isyeri:aktifIsyeri.id});if(!r.error&&Array.isArray(r.data))L=r.data.map(x=>String(x).slice(0,10));}catch(e){}
  const onceki=s.value;s.innerHTML=L.map(t=>`<option value="${t}">${_rpEscAn(_ayTrTarih(t))}</option>`).join('');s.value=(!ilk&&onceki&&L.includes(onceki))?onceki:(L[0]||'');
}
function anHazirlik(){
  const sayfa=_anId('analiz-raporlari');if(!sayfa)return;
  if(!_anId('ay-panel')){const p=document.createElement('div');p.id='ay-panel';p.style.display='none';sayfa.insertBefore(p,_anId('an-bos'));}
  if(!_anId('an-veri-btn')){const ust=sayfa.querySelector('.an-ust');if(ust){const b=document.createElement('button');b.id='an-veri-btn';b.type='button';b.className='an-btn';b.textContent='＋ Veri yükle';b.addEventListener('click',()=>ayAc());ust.appendChild(b);}}
}
window.anAc=async function(){
  anStil();anHazirlik();_ay=null;{const p=_anId('ay-panel');if(p)p.style.display='none';}
  const ad=_anId('an-isyeri-ad');if(ad)ad.textContent=(typeof aktifIsyeri!=='undefined'&&aktifIsyeri&&aktifIsyeri.ad)||'';
  await anYukle(true);
};
async function anYukle(ilk){
  if(typeof aktifIsyeri==='undefined'||!aktifIsyeri)return;
  const {data,error}=await sb.rpc('an_veri_ozeti',{p_isyeri:aktifIsyeri.id});
  if(error){_anId('an-ana').style.display='none';_anId('an-bos').style.display='';_anId('an-bos').innerHTML=`<b>Analiz verisi okunamadı</b>${_rpEscAn(_anHata(error))}`;return;}
  _anOzet=data;
  if(!data||(!Number(data.satis)&&!Number(data.sayim)&&!Number(data.alim))){_anId('an-ana').style.display='none';_anId('an-bos').style.display='';
    _anId('an-bos').innerHTML='<b>Bu işyerinde henüz analiz verisi yok</b>Kendi verinizi Excel/CSV dosyasından ya da kopyaladığınız bir tablodan yükleyin: ürün listesi (grup, fiyat, KDV, maliyet), günlük satışlar, alımlar ve envanter (stok sayımı).<br><br><button type="button" class="an-btn" id="an-yukle-ac" onclick="ayAc()">Veri yükle</button><div class="an-kucuk"><a href="#" id="an-ornek-link" onclick="anOrnekYukle();return false">deneme için örnek (sahte) veri yükle</a></div>';return;}
  _anId('an-bos').style.display='none';_anId('an-ana').style.display='';
  if(!Number(data.satis)){if(Number(data.alim))_anTur='alim';else if(Number(data.sayim))_anTur='envanter';}          // satış yoksa alım ya da envanter raporuyla aç
  anDonemDoldur(ilk);anAyYilDoldur(ilk);await anSayimDoldur(ilk);anKontrolGoster();anSekmeCiz();anOzetYaz();await anGoster();
}
function _rpEscAn(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function anAylar(bas,bit){const L=[];let [y,m]=String(bas).slice(0,7).split('-').map(Number);const [y2,m2]=String(bit).slice(0,7).split('-').map(Number);while(y<y2||(y===y2&&m<=m2)){L.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}}return L;}
function anAyAdi(ym){const [y,m]=ym.split('-');return AN_AY[+m-1]+' '+y;}
function anAraligi(d){
  const [vb,vs]=anVeriAraligi();
  if(d==='tum')return [String(vb).slice(0,10),String(vs).slice(0,10)];
  if(d==='son3'){const a=anAylar(vb,vs);return [`${a[Math.max(0,a.length-3)]}-01`,String(vs).slice(0,10)];}
  const [y,m]=d.split('-').map(Number),son=new Date(Date.UTC(y,m,0)).getUTCDate();return [`${d}-01`,`${d}-${String(son).padStart(2,'0')}`];
}
// Dönem listesi hangi veriye dayanır: Alım analizi → alım tarihleri; diğerleri → satış tarihleri
function anVeriAraligi(){const o=_anOzet||{};return _anTur==='alim'?[o.alim_bas,o.alim_bit]:[o.satis_bas,o.satis_bit];}
function anDonemDoldur(ilk){
  const [vb,vs]=anVeriAraligi();if(!vb){_anId('an-donem').innerHTML='';return;}
  const s=_anId('an-donem'),onceki=s.value,aylar=anAylar(vb,vs).reverse();
  const son3=aylar.length>3;
  s.innerHTML=(son3?'<option value="son3">Son 3 ay ('+_rpEscAn(anAyAdi(aylar[2]))+' – '+_rpEscAn(anAyAdi(aylar[0]))+')</option>':'')+'<option value="tum">Tüm dönem ('+_rpEscAn(anAyAdi(aylar[aylar.length-1]))+' – '+_rpEscAn(anAyAdi(aylar[0]))+')</option>'+aylar.map(a=>`<option value="${a}">${_rpEscAn(anAyAdi(a))}</option>`).join('');
  s.value=(!ilk&&onceki&&[...s.options].some(o=>o.value===onceki))?onceki:(_anTur==='aylik_karsilastirma'?'tum':((_anTur==='satis_analizi'||_anTur==='alim')?(son3?'son3':'tum'):aylar[0]));
}
function anSekmeCiz(){
  const k=_anId('an-sekme');k.innerHTML='';
  AN_TURLER.forEach(([t,ad])=>{const b=document.createElement('button');b.type='button';b.textContent=ad;b.dataset.t=t;b.className=t===_anTur?'on':'';b.addEventListener('click',()=>anTurSec(t));k.appendChild(b);});
}
function anOzetYaz(){
  const o=_anOzet,k=_anId('an-ozet');k.textContent='';
  if(o.ornek){const r=document.createElement('span');r.className='an-rozet';r.textContent='Örnek (sahte) veri';k.appendChild(r);}
  k.appendChild(document.createTextNode(`${_anSayi(o.urun)} ürün · ${_anSayi(o.malzeme)} malzeme · ${_anSayi(o.recete)} reçete satırı · ${_anSayi(o.satis)} satış · ${_anSayi(o.alim)} alım · ${_anSayi(o.sayim)} sayım · ${_anSayi(o.fire)} fire`));
  _anId('an-yenile').style.display=_anId('an-sil').style.display=o.ornek?'':'none';
}
window.anTurSec=function(t){
  const onceki=_anTur;_anTur=t;if((t==='alim')!==(onceki==='alim'))anDonemDoldur(true);          // Alım analizi kendi tarih aralığını kullanır
  const s=_anId('an-donem'),tekAy=/^\d{4}-\d{2}$/.test(s.value);
  if((t==='aylik_karsilastirma'||t==='satis_analizi')&&tekAy)s.value=[...s.options].some(o=>o.value==='son3')?'son3':'tum';      // karşılaştırma ve satış analizi birden çok ay ister
  anKontrolGoster();anSekmeCiz();anGoster();
};
window.anDonemDegisti=function(){anGoster();};
// "Yüklü veriler" sekmesi: Veri yükle ekranına girmeden, hangi sayfanın verisi sistemde (satır, tarih aralığı, son yükleme) + son yüklemeler
async function anYukluCiz(panel,no){
  try{
    const [o,l]=await Promise.all([ayRpc('an_veri_ozeti',{p_isyeri:aktifIsyeri.id}),ayRpc('an_yuklemeler_liste',{p_isyeri:aktifIsyeri.id})]);
    if(no!==_anNo)return;_anOzet=o;anOzetYaz();
    panel.className='an-yuklu-panel';panel.replaceChildren();panel.appendChild(ayYukluKart({ozet:o}));
    const k=ayKart('Son yüklemeler'),TUR={urun:'Ürünler',satis:'Günlük Satış',alim:'Alımlar',sayim:'Envanter'};
    if(!l||!l.length)k.appendChild(ayEl('div','ay-not','Henüz yükleme yapılmadı.'));
    (l||[]).slice(0,15).forEach(y=>{const s=ayEl('div','ay-yuklem'),sol=ayEl('div','');
      sol.appendChild(ayEl('b','',`${TUR[y.tur]||y.tur} · ${y.ad||''}`));
      const ar=y.bas?(String(y.bas).slice(0,10)===String(y.bit).slice(0,10)?_ayTrTarih(String(y.bas).slice(0,10)):`${_ayTrTarih(String(y.bas).slice(0,10))} – ${_ayTrTarih(String(y.bit).slice(0,10))}`):'';
      sol.appendChild(ayEl('div','ay-not',[y.tur!=='urun'?`${_aySay(y.satir)} satır`:`${_aySay(y.satir)} ürün`,ar,y.kaynak==='ornek'?'örnek (sahte) veri':'',y.ts?new Date(y.ts).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):''].filter(Boolean).join(' · ')));
      s.appendChild(sol);k.appendChild(s);});
    k.appendChild(ayEl('div','ay-not','Bir yüklemeyi geri almak için: Veri yükle → Önceki yüklemeler.'));
    panel.appendChild(k);
  }catch(e){if(no===_anNo){panel.className='';panel.innerHTML='<div class="an-bos"><b>Yüklü veriler okunamadı</b>'+_rpEscAn(e.message||'')+'</div>';}}
}
async function anGoster(){
  if(!_anOzet)return;const no=++_anNo,panel=_anId('an-sonuc');
  _anSon=null;anKontrolEkle();anPaylasGoster(false);
  if(_anTur==='yuklu'){panel.className='an-yuklu-panel';panel.innerHTML='<div class="an-bos">Yükleniyor…</div>';return anYukluCiz(panel,no);}
  panel.className='rc-panel';panel.innerHTML='<div class="an-bos">Rapor hazırlanıyor…</div>';
  let args;
  if(_anTur==='envanter'){const t=(_anId('an-sayim')||{}).value;
    if(!t){panel.innerHTML='<div class="an-bos"><b>Henüz stok sayımı yok</b>Envanter raporu için şablondaki "Envanter" sayfasını (sayım tarihi, malzeme, miktar, birim maliyet) yükleyin.</div>';return;}
    args={p_isyeri:aktifIsyeri.id,p_tarih:t};}
  else if(_anTur==='alim'){
    if(!_anOzet.alim_bas){panel.innerHTML='<div class="an-bos"><b>Henüz alım verisi yok</b>Alım analizi için şablondaki "Alımlar" sayfasını (tarih, malzeme, miktar, birim fiyat ya da tutar, tedarikçi) yükleyin.</div>';return;}
    const [bas,bit]=anAraligi(_anId('an-donem').value);args={p_isyeri:aktifIsyeri.id,p_bas:bas,p_bit:bit};}
  else if(!_anOzet.satis_bas){panel.innerHTML='<div class="an-bos"><b>Bu rapor için satış verisi gerekir</b>Şablondaki "Ürünler" ve "Günlük Satış" sayfalarını yükleyin.</div>';return;}
  else if(_anTur==='iki_ay'){const a1=(_anId('an-ay1')||{}).value,a2=(_anId('an-ay2')||{}).value;
    if(!a1||!a2||a1===a2){panel.innerHTML='<div class="an-bos"><b>İki farklı ay seçin</b>'+(anAylar(_anOzet.satis_bas,_anOzet.satis_bit).length<2?'Karşılaştırmak için en az iki ayın satış verisi gerekir.':'1. ve 2. ay aynı olamaz.')+'</div>';return;}
    args={p_isyeri:aktifIsyeri.id,p_ay1:a1+'-01',p_ay2:a2+'-01'};}
  else if(_anTur==='yillik')args={p_isyeri:aktifIsyeri.id,p_yil:parseInt((_anId('an-yil')||{}).value,10)};
  else{const [bas,bit]=anAraligi(_anId('an-donem').value);args={p_isyeri:aktifIsyeri.id,p_bas:bas,p_bit:bit};}
  const {data,error}=await sb.rpc('an_rapor_'+_anTur,args);
  if(no!==_anNo)return;
  if(error){panel.innerHTML=`<div class="an-bos"><b>Rapor hazırlanamadı</b>${_rpEscAn(_anHata(error))}</div>`;return;}
  panel.replaceChildren();
  if(window.RaporCizim)window.RaporCizim.ciz(data,panel);else panel.innerHTML='<div class="an-bos">Çizici yüklü değil (rapor/cizim.js).</div>';
  if(data&&data.kayit_var){_anSon={tur:_anTur,args,baslik:data.baslik,bas:data.donem_bas,bit:data.donem_bit};anPaylasGoster(true);}          // boş rapor paylaşılamaz
}
window.anOrnekYukle=async function(){
  if(!(await onay('Bu işyerine 4 aylık SAHTE örnek restoran verisi yüklenecek (32 ürün, 47 malzeme, satış, alım, sayım). Mevcut örnek veri varsa yenilenir; sizin gerçek verileriniz etkilenmez.','📈','Yükle','Vazgeç')))return;
  const b=_anId('an-yenile'),b2=_anId('an-yukle-btn');if(b)b.disabled=true;if(b2)b2.disabled=true;
  try{
    const {error}=await sb.rpc('an_ornek_veri_yukle',{p_isyeri:aktifIsyeri.id});
    if(error){bil(_anHata(error),'err');return;}
    bil('Örnek veri yüklendi','ok');await anYukle(true);
  }finally{if(b)b.disabled=false;if(b2)b2.disabled=false;}
};
window.anOrnekSil=async function(){
  if(!(await onay('Örnek (sahte) veri KALICI olarak silinecek. Elle ya da dosyadan yüklediğiniz kayıtlara dokunulmaz.','🗑️','Sil','Vazgeç')))return;
  const {error}=await sb.rpc('an_ornek_veri_sil',{p_isyeri:aktifIsyeri.id});
  if(error){bil(_anHata(error),'err');return;}
  bil('Örnek veri silindi','ok');await anYukle(true);
};

// ===================== VERİ ALMA SİHİRBAZI (Excel / CSV / panodan yapıştırma) =====================
// Dosya TARAYICIDA okunur (sunucuya dosya gitmez); yalnızca ayrıştırılmış satırlar parça parça veritabanına gönderilir.
// Üç tür: günlük satış (satır satır) · günlük satış matrisi (ürün satırlarda, günler sütunlarda) · ürün kartları (grup, fiyat, KDV, maliyet).
// PDF ve web sayfası: tabloyu kopyalayıp "Yapıştır" ile aynı akıştan geçirilir.
const AY_AYLAR={ocak:1,oca:1,subat:2,sub:2,mart:3,mar:3,nisan:4,nis:4,mayis:5,may:5,haziran:6,haz:6,temmuz:7,tem:7,agustos:8,agu:8,eylul:9,eyl:9,ekim:10,eki:10,kasim:11,kas:11,aralik:12,ara:12};
const AY_GUNLER=new Set(['pzt','sal','car','per','cum','cmt','paz','pazartesi','sali','carsamba','persembe','cuma','cumartesi','pazar']);
const AY_KOD=['kod','urunkodu','stokkodu','malzemekodu','stokkartikodu','barkod','urunno','stokno','kodu'];
const AY_AD=['urun','urunadi','urunad','stokadi','stokad','malzemeadi','malzemeismi','stokismi','malzeme','yemek','menu','urunhizmet','urunismi','adi','ad','productname','product','kalem','mamul'];
const AY_ES={
  tarih:['tarih','gun','gunluk','satistarihi','islemtarihi','belgetarihi','fistarihi','sayimtarihi','sayimgunu','envantertarihi','date','tarihi'],
  urun:[...AY_KOD,...AY_AD], ad:AY_AD, kod:AY_KOD,
  adet:['adet','satisadedi','satisadet','miktar','mik','qty','quantity','satismiktari','porsiyon','toplamadet','sayimmiktari','stokmiktari','mevcutstok','mevcut','bakiye','kalan','stok','sayim'],
  tutar:['tutar','toplamtutar','satistutari','ciro','toplam','nettutar','bruttutar','tutartl','satisbedeli','alistutari','alimtutari','faturatutari','satirtutari'],
  bf:['birimfiyat','birimfiyatnet','netbirimfiyat','alisfiyati','alisfiyat','birimalisfiyati','birimfiyati','netfiyat','fiyat'],
  ted:['tedarikci','tedarikciadi','tedarikcifirma','firma','cari','cariadi','satici','saticiadi','unvan'],
  belge:['belgeno','belgenumarasi','faturano','faturanumarasi','irsaliyeno','fisno','evrakno','belge'],
  grup:['grup','urungrubu','kategori','anagrup','reyon','category','grubu','sinif','altgrup'],
  birim:['birim','olcubirimi','birimi'],
  sf:['satisfiyati','fiyat','listefiyati','birimfiyat','satisfiyatikdvdahil','fiyatkdvdahil','brutfiyat','menufiyati'],
  kdv:['kdv','kdvorani','kdvoran','kdvyuzde','vergi'],
  nf:['netfiyat','kdvharicfiyat','netfiyati','satisfiyatinet','kdvharicsatisfiyati'],
  mal:['maliyet','birimmaliyet','maliyettutari','recetemaliyeti','netmaliyet','cost','birimmaliyetnet','maliyetfiyati']
};
const AY_ALANLAR={
  satis:[['tarih','Tarih',1],['urun','Ürün (kod ya da ad)',1],['adet','Adet',1],['tutar','Tutar (isteğe bağlı)',0],['grup','Grup (yeni ürünler için)',0],['birim','Birim (yeni ürünler için)',0]],
  matris:[['urun','Ürün (kod ya da ad)',1],['grup','Grup (yeni ürünler için)',0]],
  alim:[['tarih','Tarih',1],['ad','Malzeme adı',0],['kod','Malzeme kodu',0],['adet','Miktar',1],['bf','Birim fiyat (net)',0],['tutar','Tutar (net)',0],['grup','Grup',0],['birim','Birim',0],['ted','Tedarikçi',0],['belge','Belge no',0]],
  envanter:[['tarih','Sayım tarihi',1],['ad','Malzeme adı',0],['kod','Malzeme kodu',0],['adet','Miktar',1],['mal','Birim maliyet (net)',0],['grup','Grup',0],['birim','Birim',0]],
  urun:[['ad','Ürün adı',1],['kod','Ürün kodu',0],['grup','Grup',0],['birim','Birim',0],['sf','Satış fiyatı (KDV dahil)',0],['kdv','KDV oranı %',0],['nf','Net fiyat (KDV hariç)',0],['mal','Birim maliyet (net)',0]]
};
function ayNorm(s){return String(s==null?'':s).replace(/\u0307/g,'').replace(/[İI]/g,'i').replace(/ı/g,'i').toLowerCase().replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u').replace(/[^a-z0-9]/g,'');}
function aySlug(s){return String(s==null?'':s).replace(/\u0307/g,'').replace(/[İI]/g,'i').replace(/ı/g,'i').toLowerCase().replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/â/g,'a').replace(/î/g,'i').replace(/û/g,'u').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
// Excel seri numarası, gg.aa.yyyy, gg/aa/yy, yyyy-aa-gg, "1 Temmuz 2026", "01.07" (yıl verilirse) → yyyy-aa-gg; olmazsa null
function ayTarih(v,yil){
  if(v===undefined||v===null||v==='')return null;
  let y,m,d;
  if(v instanceof Date){if(isNaN(v))return null;y=v.getFullYear();m=v.getMonth()+1;d=v.getDate();}
  else if(typeof v==='number'){if(!(v>20000&&v<80000))return null;const t=new Date(Math.round((Math.floor(v)-25569)*86400000));y=t.getUTCFullYear();m=t.getUTCMonth()+1;d=t.getUTCDate();}
  else{
    let s=String(v).trim(),r;
    if((r=s.match(/^([A-Za-zÇĞİÖŞÜçğıöşü]{2,10})[\s,.\-]+(?=\d)/))&&AY_GUNLER.has(ayNorm(r[1])))s=s.slice(r[0].length);
    if((r=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?!\d)/))){d=+r[1];m=+r[2];y=+r[3];}
    else if((r=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?!\d)/))){y=+r[1];m=+r[2];d=+r[3];}
    else if((r=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})(?!\d)/))){d=+r[1];m=+r[2];y=2000+ +r[3];}
    else if((r=s.match(/^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\.?,?\s*(\d{4})?/))){const ay=AY_AYLAR[ayNorm(r[2])];if(!ay)return null;d=+r[1];m=ay;y=r[3]?+r[3]:yil;}
    else if((r=s.match(/^(\d{1,2})[.\/](\d{1,2})$/))&&yil){d=+r[1];m=+r[2];y=yil;}
    else return null;
  }
  if(!y||!(y>=2000&&y<=2100&&m>=1&&m<=12&&d>=1))return null;
  if(d>new Date(Date.UTC(y,m,0)).getUTCDate())return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
// "1.234,56", "1234,56", "1,234.56", "₺12", "%10", "12 TL" → sayı; boş/anlamsız → NaN
function aySayi(v){
  if(typeof v==='number')return Number.isFinite(v)?v:NaN;
  if(v===undefined||v===null)return NaN;
  let s=String(v).replace(/[₺$€%\s]|tl\b/gi,'');
  if(s===''||s==='-')return NaN;
  if(/^\(.*\)$/.test(s))s='-'+s.slice(1,-1);
  const nokta=s.includes('.'),virgul=s.includes(',');
  if(nokta&&virgul)s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  else if(virgul){s=((s.match(/,/g)||[]).length>1||/^-?\d{1,3}(,\d{3})+$/.test(s))?s.replace(/,/g,''):s.replace(',','.');}
  else if((s.match(/\./g)||[]).length>1||/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  return /^-?\d*\.?\d+$/.test(s)?parseFloat(s):NaN;
}
const ayBos=c=>c===null||c===undefined||(typeof c==='string'&&c.trim()==='');
// Başlık satırı: ilk 30 satırda, çoğu hücresi metin olan (ya da çoğu hücresi tarih olan, matris) ilk satır
function ayBaslikSatiri(aoa){
  const lim=Math.min(aoa.length,30);
  for(let r=0;r<lim;r++){
    const dolu=(aoa[r]||[]).filter(c=>!ayBos(c));if(dolu.length<2)continue;
    const tarihSay=dolu.filter(c=>ayTarih(c,2026)!==null).length;
    if(tarihSay>=3&&tarihSay>=dolu.length*0.4)return r;
    const metin=dolu.filter(c=>typeof c==='string'&&isNaN(aySayi(c))&&ayTarih(c,2026)===null).length;
    if(metin/dolu.length>=0.6)return r;
  }
  return 0;
}
function ayEsleOner(basliklar,alanlar){
  const norm=basliklar.map(ayNorm),adaylar=[];
  alanlar.forEach(a=>{const syn=AY_ES[a]||[];norm.forEach((h,i)=>{if(!h)return;let sk=0;syn.forEach((s,si)=>{if(h===s)sk=Math.max(sk,10-Math.min(si,40)*0.01);else if(s.length>=4&&h.includes(s))sk=Math.max(sk,3);});if(sk)adaylar.push([a,i,sk]);});});
  adaylar.sort((x,y)=>y[2]-x[2]);const es={},kul=new Set();
  adaylar.forEach(([a,i])=>{if(es[a]!==undefined||kul.has(i))return;es[a]=i;kul.add(i);});
  return es;
}
function ayTurOner(aoa,hdr,sayfa){
  const row=aoa[hdr]||[],tarihSay=row.filter((c,i)=>i>0&&ayTarih(c,2026)!==null).length;
  if(/envanter|sayim/.test(ayNorm(sayfa||'')))return 'envanter';
  if(/alim|alis|satinalma/.test(ayNorm(sayfa||'')))return 'alim';
  if(tarihSay>=3&&tarihSay>=(row.length-1)*0.4)return 'matris';
  const has=f=>row.some(c=>AY_ES[f].includes(ayNorm(c))),env=row.some(c=>/sayim|envanter|malzeme/.test(ayNorm(c))),alimMi=row.some(c=>/tedarik|alis|alim|satinalma/.test(ayNorm(c)));
  if(has('tarih')&&has('adet')&&(alimMi||(env&&(has('tutar')||has('bf')))))return 'alim';     // malzeme + tutar/fiyat sütunu = alım; yalnızca miktar (ve birim maliyet) = envanter
  if(has('tarih')&&has('adet'))return env?'envanter':'satis';
  if(!has('tarih')&&env&&has('adet'))return 'envanter';
  if(['sf','nf','mal','kdv'].some(has)&&!has('tarih'))return 'urun';
  return 'satis';
}
const _ayHucre=(row,i)=>(i===undefined||i===null||i<0)?null:(row[i]===undefined?null:row[i]);
const _ayMetin=v=>ayBos(v)?'':String(v).trim();
const _ayToplamSatiri=u=>{const n=ayNorm(u);return n.startsWith('toplam')||n.startsWith('gtoplam')||n.startsWith('geneltoplam')||n==='total';};
function _ayOzet(satirlar,hatalar,okunan,bos){
  const t=satirlar.map(x=>x.t).filter(Boolean).sort();
  return {satirlar,hatalar:hatalar.slice(0,200),hataSayisi:hatalar.length,okunan,bos,tarihBas:t[0]||null,tarihBit:t[t.length-1]||null,urunSayisi:new Set(satirlar.map(x=>aySlug(x.u!==undefined?x.u:x.ad))).size};
}
// Günlük satış (satır satır)
function ayHazirlaSatis(aoa,hdr,es){      // es.tarih yoksa es.tarihSabit (yyyy-aa-gg) tüm satırlara yazılır
  const satirlar=[],hatalar=[];let okunan=0,bos=0;
  for(let r=hdr+1;r<aoa.length;r++){
    const row=aoa[r]||[];if(row.every(ayBos)){bos++;continue;}
    const no=r+1,u=_ayMetin(_ayHucre(row,es.urun)),tc=es.tarih===undefined?'':_ayMetin(_ayHucre(row,es.tarih));
    if((u&&_ayToplamSatiri(u))||(tc&&_ayToplamSatiri(tc))){bos++;continue;}
    okunan++;
    const t=es.tarih===undefined?(ayTarih(es.tarihSabit)||null):ayTarih(_ayHucre(row,es.tarih));if(!t){hatalar.push({s:no,m:'Tarih okunamadı'});continue;}
    if(!u){hatalar.push({s:no,m:'Ürün boş'});continue;}
    const a=aySayi(_ayHucre(row,es.adet));if(Number.isNaN(a)){hatalar.push({s:no,m:'Adet sayı değil'});continue;}
    if(a===0){bos++;okunan--;continue;}if(a<0){hatalar.push({s:no,m:'Adet eksi'});continue;}
    let x=null;if(es.tutar!==undefined&&!ayBos(_ayHucre(row,es.tutar))){x=aySayi(_ayHucre(row,es.tutar));if(Number.isNaN(x)){hatalar.push({s:no,m:'Tutar sayı değil'});continue;}if(x<0){hatalar.push({s:no,m:'Tutar eksi'});continue;}}
    const o={s:no,t,u,a};if(x!==null)o.x=x;const g=_ayMetin(_ayHucre(row,es.grup));if(g)o.g=g;const b=_ayMetin(_ayHucre(row,es.birim));if(b)o.b=b;satirlar.push(o);
  }
  return _ayOzet(satirlar,hatalar,okunan,bos);
}
// Alımlar: her satır bir alım kaydıdır (toplanmaz). Tutar = "Tutar (net)" varsa o, yoksa miktar × net birim fiyat; eksi miktar + eksi tutar = iade
function ayHazirlaAlim(aoa,hdr,es){
  const satirlar=[],hatalar=[];let okunan=0,bos=0,toplam=0;
  for(let r=hdr+1;r<aoa.length;r++){
    const row=aoa[r]||[];if(row.every(ayBos)){bos++;continue;}
    const no=r+1,ad=_ayMetin(_ayHucre(row,es.ad)),kod=_ayMetin(_ayHucre(row,es.kod)),u=ad||kod,tc=es.tarih===undefined?'':_ayMetin(_ayHucre(row,es.tarih));
    if((u&&_ayToplamSatiri(u))||(tc&&_ayToplamSatiri(tc))){bos++;continue;}
    okunan++;
    const t=es.tarih===undefined?(ayTarih(es.tarihSabit)||null):ayTarih(_ayHucre(row,es.tarih));if(!t){hatalar.push({s:no,m:'Tarih okunamadı'});continue;}
    if(!u){hatalar.push({s:no,m:'Malzeme boş'});continue;}
    const a=aySayi(_ayHucre(row,es.adet));if(Number.isNaN(a)){hatalar.push({s:no,m:'Miktar sayı değil'});continue;}if(a===0){hatalar.push({s:no,m:'Miktar sıfır'});continue;}
    let f=null,x=null;
    if(es.bf!==undefined&&!ayBos(_ayHucre(row,es.bf))){f=aySayi(_ayHucre(row,es.bf));if(Number.isNaN(f)){hatalar.push({s:no,m:'Birim fiyat sayı değil'});continue;}}
    if(es.tutar!==undefined&&!ayBos(_ayHucre(row,es.tutar))){x=aySayi(_ayHucre(row,es.tutar));if(Number.isNaN(x)){hatalar.push({s:no,m:'Tutar sayı değil'});continue;}}
    if(f===null&&x===null){hatalar.push({s:no,m:'Birim fiyat ya da tutar yok'});continue;}
    const tt=x!==null?x:Math.round(a*f*100)/100;if((a>0&&tt<0)||(a<0&&tt>0)){hatalar.push({s:no,m:'Miktar ve tutarın işareti uyuşmuyor'});continue;}
    const o={s:no,t,u,a};if(ad&&kod)o.k=kod;if(f!==null)o.f=f;if(x!==null)o.x=x;
    const g=_ayMetin(_ayHucre(row,es.grup));if(g)o.g=g;const b=_ayMetin(_ayHucre(row,es.birim));if(b)o.b=b;
    const td=_ayMetin(_ayHucre(row,es.ted));if(td)o.td=td;const bn=_ayMetin(_ayHucre(row,es.belge));if(bn)o.bn=bn;
    toplam+=tt;satirlar.push(o);
  }
  const h=_ayOzet(satirlar,hatalar,okunan,bos);h.tutarToplam=Math.round(toplam*100)/100;return h;
}
// Envanter (stok sayımı): sıfır miktar GEÇERLİDİR; es.tarih yoksa es.tarihSabit tüm satırlara yazılır
function ayHazirlaEnvanter(aoa,hdr,es){
  const satirlar=[],hatalar=[];let okunan=0,bos=0;
  for(let r=hdr+1;r<aoa.length;r++){
    const row=aoa[r]||[];if(row.every(ayBos)){bos++;continue;}
    const no=r+1,ad=_ayMetin(_ayHucre(row,es.ad)),kod=_ayMetin(_ayHucre(row,es.kod)),u=ad||kod,tc=es.tarih===undefined?'':_ayMetin(_ayHucre(row,es.tarih));
    if((u&&_ayToplamSatiri(u))||(tc&&_ayToplamSatiri(tc))){bos++;continue;}
    okunan++;
    const t=es.tarih===undefined?(ayTarih(es.tarihSabit)||null):ayTarih(_ayHucre(row,es.tarih));if(!t){hatalar.push({s:no,m:'Tarih okunamadı'});continue;}
    if(!u){hatalar.push({s:no,m:'Malzeme boş'});continue;}
    const a=aySayi(_ayHucre(row,es.adet));if(Number.isNaN(a)){hatalar.push({s:no,m:'Miktar sayı değil'});continue;}if(a<0){hatalar.push({s:no,m:'Miktar eksi'});continue;}
    let m=null;if(es.mal!==undefined&&!ayBos(_ayHucre(row,es.mal))){m=aySayi(_ayHucre(row,es.mal));if(Number.isNaN(m)){hatalar.push({s:no,m:'Birim maliyet sayı değil'});continue;}if(m<0){hatalar.push({s:no,m:'Birim maliyet eksi'});continue;}}
    const o={s:no,t,u,a};if(ad&&kod)o.k=kod;if(m!==null)o.m=m;const g=_ayMetin(_ayHucre(row,es.grup));if(g)o.g=g;const b=_ayMetin(_ayHucre(row,es.birim));if(b)o.b=b;satirlar.push(o);
  }
  return _ayOzet(satirlar,hatalar,okunan,bos);
}
// Günlük satış matrisi: başlık satırındaki tarih sütunları → satır satır
function ayMatrisTarihSutunlari(aoa,hdr,yil){const row=aoa[hdr]||[],L=[];row.forEach((c,i)=>{const t=ayTarih(c,yil);if(t)L.push([i,t]);});return L;}
function ayHazirlaMatris(aoa,hdr,es,yil){
  const kolonlar=ayMatrisTarihSutunlari(aoa,hdr,yil),satirlar=[],hatalar=[];let okunan=0,bos=0;
  for(let r=hdr+1;r<aoa.length;r++){
    const row=aoa[r]||[];if(row.every(ayBos)){bos++;continue;}
    const no=r+1,u=_ayMetin(_ayHucre(row,es.urun));if(!u||_ayToplamSatiri(u)){bos++;continue;}
    okunan++;const g=_ayMetin(_ayHucre(row,es.grup));
    kolonlar.forEach(([ci,t])=>{
      const h=_ayHucre(row,ci);if(ayBos(h)||h==='-')return;const a=aySayi(h);
      if(Number.isNaN(a)){if(hatalar.length<200)hatalar.push({s:no,m:'Hücre sayı değil: "'+String(h).slice(0,12)+'"'});return;}
      if(a<0){hatalar.push({s:no,m:'Adet eksi'});return;}if(a===0)return;
      const o={s:no,t,u,a};if(g)o.g=g;satirlar.push(o);
    });
  }
  const ozet=_ayOzet(satirlar,hatalar,okunan,bos);ozet.gunSayisi=kolonlar.length;return ozet;
}
// Ürün kartları
function ayHazirlaUrun(aoa,hdr,es){
  const satirlar=[],hatalar=[];let okunan=0,bos=0;
  for(let r=hdr+1;r<aoa.length;r++){
    const row=aoa[r]||[];if(row.every(ayBos)){bos++;continue;}
    const no=r+1,ad=_ayMetin(_ayHucre(row,es.ad));if(!ad){if(_ayMetin(_ayHucre(row,es.kod))){hatalar.push({s:no,m:'Ürün adı boş'});okunan++;}else bos++;continue;}
    if(_ayToplamSatiri(ad)){bos++;continue;}
    okunan++;const o={s:no,ad};let hata=null;
    ['kod','grup','birim'].forEach(f=>{const v=_ayMetin(_ayHucre(row,es[f]));if(v)o[f]=v;});
    ['sf','kdv','nf','mal'].forEach(f=>{const h=_ayHucre(row,es[f]);if(ayBos(h))return;const n=aySayi(h);if(Number.isNaN(n)){hata='Sayı değil: '+f;return;}if(n<0){hata='Eksi değer: '+f;return;}o[f]=n;});
    if(o.kdv!==undefined&&o.kdv>100)hata='KDV oranı 0-100 arası olmalı';
    if(hata){hatalar.push({s:no,m:hata});continue;}satirlar.push(o);
  }
  return _ayOzet(satirlar,hatalar,okunan,bos);
}
// CSV / panodan yapıştırılan metin → hücre dizisi
function ayCsvAyristir(metin,ayirici){
  const satirlar=[];let row=[],c='',q=false;
  for(let i=0;i<metin.length;i++){
    const ch=metin[i];
    if(q){if(ch==='"'){if(metin[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch;}
    else if(ch==='"'&&c==='')q=true;
    else if(ch===ayirici){row.push(c);c='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&metin[i+1]==='\n')i++;row.push(c);satirlar.push(row);row=[];c='';}
    else c+=ch;
  }
  if(c!==''||row.length){row.push(c);satirlar.push(row);}
  return satirlar.map(r=>r.map(h=>{h=h.trim();return h===''?null:h;}));
}
function ayAyiriciBul(metin){
  const ilk=metin.split(/\r?\n/).filter(s=>s.trim()).slice(0,10);if(!ilk.length)return ',';
  const skor=a=>{const say=ilk.map(s=>s.split(a).length-1);return say[0]>0&&say.every(x=>x===say[0])?say[0]*10:say.filter(x=>x>0).length;};
  return ['\t',';',',','|'].map(a=>[a,skor(a)]).sort((x,y)=>y[1]-x[1])[0][0];
}
const _ayNumTok=t=>/^[₺$€]?-?\d{1,3}([.,]\d{3})*([.,]\d+)?%?$|^[₺$€]?-?\d+([.,]\d+)?%?$/.test(t);
// Panodan yapıştırma: sekme (Excel/web tablosu) → ; → "ürün adı + sondaki sayılar" (PDF) → virgül
function ayPanoAyristir(metin){
  const satirlar=String(metin||'').split(/\r?\n/).filter(s=>s.trim()!=='');if(!satirlar.length)return {aoa:[],ayirici:''};
  if(satirlar.some(s=>s.includes('\t')))return {aoa:ayCsvAyristir(metin,'\t'),ayirici:'sekme'};
  if(satirlar.filter(s=>s.includes(';')).length>=satirlar.length*0.6)return {aoa:ayCsvAyristir(metin,';'),ayirici:';'};
  const sondaki=s=>{const t=s.trim().split(/\s+/);let k=0;while(k<t.length-1&&_ayNumTok(t[t.length-1-k]))k++;return {t,k};};
  const bilgi=satirlar.map(sondaki),sayac={};bilgi.forEach(b=>{if(b.k>0)sayac[b.k]=(sayac[b.k]||0)+1;});
  const mod=Object.keys(sayac).sort((a,b)=>sayac[b]-sayac[a])[0];
  if(mod&&sayac[mod]>=satirlar.length*0.6&&satirlar.length>=2){
    const k=+mod;
    const aoa=bilgi.map(b=>b.k===k?[b.t.slice(0,b.t.length-k).join(' '),...b.t.slice(b.t.length-k)]:null);
    const hdr=aoa.findIndex(x=>x===null);
    return {aoa:aoa.map((x,i)=>x||(i===0?['Ürün',...Array.from({length:k},(_,j)=>'Sütun '+(j+2))]:[bilgi[i].t.join(' ')])),ayirici:'boşluk (PDF)',baslikUretildi:hdr===0};
  }
  if(satirlar.filter(s=>s.includes(',')).length>=satirlar.length*0.6)return {aoa:ayCsvAyristir(metin,','),ayirici:','};
  return {aoa:satirlar.map(s=>[s.trim()]),ayirici:'yok'};
}
function aySutunHarfi(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}

// ---------- Sihirbaz durumu ve okuma ----------
let _ay=null;
const _ayId=id=>document.getElementById(id);
function ayEl(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!==undefined&&x!==null)e.textContent=x;return e;}
function ayBtn(x,c,fn){const b=ayEl('button',c,x);b.type='button';b.addEventListener('click',fn);return b;}
function ayYeniDurum(){return {kaynak:'',dosyaAdi:'',wb:null,sayfalar:[],sayfa:'',aoa:null,hdr:0,tur:'satis',es:{},yil:new Date().getFullYear(),degistir:true,otomatik:true,kdvDahil:true,hazir:null,eksik:[],sabitTarih:'',sablon:null,calisiyor:false,ilerleme:null,sonuc:null,hata:'',yuklemeler:null,pano:''};}
const _aySay=n=>Number(n||0).toLocaleString('tr-TR');
const _ayTrTarih=s=>s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'—';
async function ayRpc(ad,args){const r=await sb.rpc(ad,args);if(r.error)throw new Error(r.error.message||r.error.details||'Sunucu hatası');return r.data;}
const ayBaslikMetinleri=d=>((d.aoa&&d.aoa[d.hdr])||[]).map(x=>ayBos(x)?'':String(x));
// Sayfa/başlık/tür değişince eşleştirmeyi ve hazırlığı yeniden kurar
// Tutar sütununun başlığından KDV durumunu tahmin eder: "KDV hariç / net" → hariç; "KDV dahil / brüt" → dahil; belli değilse dokunmaz
function ayKdvTahmin(d){
  if(d.tur!=='satis'||d.es.tutar===undefined)return;
  const h=ayNorm(ayBaslikMetinleri(d)[d.es.tutar]||'');
  if(/haric|net/.test(h)&&!/dahil|brut/.test(h))d.kdvDahil=false;else if(/dahil|brut/.test(h))d.kdvDahil=true;
}
function ayAnaliz(d,turuOner){
  const aoa=d.aoa||[];if(!aoa.length){d.hazir=null;d.eksik=[];return;}
  d.hdr=Math.min(Math.max(0,d.hdr),aoa.length-1);if(turuOner)d.tur=ayTurOner(aoa,d.hdr,d.sayfa);
  d.es=ayEsleOner(ayBaslikMetinleri(d),AY_ALANLAR[d.tur].map(a=>a[0]));ayKdvTahmin(d);ayHazirla(d);
}
function ayHazirla(d){
  const sabit=(d.tur==='satis'||d.tur==='envanter'||d.tur==='alim')&&d.es.tarih===undefined&&ayTarih(d.sabitTarih)!==null;
  d.eksik=AY_ALANLAR[d.tur].filter(a=>a[2]&&(d.es[a[0]]===undefined||d.es[a[0]]===null)&&!(a[0]==='tarih'&&sabit)).map(a=>a[1]);
  if((d.tur==='envanter'||d.tur==='alim')&&d.es.ad===undefined&&d.es.kod===undefined)d.eksik.push('Malzeme adı ya da kodu');
  if(d.tur==='alim'&&d.es.bf===undefined&&d.es.tutar===undefined)d.eksik.push('Birim fiyat ya da tutar');
  if(d.eksik.length||!d.aoa){d.hazir=null;return;}
  if(d.tur==='satis')d.hazir=ayHazirlaSatis(d.aoa,d.hdr,{...d.es,tarihSabit:d.sabitTarih});
  else if(d.tur==='alim')d.hazir=ayHazirlaAlim(d.aoa,d.hdr,{...d.es,tarihSabit:d.sabitTarih});
  else if(d.tur==='envanter')d.hazir=ayHazirlaEnvanter(d.aoa,d.hdr,{...d.es,tarihSabit:d.sabitTarih});
  else if(d.tur==='matris')d.hazir=ayHazirlaMatris(d.aoa,d.hdr,d.es,d.yil);
  else d.hazir=ayHazirlaUrun(d.aoa,d.hdr,d.es);
}
const aySayfaAoa=(wb,ad)=>XLSX.utils.sheet_to_json(wb.Sheets[ad],{header:1,raw:true,defval:null,blankrows:true});
// Kendi şablonumuz: "Ürünler", "Günlük Satış", "Envanter" sayfalarından BULUNAN hepsi sırayla, sütun eşleştirmeden yüklenir
function aySablonBul(d){
  d.sablon=null;if(!d.wb)return;
  const bul=(...adlar)=>d.sayfalar.find(s=>adlar.includes(ayNorm(s))),m=a=>(a||[]).map(x=>ayBos(x)?'':String(x)),parcalar=[];
  const su=bul('urunler'),ss=bul('gunluksatis','gunluksatislar','satislar'),sa=bul('alimlar','alislar','satinalma','satinalmalar','alimhareketleri'),se=bul('envanter','stoksayimi','sayim');
  if(su){const a=aySayfaAoa(d.wb,su),h=ayBaslikSatiri(a),e=ayEsleOner(m(a[h]),['ad','kod','grup','birim','sf','kdv','nf','mal']);if(e.ad!==undefined)parcalar.push({tur:'urun',sayfa:su,hazir:ayHazirlaUrun(a,h,e)});}
  if(ss){const a=aySayfaAoa(d.wb,ss),h=ayBaslikSatiri(a),e=ayEsleOner(m(a[h]),['tarih','urun','adet','grup','birim']);if(e.tarih!==undefined&&e.urun!==undefined&&e.adet!==undefined)parcalar.push({tur:'satis',sayfa:ss,hazir:ayHazirlaSatis(a,h,e)});}
  if(sa){const a=aySayfaAoa(d.wb,sa),h=ayBaslikSatiri(a),e=ayEsleOner(m(a[h]),['tarih','ad','kod','adet','bf','tutar','grup','birim','ted','belge']);if(e.tarih!==undefined&&(e.ad!==undefined||e.kod!==undefined)&&e.adet!==undefined&&(e.bf!==undefined||e.tutar!==undefined))parcalar.push({tur:'alim',sayfa:sa,hazir:ayHazirlaAlim(a,h,e)});}
  if(se){const a=aySayfaAoa(d.wb,se),h=ayBaslikSatiri(a),e=ayEsleOner(m(a[h]),['tarih','ad','kod','adet','mal','grup','birim']);if(e.tarih!==undefined&&(e.ad!==undefined||e.kod!==undefined)&&e.adet!==undefined)parcalar.push({tur:'sayim',sayfa:se,hazir:ayHazirlaEnvanter(a,h,e)});}
  if(parcalar.length)d.sablon={parcalar};
}
// Birden çok sayfa varsa: başlıkları en çok tanınan (tarih, ürün, adet, fiyat…) sayfa; açıklama/boş sayfalar elenir
function ayEnIyiSayfa(wb,sayfalar){
  const puan=s=>{
    const a=aySayfaAoa(wb,s);if(a.filter(r=>!r.every(ayBos)).length<2)return -1;
    const row=a[ayBaslikSatiri(a)]||[];let p=0,tarihSay=0;
    row.forEach(c=>{const n=ayNorm(c);if(n&&Object.values(AY_ES).some(L=>L.includes(n)))p++;else if(ayTarih(c,2026))tarihSay++;});
    return p+(tarihSay>=3?2:0);
  };
  return sayfalar.map(s=>[s,puan(s)]).sort((x,y)=>y[1]-x[1])[0][0];
}
// Dosya (ArrayBuffer) → durum. CSV/TXT: UTF-8, olmazsa Windows-1254 (Türkçe); Excel: SheetJS
function ayDosyaIsle(buf,ad){
  const uz=String(ad).toLowerCase().split('.').pop(),d=ayYeniDurum();d.kaynak='dosya';d.dosyaAdi=ad;
  if(['csv','txt','tsv'].includes(uz)){
    let m;try{m=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch(e){m=new TextDecoder('windows-1254').decode(buf);}
    m=m.replace(/^\uFEFF/,'');d.aoa=ayCsvAyristir(m,ayAyiriciBul(m));d.sayfalar=['(csv)'];d.sayfa='(csv)';
  }else{
    if(typeof XLSX==='undefined')throw new Error('Excel kütüphanesi yüklenemedi, sayfayı yenileyin.');
    d.wb=XLSX.read(buf,{type:'array'});d.sayfalar=d.wb.SheetNames.slice();
    d.sayfa=ayEnIyiSayfa(d.wb,d.sayfalar);
    aySablonBul(d);d.aoa=aySayfaAoa(d.wb,d.sayfa);
  }
  if(!d.aoa||!d.aoa.length)throw new Error('Dosyada okunacak satır bulunamadı.');
  d.hdr=ayBaslikSatiri(d.aoa);ayAnaliz(d,true);return d;
}
function ayPanoIsle(metin){
  const r=ayPanoAyristir(metin);if(!r.aoa.length)throw new Error('Yapıştırılan metin boş.');
  const d=ayYeniDurum();d.kaynak='pano';d.dosyaAdi='Yapıştırılan tablo';d.aoa=r.aoa;d.sayfalar=['(yapıştırma)'];d.sayfa='(yapıştırma)';d.ayirici=r.ayirici;
  d.hdr=r.baslikUretildi?0:ayBaslikSatiri(d.aoa);ayAnaliz(d,true);return d;
}
async function ayDosyaYukle(f){
  if(!f)return;if(f.size>25*1024*1024){bil('Dosya 25 MB\'tan büyük; bölerek yükleyin.','err');return;}
  try{_ay=ayDosyaIsle(await f.arrayBuffer(),f.name);}catch(e){bil(e.message||'Dosya okunamadı','err');return;}
  ayCiz();ayYuklemeleriGetir();
}
window.ayDosyaSecildi=function(input){const f=input.files&&input.files[0];input.value='';ayDosyaYukle(f);};
window.ayPanoOku=function(){
  const ta=_ayId('ay-pano-metin');try{_ay=ayPanoIsle(ta?ta.value:(_ay&&_ay.pano)||'');}catch(e){bil(e.message,'err');return;}
  ayCiz();ayYuklemeleriGetir();
};
window.aySayfaDegisti=function(ad){const d=_ay;d.sayfa=ad;d.aoa=aySayfaAoa(d.wb,ad);d.hdr=ayBaslikSatiri(d.aoa);ayAnaliz(d,true);ayCiz();};
window.ayTurSec=function(t){const d=_ay;d.tur=t;ayAnaliz(d,false);ayCiz();};

// ---------- Yükleme ----------
function ayParcala(L,n){const p=[];for(let i=0;i<L.length;i+=n)p.push(L.slice(i,i+n));return p;}
function ayIlerlemeYaz(){
  const d=_ay,i=d&&d.ilerleme,m=_ayId('ay-ilerleme-metin'),c=_ayId('ay-ilerleme-cubuk');if(!i||!m||!c)return;
  m.textContent=`${i.etiket}: ${_aySay(i.yapilan)} / ${_aySay(i.toplam)} satır`;c.style.width=Math.round(i.yapilan/Math.max(i.toplam,1)*100)+'%';
}
// tür: 'urun' | 'satis' (matris de satış olarak gönderilir). Dönüş: özet; hata olursa yazılan satışlar geri alınır.
async function ayGonder(tur,satirlar,sec,dosyaAdi){
  const isy=aktifIsyeri.id,ozet={tur,gonderilen:satirlar.length,eklenen:0,guncellenen:0,yeniUrun:0,atlanan:0,fiyatsiz:0,ciro:0,silinen:0,hatalar:[],tutar:0};
  let parti=null;
  try{
    parti=await ayRpc('an_yukleme_baslat',{p_isyeri:isy,p_tur:tur,p_ad:dosyaAdi});
    const etiket=tur==='urun'?'Ürün kartları':(tur==='sayim'?'Envanter':(tur==='alim'?'Alımlar':'Günlük satışlar')),parcalar=ayParcala(satirlar,tur==='urun'?1000:1500);let yapilan=0;
    for(const p of parcalar){
      if(tur==='urun'){const r=await ayRpc('an_urun_aktar',{p_isyeri:isy,p_satirlar:p});ozet.eklenen+=r.eklenen;ozet.guncellenen+=r.guncellenen;ozet.atlanan+=r.atlanan;ozet.ciro+=r.ciro_guncellenen||0;ozet.hatalar.push(...r.hatalar);}
      else if(tur==='alim'){const r=await ayRpc('an_alim_aktar',{p_isyeri:isy,p_parti:parti,p_satirlar:p,p_otomatik:!!sec.otomatik});ozet.eklenen+=r.eklenen;ozet.yeniUrun+=r.yeni_malzeme;ozet.atlanan+=r.atlanan;ozet.tutar+=Number(r.tutar||0);ozet.hatalar.push(...r.hatalar);}
      else if(tur==='sayim'){const r=await ayRpc('an_envanter_aktar',{p_isyeri:isy,p_parti:parti,p_satirlar:p,p_otomatik:!!sec.otomatik});ozet.eklenen+=r.eklenen;ozet.yeniUrun+=r.yeni_malzeme;ozet.atlanan+=r.atlanan;ozet.hatalar.push(...r.hatalar);}
      else{const r=await ayRpc('an_satis_aktar',{p_isyeri:isy,p_parti:parti,p_satirlar:p,p_otomatik:!!sec.otomatik,p_kdv_dahil:sec.kdvDahil!==false});ozet.eklenen+=r.eklenen;ozet.yeniUrun+=r.yeni_urun;ozet.atlanan+=r.atlanan;ozet.fiyatsiz+=r.fiyatsiz;ozet.hatalar.push(...r.hatalar);}
      yapilan+=p.length;if(_ay){_ay.ilerleme={yapilan,toplam:satirlar.length,etiket};ayIlerlemeYaz();}
    }
    if(tur==='satis'&&sec.degistir&&ozet.eklenen>0){
      const t=satirlar.map(x=>x.t).sort(),anahtarlar=[...new Set(satirlar.map(x=>x.u))];
      ozet.silinen=await ayRpc('an_satis_temizle',{p_isyeri:isy,p_bas:t[0],p_bit:t[t.length-1],p_anahtarlar:anahtarlar,p_haric:parti});
    }
    if(tur==='alim'&&sec.degistir&&ozet.eklenen>0)ozet.silinen=await ayRpc('an_alim_degistir',{p_isyeri:isy,p_parti:parti});     // aynı belge no + tedarikçi + malzeme: eski satır yenisiyle değişir; farklı faturalara dokunulmaz
    const b=await ayRpc('an_yukleme_bitir',{p_parti:parti,p_satir:tur==='urun'?ozet.eklenen+ozet.guncellenen:null});ozet.bas=b&&b.bas;ozet.bit=b&&b.bit;
    return ozet;
  }catch(e){
    if(parti&&(tur==='satis'||tur==='sayim'||tur==='alim')){try{await sb.rpc('an_yukleme_sil',{p_parti:parti});}catch(x){}}   // yarım kalan yüklemeyi geri al
    throw e;
  }
}
function ayOzetMetni(o){
  const p=[];
  if(o.tur==='urun')p.push(`${_aySay(o.eklenen)} yeni ürün, ${_aySay(o.guncellenen)} ürün güncellendi`);
  else if(o.tur==='alim'){p.push(`${_aySay(o.eklenen)} alım satırı yüklendi`);if(o.bas)p.push(`${_ayTrTarih(o.bas)} – ${_ayTrTarih(o.bit)}`);p.push('₺'+_aySay(Math.round(o.tutar))+' net');if(o.yeniUrun)p.push(`${_aySay(o.yeniUrun)} yeni malzeme oluşturuldu`);if(o.silinen)p.push(`${_aySay(o.silinen)} eski alım satırı (aynı belge no) güncellendi`);}
  else if(o.tur==='sayim'){p.push(`${_aySay(o.eklenen)} sayım satırı yüklendi`);if(o.bas)p.push(o.bas===o.bit?_ayTrTarih(o.bas):`${_ayTrTarih(o.bas)} – ${_ayTrTarih(o.bit)}`);if(o.yeniUrun)p.push(`${_aySay(o.yeniUrun)} yeni malzeme oluşturuldu`);}
  else{p.push(`${_aySay(o.eklenen)} satış satırı yüklendi`);if(o.bas)p.push(`${_ayTrTarih(o.bas)} – ${_ayTrTarih(o.bit)}`);if(o.yeniUrun)p.push(`${_aySay(o.yeniUrun)} yeni ürün oluşturuldu`);if(o.silinen)p.push(`${_aySay(o.silinen)} eski satır değiştirildi`);}
  if(o.atlanan)p.push(`${_aySay(o.atlanan)} satır atlandı`);
  if(o.ciro)p.push(`${_aySay(o.ciro)} satışın cirosu güncellendi`);
  return p.join(' · ');
}
window.ayYukle=async function(){
  const d=_ay;if(!d||d.calisiyor||!d.hazir||!d.hazir.satirlar.length)return;
  const h=d.hazir,gtur=d.tur==='urun'?'urun':(d.tur==='envanter'?'sayim':(d.tur==='alim'?'alim':'satis')),satis=gtur==='satis';
  if(satis&&d.degistir&&typeof _anOzet!=='undefined'&&_anOzet&&Number(_anOzet.satis)>0&&!(await onay(`Aynı tarih aralığında (${_ayTrTarih(h.tarihBas)} – ${_ayTrTarih(h.tarihBit)}) bu dosyadaki ürünlere ait ESKİ satışlar silinip yerine bu dosyadaki satışlar yazılacak. Devam edilsin mi?`,'🔁','Devam','Vazgeç')))return;
  d.calisiyor=true;d.sonuc=null;d.hata='';d.ilerleme={yapilan:0,toplam:h.satirlar.length,etiket:'Hazırlanıyor'};ayCiz();ayIlerlemeYaz();
  try{
    const o=await ayGonder(gtur,h.satirlar,{degistir:d.degistir,otomatik:d.otomatik,kdvDahil:d.kdvDahil},d.dosyaAdi);o.atlanan+=h.hataSayisi||0;     // önizlemede elenen hatalı satırlar da "atlandı" sayılır
    d.sonuc={ok:true,satirlar:[ayOzetMetni(o)],fiyatsiz:o.fiyatsiz,hatalar:o.hatalar,tur:d.tur};
  }catch(e){d.sonuc={ok:false,hata:e.message||String(e)};}
  d.calisiyor=false;d.ilerleme=null;ayCiz();ayYuklemeleriGetir();
};
window.aySablonYukle=async function(){
  const d=_ay;if(!d||d.calisiyor||!d.sablon)return;const SIRA={urun:0,satis:1,alim:2,sayim:3},P=d.sablon.parcalar.filter(p=>p.sec!==false&&p.hazir.satirlar.length).sort((x,y)=>SIRA[x.tur]-SIRA[y.tur]),ETK={urun:'Ürünler',satis:'Satışlar',alim:'Alımlar',sayim:'Envanter'},satirlar=[],hatalar=[];let fiyatsiz=0;
  d.calisiyor=true;d.sonuc=null;d.ilerleme={yapilan:0,toplam:P[0]?P[0].hazir.satirlar.length:0,etiket:'Hazırlanıyor'};ayCiz();ayIlerlemeYaz();
  try{
    for(const p of P){
      d.ilerleme={yapilan:0,toplam:p.hazir.satirlar.length,etiket:ETK[p.tur]};ayIlerlemeYaz();
      const o=await ayGonder(p.tur,p.hazir.satirlar,{degistir:true,otomatik:true,kdvDahil:true},d.dosyaAdi+' › '+p.sayfa);
      o.atlanan+=p.hazir.hataSayisi||0;satirlar.push(ETK[p.tur]+': '+ayOzetMetni(o));hatalar.push(...o.hatalar);fiyatsiz+=o.fiyatsiz||0;
    }
    d.sonuc={ok:true,satirlar,fiyatsiz,hatalar,tur:'satis'};
  }catch(e){d.sonuc={ok:false,hata:e.message||String(e),tamam:satirlar};}
  d.calisiyor=false;d.ilerleme=null;ayCiz();ayYuklemeleriGetir();
};
async function ayYuklemeleriGetir(){
  try{const l=await ayRpc('an_yuklemeler_liste',{p_isyeri:aktifIsyeri.id});if(_ay){_ay.yuklemeler=l;ayCiz();}}catch(e){if(_ay){_ay.yuklemeler=[];}}
  ayOzetGetir();          // "Sistemde yüklü veriler" kartını da tazele (yükleme, geri alma ve ekran açılışından sonra)
}
window.ayGeriAl=async function(id,ad){
  if(!(await onay(`"${ad}" yüklemesi geri alınacak: bu yüklemeyle gelen satırlar silinir. (Ürün ve malzeme kartları silinmez.)`,'↩️','Geri al','Vazgeç')))return;
  try{const n=await ayRpc('an_yukleme_sil',{p_parti:id});bil(`Geri alındı (${_aySay(n)} satır silindi)`,'ok');}catch(e){bil(e.message||'Geri alınamadı','err');return;}
  await ayYuklemeleriGetir();
};

// ---------- Ekran ----------
// "Sistemde yüklü veriler": şablondaki her sayfanın verisi sistemde var mı, kaç satır, hangi tarihler, ne zaman yüklendi
function ayYukluKart(d){
  const k=ayKart('Sistemde yüklü veriler'),o=d.ozet;
  if(!o){k.appendChild(ayEl('div','ay-not','Yükleniyor…'));return k;}
  const tr=x=>_ayTrTarih(String(x).slice(0,10)),aralik=(b,s)=>!b?'':(String(b).slice(0,10)===String(s).slice(0,10)?tr(b):`${tr(b)} – ${tr(s)}`),
    son=ts=>{try{return ts?'son yükleme '+new Date(ts).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';}catch(e){return '';}};
  const S=[['Ürünler',Number(o.urun),`${_aySay(o.urun)} ürün`,'',o.son_urun],
    ['Günlük Satış',Number(o.satis),`${_aySay(o.satis)} satır`,aralik(o.satis_bas,o.satis_bit),o.son_satis],
    ['Alımlar',Number(o.alim),`${_aySay(o.alim)} satır`+(o.alim_tutar!==undefined&&o.alim_tutar!==null?` · ₺${_aySay(Math.round(Number(o.alim_tutar)))} net`:''),aralik(o.alim_bas,o.alim_bit),o.son_alim],
    ['Envanter',Number(o.sayim),`${_aySay(o.sayim)} satır`+(o.sayim_gun?` · ${_aySay(o.sayim_gun)} sayım günü`:''),aralik(o.sayim_bas,o.sayim_bit),o.son_sayim]];
  const t=ayEl('div','ay-yuklu');
  S.forEach(([ad,n,oz,ar,ts])=>{const r=ayEl('div','ay-yuklu-satir'+(n?'':' ay-yuklu-yok'));r.dataset.sayfa=ad;r.appendChild(ayEl('span','ay-yuklu-isaret',n?'✓':'○'));r.appendChild(ayEl('b','ay-yuklu-ad',ad));r.appendChild(ayEl('span','ay-yuklu-ozet',n?oz:'henüz yüklenmedi'));r.appendChild(ayEl('span','ay-yuklu-ar',n?ar:''));r.appendChild(ayEl('span','ay-yuklu-son',n?son(ts):''));t.appendChild(r);});
  k.appendChild(t);
  k.appendChild(ayEl('div','ay-not',`Malzeme kartı: ${_aySay(o.malzeme)} · Reçete satırı: ${_aySay(o.recete)} · Fire: ${_aySay(o.fire)}`+(o.ornek?' · Örnek (sahte) veri de var':'')));
  return k;
}
async function ayOzetGetir(){
  try{const o=await ayRpc('an_veri_ozeti',{p_isyeri:aktifIsyeri.id});if(_ay){_ay.ozet=o;ayCiz();}}catch(e){}
}
function ayKart(baslik){const k=ayEl('div','an-kart ay-kart');if(baslik)k.appendChild(ayEl('div','ay-bas',baslik));return k;}
function ayOrnek(aoa,hdr,i){for(let r=hdr+1;r<Math.min(aoa.length,hdr+8);r++){const v=(aoa[r]||[])[i];if(!ayBos(v))return String(v).slice(0,16);}return '';}
function ayKaynakKarti(d){
  const k=ayKart('1 · Dosya ya da tablo'),sat=ayEl('div','ay-satir'),lab=ayEl('label','an-btn ay-dosya','Excel / CSV dosyası seç'),inp=document.createElement('input');
  inp.type='file';inp.id='ay-dosya';inp.accept='.xlsx,.xls,.xlsm,.csv,.txt,.tsv';inp.style.display='none';inp.addEventListener('change',()=>ayDosyaSecildi(inp));lab.appendChild(inp);sat.appendChild(lab);
  if(d.aoa){
    sat.appendChild(ayEl('span','ay-chip','📄 '+d.dosyaAdi+(d.kaynak==='pano'&&d.ayirici?' ('+d.ayirici+')':'')));
    if(d.sayfalar.length>1){const s=ayEl('select','ay-sec');d.sayfalar.forEach(x=>{const o=ayEl('option','',x);o.value=x;s.appendChild(o);});s.value=d.sayfa;s.addEventListener('change',()=>aySayfaDegisti(s.value));sat.appendChild(s);}
  }
  k.appendChild(sat);
  const ta=ayEl('textarea','ay-pano');ta.id='ay-pano-metin';ta.rows=4;ta.placeholder='…ya da Excel, web sayfası veya PDF\'ten kopyaladığınız tabloyu buraya yapıştırın';ta.value=d.pano||'';ta.addEventListener('input',()=>{d.pano=ta.value;});k.appendChild(ta);
  const alt=ayEl('div','ay-satir');alt.appendChild(ayBtn('Yapıştırılan tabloyu oku','an-btn2',()=>ayPanoOku()));alt.appendChild(ayEl('span','ay-not','Dosya sunucuya gönderilmez; tarayıcıda okunur. PDF ve web sayfası için tabloyu seçip kopyalayın, yapıştırın.'));k.appendChild(alt);
  k.addEventListener('dragover',e=>e.preventDefault());k.addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)ayDosyaYukle(f);});
  return k;
}
function aySablonKarti(d){
  const P=d.sablon.parcalar,k=ayKart('Hazır şablon bulundu'),ad={urun:(p)=>`"${p.sayfa}" sayfasında ${_aySay(p.hazir.satirlar.length)} ürün`,
    satis:(p)=>`"${p.sayfa}" sayfasında ${_aySay(p.hazir.satirlar.length)} satış satırı (${_ayTrTarih(p.hazir.tarihBas)} – ${_ayTrTarih(p.hazir.tarihBit)})`,
    alim:(p)=>`"${p.sayfa}" sayfasında ${_aySay(p.hazir.satirlar.length)} alım satırı (${_ayTrTarih(p.hazir.tarihBas)} – ${_ayTrTarih(p.hazir.tarihBit)}, ₺${_aySay(Math.round(p.hazir.tutarToplam||0))} net)`,
    sayim:(p)=>`"${p.sayfa}" sayfasında ${_aySay(p.hazir.satirlar.length)} sayım satırı (${p.hazir.tarihBas===p.hazir.tarihBit?_ayTrTarih(p.hazir.tarihBas):_ayTrTarih(p.hazir.tarihBas)+' – '+_ayTrTarih(p.hazir.tarihBit)})`};
  k.appendChild(ayEl('div','ay-metin','Yüklemek istediğiniz sayfaları işaretleyin. İşaretini kaldırdığınız sayfaya (örneğin daha önce yüklediğiniz ürünler ve satışlar) hiç dokunulmaz; o veriler olduğu gibi kalır.'));
  P.forEach(p=>{const l=ayEl('label','ay-onay'),c=document.createElement('input');c.type='checkbox';c.className='ay-sablon-sec';c.dataset.tur=p.tur;c.checked=p.sec!==false&&p.hazir.satirlar.length>0;c.disabled=d.calisiyor||!p.hazir.satirlar.length;
    c.addEventListener('change',()=>{p.sec=c.checked;ayCiz();});l.appendChild(c);l.appendChild(document.createTextNode(' '+ad[p.tur](p)));k.appendChild(l);});
  const S=P.filter(p=>p.sec!==false&&p.hazir.satirlar.length),hata=S.reduce((x,p)=>x+p.hazir.hataSayisi,0);if(hata)k.appendChild(ayEl('div','ay-uyari',`${_aySay(hata)} hatalı satır atlanacak.`));
  const b=ayBtn(S.length?`Seçili ${S.length} sayfayı yükle`:'Yüklenecek sayfa seçin','an-btn',()=>aySablonYukle());b.id='ay-sablon-btn';b.disabled=d.calisiyor||!S.length;k.appendChild(b);return k;
}
function ayAyarKarti(d){
  const k=ayKart('2 · Ne yükleniyor?'),seg=ayEl('div','ay-seg');
  [['satis','Günlük satış (satır satır)'],['matris','Günlük satış (ürün × gün matrisi)'],['urun','Ürün kartları (fiyat, KDV, maliyet)'],['alim','Alımlar (satın alma)'],['envanter','Envanter (stok sayımı)']].forEach(([t,ad])=>{const b=ayBtn(ad,d.tur===t?'on':'',()=>ayTurSec(t));b.dataset.t=t;seg.appendChild(b);});
  k.appendChild(seg);
  const sat=ayEl('div','ay-satir'),hl=ayEl('label','ay-alan','Başlık satırı '),hi=document.createElement('input');hi.type='number';hi.id='ay-hdr';hi.min=1;hi.max=Math.max(1,(d.aoa||[]).length);hi.value=d.hdr+1;hi.className='ay-sayi';
  hi.addEventListener('change',()=>{d.hdr=Math.max(0,(parseInt(hi.value,10)||1)-1);ayAnaliz(d,false);ayCiz();});hl.appendChild(hi);sat.appendChild(hl);
  if(d.tur==='matris'){const yl=ayEl('label','ay-alan','Yıl (başlıkta yoksa) '),yi=document.createElement('input');yi.type='number';yi.id='ay-yil';yi.min=2000;yi.max=2100;yi.value=d.yil;yi.className='ay-sayi';yi.addEventListener('change',()=>{d.yil=parseInt(yi.value,10)||d.yil;ayHazirla(d);ayCiz();});yl.appendChild(yi);sat.appendChild(yl);
    const L=ayMatrisTarihSutunlari(d.aoa,d.hdr,d.yil);sat.appendChild(ayEl('span','ay-not',L.length?`${L.length} gün sütunu bulundu (${_ayTrTarih(L[0][1])} … ${_ayTrTarih(L[L.length-1][1])})`:'Başlık satırında tarih sütunu bulunamadı'));}
  k.appendChild(sat);
  const bas=ayBaslikMetinleri(d),g=ayEl('div','ay-esles');
  AY_ALANLAR[d.tur].forEach(([f,ad,zorunlu])=>{
    const l=ayEl('label','ay-alan',ad+(zorunlu?' *':'')),s=ayEl('select','ay-sec');s.dataset.alan=f;
    const o0=ayEl('option','','— yok —');o0.value='';s.appendChild(o0);
    bas.forEach((b,i)=>{if(d.tur==='matris'&&ayTarih(d.aoa[d.hdr][i],d.yil))return;const o=ayEl('option','',`${aySutunHarfi(i)} · ${b||'(başlıksız)'}${ayOrnek(d.aoa,d.hdr,i)?'  — örn. '+ayOrnek(d.aoa,d.hdr,i):''}`);o.value=String(i);s.appendChild(o);});
    s.value=d.es[f]===undefined?'':String(d.es[f]);
    s.addEventListener('change',()=>{if(s.value==='')delete d.es[f];else d.es[f]=+s.value;if(f==='tutar')ayKdvTahmin(d);ayHazirla(d);ayCiz();});l.appendChild(s);g.appendChild(l);
  });
  k.appendChild(g);
  if((d.tur==='satis'||d.tur==='envanter'||d.tur==='alim')&&d.es.tarih===undefined){
    const sb_=ayEl('div','ay-secenek'),l=ayEl('label','ay-alan',d.tur==='envanter'?'Dosyada tarih sütunu yoksa: sayım tarihi ':(d.tur==='alim'?'Dosyada tarih sütunu yoksa: alım tarihi ':'Dosyada tarih sütunu yoksa: tüm satırlar için tarih ')),i=document.createElement('input');i.type='date';i.id='ay-sabit-tarih';i.className='ay-sec';i.value=d.sabitTarih||'';
    i.addEventListener('change',()=>{d.sabitTarih=i.value;ayHazirla(d);ayCiz();});l.appendChild(i);sb_.appendChild(l);
    if(d.tur==='satis'&&ayTarih(d.sabitTarih))sb_.appendChild(ayEl('div','ay-uyari','Günlük dağılım olmayacak: tüm satışlar tek güne yazılır, günlük grafikler o güne yığılır. Ürün sıralamaları ve toplamlar için uygundur.'));
    k.appendChild(sb_);
  }
  if(d.tur!=='urun'){
    const sec=ayEl('div','ay-secenek');
    const c1=ayEl('label','ay-onay'),i1=document.createElement('input');i1.type='checkbox';i1.id='ay-degistir';i1.checked=d.degistir;i1.addEventListener('change',()=>{d.degistir=i1.checked;});c1.appendChild(i1);c1.appendChild(document.createTextNode(d.tur==='alim'?' Aynı belge numaralı eski alım satırlarını yenisiyle değiştir (belge no yoksa eklenir)':' Aynı tarih ve ürünlerin eski kayıtlarını değiştir (çift sayımı önler)'));if(d.tur!=='envanter')sec.appendChild(c1);
    const c2=ayEl('label','ay-onay'),i2=document.createElement('input');i2.type='checkbox';i2.id='ay-otomatik';i2.checked=d.otomatik;i2.addEventListener('change',()=>{d.otomatik=i2.checked;});c2.appendChild(i2);c2.appendChild(document.createTextNode((d.tur==='envanter'||d.tur==='alim')?' Kayıtlı olmayan malzemeleri otomatik oluştur':' Kayıtlı olmayan ürünleri otomatik oluştur'));sec.appendChild(c2);
    if(d.tur==='satis'&&d.es.tutar!==undefined){const c3=ayEl('label','ay-onay','Tutar sütunu '),s3=ayEl('select','ay-sec');s3.id='ay-kdv';[['1','KDV dahil'],['0','KDV hariç']].forEach(([v,a])=>{const o=ayEl('option','',a);o.value=v;s3.appendChild(o);});s3.value=d.kdvDahil?'1':'0';s3.addEventListener('change',()=>{d.kdvDahil=s3.value==='1';});c3.appendChild(s3);sec.appendChild(c3);}
    k.appendChild(sec);
  }
  return k;
}
function ayOnizlemeKarti(d){
  const k=ayKart('3 · Önizleme'),h=d.hazir;
  if(d.eksik.length){k.appendChild(ayEl('div','ay-uyari','Önce şunları eşleştirin: '+d.eksik.join(', ')+'.'));return k;}
  if(!h)return k;
  const ozet=[`${_aySay(h.satirlar.length)} geçerli satır`];
  if(d.tur!=='urun'){if(h.tarihBas)ozet.push(h.tarihBas===h.tarihBit?_ayTrTarih(h.tarihBas):`${_ayTrTarih(h.tarihBas)} – ${_ayTrTarih(h.tarihBit)}`);ozet.push(`${_aySay(h.urunSayisi)} ${(d.tur==='envanter'||d.tur==='alim')?'malzeme':'ürün'}`);if(d.tur==='alim')ozet.push('₺'+_aySay(Math.round(h.tutarToplam||0))+' net');}else ozet.push(`${_aySay(h.urunSayisi)} ürün`);
  if(h.hataSayisi)ozet.push(`${_aySay(h.hataSayisi)} hatalı (atlanacak)`);if(h.bos)ozet.push(`${_aySay(h.bos)} boş/toplam satırı atlandı`);
  const ol=ayEl('div','ay-ozet',ozet.join(' · '));ol.id='ay-ozet';k.appendChild(ol);
  if(h.satirlar.length){
    const sar=ayEl('div','ay-tablo-sar'),t=ayEl('table','ay-tablo'),bas=ayEl('tr');
    const kol=d.tur==='urun'?[['s','Satır'],['kod','Kod'],['ad','Ürün'],['grup','Grup'],['birim','Birim'],['sf','Satış fiyatı'],['kdv','KDV %'],['nf','Net fiyat'],['mal','Maliyet']]     :(d.tur==='alim'?[['s','Satır'],['t','Tarih'],['k','Kod'],['u','Malzeme'],['a','Miktar'],['f','Birim fiyat'],['x','Tutar'],['td','Tedarikçi'],['bn','Belge']]:d.tur==='envanter'?[['s','Satır'],['t','Tarih'],['k','Kod'],['u','Malzeme'],['a','Miktar'],['m','Birim maliyet'],['g','Grup'],['b','Birim']]:[['s','Satır'],['t','Tarih'],['u','Ürün'],['a','Adet'],['x','Tutar'],['g','Grup']]);
    kol.forEach(([f,a])=>bas.appendChild(ayEl('th','',a)));const th=ayEl('thead');th.appendChild(bas);t.appendChild(th);const tb=ayEl('tbody');
    h.satirlar.slice(0,8).forEach(r=>{const tr=ayEl('tr');kol.forEach(([f])=>tr.appendChild(ayEl('td','',r[f]===undefined?'':(f==='t'?_ayTrTarih(r[f]):String(r[f])))));tb.appendChild(tr);});
    t.appendChild(tb);sar.appendChild(t);k.appendChild(sar);if(h.satirlar.length>8)k.appendChild(ayEl('div','ay-not','İlk 8 satır gösteriliyor.'));
  }
  if(h.hataSayisi){const e=ayEl('div','ay-hatalar');e.appendChild(ayEl('b','','Atlanacak satırlar'));h.hatalar.slice(0,8).forEach(x=>e.appendChild(ayEl('div','',`Satır ${x.s}: ${x.m}`)));if(h.hataSayisi>8)e.appendChild(ayEl('div','',`… ve ${_aySay(h.hataSayisi-8)} satır daha`));k.appendChild(e);}
  if(d.tur==='alim'){k.appendChild(ayEl('div','ay-not','Birim fiyat ve tutar KDV HARİÇ (net) kabul edilir. Eksi miktar ve eksi tutar alış iadesi sayılır. Aynı güne ait FARKLI belge numaralı faturalar birbirini silmez; aynı belge numaralı fatura tekrar yüklenirse kendini günceller.'));
    if(d.es.belge===undefined)k.appendChild(ayEl('div','ay-uyari','Belge no sütunu yok: bu alımlar mevcut alımlara EKLENİR. Aynı dosyayı ikinci kez yüklerseniz çift sayılır (yanlışlıkla yüklerseniz "Önceki yüklemeler"den Geri al yapabilirsiniz).'));}
  if(d.tur==='satis'&&d.es.tutar===undefined&&h.satirlar.length)k.appendChild(ayEl('div','ay-not','Tutar sütunu yok: ciro, ürün kartındaki satış fiyatından hesaplanır. Fiyatlar yoksa Ürün kartlarını da yükleyin.'));
  if(d.calisiyor){const p=ayEl('div','ay-ilerleme'),m=ayEl('div','ay-not');m.id='ay-ilerleme-metin';const c=ayEl('div','ay-cubuk-iz'),i=ayEl('div','ay-cubuk');i.id='ay-ilerleme-cubuk';c.appendChild(i);p.appendChild(m);p.appendChild(c);k.appendChild(p);}
  const b=ayBtn(d.calisiyor?'Yükleniyor…':`Yükle (${_aySay(h.satirlar.length)} satır)`,'an-btn',()=>ayYukle());b.id='ay-yukle-btn';b.disabled=d.calisiyor||!h.satirlar.length;k.appendChild(b);
  return k;
}
function aySonucKarti(d){
  const s=d.sonuc,k=ayKart(s.ok?'✓ Yükleme tamamlandı':'Yükleme başarısız');k.id='ay-sonuc';k.classList.add(s.ok?'ay-iyi':'ay-kotu');
  if(!s.ok){k.appendChild(ayEl('div','ay-metin',s.hata));if(s.tamam&&s.tamam.length){k.appendChild(ayEl('div','ay-not','Önceki sayfalar yüklendi:'));s.tamam.forEach(x=>k.appendChild(ayEl('div','ay-not',x)));}k.appendChild(ayEl('div','ay-not','Yarım kalan sayfa otomatik geri alındı; o sayfa için veride değişiklik olmadı.'));return k;}
  s.satirlar.forEach(x=>k.appendChild(ayEl('div','ay-metin',x)));
  if(s.fiyatsiz)k.appendChild(ayEl('div','ay-uyari',`${_aySay(s.fiyatsiz)} satışın fiyatı/tutarı yok, cirosu 0. Ürün kartlarını (satış fiyatı) da yüklerseniz ciro otomatik hesaplanır.`));
  if(s.hatalar.length){const e=ayEl('div','ay-hatalar');e.appendChild(ayEl('b','','Sunucunun atladığı satırlar'));s.hatalar.slice(0,8).forEach(x=>e.appendChild(ayEl('div','',`Satır ${x.s}: ${x.m}`)));k.appendChild(e);}
  k.appendChild(ayBtn('Raporları göster','an-btn',()=>ayKapat()));return k;
}
function ayGecmisKarti(d){
  const k=ayKart('Önceki yüklemeler');
  if(!d.yuklemeler){k.appendChild(ayEl('div','ay-not','Yükleniyor…'));return k;}
  if(!d.yuklemeler.length){k.appendChild(ayEl('div','ay-not','Henüz yükleme yok.'));return k;}
  d.yuklemeler.forEach(y=>{
    const s=ayEl('div','ay-gecmis'),sol=ayEl('div'),ad=y.kaynak==='ornek'?'Örnek (sahte) veri':y.ad;
    sol.appendChild(ayEl('b','',`${y.tur==='urun'?'Ürün kartları':(y.tur==='sayim'?'Envanter':(y.tur==='alim'?'Alımlar':'Satışlar'))} · ${ad}`));
    sol.appendChild(ayEl('div','ay-not',`${_aySay(y.satir)} satır${y.bas?` · ${_ayTrTarih(String(y.bas).slice(0,10))} – ${_ayTrTarih(String(y.bit).slice(0,10))}`:''} · ${new Date(y.ts).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}`));
    s.appendChild(sol);if((y.tur==='satis'||y.tur==='sayim'||y.tur==='alim')&&y.kaynak!=='ornek')s.appendChild(ayBtn('Geri al','an-btn2 kirmizi',()=>ayGeriAl(y.id,ad)));
    k.appendChild(s);
  });
  return k;
}
// Örnek (sahte) veri duruyorsa: gerçek veriyle karışmasın diye silmeyi öner (sihirbazdan çıkmadan)
window.ayOrnekSil=async function(){
  if(!(await onay('Örnek (sahte) veri KALICI olarak silinecek. Sizin yüklediğiniz kayıtlara dokunulmaz.','🗑️','Sil','Vazgeç')))return;
  try{await ayRpc('an_ornek_veri_sil',{p_isyeri:aktifIsyeri.id});_anOzet=await ayRpc('an_veri_ozeti',{p_isyeri:aktifIsyeri.id});bil('Örnek veri silindi','ok');}catch(e){bil(e.message||'Silinemedi','err');return;}
  if(_ay)_ay.yuklemeler=null;ayCiz();ayYuklemeleriGetir();
};
function ayOrnekUyarisi(){
  const k=ayKart();k.id='ay-ornek-uyari';k.classList.add('ay-uyari');
  k.appendChild(ayEl('div','ay-metin','Bu işyerinde örnek (sahte) veri var. Kendi verinizi yüklemeden önce silmeniz önerilir; aksi halde raporlar sahte ve gerçek veriyi karışık gösterir.'));
  k.appendChild(ayBtn('Örnek veriyi sil','an-btn2 kirmizi',()=>ayOrnekSil()));return k;
}
function ayCiz(){
  const p=_ayId('ay-panel');if(!p||!_ay)return;const d=_ay;p.replaceChildren();
  const ust=ayEl('div','an-ust');ust.appendChild(ayEl('div','an-baslik','Veri yükle'));ust.appendChild(ayBtn('Kapat','an-btn2',()=>ayKapat()));p.appendChild(ust);p.appendChild(ayYukluKart(d));
  if(typeof _anOzet!=='undefined'&&_anOzet&&_anOzet.ornek)p.appendChild(ayOrnekUyarisi());
  p.appendChild(ayKaynakKarti(d));
  if(d.sablon)p.appendChild(aySablonKarti(d));
  if(d.aoa){p.appendChild(ayAyarKarti(d));p.appendChild(ayOnizlemeKarti(d));}
  if(d.sonuc)p.appendChild(aySonucKarti(d));
  p.appendChild(ayGecmisKarti(d));
}
window.ayAc=function(){
  anStil();const p=_ayId('ay-panel');if(!p)return;
  _ay=ayYeniDurum();_anId('an-bos').style.display='none';_anId('an-ana').style.display='none';p.style.display='';ayCiz();ayYuklemeleriGetir();
};
window.ayKapat=function(){const p=_ayId('ay-panel');if(p)p.style.display='none';_ay=null;anYukle(false);};
