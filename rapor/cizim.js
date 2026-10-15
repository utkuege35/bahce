// ===== RAPOR ÇİZİMİ (ortak): alıcı sayfası (rapor/index.html) ve yönetici önizlemesi (uygulama) AYNI kodu kullanır =====
// RaporCizim.ciz(rapor, kapsayici): sunucudan gelen rapor JSON'unu kapsayıcıya çizer (koyu tema, SVG grafikler; stil: rapor/cizim.css).
// Güvenlik: sunucudan gelen tüm metinler yalnızca textContent ile yazılır; SVG özniteliklerine yalnızca sayı/renk yazılır; satır içi stil özniteliği kullanılmaz (yalnızca CSSOM).
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const RENK = ['#34d399', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#2dd4bf', '#f472b6', '#a3e635', '#38bdf8', '#fb923c', '#c084fc', '#94a3b8'];
  let uid = 0;

  // ---------- yardımcılar ----------
  function el(etiket, sinif, metin) { const e = document.createElement(etiket); if (sinif) e.className = sinif; if (metin !== undefined && metin !== null) e.textContent = metin; return e; }
  function sv(etiket, oz, metin) { const e = document.createElementNS(NS, etiket); for (const k in oz) e.setAttribute(k, oz[k]); if (metin !== undefined && metin !== null) e.textContent = metin; return e; }
  const para = n => '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sayi = n => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
  const kisa = n => { n = Number(n || 0); const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' Mn'; if (a >= 1e3) return (n / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + ' bin'; return Math.round(n).toLocaleString('tr-TR'); };
  const yuzde = (v, t) => (t > 0 ? v / t * 100 : 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const trTarih = t => { const p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ''; };
  const tarihAd = t => { try { return new Date(t + 'T00:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' }); } catch (e) { return trTarih(t); } };
  const hGun = t => (new Date(t + 'T00:00:00Z').getUTCDay() + 6) % 7;                    // Pzt=0 … Paz=6
  const gunEkle = (t, n) => { const d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const gunFarki = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
  function guzelUst(max) { const p = Math.pow(10, Math.floor(Math.log10(max || 1))), n = (max || 1) / p, u = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10; return u * p; }
  function kart(baslik, kucuk) { const k = el('section', 'rc-kart'), h = el('h2'); h.appendChild(document.createTextNode(baslik)); if (kucuk) h.appendChild(el('small', '', kucuk)); k.appendChild(h); return k; }
  function oku() { return el('div', 'rc-oku'); }
  function okuYaz(o, ad, tutar, ek) { o.replaceChildren(); o.appendChild(document.createTextNode(ad + ' · ')); o.appendChild(el('b', '', para(tutar))); if (ek) o.appendChild(document.createTextNode(' · ' + ek)); }
  function degrade(defs, id, ust, alt) { const g = sv('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }); g.appendChild(sv('stop', { offset: '0%', 'stop-color': ust })); g.appendChild(sv('stop', { offset: '100%', 'stop-color': alt })); defs.appendChild(g); }
  function gunListesi(bas, bit, gunler, kalemler) { const L = [], n = Math.min(gunFarki(bas, bit) + 1, 400); for (let i = 0; i < n; i++) { const g = gunEkle(bas, i); L.push({ tarih: g, tutar: gunler[g] || 0, kalem: kalemler[g] || 0 }); } return L; }

  // ---------- üst özet ----------
  function egri(noktalar) {                      // yumuşak eğri (orta nokta yöntemi)
    if (noktalar.length < 2) return '';
    let d = `M${noktalar[0][0].toFixed(1)},${noktalar[0][1].toFixed(1)}`;
    for (let i = 1; i < noktalar.length - 1; i++) { const m = [(noktalar[i][0] + noktalar[i + 1][0]) / 2, (noktalar[i][1] + noktalar[i + 1][1]) / 2]; d += ` Q${noktalar[i][0].toFixed(1)},${noktalar[i][1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`; }
    const s = noktalar[noktalar.length - 1]; return d + ` L${s[0].toFixed(1)},${s[1].toFixed(1)}`;
  }
  function mini(gunL) {
    const W = 360, H = 64, mx = Math.max(...gunL.map(x => x.tutar), 1), id = 'rcs' + (++uid);
    const nk = gunL.map((x, i) => [i / (gunL.length - 1) * W, H - 6 - x.tutar / mx * (H - 18)]);
    const s = sv('svg', { class: 'rc-spark', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Günlük alım eğrisi' }), defs = sv('defs', {});
    const g = sv('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }); g.appendChild(sv('stop', { offset: '0%', 'stop-color': '#34d399', 'stop-opacity': '.45' })); g.appendChild(sv('stop', { offset: '100%', 'stop-color': '#34d399', 'stop-opacity': '0' })); defs.appendChild(g); s.appendChild(defs);
    const yol = egri(nk);
    s.appendChild(sv('path', { d: yol + ` L${W},${H} L0,${H} Z`, fill: `url(#${id})` }));
    const c = sv('path', { d: yol, fill: 'none', stroke: '#6ee7b7', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', class: 'rc-cizgi' }); c.style.setProperty('--u', '2400'); s.appendChild(c);
    return s;
  }
  function ozet(kok, r, gunL) {
    const o = r.ozet, cok = r.donem_bas !== r.donem_bit, h = el('section', 'rc-hero');
    h.appendChild(el('div', 'rc-etiket', cok ? 'Toplam alım' : 'Günlük toplam alım'));
    h.appendChild(el('div', 'rc-hero-tutar', para(o.toplam_tutar)));
    const alt = el('div', 'rc-alt');
    if (Number(o.onceki_tutar) > 0) { const d = (o.toplam_tutar - o.onceki_tutar) / o.onceki_tutar * 100; alt.appendChild(el('span', 'rc-delta' + (d < 0 ? ' az' : ''), (d >= 0 ? '▲ %' : '▼ %') + Math.abs(d).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + (cok ? ' önceki döneme göre' : ' önceki güne göre'))); }
    else alt.appendChild(el('span', 'rc-delta yok', cok ? 'Önceki dönemde alım yok' : 'Önceki gün alım yok'));
    alt.appendChild(el('span', 'rc-donem', cok ? `${trTarih(r.donem_bas)} – ${trTarih(r.donem_bit)} · ${o.gun_sayisi} gün` : tarihAd(r.donem_bas)));
    h.appendChild(alt);
    if (cok && gunL.length > 1 && gunL.some(x => x.tutar > 0)) h.appendChild(mini(gunL)); else h.style.paddingBottom = '18px';
    kok.appendChild(h);
  }
  function gostergeler(kok, r, gunL) {
    const o = r.ozet, cok = r.donem_bas !== r.donem_bit, aktif = gunL.filter(x => x.tutar > 0).length, g = el('div', 'rc-kpi');
    const T = [['🧾', 'Kalem', String(o.kalem_sayisi), 'alım satırı'], ['📄', 'Belge', String(o.belge_sayisi), 'irsaliye / fatura'], ['🏭', 'Tedarikçi', o.tedarikci_sayisi ? String(o.tedarikci_sayisi) : '—', o.tedarikci_sayisi ? 'farklı firma' : 'bilgi yok'],
      cok ? ['📅', 'Günlük ort.', '₺' + Math.round(o.toplam_tutar / Math.max(o.gun_sayisi, 1)).toLocaleString('tr-TR'), aktif + ' günde alım var'] : ['⚖️', 'Kalem ort.', '₺' + Math.round(o.toplam_tutar / Math.max(o.kalem_sayisi, 1)).toLocaleString('tr-TR'), 'kalem başına']];
    T.forEach(t => { const d = el('div'); d.appendChild(el('div', 'rc-kpi-i', t[0])); d.appendChild(el('div', 'rc-kpi-e', t[1])); d.appendChild(el('div', 'rc-kpi-d', t[2])); d.appendChild(el('div', 'rc-kpi-k', t[3])); g.appendChild(d); });
    kok.appendChild(g);
  }

  // ---------- günlere göre sütun grafiği ----------
  function gunlukKart(kok, gunL) {
    let veri = gunL.map(x => ({ e: x.tarih.slice(8), ad: tarihAd(x.tarih), tutar: x.tutar, kalem: x.kalem })), tur = 'günlük';
    if (gunL.length > 62) {                       // çok uzun dönem: haftalara topla
      const h = {}; gunL.forEach(x => { const b = gunEkle(x.tarih, -hGun(x.tarih)); (h[b] = h[b] || { tutar: 0, kalem: 0 }); h[b].tutar += x.tutar; h[b].kalem += x.kalem; });
      veri = Object.keys(h).sort().map(b => ({ e: b.slice(8) + '.' + b.slice(5, 7), ad: trTarih(b) + ' haftası', tutar: h[b].tutar, kalem: h[b].kalem })); tur = 'haftalık';
    }
    const k = kart('Günlere göre alım', tur), o = oku(); k.appendChild(o);
    const W = Math.max(300, Math.min(920, Math.round((kok.clientWidth || 392) - 32))), H = W < 520 ? 206 : 250, sol = 46, sag = 6, ust = 8, alt = 26, iw = W - sol - sag, ih = H - ust - alt, n = veri.length, slot = iw / n, bw = Math.max(3, Math.min(26, slot * 0.68));
    const mx = Math.max(...veri.map(x => x.tutar), 1), tavan = guzelUst(mx), id = 'rcg' + (++uid);
    const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Günlere göre alım sütun grafiği' }), defs = sv('defs', {});
    degrade(defs, id + 'a', '#6ee7b7', '#3b82f6'); degrade(defs, id + 'b', '#fde68a', '#f59e0b'); s.appendChild(defs);
    for (let i = 0; i <= 3; i++) { const y = ust + ih - ih * i / 3; s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: y, y2: y, class: 'rc-izg' })); s.appendChild(sv('text', { x: sol - 5, y: y + 3, 'text-anchor': 'end', class: 'rc-t' }, kisa(tavan * i / 3))); }
    const enI = veri.findIndex(x => x.tutar === mx), sut = [], adim = Math.max(1, Math.ceil(n / 8));
    veri.forEach((x, i) => {
      const cx = sol + slot * i + slot / 2, h = x.tutar / tavan * ih;
      if (x.tutar > 0) { const r = sv('rect', { x: (cx - bw / 2).toFixed(1), y: (ust + ih - h).toFixed(1), width: bw.toFixed(1), height: Math.max(h, 1.5).toFixed(1), rx: Math.min(4, bw / 2).toFixed(1), fill: `url(#${id}${i === enI ? 'b' : 'a'})`, class: 'rc-sutun' }); r.style.setProperty('--i', i); r.appendChild(sv('title', {}, `${x.ad}: ${para(x.tutar)}`)); s.appendChild(r); sut[i] = r; }
      else s.appendChild(sv('rect', { x: (cx - bw / 2).toFixed(1), y: ust + ih - 2, width: bw.toFixed(1), height: 2, rx: 1, fill: 'rgba(255,255,255,.12)' }));
      if (i % adim === 0) s.appendChild(sv('text', { x: cx.toFixed(1), y: H - 9, 'text-anchor': 'middle', class: 'rc-t' }, x.e));
      const v = sv('rect', { x: (sol + slot * i).toFixed(1), y: ust, width: slot.toFixed(1), height: ih + alt - 6, class: 'rc-vurus' }); v.addEventListener('click', () => sec(i)); s.appendChild(v);
    });
    function sec(i) { sut.forEach(r => r && r.classList.remove('sec')); if (sut[i]) sut[i].classList.add('sec'); okuYaz(o, veri[i].ad, veri[i].tutar, veri[i].kalem ? veri[i].kalem + ' kalem' : 'alım yok'); }
    sec(enI >= 0 ? enI : 0);
    k.appendChild(s); kok.appendChild(k);
  }

  // ---------- gruplar: halka grafik ----------
  function gruplamaHazirla(S) {
    const anaSayisi = new Set(S.map(s => s.grup1 || '')).size;
    const grupAdi = s => (anaSayisi <= 1 ? (s.grup2 || s.grup1) : s.grup1) || 'Diğer';
    const topla = {}; S.forEach(s => { const g = grupAdi(s); topla[g] = (topla[g] || 0) + Number(s.tutar || 0); });
    const gruplar = Object.keys(topla).map(ad => ({ ad, tutar: topla[ad] })).sort((a, b) => b.tutar - a.tutar);
    const renkDe = {}; gruplar.forEach((g, i) => { renkDe[g.ad] = RENK[i % RENK.length]; });
    return { grupAdi, gruplar, renkDe };
  }
  function halkaKart(ust, gr, toplam) {
    const k = kart('Gruplara göre dağılım', gr.gruplar.length + ' grup');
    let L = gr.gruplar.slice(0, 6); if (gr.gruplar.length > 6) L.push({ ad: 'Diğer', tutar: gr.gruplar.slice(6).reduce((a, g) => a + g.tutar, 0) });
    const yaricap = 58, C = 2 * Math.PI * yaricap, kap = el('div', 'rc-halka');
    const s = sv('svg', { viewBox: '0 0 160 160', width: '150', height: '150', role: 'img', 'aria-label': 'Grup dağılımı halka grafiği' }), g = sv('g', { class: 'rc-donus' });
    g.appendChild(sv('circle', { cx: 80, cy: 80, r: yaricap, fill: 'none', stroke: 'rgba(255,255,255,.06)', 'stroke-width': 24 }));
    const dil = [], satir = []; let birik = 0;
    const merkez1 = sv('text', { x: 80, y: 80, class: 'rc-tm' }, '₺' + kisa(toplam)), merkez2 = sv('text', { x: 80, y: 95, class: 'rc-ts' }, 'toplam');
    function sec(i) {
      dil.forEach((d, j) => { d.classList.toggle('sec', j === i); });
      if (i < 0) { merkez1.textContent = '₺' + kisa(toplam); merkez2.textContent = 'toplam'; return; }
      merkez1.textContent = '%' + yuzde(L[i].tutar, toplam); merkez2.textContent = L[i].ad.length > 18 ? L[i].ad.slice(0, 17) + '…' : L[i].ad;
    }
    L.forEach((x, i) => {
      const oran = toplam > 0 ? x.tutar / toplam : 0, uz = Math.max(C * oran - 2.5, 0.5), renk = x.ad === 'Diğer' && gr.gruplar.length > 6 ? '#94a3b8' : (gr.renkDe[x.ad] || RENK[i]);
      const c = sv('circle', { cx: 80, cy: 80, r: yaricap, fill: 'none', stroke: renk, 'stroke-width': 24, 'stroke-dasharray': `${uz.toFixed(2)} ${(C - uz).toFixed(2)}`, 'stroke-dashoffset': (-birik).toFixed(2), transform: 'rotate(-90 80 80)', class: 'rc-dilim' });
      c.appendChild(sv('title', {}, `${x.ad}: ${para(x.tutar)} · %${yuzde(x.tutar, toplam)}`)); c.addEventListener('click', () => sec(dil[i].classList.contains('sec') ? -1 : i)); g.appendChild(c); dil.push(c); birik += C * oran;
    });
    s.appendChild(g); s.appendChild(merkez1); s.appendChild(merkez2); kap.appendChild(s);
    const lej = el('div', 'rc-lej');
    L.forEach((x, i) => {
      const r = el('div', 'rc-lej-s'), nokta = el('i'); nokta.style.background = x.ad === 'Diğer' && gr.gruplar.length > 6 ? '#94a3b8' : (gr.renkDe[x.ad] || RENK[i]);
      r.appendChild(nokta); r.appendChild(el('span', '', x.ad)); const e = el('em'); e.appendChild(el('b', '', '%' + yuzde(x.tutar, toplam))); e.appendChild(document.createTextNode(' · ₺' + kisa(x.tutar))); r.appendChild(e);
      r.addEventListener('click', () => sec(dil[i].classList.contains('sec') ? -1 : i)); lej.appendChild(r);
    });
    kap.appendChild(lej); k.appendChild(kap); ust.appendChild(k);
  }

  // ---------- en çok alınan kalemler ----------
  function kalemKart(ust, S, gr, toplam) {
    const t = {}; S.forEach(s => { const a = (s.kod || '') + '|' + (s.ad || ''); const x = (t[a] = t[a] || { ad: s.ad || s.kod || '—', tutar: 0, miktar: 0, birim: s.birim, birimler: new Set(), grup: gr.grupAdi(s) }); x.tutar += Number(s.tutar || 0); x.miktar += Number(s.miktar || 0); x.birimler.add(s.birim || ''); });
    const L = Object.values(t).sort((a, b) => b.tutar - a.tutar), ilk = L.slice(0, 8), mx = ilk.length ? ilk[0].tutar : 1;
    const k = kart('En çok alınan kalemler', `ilk ${ilk.length} / ${L.length}`);
    ilk.forEach((x, i) => {
      const r = el('div', 'rc-sira'), no = el('div', 'rc-no' + (i === 0 ? ' bir' : ''), String(i + 1)); r.appendChild(no);
      const orta = el('div'); orta.style.minWidth = '0'; orta.appendChild(el('div', 'rc-ad', x.ad));
      const yol = el('div', 'rc-yol'), d = el('div', 'rc-dolgu'), renk = gr.renkDe[x.grup] || RENK[0]; d.style.width = Math.max(3, x.tutar / mx * 100) + '%'; d.style.background = `linear-gradient(90deg,${renk},${renk}aa)`; d.style.setProperty('--i', i); yol.appendChild(d); orta.appendChild(yol); r.appendChild(orta);
      const tt = el('div', 'rc-tut', para(x.tutar)); tt.appendChild(el('small', '', (x.birimler.size === 1 ? sayi(x.miktar) + ' ' + (x.birim || '') + ' · ' : '') + '%' + yuzde(x.tutar, toplam))); r.appendChild(tt); k.appendChild(r);
    });
    ust.appendChild(k);
  }

  // ---------- tedarikçi payı (yığın çubuk) ----------
  function tedarikciKart(ust, S, toplam) {
    const t = {}; S.forEach(s => { const a = (s.tedarikci || '').trim(); if (a) t[a] = (t[a] || 0) + Number(s.tutar || 0); });
    let L = Object.keys(t).map(ad => ({ ad, tutar: t[ad] })).sort((a, b) => b.tutar - a.tutar); if (!L.length) return false;
    const tum = L.length; if (L.length > 6) { L = L.slice(0, 5).concat([{ ad: 'Diğer', tutar: L.slice(5).reduce((a, x) => a + x.tutar, 0) }]); }
    const bilinen = L.reduce((a, x) => a + x.tutar, 0), k = kart('Tedarikçilere göre', tum + ' firma'), yigin = el('div', 'rc-yigin');
    const renk = (x, i) => x.ad === 'Diğer' && tum > 6 ? '#94a3b8' : RENK[(i + 3) % RENK.length];
    L.forEach((x, i) => { const p = el('div'); p.style.flexGrow = String(Math.max(x.tutar, 1)); p.style.flexBasis = '0'; p.style.background = renk(x, i); p.style.animationDelay = (i * 80) + 'ms'; p.title = `${x.ad}: ${para(x.tutar)}`; yigin.appendChild(p); });
    k.appendChild(yigin);
    const lej = el('div', 'rc-lej'); L.forEach((x, i) => { const r = el('div', 'rc-lej-s'), n = el('i'); n.style.background = renk(x, i); r.appendChild(n); r.appendChild(el('span', '', x.ad)); const e = el('em'); e.appendChild(el('b', '', '%' + yuzde(x.tutar, bilinen))); e.appendChild(document.createTextNode(' · ₺' + kisa(x.tutar))); r.appendChild(e); lej.appendChild(r); });
    k.appendChild(lej); ust.appendChild(k); return true;
  }

  // ---------- takvim ısı haritası ----------
  function isiKart(ust, gunL) {
    const k = kart('Alım takvimi', 'koyu = yoğun gün'), o = oku(); k.appendChild(o);
    const mx = Math.max(...gunL.map(x => x.tutar), 1), izgara = el('div', 'rc-isi');
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(a => izgara.appendChild(el('div', 'rc-isi-b', a)));
    for (let i = 0; i < hGun(gunL[0].tarih); i++) izgara.appendChild(el('div', 'rc-hucre dis'));
    const hc = [];
    gunL.forEach((x, i) => {
      const h = el('div', 'rc-hucre' + (x.tutar > 0 ? '' : ' yok'), String(Number(x.tarih.slice(8)))); h.title = `${tarihAd(x.tarih)}: ${x.tutar > 0 ? para(x.tutar) : 'alım yok'}`;
      if (x.tutar > 0) { const a = 0.2 + 0.8 * Math.sqrt(x.tutar / mx); h.style.background = `rgba(52,211,153,${a.toFixed(2)})`; if (a > 0.62) h.style.color = '#04281d'; }
      h.addEventListener('click', () => { hc.forEach(c => c.classList.remove('sec')); h.classList.add('sec'); if (x.tutar > 0) okuYaz(o, tarihAd(x.tarih), x.tutar, x.kalem + ' kalem'); else { o.replaceChildren(); o.appendChild(document.createTextNode(tarihAd(x.tarih) + ' · alım yok')); } });
      hc.push(h); izgara.appendChild(h);
    });
    k.appendChild(izgara);
    const en = gunL.reduce((a, x) => x.tutar > a.tutar ? x : a, gunL[0]); okuYaz(o, tarihAd(en.tarih), en.tutar, 'en yoğun gün');
    const l = el('div', 'rc-isi-lej'); l.appendChild(el('span', '', 'az')); l.appendChild(el('i')); l.appendChild(el('span', '', 'çok')); k.appendChild(l); ust.appendChild(k);
  }

  // ---------- detay tablosu ----------
  function tabloKart(kok, S, cok, gr) {
    const k = kart('Alım detayı', S.length + ' kalem'), ara = el('input', 'rc-arama'); ara.type = 'search'; ara.placeholder = 'Stok, tedarikçi veya belge ara…'; ara.setAttribute('aria-label', 'Detayda ara'); k.appendChild(ara);
    const sar = el('div', 'rc-tablo-sar'), tb = el('table', 'rc-tablo'); sar.appendChild(tb); k.appendChild(sar);
    const bas = el('thead'), hr = el('tr'), kol = [['Stok', ''], cok ? ['Tarih', ''] : null, ['Miktar', 's'], ['Birim Fiyat', 's'], ['Tutar', 's'], ['Tedarikçi', ''], ['Belge', '']].filter(Boolean);
    kol.forEach(([ad, c]) => hr.appendChild(el('th', c, ad))); bas.appendChild(hr); tb.appendChild(bas);
    const govde = el('tbody'), alt = el('tfoot'); tb.appendChild(govde); tb.appendChild(alt);
    function ciz() {
      const q = ara.value.trim().toLocaleLowerCase('tr'), liste = S.filter(s => !q || [s.ad, s.kod, s.tedarikci, s.belge].some(x => String(x || '').toLocaleLowerCase('tr').includes(q)));
      govde.replaceChildren(); alt.replaceChildren();
      liste.forEach(s => {
        const tr = el('tr'), t0 = el('td', 'ilk'), nk = el('span', 'rc-nokta'); nk.style.background = gr.renkDe[gr.grupAdi(s)] || '#888'; t0.appendChild(nk); t0.appendChild(document.createTextNode(s.ad || '—')); tr.appendChild(t0);
        const h = (et, m, sn) => { const td = el('td', sn || '', m); td.setAttribute('data-et', et); return td; };
        if (cok) tr.appendChild(h('Tarih', trTarih(s.tarih)));
        tr.appendChild(h('Miktar', sayi(s.miktar) + ' ' + (s.birim || ''), 's')); tr.appendChild(h('Birim Fiyat', s.birim_fiyat == null ? '—' : para(s.birim_fiyat), 's')); tr.appendChild(h('Tutar', para(s.tutar), 's'));
        tr.appendChild(h('Tedarikçi', s.tedarikci || '—')); tr.appendChild(h('Belge', s.belge || '—')); govde.appendChild(tr);
      });
      if (!liste.length) { const tr = el('tr'), td = el('td', 'ilk', 'Eşleşen kayıt yok.'); td.colSpan = kol.length; tr.appendChild(td); govde.appendChild(tr); return; }
      const tr = el('tr'), ta = el('td', 'ilk', 'TOPLAM (' + liste.length + ' kalem)'); ta.colSpan = cok ? 4 : 3; tr.appendChild(ta);
      const tt = el('td', 's', para(liste.reduce((a, s) => a + Number(s.tutar || 0), 0))); tt.setAttribute('data-et', 'Toplam'); tr.appendChild(tt); tr.appendChild(el('td', '')); tr.appendChild(el('td', '')); alt.appendChild(tr);
    }
    ara.addEventListener('input', ciz); ciz(); kok.appendChild(k);
  }

  // ---------- RAPOR: ALIMLAR (tek gün ya da dönem) ----------
  function cizAlimlar(r, kap) {
    const kok = el('div', 'rc'); kap.appendChild(kok);
    const S = r.satirlar || [], cok = r.donem_bas !== r.donem_bit, toplam = Number(r.ozet.toplam_tutar) || S.reduce((a, s) => a + Number(s.tutar || 0), 0);
    const gunler = {}, kalemler = {}; S.forEach(s => { gunler[s.tarih] = (gunler[s.tarih] || 0) + Number(s.tutar || 0); kalemler[s.tarih] = (kalemler[s.tarih] || 0) + 1; });
    const gunL = cok ? gunListesi(r.donem_bas, r.donem_bit, gunler, kalemler) : [], gr = gruplamaHazirla(S);
    ozet(kok, r, gunL); gostergeler(kok, r, gunL);
    if (cok && gunL.length > 1) gunlukKart(kok, gunL);
    const a = el('div', 'rc-izgara iki'); halkaKart(a, gr, toplam); kalemKart(a, S, gr, toplam); kok.appendChild(a);
    const b = el('div', 'rc-izgara'); if (cok && gunL.length >= 7 && gunL.length <= 62) isiKart(b, gunL); tedarikciKart(b, S, toplam);
    if (b.children.length) { if (b.children.length === 2) b.classList.add('iki'); kok.appendChild(b); }
    tabloKart(kok, S, cok, gr);
  }
  const CIZICILER = { alimlar: cizAlimlar };     // yeni rapor türleri buraya eklenir
  window.RaporCizim = { ciz: function (r, kap) { const c = CIZICILER[r && r.tur]; if (c) c(r, kap); else kap.appendChild(el('div', 'rc-kart', 'Bu rapor türü görüntülenemiyor.')); }, para: para, sayi: sayi, trTarih: trTarih };
})();
