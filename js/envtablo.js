// ===== ENVANTER TABLOSU: SÜTUN FİLTRESİ + SIRALAMA (Excel benzeri) — ortak motor =====
// Hem ana sistemdeki Stok Envanter Raporu (ekran 'env') hem Bağımsız Raporlama › Envanter (ekran 'be') bunu kullanır.
//  • SIRALAMA: sütun başlığına tıklayınca o sütundaki değere göre sıralanır. Sayısal sütun: 1. tık büyükten küçüğe, 2. tık küçükten büyüğe,
//    3. tık sıralamayı kaldırır (varsayılan sıraya döner). Metin sütunu (Kod/Stok/Birim): A→Z, Z→A, kaldır. Değeri olmayanlar (örn. sayımı yapılmamış) HER ZAMAN sonda.
//    GRUP görünümünde hiyerarşi bozulmaz: kardeş gruplar kendi içinde sıralanır, alt gruplar ebeveynlerinin altında kalır.
//  • FİLTRE: başlıktaki huni simgesi. Sayısal: >, ≥, <, ≤, =, ≠, arasında, dolu, boş, negatif, pozitif. Metin: içerir, içermez, ile başlar, eşittir
//    (+ az sayıda farklı değer varsa Excel gibi değer listesi). Birden çok sütunda filtre birlikte (VE) uygulanır.
//  • Etkin sıralama ve filtreler tablonun üstünde silinebilir rozetler olarak görünür. Durum her görünüm (detay / grup) için ayrı tutulur ve
//    rapor yeniden çizilince korunur. Tablodaki TOPLAM ve Excel çıktısı, ekranda GÖRÜNEN (filtreli + sıralı) satırlara göre hesaplanır.
// Ekran, her çizimde: kolonlar(ekran,görünüm,tanım) → th(...) ile başlıklar → isle(ekran,görünüm,satırlar[,ağaç]) çağırır.
(function(){
  if(window.EnvTablo)return;
  const ET={};
  const durum={},kayit={},kolonTanim={},ham={};
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const st=(e,g)=>{durum[e]=durum[e]||{};return durum[e][g]=durum[e][g]||{sirala:null,filtre:{}};};
  const kolon=(e,g,id)=>(kolonTanim[e+'|'+g]||[]).find(k=>k.id===id);
  const yok=v=>v===null||v===undefined||v==='';
  const fmt=(v,t)=>t==='t'?(+v).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):(+v).toLocaleString('tr-TR',{maximumFractionDigits:3});

  // ----- stil (bir kez) -----
  const css=document.createElement('style');css.id='et-stil';
  css.textContent=`
  .et-th{cursor:pointer;user-select:none;white-space:nowrap}
  .et-th:hover{filter:brightness(1.18)}
  .et-ok{display:inline-block;min-width:11px;margin-left:3px;font-size:9px;color:var(--turuncu,#e07b4a)}
  .et-ok[data-yon="asc"]::after{content:"▲"}
  .et-ok[data-yon="desc"]::after{content:"▼"}
  .et-f{display:inline-block;width:13px;height:13px;margin:0 0 -2px 3px;padding:0;border:none;cursor:pointer;vertical-align:baseline;color:var(--yazi3,#7a8a99);background-color:currentColor;
    -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M1 2h14l-5.5 6.5V14l-3-1.5V8.5z'/%3E%3C/svg%3E") center/10px no-repeat;
    mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M1 2h14l-5.5 6.5V14l-3-1.5V8.5z'/%3E%3C/svg%3E") center/10px no-repeat}
  .et-f:hover{color:var(--yazi,#e8edf2)}
  .et-f.et-aktif{color:var(--turuncu,#e07b4a)}
  .et-popup{position:fixed;z-index:9999;display:none;width:272px;background:var(--beyaz,#1a2535);color:var(--yazi,#e8edf2);border:1px solid var(--border,#243448);border-radius:10px;box-shadow:0 10px 32px rgba(0,0,0,.4);padding:10px 12px;font-size:12px}
  .et-popup .et-bas{font-weight:600;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--krem2,#172030)}
  .et-popup .et-sira{display:flex;gap:6px;margin-bottom:8px}
  .et-popup button.et-d{flex:1;font-size:11px;padding:5px 6px;border:1px solid var(--border,#243448);border-radius:6px;background:var(--krem2,#172030);color:var(--yazi,#e8edf2);cursor:pointer}
  .et-popup button.et-d:hover{border-color:var(--turuncu,#e07b4a)}
  .et-popup select,.et-popup input[type=text]{width:100%;box-sizing:border-box;font-size:12px;padding:5px 7px;margin-bottom:6px;border:1px solid var(--border,#243448);border-radius:6px;background:var(--krem,#0f1923);color:var(--yazi,#e8edf2)}
  .et-popup .et-liste{max-height:150px;overflow:auto;border:1px solid var(--border,#243448);border-radius:6px;padding:4px 6px;margin:2px 0 8px}
  .et-popup .et-liste label{display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer}
  .et-popup .et-liste input{width:auto;margin:0}
  .et-popup .et-alt{display:flex;gap:6px;margin-top:4px}
  .et-popup .et-uygula{flex:1;padding:6px;border:none;border-radius:6px;background:var(--yesil,#5b9ec9);color:#fff;font-weight:600;cursor:pointer}
  .et-popup .et-temiz{padding:6px 8px;border:1px solid var(--border,#243448);border-radius:6px;background:transparent;color:var(--yazi2,#a0b4c4);cursor:pointer}
  .et-popup .et-hata{color:#e57373;font-size:11px;min-height:14px}
  .et-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 .6rem;font-size:12px}
  .et-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 6px 3px 10px;border-radius:14px;background:var(--krem2,#172030);border:1px solid var(--turuncu,#e07b4a);color:var(--yazi,#e8edf2)}
  .et-chip b{cursor:pointer;color:var(--yazi3,#7a8a99);padding:0 4px;font-weight:400}
  .et-chip b:hover{color:#e57373}
  .et-temizle{font-size:11px;padding:3px 10px;border:1px solid var(--border,#243448);border-radius:14px;background:transparent;color:var(--yazi2,#a0b4c4);cursor:pointer}`;
  document.head.appendChild(css);

  // ----- kayıt / tanım -----
  ET.kaydet=function(ekran,secenek){kayit[ekran]=secenek;};          // {barId, yenile(), gorunum()}
  ET.kolonlar=function(ekran,gorunum,dizi){kolonTanim[ekran+'|'+gorunum]=dizi;};  // [{id,ad,tip:'metin'|'sayi',deger(satir),bosMu?(v)}]
  const yenile=e=>{if(kayit[e]&&kayit[e].yenile)kayit[e].yenile();};

  // Başlık hücresi. o: {sinif, stil, rowspan}. Simgeler CSS ile çizilir (hücrenin metin içeriği sadece etikettir).
  ET.th=function(ekran,gorunum,kolId,etiket,o){
    o=o||{};const s=st(ekran,gorunum);
    const yon=s.sirala&&s.sirala.k===kolId?s.sirala.yon:'';
    const fa=s.filtre[kolId]?' et-aktif':'';
    return `<th class="et-th ${o.sinif||''}"${o.rowspan?` rowspan="${o.rowspan}"`:''} style="${o.stil||''}" title="Sıralamak için tıklayın" onclick="EnvTablo.sirala('${ekran}','${gorunum}','${kolId}')">${etiket}<span class="et-ok" data-yon="${yon}"></span><button type="button" class="et-f${fa}" title="Filtrele" onclick="EnvTablo.filtreAc(event,'${ekran}','${gorunum}','${kolId}')"></button></th>`;
  };

  // ----- sıralama -----
  ET.sirala=function(ekran,gorunum,kolId){
    const kol=kolon(ekran,gorunum,kolId);if(!kol)return;
    const s=st(ekran,gorunum),ilk=kol.tip==='metin'?'asc':'desc',ters=ilk==='asc'?'desc':'asc';
    if(!s.sirala||s.sirala.k!==kolId)s.sirala={k:kolId,yon:ilk};
    else if(s.sirala.yon===ilk)s.sirala={k:kolId,yon:ters};
    else s.sirala=null;
    yenile(ekran);
  };
  ET._sirala=function(ekran,gorunum,kolId,yon){st(ekran,gorunum).sirala={k:kolId,yon};kapat();yenile(ekran);};
  function kars(a,b,kol,yon){
    const x=kol.deger(a),y=kol.deger(b),nx=yok(x),ny=yok(y);
    if(nx&&ny)return 0;if(nx)return 1;if(ny)return -1;       // değeri olmayanlar hep sonda
    const c=kol.tip==='metin'?String(x).localeCompare(String(y),'tr',{numeric:true,sensitivity:'base'}):x-y;
    return yon==='desc'?-c:c;
  }
  function agacSirala(liste,agac,cmp){
    const var_=new Map(liste.map(r=>[agac.id(r),r])),cocuk=new Map(),kokler=[];
    liste.forEach(r=>{const u=agac.ust(r);if(u&&var_.has(u)){if(!cocuk.has(u))cocuk.set(u,[]);cocuk.get(u).push(r);}else kokler.push(r);});
    const cikti=[];const gez=d=>d.slice().sort(cmp).forEach(r=>{cikti.push(r);const c=cocuk.get(agac.id(r));if(c)gez(c);});
    gez(kokler);return cikti;
  }

  // ----- filtre koşulu -----
  function esles(f,kol,r){
    const v=kol.deger(r);
    if(kol.tip==='metin'){
      const s=String(v==null?'':v);
      if(f.secili&&f.secili.length&&!f.secili.includes(s))return false;
      if(f.op&&f.v1){
        const a=s.toLocaleLowerCase('tr'),q=String(f.v1).toLocaleLowerCase('tr');
        if(f.op==='icerir')return a.includes(q);if(f.op==='icermez')return !a.includes(q);
        if(f.op==='baslar')return a.startsWith(q);if(f.op==='esit')return a===q;
      }
      return true;
    }
    const bos=kol.bosMu?kol.bosMu(v):(v===null||v===undefined||v===0);
    if(f.op==='dolu')return !bos;if(f.op==='bos')return bos;
    if(v===null||v===undefined)return false;                    // sayısal koşulda değeri olmayan satır elenir
    if(f.op==='negatif')return v<0;if(f.op==='pozitif')return v>0;
    const a=f.n1,b=f.n2;
    switch(f.op){case '>':return v>a;case '>=':return v>=a;case '<':return v<a;case '<=':return v<=a;
      case '=':return Math.abs(v-a)<1e-9;case '!=':return Math.abs(v-a)>=1e-9;case 'arasinda':return v>=Math.min(a,b)&&v<=Math.max(a,b);}
    return true;
  }

  // Ekranın çağırdığı ana işlev: satırları sıralar (varsa hiyerarşiyi koruyarak) ve filtreler; rozet çubuğunu günceller.
  ET.isle=function(ekran,gorunum,satirlar,agac){
    ham[ekran+'|'+gorunum]=satirlar.slice();
    const s=st(ekran,gorunum);let liste=satirlar.slice();
    if(s.sirala){
      const kol=kolon(ekran,gorunum,s.sirala.k);
      if(kol){const c=(a,b)=>kars(a,b,kol,s.sirala.yon);liste=agac?agacSirala(liste,agac,c):liste.map((r,i)=>[r,i]).sort((p,q)=>c(p[0],q[0])||p[1]-q[1]).map(p=>p[0]);}
    }
    Object.keys(s.filtre).forEach(k=>{const kol=kolon(ekran,gorunum,k);if(kol)liste=liste.filter(r=>esles(s.filtre[k],kol,r));});
    ET.barCiz(ekran,gorunum);
    return liste;
  };
  ET.aktifMi=(ekran,gorunum)=>{const s=st(ekran,gorunum);return !!s.sirala||Object.keys(s.filtre).length>0;};
  ET.filtreSayisi=(ekran,gorunum)=>Object.keys(st(ekran,gorunum).filtre).length;
  ET.temizle=function(ekran,gorunum){durum[ekran]=durum[ekran]||{};durum[ekran][gorunum]={sirala:null,filtre:{}};kapat();yenile(ekran);};
  ET.filtreKaldir=function(ekran,gorunum,kolId){delete st(ekran,gorunum).filtre[kolId];yenile(ekran);};
  ET.siralaKaldir=function(ekran,gorunum){st(ekran,gorunum).sirala=null;yenile(ekran);};
  ET.durum=(ekran,gorunum)=>JSON.parse(JSON.stringify(st(ekran,gorunum)));   // test/inceleme için kopya

  // ----- rozet çubuğu -----
  const OP_AD={'>':'>','>=':'≥','<':'<','<=':'≤','=':'=','!=':'≠',dolu:'dolu',bos:'boş',negatif:'negatif',pozitif:'pozitif',icerir:'içerir',icermez:'içermez',baslar:'ile başlar',esit:'eşittir'};
  function filtreMetni(f,kol,t){
    const parca=[];
    if(kol.tip==='metin'){
      if(f.secili&&f.secili.length)parca.push(f.secili.length<=3?f.secili.join(', '):`${f.secili.length} değer`);
      if(f.op&&f.v1)parca.push(`${OP_AD[f.op]} "${f.v1}"`);
      return `${kol.ad}: ${parca.join(' · ')}`;
    }
    const tur=kol.id.endsWith('_t')?'t':'m';
    if(f.op==='arasinda')return `${kol.ad} ${fmt(f.n1,tur)} – ${fmt(f.n2,tur)} arası`;
    if(['dolu','bos','negatif','pozitif'].includes(f.op))return `${kol.ad} ${OP_AD[f.op]}`;
    return `${kol.ad} ${OP_AD[f.op]} ${fmt(f.n1,tur)}`;
  }
  ET.barCiz=function(ekran,gorunum){
    const k=kayit[ekran];if(!k||!k.barId)return;const el=document.getElementById(k.barId);if(!el)return;
    const s=st(ekran,gorunum);const rozet=[];
    if(s.sirala){const kol=kolon(ekran,gorunum,s.sirala.k);if(kol)rozet.push(`<span class="et-chip">Sıralama: ${esc(kol.ad)} ${s.sirala.yon==='desc'?'▼':'▲'}<b title="Sıralamayı kaldır" onclick="EnvTablo.siralaKaldir('${ekran}','${gorunum}')">✕</b></span>`);}
    Object.keys(s.filtre).forEach(id=>{const kol=kolon(ekran,gorunum,id);if(kol)rozet.push(`<span class="et-chip">${esc(filtreMetni(s.filtre[id],kol))}<b title="Filtreyi kaldır" onclick="EnvTablo.filtreKaldir('${ekran}','${gorunum}','${id}')">✕</b></span>`);});
    el.className=rozet.length?'et-bar':'';
    el.innerHTML=rozet.length?rozet.join('')+`<button type="button" class="et-temizle" onclick="EnvTablo.temizle('${ekran}','${gorunum}')">Tümünü temizle</button>`:'';
  };

  // ----- filtre penceresi -----
  let pop=null,popBaglam=null;
  const popup=()=>{if(!pop){pop=document.createElement('div');pop.className='et-popup';pop.id='et-popup';document.body.appendChild(pop);}return pop;};
  function kapat(){if(pop)pop.style.display='none';popBaglam=null;}
  ET.kapat=kapat;
  // "1.234,56", "12,5", "1.234" (binlik), "1234.5" biçimlerini sayıya çevirir; olmazsa NaN
  ET.sayiOku=function(m){
    let s=String(m==null?'':m).replace(/[₺\s%]|tl/gi,'');if(s==='')return NaN;
    const nok=(s.match(/\./g)||[]).length,vir=(s.match(/,/g)||[]).length;
    if(nok&&vir)s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
    else if(vir===1&&!nok)s=s.replace(',','.');
    else if(nok>1)s=s.replace(/\./g,'');
    else if(nok===1&&/^-?\d{1,3}\.\d{3}$/.test(s))s=s.replace('.','');   // tek nokta + tam 3 hane: Türkçe binlik ayracı
    return /^-?\d*\.?\d+$/.test(s)?parseFloat(s):NaN;
  };
  ET.filtreAc=function(ev,ekran,gorunum,kolId){
    ev.stopPropagation();ev.preventDefault();
    const kol=kolon(ekran,gorunum,kolId);if(!kol)return;
    const dugme=ev.currentTarget||ev.target,s=st(ekran,gorunum),f=s.filtre[kolId]||{};
    const p=popup();popBaglam={ekran,gorunum,kolId};
    const sayisal=kol.tip!=='metin';
    let h=`<div class="et-bas">${esc(kol.ad)}</div>
      <div class="et-sira"><button type="button" class="et-d" onclick="EnvTablo._sirala('${ekran}','${gorunum}','${kolId}','${sayisal?'desc':'asc'}')">${sayisal?'↓ Büyükten küçüğe':'A → Z'}</button><button type="button" class="et-d" onclick="EnvTablo._sirala('${ekran}','${gorunum}','${kolId}','${sayisal?'asc':'desc'}')">${sayisal?'↑ Küçükten büyüğe':'Z → A'}</button></div>`;
    if(sayisal){
      const ops=[['','— Koşul seçin —'],['>','Büyüktür (>)'],['>=','Büyük veya eşit (≥)'],['<','Küçüktür (<)'],['<=','Küçük veya eşit (≤)'],['=','Eşittir (=)'],['!=','Eşit değildir (≠)'],['arasinda','Arasında'],['dolu','Dolu (sıfırdan farklı)'],['bos',kol.bosMu&&kol.id.startsWith('sayim')?'Boş (sayım yapılmamış)':'Boş (sıfır)'],['negatif','Negatif (< 0)'],['pozitif','Pozitif (> 0)']];
      h+=`<select id="et-op" onchange="EnvTablo._opDegisti()">${ops.map(o=>`<option value="${o[0]}"${(f.op||'')===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select>
        <input type="text" id="et-v1" placeholder="Değer" value="${f.n1!==undefined?esc(fmtGiris(f.n1)):''}" onkeydown="if(event.key==='Enter')EnvTablo._uygula()">
        <input type="text" id="et-v2" placeholder="ve (üst sınır)" value="${f.n2!==undefined?esc(fmtGiris(f.n2)):''}" onkeydown="if(event.key==='Enter')EnvTablo._uygula()">`;
    }else{
      const ops=[['icerir','İçerir'],['icermez','İçermez'],['baslar','İle başlar'],['esit','Eşittir']];
      h+=`<select id="et-op">${ops.map(o=>`<option value="${o[0]}"${(f.op||'icerir')===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select>
        <input type="text" id="et-v1" placeholder="Metin" value="${esc(f.v1||'')}" onkeydown="if(event.key==='Enter')EnvTablo._uygula()">`;
      const farkli=[...new Set((ham[ekran+'|'+gorunum]||[]).map(r=>String(kol.deger(r)==null?'':kol.deger(r))))].filter(x=>x!=='').sort((a,b)=>a.localeCompare(b,'tr',{numeric:true}));
      p._degerler=farkli;
      if(farkli.length&&farkli.length<=50){
        h+=`<div class="et-liste">${farkli.map((v,i)=>`<label><input type="checkbox" class="et-sec" data-i="${i}"${(f.secili||[]).includes(v)?' checked':''}> ${esc(v)}</label>`).join('')}</div>`;
      }
    }
    h+=`<div class="et-hata" id="et-hata"></div><div class="et-alt"><button type="button" class="et-uygula" onclick="EnvTablo._uygula()">Uygula</button><button type="button" class="et-temiz" onclick="EnvTablo._temizSutun()">Bu sütunu temizle</button></div>`;
    p.innerHTML=h;p.style.display='block';
    const r=dugme.getBoundingClientRect();
    p.style.left=Math.max(8,Math.min(r.left,window.innerWidth-p.offsetWidth-8))+'px';
    p.style.top=Math.max(8,Math.min(r.bottom+4,window.innerHeight-p.offsetHeight-8))+'px';
    if(sayisal)ET._opDegisti();
    const ilk=p.querySelector('#et-v1');if(ilk&&ilk.offsetParent)ilk.focus();
  };
  const fmtGiris=n=>(+n).toLocaleString('tr-TR',{maximumFractionDigits:6,useGrouping:false});
  ET._opDegisti=function(){
    const op=document.getElementById('et-op').value;
    const v1=document.getElementById('et-v1'),v2=document.getElementById('et-v2');
    v1.style.display=['','dolu','bos','negatif','pozitif'].includes(op)?'none':'';
    v2.style.display=op==='arasinda'?'':'none';
  };
  ET._uygula=function(){
    if(!popBaglam)return;const {ekran,gorunum,kolId}=popBaglam;const kol=kolon(ekran,gorunum,kolId);const s=st(ekran,gorunum);
    const hata=m=>{const h=document.getElementById('et-hata');if(h)h.textContent=m;};
    const op=document.getElementById('et-op').value;
    if(kol.tip==='metin'){
      const v1=document.getElementById('et-v1').value.trim();
      const secili=[...pop.querySelectorAll('.et-sec:checked')].map(c=>pop._degerler[+c.dataset.i]);
      const tumu=pop.querySelectorAll('.et-sec').length;
      const sec=(tumu&&secili.length===tumu)?[]:secili;                     // hepsi işaretliyse kısıt yok
      if(!v1&&!sec.length)delete s.filtre[kolId];else s.filtre[kolId]={op:v1?op:'',v1,secili:sec};
    }else{
      if(!op)delete s.filtre[kolId];
      else if(['dolu','bos','negatif','pozitif'].includes(op))s.filtre[kolId]={op};
      else{
        const n1=ET.sayiOku(document.getElementById('et-v1').value),n2=ET.sayiOku(document.getElementById('et-v2').value);
        if(Number.isNaN(n1)){hata('Geçerli bir sayı girin (örn. 1.250,50)');return;}
        if(op==='arasinda'&&Number.isNaN(n2)){hata('Üst sınır için geçerli bir sayı girin');return;}
        s.filtre[kolId]=op==='arasinda'?{op,n1,n2}:{op,n1};
      }
    }
    kapat();yenile(ekran);
  };
  ET._temizSutun=function(){if(!popBaglam)return;const {ekran,gorunum,kolId}=popBaglam;delete st(ekran,gorunum).filtre[kolId];kapat();yenile(ekran);};
  // pencere dışına tıklama / Esc / sayfa kaydırma ile kapanır
  document.addEventListener('mousedown',e=>{if(pop&&pop.style.display==='block'&&!pop.contains(e.target)&&!(e.target.closest&&e.target.closest('.et-f')))kapat();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')kapat();});
  window.addEventListener('scroll',e=>{if(pop&&pop.style.display==='block'&&!pop.contains(e.target))kapat();},true);
  window.addEventListener('resize',kapat);
  window.EnvTablo=ET;
})();
