// ===== DEPO BAZLI STOK DURUMU =====
// Depo bazlı bakiyeler veritabanında (depo_stok_durumu fonksiyonu) hesaplanır; ekran sadece sonucu alır.
// Filtre değişimlerinde yeniden sorgu yapılmaz (önbellek); sayfa açılışında ve "yenile" ile güncellenir.
let _dsVeri=null,_dsIsyeri=null;
async function depoStokVeriGetir(){
  const {data,error}=await sb.rpc('depo_stok_durumu',{p_isyeri:aktifIsyeri?.id||null});
  if(error)throw error;
  const h={};
  (data||[]).forEach(r=>{(h[r.stok_id]=h[r.stok_id]||{})[r.depo_id]=parseFloat(r.bakiye)||0;});
  return h;
}
let _dsSonSatirlar=[],_dsSonDepolar=[];
const _dsSayi=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:3});

window.renderDepoStok=async function(yenile){
  const thEl=document.getElementById('ds-th'),tbEl=document.getElementById('ds-tb');
  if(!thEl||!tbEl)return;
  if(yenile===true||_dsVeri===null||_dsIsyeri!==(aktifIsyeri?.id||null)){
    tbEl.innerHTML='<tr><td class="bos">Hesaplanıyor...</td></tr>';
    try{_dsVeri=await depoStokVeriGetir();_dsIsyeri=aktifIsyeri?.id||null;}
    catch(e){tbEl.innerHTML=`<tr><td class="bos">Stok bilgisi okunamadı: ${e.message}. Veritabanı fonksiyonları kurulu mu?</td></tr>`;return;}
  }
  const depoKapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(depolar):depolar).filter(d=>d.aktif!==false);
  // Depo filtre kutusu
  const sel=document.getElementById('ds-depo');
  const seciliDepo=sel.value;
  sel.innerHTML='<option value="">Tüm depolar</option>'+depoKapsam.map(d=>`<option value="${d.id}"${d.id===seciliDepo?' selected':''}>${d.ad}${d.ana_depo?' (Ana Depo)':''}</option>`).join('');
  sel.value=seciliDepo;
  const gosterilenDepolar=seciliDepo?depoKapsam.filter(d=>d.id===seciliDepo):depoKapsam;
  const ara=(document.getElementById('ds-ara').value||'').trim().toLocaleLowerCase('tr');
  const gizle=document.getElementById('ds-gizle').checked;

  const harita=_dsVeri||{};
  const kapsam=(typeof isyeriFiltre==='function'?isyeriFiltre(stoklar):stoklar).filter(s=>s.tip==='stok'&&s.aktif!==false);
  const satirlar=[];
  kapsam.forEach(s=>{
    if(ara&&!(s.ad||'').toLocaleLowerCase('tr').includes(ara)&&!(s.kod||'').toLowerCase().includes(ara))return;
    const o=harita[s.id]||{};
    const degerler=gosterilenDepolar.map(d=>o[d.id]||0);
    const toplam=degerler.reduce((a,b)=>a+b,0);
    if(gizle&&degerler.every(v=>Math.abs(v)<0.0005))return;
    satirlar.push({stok:s,degerler,toplam});
  });
  satirlar.sort((a,b)=>(a.stok.kod||'').localeCompare(b.stok.kod||''));
  _dsSonSatirlar=satirlar;_dsSonDepolar=gosterilenDepolar;

  thEl.innerHTML='<tr><th style="width:110px">Kod</th><th style="min-width:200px">Stok</th><th style="width:60px">Birim</th>'
    +gosterilenDepolar.map(d=>`<th style="text-align:right">${d.ad}</th>`).join('')
    +(gosterilenDepolar.length>1?'<th style="text-align:right">Toplam</th>':'')+'</tr>';
  const hucre=(v,kalin)=>{
    const bos=Math.abs(v)<0.0005;
    const stil=(v<-0.0005?'color:#c62828;font-weight:600;':'')+(kalin&&v>=-0.0005?'font-weight:600;':'');
    return `<td style="text-align:right;${stil}">${bos?'':_dsSayi(v)}</td>`;
  };
  const toplamKolonu=gosterilenDepolar.length>1;
  tbEl.innerHTML=satirlar.map(r=>{
    const tb=birimler.find(b=>b.id===r.stok.birim_id);
    return `<tr><td class="tree-kod">${r.stok.kod||''}</td><td>${r.stok.ad}</td><td>${tb?.kisaltma||''}</td>${r.degerler.map(v=>hucre(v,false)).join('')}${toplamKolonu?hucre(r.toplam,true):''}</tr>`;
  }).join('')||`<tr><td colspan="${3+gosterilenDepolar.length+(toplamKolonu?1:0)}" class="bos">Kayıt yok</td></tr>`;
  const ozet=document.getElementById('ds-ozet');
  if(ozet)ozet.textContent=`${satirlar.length} stok kalemi`+(anaDepoId()?'':' · ⚠ Ana depo tanımlı değil');
};
window.depoStokExcelIndir=function(){
  if(!_dsSonSatirlar.length){bil('İndirilecek veri yok','err');return;}
  const data=_dsSonSatirlar.map(r=>{
    const tb=birimler.find(b=>b.id===r.stok.birim_id);
    const o={'Kod':r.stok.kod||'','Stok':r.stok.ad,'Birim':tb?.kisaltma||''};
    _dsSonDepolar.forEach((d,i)=>{o[d.ad]=+r.degerler[i].toFixed(3);});
    if(_dsSonDepolar.length>1)o['Toplam']=+r.toplam.toFixed(3);
    return o;
  });
  const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Depo Stok');
  XLSX.writeFile(wb,'depo_stok_durumu.xlsx');
};
