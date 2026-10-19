// ===== ANALİZ RAPORLARI (yönetici) =====
// Standart veri modelinden (an_* tabloları) hesaplanan raporlar: satış analizi (fiyat + birim maliyet + günlük adet) · ürün satış ve maliyet (reçeteli) · malzeme tüketim ve maliyet · aylık karşılaştırma · stok tüketim farkı.
// Raporu sunucu hazırlar (an_rapor_* işlevleri; satır güvenliği ile yalnızca bu işyerinin verisi), ekranda ortak çizici (rapor/cizim.js) gösterir.
// Örnek (SAHTE) veri: yöneticinin tek tıkla yükleyip silebildiği 4 aylık restoran verisi. Sunum / gönderim bu sayfanın konusu değil.
let _anOzet=null,_anTur='satis_analizi',_anNo=0;
const AN_TURLER=[['satis_analizi','Satış analizi'],['urun_satis_maliyet','Ürün satış ve maliyet'],['malzeme_tuketim_maliyet','Malzeme tüketim ve maliyet'],['aylik_karsilastirma','Aylık karşılaştırma'],['stok_tuketim_fark','Stok tüketim farkı']];
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
#analiz-raporlari .an-bos{text-align:center;padding:26px 10px;color:var(--s)}#analiz-raporlari .an-bos b{display:block;color:var(--y);font-size:15px;margin-bottom:6px}`;
  document.head.appendChild(s);
}
window.anAc=async function(){
  anStil();
  const ad=_anId('an-isyeri-ad');if(ad)ad.textContent=(typeof aktifIsyeri!=='undefined'&&aktifIsyeri&&aktifIsyeri.ad)||'';
  await anYukle(true);
};
async function anYukle(ilk){
  if(typeof aktifIsyeri==='undefined'||!aktifIsyeri)return;
  const {data,error}=await sb.rpc('an_veri_ozeti',{p_isyeri:aktifIsyeri.id});
  if(error){_anId('an-ana').style.display='none';_anId('an-bos').style.display='';_anId('an-bos').innerHTML=`<b>Analiz verisi okunamadı</b>${_rpEscAn(_anHata(error))}`;return;}
  _anOzet=data;
  if(!data||!Number(data.satis)){_anId('an-ana').style.display='none';_anId('an-bos').style.display='';
    _anId('an-bos').innerHTML='<b>Bu işyerinde henüz analiz verisi yok</b>Raporları denemek için 4 aylık sahte bir restoran verisi yükleyebilirsiniz (istediğiniz an tek tıkla silinir).<br><br><button type="button" class="an-btn" id="an-yukle-btn" onclick="anOrnekYukle()">Örnek veriyi yükle</button>';return;}
  _anId('an-bos').style.display='none';_anId('an-ana').style.display='';
  anDonemDoldur(ilk);anSekmeCiz();anOzetYaz();await anGoster();
}
function _rpEscAn(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function anAylar(bas,bit){const L=[];let [y,m]=String(bas).slice(0,7).split('-').map(Number);const [y2,m2]=String(bit).slice(0,7).split('-').map(Number);while(y<y2||(y===y2&&m<=m2)){L.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}}return L;}
function anAyAdi(ym){const [y,m]=ym.split('-');return AN_AY[+m-1]+' '+y;}
function anAraligi(d){
  if(d==='tum')return [String(_anOzet.satis_bas).slice(0,10),String(_anOzet.satis_bit).slice(0,10)];
  if(d==='son3'){const a=anAylar(_anOzet.satis_bas,_anOzet.satis_bit);return [`${a[Math.max(0,a.length-3)]}-01`,String(_anOzet.satis_bit).slice(0,10)];}
  const [y,m]=d.split('-').map(Number),son=new Date(Date.UTC(y,m,0)).getUTCDate();return [`${d}-01`,`${d}-${String(son).padStart(2,'0')}`];
}
function anDonemDoldur(ilk){
  const s=_anId('an-donem'),onceki=s.value,aylar=anAylar(_anOzet.satis_bas,_anOzet.satis_bit).reverse();
  const son3=aylar.length>3;
  s.innerHTML=(son3?'<option value="son3">Son 3 ay ('+_rpEscAn(anAyAdi(aylar[2]))+' – '+_rpEscAn(anAyAdi(aylar[0]))+')</option>':'')+'<option value="tum">Tüm dönem ('+_rpEscAn(anAyAdi(aylar[aylar.length-1]))+' – '+_rpEscAn(anAyAdi(aylar[0]))+')</option>'+aylar.map(a=>`<option value="${a}">${_rpEscAn(anAyAdi(a))}</option>`).join('');
  s.value=(!ilk&&onceki&&[...s.options].some(o=>o.value===onceki))?onceki:(_anTur==='aylik_karsilastirma'?'tum':(_anTur==='satis_analizi'?(son3?'son3':'tum'):aylar[0]));
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
  _anTur=t;const s=_anId('an-donem'),tekAy=/^\d{4}-\d{2}$/.test(s.value);
  if((t==='aylik_karsilastirma'||t==='satis_analizi')&&tekAy)s.value=[...s.options].some(o=>o.value==='son3')?'son3':'tum';      // karşılaştırma ve satış analizi birden çok ay ister
  anSekmeCiz();anGoster();
};
window.anDonemDegisti=function(){anGoster();};
async function anGoster(){
  if(!_anOzet)return;const no=++_anNo,panel=_anId('an-sonuc'),[bas,bit]=anAraligi(_anId('an-donem').value);
  panel.className='rc-panel';panel.innerHTML='<div class="an-bos">Rapor hazırlanıyor…</div>';
  const {data,error}=await sb.rpc('an_rapor_'+_anTur,{p_isyeri:aktifIsyeri.id,p_bas:bas,p_bit:bit});
  if(no!==_anNo)return;
  if(error){panel.innerHTML=`<div class="an-bos"><b>Rapor hazırlanamadı</b>${_rpEscAn(_anHata(error))}</div>`;return;}
  panel.replaceChildren();
  if(window.RaporCizim)window.RaporCizim.ciz(data,panel);else panel.innerHTML='<div class="an-bos">Çizici yüklü değil (rapor/cizim.js).</div>';
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
