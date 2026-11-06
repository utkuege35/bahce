// ===== RAPOR ÇİZİMİ (neon görünüm) =====
// RaporCizim.ciz(rapor, kapsayici): sunucudan gelen analiz raporu JSON'unu kapsayıcıya çizer (koyu / neon tema, SVG grafikler; stil: rapor/cizim.css).
// Uygulamadaki Analiz Raporları ekranı ve indirilen PDF / HTML dosyaları AYNI kodu kullanır.
// Güvenlik: tüm metinler yalnızca textContent ile yazılır; SVG özniteliklerine yalnızca sayı / renk yazılır; renkler ve ölçüler CSSOM ile verilir (satır içi stil özniteliği yok).
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const CY = '#22d3ee', MINT = '#34f5b0', BL = '#3b82f6', VI = '#8b5cf6', PK = '#f472b6', AMBER = '#fbbf24', LIME = '#a3e635', ROSE = '#fb7185', SOLUK = '#7f93c4', YAZI = '#eaf4ff', ZEMIN = '#050a1c';
  const PALET = [CY, BL, VI, PK, AMBER, MINT, LIME, '#fb923c', '#38bdf8', '#c084fc', '#2dd4bf', SOLUK];
  const SERI = [CY, PK, AMBER, MINT];
  const SINIF_RENK = { 'Yıldız': MINT, 'İş atı': AMBER, 'Bulmaca': CY, 'Zayıf': ROSE };
  const SINIF_ACIKLAMA = { 'Yıldız': 'popüler ve kârlı', 'İş atı': 'popüler, düşük kâr', 'Bulmaca': 'kârlı ama az satıyor', 'Zayıf': 'az satıyor, düşük kâr' };
  const GUN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'], GKISA = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  let uid = 0;

  // ---------- yardımcılar ----------
  function el(etiket, sinif, metin) { const e = document.createElement(etiket); if (sinif) e.className = sinif; if (metin !== undefined && metin !== null) e.textContent = metin; return e; }
  function sv(etiket, oz, metin) { const e = document.createElementNS(NS, etiket); for (const k in oz) e.setAttribute(k, oz[k]); if (metin !== undefined && metin !== null) e.textContent = metin; return e; }
  const para = n => '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sayi = n => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
  const TL0 = n => (Number(n) < 0 ? '-' : '') + '₺' + Math.abs(Math.round(Number(n || 0))).toLocaleString('tr-TR');
  const yz1 = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const kisa = n => { n = Number(n || 0); const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' Mn'; if (a >= 1e3) return (n / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + ' B'; return Math.round(n).toLocaleString('tr-TR'); };
  const trTarih = t => { const p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ''; };
  const tarihAd = t => { try { return new Date(t + 'T00:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' }); } catch (e) { return trTarih(t); } };
  const ayKisa = t => { try { return new Date(t + 'T00:00:00Z').toLocaleDateString('tr-TR', { month: 'short', timeZone: 'UTC' }).replace('.', ''); } catch (e) { return ''; } };
  const hGun = t => (new Date(t + 'T00:00:00Z').getUTCDay() + 6) % 7;                    // Pzt=0 … Paz=6
  const gunEkle = (t, n) => { const d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  function bic(b, v) {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v) + 0;                          // -0 → 0 ("%-0,0" görünmesin)
    switch (b) {
      case 'para': return TL0(n);
      case 'para2': return (n < 0 ? '-' : '') + para(Math.abs(n));
      case 'sayi': return Number.isFinite(n) ? n.toLocaleString('tr-TR', { maximumFractionDigits: 3 }) : String(v);
      case 'sayi1': return Number.isFinite(n) ? n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : String(v);
      case 'yuzde': return Number.isFinite(n) ? (n < 0 ? '-' : '') + '%' + Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : String(v);
      default: return String(v);
    }
  }
  const eksenFm = b => v => b === 'para' || b === 'para2' ? (v < 0 ? '-₺' : '₺') + kisa(Math.abs(v)) : b === 'yuzde' ? (v < 0 ? '-' : '') + '%' + Math.abs(Math.round(v)) : kisa(v);
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function karis(a, b, t) { a = hex(a); b = hex(b); t = Math.max(0, Math.min(1, t)); return '#' + [0, 1, 2].map(i => ('0' + Math.round(a[i] + (b[i] - a[i]) * t).toString(16)).slice(-2)).join(''); }
  function rampa(t) { return t < 0.5 ? karis('#3b4fa8', CY, t * 2) : karis(CY, MINT, (t - 0.5) * 2); }   // düşük: lacivert, orta: camgöbeği, yüksek: nane
  function guzelUst(max) { const p = Math.pow(10, Math.floor(Math.log10(max || 1))), n = (max || 1) / p, u = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10; return u * p; }
  function kart(baslik, kucuk) { const k = el('section', 'rc-kart'), h = el('h2'); h.appendChild(document.createTextNode(baslik)); if (kucuk) h.appendChild(el('small', '', kucuk)); k.appendChild(h); return k; }
  function oku() { return el('div', 'rc-oku'); }
  function yaz(o, parcalar) { o.replaceChildren(); parcalar.forEach(p => { const e = p[1] ? el('b', '', p[0]) : document.createTextNode(p[0]); if (p[2] && e.style) e.style.color = p[2]; o.appendChild(e); }); }
  function uyarla(kap, ciz) {     // kapsayıcı genişliği değişince yeniden çizer (telefon döndürme, pencere boyutu)
    let son = 0, t = null, ro = null;
    function yap() { if (!kap.isConnected) { if (ro) ro.disconnect(); return; } const w = Math.round(kap.clientWidth); if (w < 120 || w === son) return; son = w; ciz(w); }
    yap(); if (window.ResizeObserver) { ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(yap, 90); }); ro.observe(kap); }
  }
  function tanim(svg) {   // parlama süzgeçleri
    const d = sv('defs', {}), id = 'rcf' + (++uid);
    [['a', 3], ['b', 6]].forEach(a => {
      const f = sv('filter', { id: id + a[0], x: '-40%', y: '-40%', width: '180%', height: '180%' });
      f.appendChild(sv('feGaussianBlur', { stdDeviation: a[1], result: 'b' })); const m = sv('feMerge', {}); m.appendChild(sv('feMergeNode', { in: 'b' })); m.appendChild(sv('feMergeNode', { in: 'SourceGraphic' })); f.appendChild(m); d.appendChild(f);
    });
    svg.appendChild(d); return { d, hafif: 'url(#' + id + 'a)', guclu: 'url(#' + id + 'b)', id };
  }
  function degrade(d, id, yatay, aralik) { const g = sv('linearGradient', { id, x1: 0, y1: 0, x2: yatay ? 1 : 0, y2: yatay ? 0 : 1 }); aralik.forEach(a => g.appendChild(sv('stop', { offset: a[0], 'stop-color': a[1], 'stop-opacity': a[2] === undefined ? 1 : a[2] }))); d.appendChild(g); return 'url(#' + id + ')'; }
  function egri(P) {   // monoton kübik eğri (aşma yapmaz)
    const n = P.length; if (n < 2) return ''; const dx = [], m = [], t = []; let i;
    for (i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = (P[i + 1][1] - P[i][1]) / (dx[i] || 1); }
    t[0] = m[0]; t[n - 1] = m[n - 2]; for (i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; } else { const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b; if (s > 9) { const u = 3 / Math.sqrt(s); t[i] = u * a * m[i]; t[i + 1] = u * b * m[i]; } } }
    let d = 'M' + P[0][0].toFixed(1) + ',' + P[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ' C' + (P[i][0] + h).toFixed(1) + ',' + (P[i][1] + t[i] * h).toFixed(1) + ' ' + (P[i + 1][0] - h).toFixed(1) + ',' + (P[i + 1][1] - t[i + 1] * h).toFixed(1) + ' ' + P[i + 1][0].toFixed(1) + ',' + P[i + 1][1].toFixed(1); }
    return d;
  }
  function lejant(k, adlar, renkler) { const l = el('div', 'rc-leg'); adlar.forEach((a, i) => { const e = el('span'), n = el('i'); n.style.background = renkler[i % renkler.length]; n.style.boxShadow = '0 0 8px ' + renkler[i % renkler.length]; e.appendChild(n); e.appendChild(document.createTextNode(a)); l.appendChild(e); }); k.appendChild(l); }

  // ---------- üst özet (hero) ve göstergeler ----------
  function hero(kok, r) {
    const h = el('section', 'rc-hero'); h.appendChild(el('div', 'rc-etiket', 'Analiz raporu')); h.appendChild(el('div', 'rc-bas', r.baslik));
    const ab = el('div', 'rc-alt'); ab.appendChild(el('span', 'rc-donem', r.donem_bas === r.donem_bit ? trTarih(r.donem_bas) : `${trTarih(r.donem_bas)} – ${trTarih(r.donem_bit)}`)); h.appendChild(ab);
    if (r.aciklama) h.appendChild(el('div', 'rc-acik', r.aciklama)); kok.appendChild(h);
  }
  function halkaMini(v, c1, c2) {   // küçük yüzde halkası
    const s = sv('svg', { viewBox: '0 0 44 44', width: 44, height: 44, class: 'rc-mini-halka', 'aria-hidden': 'true' }), f = tanim(s), R = 17, C = 2 * Math.PI * R, g = degrade(f.d, f.id + 'g', true, [[0, c1], [1, c2]]);
    s.appendChild(sv('circle', { cx: 22, cy: 22, r: R, fill: 'none', stroke: 'rgba(120,160,255,.14)', 'stroke-width': 5 }));
    const a = sv('circle', { cx: 22, cy: 22, r: R, fill: 'none', stroke: g, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': (C * Math.max(0, Math.min(100, v)) / 100).toFixed(1) + ' ' + C.toFixed(1), transform: 'rotate(-90 22 22)', filter: f.hafif, class: 'rc-yay' }); a.style.setProperty('--c', C.toFixed(1)); s.appendChild(a); return s;
  }
  function kpiGoster(kok, kpi) {
    const g = el('div', 'rc-kpi n' + kpi.length), TON = { iyi: 1, kotu: 1, uyari: 1 };
    kpi.forEach(t => {
      const d = el('div', TON[t.ton] ? 't-' + t.ton : ''), m = bic(t.b, t.v), ust = el('div', 'rc-kpi-ust'), sol = el('div', 'rc-kpi-sol');
      sol.appendChild(el('div', 'rc-kpi-e', t.e)); sol.appendChild(el('div', 'rc-kpi-d' + (TON[t.ton] ? ' ' + t.ton : '') + (m.length > 11 ? ' u' : ''), m)); ust.appendChild(sol);
      const v = Number(t.v); if (t.b === 'yuzde' && t.v !== null && t.v !== undefined && t.v !== '' && Number.isFinite(v) && v >= 0 && v <= 100) ust.appendChild(halkaMini(v, t.ton === 'kotu' ? PK : CY, t.ton === 'kotu' ? ROSE : MINT));
      d.appendChild(ust); if (t.k) d.appendChild(el('div', 'rc-kpi-k', t.k)); g.appendChild(d);
    });
    kok.appendChild(g);
  }

  // ---------- günlük seri: parlayan dalga (çok nokta) ya da 3B sütunlar (az nokta) ----------
  function gunluk(kok, sp) {
    const fm = v => bic(sp.b, v), sinir = sp.sinir || 124;
    let veri = sp.x.map((d, i) => ({ t: String(d).slice(0, 10), v: Number(sp.v[i] || 0) })), tur = 'günlük';
    if (veri.length > sinir) {                 // çok uzun dönem: haftalara topla
      const h = {}; veri.forEach(x => { const b = gunEkle(x.t, -hGun(x.t)); h[b] = (h[b] || 0) + x.v; });
      veri = Object.keys(h).sort().map(b => ({ t: b, v: h[b], hafta: true })); tur = 'haftalık';
    }
    const n = veri.length; if (!n) return;
    const k = kart(sp.baslik, tur), o = oku(), gov = el('div', 'rc-gov'); k.appendChild(o); k.appendChild(gov); kok.appendChild(k);
    const V = veri.map(x => x.v), mx = Math.max(...V, 0), mxI = V.indexOf(mx), ort = V.reduce((a, b) => a + b, 0) / n, bosEt = sp.etiket || 'kayıt yok';
    const ad = i => veri[i].hafta ? trTarih(veri[i].t) + ' haftası' : tarihAd(veri[i].t);
    const varsayilan = () => yaz(o, [['En yüksek '], [ad(mxI), true, MINT], [' · ' + fm(mx)]]);
    const satirYaz = i => { const p = [[ad(i), true], [' · '], [fm(V[i]), true, CY]]; if (V[i] === 0) p.push([' · ' + bosEt]); else if ((sp.b === 'para' || sp.b === 'para2') && ort > 0) p.push([' · ortalamanın %' + Math.round(V[i] / ort * 100) + '\'i']); yaz(o, p); };
    if (n <= 14) {                              // az nokta: 3B sütunlar
      let sec = null;
      function ciz(W) {
        gov.replaceChildren(); const dar = W < 520, H = dar ? 220 : 250, ust = 30, alt = 34, taban = H - alt, slot = W / n, bw = Math.min(46, slot * 0.56), d = bw * 0.2, s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg' }), f = tanim(s), cub = [];
        s.appendChild(sv('ellipse', { cx: W / 2, cy: taban + 6, rx: W / 2 - 6, ry: 9, fill: 'rgba(60,100,220,.10)' }));
        veri.forEach((x, i) => {
          const t = mx > 0 ? x.v / mx : 0, cx = slot * (i + .5), hh = Math.max(x.v > 0 ? 6 : 2, (taban - ust) * t), y0 = taban - hh, c = rampa(.2 + .8 * t), ac = karis(c, '#ffffff', .35), kou = karis(c, '#0a1030', .45);
          const g = sv('g', { class: 'rc-cubuk', tabindex: 0, role: 'button', 'aria-label': ad(i) + ', ' + fm(x.v) }), govde = sv('g', { class: 'rc-govde' }); if (i === mxI) govde.setAttribute('filter', f.hafif);
          govde.appendChild(sv('rect', { x: cx - bw / 2, y: y0, width: bw / 2, height: hh, fill: degrade(f.d, f.id + 'L' + i, false, [[0, ac], [1, c]]) })); govde.appendChild(sv('rect', { x: cx, y: y0, width: bw / 2, height: hh, fill: degrade(f.d, f.id + 'R' + i, false, [[0, c], [1, kou]]) }));
          if (x.v > 0) govde.appendChild(sv('polygon', { points: `${cx - bw / 2},${y0} ${cx},${y0 - d} ${cx + bw / 2},${y0} ${cx},${y0 + d}`, fill: karis(c, '#ffffff', .6) }));
          g.appendChild(govde);
          if (i % Math.max(1, Math.ceil(n / 10)) === 0) g.appendChild(sv('text', { x: cx, y: H - 12, 'text-anchor': 'middle', class: 'rc-m' }, x.hafta ? x.t.slice(8) + '.' + x.t.slice(5, 7) : x.t.slice(8)));
          if (i === mxI && x.v > 0) g.appendChild(sv('text', { x: cx, y: y0 - d - 6, 'text-anchor': 'middle', class: 'rc-tt', fill: MINT }, eksenFm(sp.b)(x.v)));
          g.appendChild(sv('rect', { x: cx - slot / 2, y: 0, width: slot, height: H, fill: 'transparent' }));
          const sc = () => { cub.forEach(q => q.setAttribute('class', 'rc-cubuk' + (q === g ? ' ak' : ' sol'))); satirYaz(i); };
          g.addEventListener('mouseenter', sc); g.addEventListener('focus', sc); g.addEventListener('click', e => { e.stopPropagation(); sc(); }); s.appendChild(g); cub.push(g);
        });
        const bos = () => { cub.forEach(q => q.setAttribute('class', 'rc-cubuk')); varsayilan(); }; s.addEventListener('mouseleave', bos); s.addEventListener('click', bos); gov.appendChild(s); varsayilan();
      }
      uyarla(gov, ciz); return;
    }
    function ciz(W) {                           // çok nokta: parlayan dalga
      gov.replaceChildren(); const dar = W < 520, H = dar ? 200 : 250, sol = 4, sag = 4, ust = 30, alt = 26, tavan = (mx || 1) * 1.12;
      const px = i => sol + (W - sol - sag) * i / (n - 1), py = v => ust + (H - ust - alt) * (1 - v / tavan);
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg rc-dokun' }), f = tanim(s);
      const alan = degrade(f.d, f.id + 'ga', false, [[0, CY, .5], [.6, BL, .16], [1, BL, 0]]), cizgi = degrade(f.d, f.id + 'gl', true, [[0, BL], [.5, CY], [1, MINT]]);
      [0.33, 0.66, 1].forEach(a => { const y = py(tavan / 1.12 * a); s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: y, y2: y, stroke: 'rgba(120,160,255,.09)', 'stroke-dasharray': '2 5' })); s.appendChild(sv('text', { x: sol + 2, y: y - 4, class: 'rc-m' }, eksenFm(sp.b)(tavan / 1.12 * a))); });
      const P = V.map((v, i) => [px(i), py(v)]), yol = egri(P);
      s.appendChild(sv('path', { d: `${yol} L${px(n - 1).toFixed(1)},${H - alt} L${px(0).toFixed(1)},${H - alt} Z`, fill: alan, class: 'rc-alan' }));
      s.appendChild(sv('path', { d: yol, fill: 'none', stroke: cizgi, 'stroke-width': 2.4, 'stroke-linecap': 'round', filter: f.hafif, class: 'rc-cizgi', pathLength: 1 }));
      let son = '';
      for (let i = 0; i < n; i++) { const a = veri[i].t.slice(0, 7); if (i === 0 || a !== son) { son = a; const xx = px(i); s.appendChild(sv('line', { x1: xx, x2: xx, y1: H - alt, y2: H - alt + 5, stroke: 'rgba(120,160,255,.35)' })); s.appendChild(sv('text', { x: xx + 3, y: H - 8, class: 'rc-m' }, ayKisa(veri[i].t))); } }
      if (mx > 0) { const zi = sv('g', {}); zi.appendChild(sv('circle', { cx: P[mxI][0], cy: P[mxI][1], r: 11, fill: MINT, 'fill-opacity': .15, class: 'rc-nabiz' })); zi.appendChild(sv('circle', { cx: P[mxI][0], cy: P[mxI][1], r: 4.5, fill: MINT, filter: f.hafif })); zi.appendChild(sv('text', { x: Math.max(34, Math.min(W - 34, P[mxI][0])), y: P[mxI][1] - 15, 'text-anchor': 'middle', class: 'rc-tt', fill: MINT }, eksenFm(sp.b)(mx))); s.appendChild(zi); }
      const reh = sv('g', {}); reh.style.display = 'none'; reh.appendChild(sv('line', { y1: ust - 6, y2: H - alt, stroke: 'rgba(255,255,255,.35)', 'stroke-dasharray': '3 3' })); reh.appendChild(sv('circle', { r: 5.5, fill: YAZI, stroke: CY, 'stroke-width': 2.5, filter: f.hafif })); s.appendChild(reh);
      function sal(e) { const b = s.getBoundingClientRect(), x = (e.clientX - b.left) * (W / b.width), i = Math.max(0, Math.min(n - 1, Math.round((x - sol) / (W - sol - sag) * (n - 1)))); reh.style.display = ''; reh.setAttribute('transform', `translate(${px(i).toFixed(1)},0)`); reh.lastChild.setAttribute('cy', py(V[i]).toFixed(1)); satirYaz(i); }
      s.addEventListener('pointermove', sal); s.addEventListener('pointerdown', sal); s.addEventListener('pointerleave', () => { reh.style.display = 'none'; varsayilan(); });
      gov.appendChild(s); varsayilan();
    }
    uyarla(gov, ciz);
  }

  // ---------- gruplu sütun: iki / üç seri yan yana parlayan sütunlar ----------
  function gruplu(kok, sp) {
    const X = sp.x, S = sp.seriler, n = X.length, ns = S.length; if (!n || !ns) return;
    const k = kart(sp.baslik), o = oku(), gov = el('div', 'rc-gov'); k.appendChild(o); k.appendChild(gov); const fm = v => bic(sp.b, v); kok.appendChild(k);
    const RE = [[CY, BL], [MINT, '#10b981'], [PK, VI], [AMBER, '#f97316']];
    let son = n - 1; while (son > 0 && !Number(S[0].v[son])) son--;      // ilk serinin verisi olan son grubu seç
    let secili = son;
    function bilgi(j) { const p = [[X[j] + ' · ']]; S.forEach((se, i) => { if (i) p.push(['  ·  ']); p.push([se.ad + ' ']); p.push([fm(se.v[j]), true, RE[i % 4][0]]); }); yaz(o, p); }
    function ciz(W) {
      gov.replaceChildren(); const dar = W < 520, H = dar ? 240 : 280, sol = dar ? 44 : 52, sag = 6, ust = 14, alt = 30, iw = W - sol - sag, ih = H - ust - alt, slot = iw / n, gw = Math.min(slot * 0.8, 150), bw = Math.max(4, gw / ns - 3);
      const mx = Math.max(...S.flatMap(s => s.v.map(v => Number(v) || 0)), 1), tavan = guzelUst(mx), s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg' }), f = tanim(s), grup = [];
      for (let i = 0; i <= 3; i++) { const y = ust + ih - ih * i / 3; s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: y, y2: y, stroke: 'rgba(120,160,255,.09)', 'stroke-dasharray': '2 5' })); s.appendChild(sv('text', { x: sol - 6, y: y + 3, 'text-anchor': 'end', class: 'rc-m' }, eksenFm(sp.b)(tavan * i / 3))); }
      X.forEach((xe, j) => {
        const x0 = sol + slot * j + (slot - gw) / 2, g = sv('g', { class: 'rc-grup', tabindex: 0, role: 'button', 'aria-label': String(xe) }), govde = sv('g', { class: 'rc-govde' }); grup[j] = g;
        S.forEach((se, i) => { const v = Number(se.v[j]) || 0, h = Math.max(v > 0 ? 2 : 1, v / tavan * ih), c = RE[i % 4], gr = degrade(f.d, f.id + 'b' + j + '_' + i, false, [[0, c[0]], [1, c[1]]]);
          govde.appendChild(sv('rect', { x: (x0 + i * (bw + 3)).toFixed(1), y: (ust + ih - h).toFixed(1), width: bw.toFixed(1), height: h.toFixed(1), rx: Math.min(5, bw / 2).toFixed(1), fill: gr, filter: f.hafif })); });
        g.appendChild(govde); g.appendChild(sv('text', { x: (sol + slot * j + slot / 2).toFixed(1), y: H - 10, 'text-anchor': 'middle', class: 'rc-m' }, slot < 90 ? String(xe).split(' ')[0] : xe));
        g.appendChild(sv('rect', { x: (sol + slot * j).toFixed(1), y: 0, width: slot.toFixed(1), height: H, fill: 'transparent' }));
        const sc = () => { secili = j; grup.forEach((q, a) => q.setAttribute('class', 'rc-grup' + (a === j ? ' ak' : ' sol'))); bilgi(j); };
        g.addEventListener('mouseenter', sc); g.addEventListener('focus', sc); g.addEventListener('click', e => { e.stopPropagation(); sc(); }); s.appendChild(g);
      });
      gov.appendChild(s); bilgi(secili);
    }
    uyarla(gov, ciz); lejant(k, S.map(s => s.ad), RE.map(a => a[0]));
  }

  // ---------- çizgi: üst üste parlayan dalgalar ----------
  function cizgi(kok, sp) {
    const X = sp.x, S = sp.seriler.slice(0, 4), n = X.length; if (n < 2 || !S.length) return;
    const tum = S.flatMap(s => s.v.filter(v => v !== null && v !== undefined).map(Number)); if (!tum.length) return;
    const k = kart(sp.baslik), o = oku(), gov = el('div', 'rc-gov'); k.appendChild(o); k.appendChild(gov); kok.appendChild(k);
    const fm = v => v === null || v === undefined ? '—' : bic(sp.b, v);
    let sn = n - 1; while (sn > 0 && S.every(se => se.v[sn] === null || se.v[sn] === undefined)) sn--;
    const varsayilan = () => bilgiYaz(sn, false);
    function bilgiYaz(j) { const p = [[X[j] + ' · ', true]]; S.forEach((se, i) => { if (i) p.push(['  ·  ']); p.push([se.ad + ' ' + fm(se.v[j]), true, SERI[i]]); }); yaz(o, p); }
    function ciz(W) {
      gov.replaceChildren(); const dar = W < 520, H = dar ? 230 : 280, sol = 4, sag = 4, ust = 16, alt = 26, yuz = sp.b === 'yuzde', mn0 = yuz ? Math.min(...tum) : Math.min(0, ...tum), mx0 = yuz ? Math.max(...tum) : Math.max(...tum, 0), pay = yuz ? Math.max((mx0 - mn0) * 0.25, 0.5) : (mx0 - mn0 || 1) * 0.1, lo = yuz ? mn0 - pay : (mn0 < 0 ? mn0 - pay : 0), hi = mx0 + pay;
      const px = j => sol + (W - sol - sag) * (n === 1 ? 0.5 : j / (n - 1)), py = v => ust + (H - ust - alt) * (1 - (v - lo) / (hi - lo));
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg rc-dokun' }), f = tanim(s), ef = eksenFm(sp.b);
      for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3, y = py(v); s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: y, y2: y, stroke: 'rgba(120,160,255,.09)', 'stroke-dasharray': '2 5' })); s.appendChild(sv('text', { x: sol + 2, y: y - 4, class: 'rc-m' }, ef(v))); }
      if (lo < 0) s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: py(0), y2: py(0), stroke: 'rgba(255,255,255,.28)', 'stroke-width': 1 }));
      const adim = Math.max(1, Math.ceil(n / (dar ? 6 : 11))); X.forEach((xe, j) => { if (j % adim === 0) s.appendChild(sv('text', { x: px(j).toFixed(1), y: H - 8, 'text-anchor': j === 0 ? 'start' : j === n - 1 ? 'end' : 'middle', class: 'rc-m' }, dar && String(xe).length > 8 ? String(xe).split(' ')[0] : xe)); });
      const zero = Math.max(0, py(Math.max(lo, 0)));
      S.forEach((se, i) => {
        const c = SERI[i], pts = se.v.map((v, j) => v === null || v === undefined ? null : [px(j), py(Number(v)), Number(v)]); let seg = []; const parcalar = [];
        pts.forEach(p => { if (p) seg.push(p); else { if (seg.length) parcalar.push(seg); seg = []; } }); if (seg.length) parcalar.push(seg);
        const al = degrade(f.d, f.id + 'ga' + i, false, [[0, c, .26], [.7, c, .04], [1, c, 0]]), ln = degrade(f.d, f.id + 'gl' + i, true, [[0, karis(c, '#ffffff', .1)], [1, c]]);
        parcalar.forEach(sg => { if (sg.length < 2) { s.appendChild(sv('circle', { cx: sg[0][0], cy: sg[0][1], r: 4, fill: c, filter: f.hafif })); return; } const yol = egri(sg.map(p => [p[0], p[1]]));
          if (S.length <= 2 && !yuz) s.appendChild(sv('path', { d: `${yol} L${sg[sg.length - 1][0].toFixed(1)},${zero} L${sg[0][0].toFixed(1)},${zero} Z`, fill: al, class: 'rc-alan' }));
          s.appendChild(sv('path', { d: yol, fill: 'none', stroke: ln, 'stroke-width': 2.3, 'stroke-linecap': 'round', filter: f.hafif, class: 'rc-cizgi', pathLength: 1 })); });
        if (n <= 14) pts.forEach(p => { if (p) s.appendChild(sv('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 3.6, fill: ZEMIN, stroke: c, 'stroke-width': 2 })); });
      });
      const reh = sv('g', {}); reh.style.display = 'none'; reh.appendChild(sv('line', { y1: ust - 4, y2: H - alt, stroke: 'rgba(255,255,255,.35)', 'stroke-dasharray': '3 3' })); const dots = S.map((_, i) => { const d = sv('circle', { r: 5, fill: YAZI, stroke: SERI[i], 'stroke-width': 2.4 }); reh.appendChild(d); return d; }); s.appendChild(reh);
      function sal(e) { const b = s.getBoundingClientRect(), x = (e.clientX - b.left) * (W / b.width), j = Math.max(0, Math.min(n - 1, Math.round((x - sol) / (W - sol - sag) * (n - 1)))); reh.style.display = ''; reh.setAttribute('transform', `translate(${px(j).toFixed(1)},0)`); S.forEach((se, i) => { const v = se.v[j]; dots[i].style.display = v === null || v === undefined ? 'none' : ''; if (v !== null && v !== undefined) dots[i].setAttribute('cy', py(Number(v)).toFixed(1)); }); bilgiYaz(j); }
      s.addEventListener('pointermove', sal); s.addEventListener('pointerdown', sal); s.addEventListener('pointerleave', () => { reh.style.display = 'none'; varsayilan(); });
      gov.appendChild(s); varsayilan();
    }
    uyarla(gov, ciz); lejant(k, S.map(s => s.ad), SERI);
  }

  // ---------- takvim: ışıklı nokta matrisi + en yoğun 5 gün ----------
  function takvim(kok, sp) {
    const X = sp.x.map(d => String(d).slice(0, 10)), V = sp.v.map(v => Number(v || 0)), n = V.length; if (n < 2) return;
    const fm = v => bic(sp.b, v), mx = Math.max(...V, 0) || 1, ort = V.reduce((a, b) => a + b, 0) / n, off = hGun(X[0]), hafta = Math.ceil((n + off) / 7), esik = V.slice().sort((a, b) => b - a)[Math.max(0, Math.floor(n * 0.08))];
    const k = kart(sp.baslik, 'parlak = yoğun gün'), o = oku(), duzen = el('div', 'rc-iki-duzen'), mat = el('div', 'rc-mat'), yan = el('div', 'rc-yan'); duzen.appendChild(mat); duzen.appendChild(yan); k.appendChild(o); k.appendChild(duzen); kok.appendChild(k);
    let noktalar = []; const mxI = V.indexOf(Math.max(...V));
    const varsayilan = () => yaz(o, [['En parlak gün '], [tarihAd(X[mxI]), true, MINT], [' · ' + fm(mx) + ' · günlük ortalama ' + fm(ort)]]);
    const sec = j => { noktalar.forEach(q => q.setAttribute('class', 'rc-nokta')); if (noktalar[j]) noktalar[j].setAttribute('class', 'rc-nokta ak'); const p = [[tarihAd(X[j]), true], [' · '], [fm(V[j]), true, CY]]; if (V[j] === 0) p.push([' · ' + (sp.etiket || 'kayıt yok')]); else if (sp.b === 'para' && ort > 0) p.push([' · ortalamanın %' + Math.round(V[j] / ort * 100) + '\'i']); yaz(o, p); };
    const bos = () => { noktalar.forEach(q => q.setAttribute('class', 'rc-nokta')); varsayilan(); };
    yan.appendChild(el('div', 'rc-yan-b', 'En yoğun 5 gün'));
    V.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 5).forEach(q => {
      const sat = el('div', 'rc-top'), iz = el('div', 'rc-top-iz'), dg = el('div', 'rc-top-dg'); dg.style.width = (q[0] / mx * 100).toFixed(1) + '%'; iz.appendChild(dg);
      sat.appendChild(el('div', 'rc-top-ad', tarihAd(X[q[1]]))); sat.appendChild(el('div', 'rc-top-d', eksenFm(sp.b)(q[0]))); sat.appendChild(iz); sat.addEventListener('mouseenter', () => sec(q[1])); sat.addEventListener('mouseleave', bos); yan.appendChild(sat);
    });
    function ciz(W) {
      mat.replaceChildren(); noktalar = []; const sol = 30, ust = 22, hucre = Math.max(11, Math.min(40, (W - sol - 4) / hafta)), GW = Math.round(sol + hafta * hucre + 4), H = Math.round(ust + 7 * hucre + 6);
      const s = sv('svg', { viewBox: `0 0 ${GW} ${H}`, width: GW, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg rc-sabit' }), f = tanim(s);
      GKISA.forEach((g, i) => { if (hucre >= 14 || i % 2 === 0) s.appendChild(sv('text', { x: sol - 6, y: ust + i * hucre + hucre / 2 + 3.5, 'text-anchor': 'end', class: 'rc-m' }, g)); });
      const par = sv('g', { filter: f.hafif }), sonuk = sv('g', {}); s.appendChild(sonuk); s.appendChild(par);
      for (let i = 0; i < n; i++) {
        const idx = i + off, col = Math.floor(idx / 7), row = idx % 7, cx = sol + col * hucre + hucre / 2, cy = ust + row * hucre + hucre / 2, tt = V[i] / mx, rr = hucre * 0.5 * (0.34 + 0.56 * tt);
        if (X[i].slice(8) === '01' || i === 0) s.appendChild(sv('text', { x: cx - hucre / 2 + 2, y: 12, class: 'rc-m' }, ayKisa(X[i])));
        const nk = sv('circle', { cx, cy, r: rr.toFixed(1), fill: V[i] > 0 ? rampa(tt) : '#26335f', 'fill-opacity': (0.55 + 0.45 * tt).toFixed(2), class: 'rc-nokta', tabindex: 0, role: 'button', 'aria-label': tarihAd(X[i]) + ', ' + fm(V[i]) }); nk.style.setProperty('--i', i);
        (V[i] >= esik && V[i] > 0 ? par : sonuk).appendChild(nk); noktalar.push(nk);
        nk.addEventListener('mouseenter', () => sec(i)); nk.addEventListener('focus', () => sec(i)); nk.addEventListener('click', e => { e.stopPropagation(); sec(i); });
      }
      s.addEventListener('mouseleave', bos); mat.appendChild(s); varsayilan();
    }
    uyarla(mat, ciz);
  }

  // ---------- sıralı liste (yatay çubuk) ----------
  function haftaGunleri(sp) { const ad = sp.satirlar.map(x => x.ad); return sp.satirlar.length >= 5 && sp.satirlar.length <= 7 && ad.every(a => GUN.indexOf(a) >= 0); }
  function hafta3d(kok, sp) {
    const map = {}; sp.satirlar.forEach(x => { map[x.ad] = x; }); const D = GUN.map((g, i) => { const x = map[g]; return { ad: g, kisa: GKISA[i], v: x ? Number(x.v) : 0, ek: x ? x.ek : '' }; }), mx = Math.max(...D.map(d => d.v), 0); if (mx <= 0) return;
    const enI = D.reduce((a, d, i) => d.v > D[a].v ? i : a, 0), fm = v => bic(sp.b, v), k = kart(sp.baslik), o = oku(), gov = el('div', 'rc-gov'); k.appendChild(o); k.appendChild(gov); kok.appendChild(k);
    const varsayilan = () => yaz(o, [['En güçlü gün '], [D[enI].ad, true, MINT], [' · ' + fm(D[enI].v)]]);
    function ciz(W) {
      gov.replaceChildren(); const dar = W < 520, H = dar ? 220 : 250, ust = 34, alt = 40, taban = H - alt, slot = W / 7, bw = Math.min(44, slot * 0.54), d = bw * 0.2, s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg' }), f = tanim(s), cub = [];
      s.appendChild(sv('ellipse', { cx: W / 2, cy: taban + 6, rx: W / 2 - 6, ry: 9, fill: 'rgba(60,100,220,.10)' }));
      D.forEach((x, i) => {
        const t = x.v / mx, cx = slot * (i + .5), hh = Math.max(6, (taban - ust) * t), y0 = taban - hh, c = rampa(.2 + .8 * t), g = sv('g', { class: 'rc-cubuk', tabindex: 0, role: 'button', 'aria-label': x.ad + ', ' + fm(x.v) }), govde = sv('g', { class: 'rc-govde' }); if (i === enI) govde.setAttribute('filter', f.hafif);
        govde.appendChild(sv('rect', { x: cx - bw / 2, y: y0, width: bw / 2, height: hh, fill: degrade(f.d, f.id + 'L' + i, false, [[0, karis(c, '#ffffff', .35)], [1, c]]) })); govde.appendChild(sv('rect', { x: cx, y: y0, width: bw / 2, height: hh, fill: degrade(f.d, f.id + 'R' + i, false, [[0, c], [1, karis(c, '#0a1030', .45)]]) }));
        govde.appendChild(sv('polygon', { points: `${cx - bw / 2},${y0} ${cx},${y0 - d} ${cx + bw / 2},${y0} ${cx},${y0 + d}`, fill: karis(c, '#ffffff', .6) })); g.appendChild(govde);
        g.appendChild(sv('text', { x: cx, y: H - 14, 'text-anchor': 'middle', class: 'rc-m' }, x.kisa)); if (i === enI || !dar) g.appendChild(sv('text', { x: cx, y: y0 - d - 6, 'text-anchor': 'middle', class: 'rc-tt', fill: i === enI ? MINT : SOLUK }, eksenFm(sp.b)(x.v)));
        g.appendChild(sv('rect', { x: cx - slot / 2, y: 0, width: slot, height: H, fill: 'transparent' }));
        const sc = () => { cub.forEach(q => q.setAttribute('class', 'rc-cubuk' + (q === g ? ' ak' : ' sol'))); yaz(o, [[x.ad, true], [' · ' + fm(x.v), true, CY], [x.ek ? ' · ' + x.ek : '']]); };
        g.addEventListener('mouseenter', sc); g.addEventListener('focus', sc); g.addEventListener('click', e => { e.stopPropagation(); sc(); }); s.appendChild(g); cub.push(g);
      });
      const bos = () => { cub.forEach(q => q.setAttribute('class', 'rc-cubuk')); varsayilan(); }; s.addEventListener('mouseleave', bos); s.addEventListener('click', bos); gov.appendChild(s); varsayilan();
    }
    uyarla(gov, ciz);
  }
  function sira(ust, sp) {
    if (haftaGunleri(sp)) return hafta3d(ust, sp);
    const L = sp.satirlar, k = kart(sp.baslik), mx = Math.max(...L.map(x => Math.abs(Number(x.v))), 1e-9), kirmizi = sp.renk === 'kirmizi', c1 = kirmizi ? PK : CY, c2 = kirmizi ? ROSE : MINT;
    L.forEach((x, i) => {
      const r = el('div', 'rc-sira'), orta = el('div', 'rc-orta'), yol = el('div', 'rc-yol'), d = el('div', 'rc-dolgu'), tt = el('div', 'rc-tut', bic(sp.b, x.v));
      r.appendChild(el('div', 'rc-no' + (i === 0 ? ' bir' : ''), String(i + 1))); orta.appendChild(el('div', 'rc-ad', x.ad));
      d.style.width = Math.max(2, Math.abs(Number(x.v)) / mx * 100) + '%'; d.style.background = `linear-gradient(90deg,${karis(c1, '#0a1030', .45)},${c1} 60%,${c2})`; d.style.setProperty('--i', i); d.style.setProperty('--g', c2); yol.appendChild(d); orta.appendChild(yol); r.appendChild(orta);
      if (x.ek) tt.appendChild(el('small', '', x.ek)); r.appendChild(tt); k.appendChild(r);
    });
    ust.appendChild(k);
  }

  // ---------- halka: ışıltılı halka + liste ----------
  function halka(ust, sp) {
    const L = sp.dilimler.map(d => ({ ad: d.ad, v: Number(d.v) })).filter(d => d.v > 0); if (!L.length) return;
    const toplam = L.reduce((a, g) => a + g.v, 0), fm = v => sp.b === 'para' ? '₺' + kisa(v) : bic(sp.b, v), k = kart(sp.baslik, L.length + ' dilim'), o = oku(), duzen = el('div', 'rc-halka'), sol = el('div', 'rc-halka-sol'), lej = el('div', 'rc-lej'); k.appendChild(o);
    duzen.appendChild(sol); duzen.appendChild(lej); k.appendChild(duzen); ust.appendChild(k);
    const s = sv('svg', { viewBox: '0 0 180 180', width: 180, height: 180, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg rc-halka-svg' }), f = tanim(s), R = 66, C = 2 * Math.PI * R, dil = [], satirlar = []; let ac = 0;
    s.appendChild(sv('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: 'rgba(120,160,255,.10)', 'stroke-width': 18 }));
    L.forEach((g, i) => {
      const c = PALET[i % PALET.length], oran = g.v / toplam, uz = Math.max(C * oran - 3, 0.6), d = sv('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: c, 'stroke-width': 18, 'stroke-dasharray': `${uz.toFixed(2)} ${(C - uz).toFixed(2)}`, 'stroke-dashoffset': (-ac).toFixed(2), transform: 'rotate(-90 90 90)', class: 'rc-dilim', filter: f.hafif }); d.style.setProperty('--i', i);
      ac += C * oran; s.appendChild(d); dil.push(d);
    });
    const mt = sv('text', { x: 90, y: 88, 'text-anchor': 'middle', class: 'rc-halka-t' }, fm(toplam)); s.appendChild(mt); s.appendChild(sv('text', { x: 90, y: 106, 'text-anchor': 'middle', class: 'rc-m' }, 'toplam')); sol.appendChild(s);
    const varsayilan = () => { dil.forEach(d => d.setAttribute('class', 'rc-dilim')); satirlar.forEach(r => r.classList.remove('sol', 'ak')); yaz(o, [['Toplam '], [fm(toplam), true], [' · en büyük dilim '], [L[0].ad, true, CY], [' %' + yz1(L[0].v / toplam * 100)]]); };
    const sec = i => { dil.forEach((d, j) => d.setAttribute('class', 'rc-dilim' + (j === i ? ' ak' : ' sol'))); satirlar.forEach((r, j) => { r.classList.toggle('ak', j === i); r.classList.toggle('sol', j !== i); }); yaz(o, [[L[i].ad, true, PALET[i % PALET.length]], [' · '], [fm(L[i].v), true], [' · %' + yz1(L[i].v / toplam * 100) + ' pay']]); };
    L.forEach((g, i) => {
      const r = el('div', 'rc-lej-s'), nk = el('i'); nk.style.background = PALET[i % PALET.length]; nk.style.boxShadow = '0 0 8px ' + PALET[i % PALET.length];
      r.appendChild(nk); r.appendChild(el('span', 'rc-lej-ad', g.ad)); r.appendChild(el('b', 'rc-lej-pay', '%' + yz1(g.v / toplam * 100))); r.appendChild(el('span', 'rc-lej-v', fm(g.v)));
      r.tabIndex = 0; r.addEventListener('mouseenter', () => sec(i)); r.addEventListener('focus', () => sec(i)); r.addEventListener('mouseleave', varsayilan); r.addEventListener('blur', varsayilan); lej.appendChild(r); satirlar.push(r);
      dil[i].addEventListener('mouseenter', () => sec(i)); dil[i].addEventListener('click', e => { e.stopPropagation(); sec(i); }); dil[i].addEventListener('mouseleave', varsayilan);
    });
    varsayilan();
  }

  // ---------- sapma: iki yöne parlayan çubuklar ----------
  function sapma(ust, sp) {
    const L = sp.satirlar, k = kart(sp.baslik), mx = Math.max(...L.map(x => Math.abs(Number(x.v))), 1e-9), kotuArtis = sp.iyi_yon === 'azalis', notr = sp.iyi_yon === 'notr';
    L.forEach((x, i) => {
      const v = Number(x.v), kotu = v === 0 ? null : (kotuArtis ? v > 0 : v < 0), renk = v === 0 ? SOLUK : notr ? (v > 0 ? BL : AMBER) : kotu ? ROSE : MINT, w = Math.abs(v) / mx * 50;   // "notr": artış/azalış iyi ya da kötü değildir (örn. stok değeri)
      const s = el('div', 'rc-sap-s'), ad = el('div'), iz = el('div', 'rc-sap-iz'), b = el('div', 'rc-sap-b'), dg = el('div', 'rc-tut', (v > 0 ? '+' : '') + bic(sp.b, v));
      ad.appendChild(el('div', 'rc-ad', x.ad)); if (x.ek) ad.appendChild(el('div', 'rc-sap-ek', x.ek)); dg.style.color = renk;
      b.style.width = Math.max(w, v === 0 ? 0 : 1.5) + '%'; b.style.left = (v >= 0 ? 50 : 50 - Math.max(w, 1.5)) + '%'; b.style.background = `linear-gradient(${v >= 0 ? 90 : 270}deg,${karis(renk, '#0a1030', .5)},${renk})`; b.style.boxShadow = `0 0 12px ${renk}88`; b.style.transformOrigin = v >= 0 ? 'left' : 'right'; b.style.setProperty('--i', i);
      iz.appendChild(b); s.appendChild(ad); s.appendChild(dg); s.appendChild(iz); k.appendChild(s);
    });
    ust.appendChild(k);
  }

  // ---------- gruplu: menü mühendisliği (popülerlik × porsiyon kârı) ----------
  function dortlu(kok, sp) {
    const N = sp.noktalar, k = kart(sp.baslik, N.length + ' ürün'), o = oku(), gov = el('div', 'rc-gov'); k.appendChild(o); k.appendChild(gov); kok.appendChild(k);
    const oz = N.slice().sort((a, b) => b.x - a.x).slice(0, 2).concat(N.slice().sort((a, b) => b.y - a.y).slice(0, 2), N.slice().sort((a, b) => a.y - b.y).slice(0, 1)), etiket = new Set(oz.map(p => p.ad));
    let secili = N.reduce((m, p, i) => (p.x * p.y > N[m].x * N[m].y ? i : m), 0), nokta = [];
    const bilgi = i => { const p = N[i]; nokta.forEach((c, j) => c.classList.toggle('ak', j === i)); yaz(o, [[p.ad, true], [` · ${sayi(p.x)} adet · porsiyon başına ₺${sayi(p.y)} kâr · `], [p.sinif, true, SINIF_RENK[p.sinif]]]); };
    function ciz(W) {
      gov.replaceChildren(); nokta = []; const dar = W < 520, H = dar ? 320 : 380, sol = 52, sag = 12, ust = 14, alt = 44, iw = W - sol - sag, ih = H - ust - alt;
      const xmax = guzelUst(Math.max(...N.map(p => Number(p.x)), Number(sp.x_esik)) * 1.08), ys = N.map(p => Number(p.y)), ymin = Math.min(0, ...ys) < 0 ? Math.floor(Math.min(...ys) * 1.1) : 0, ymax = guzelUst(Math.max(...ys, Number(sp.y_esik)) * 1.08);
      const px = v => sol + v / xmax * iw, py = v => ust + ih - (v - ymin) / (ymax - ymin) * ih, ex = px(Number(sp.x_esik)), ey = py(Number(sp.y_esik)), s = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': sp.baslik, class: 'rc-svg' }), f = tanim(s);
      [['Yıldız', ex, ust, sol + iw - ex, ey - ust], ['İş atı', ex, ey, sol + iw - ex, ust + ih - ey], ['Bulmaca', sol, ust, ex - sol, ey - ust], ['Zayıf', sol, ey, ex - sol, ust + ih - ey]].forEach(([c, x, y, w, h], i) => {
        if (w > 0 && h > 0) s.appendChild(sv('rect', { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1), rx: 8, fill: degrade(f.d, f.id + 'q' + i, false, [[0, SINIF_RENK[c], .13], [1, SINIF_RENK[c], .02]]) })); });
      s.appendChild(sv('line', { x1: ex, x2: ex, y1: ust, y2: ust + ih, stroke: 'rgba(255,255,255,.4)', 'stroke-dasharray': '4 4' })); s.appendChild(sv('line', { x1: sol, x2: sol + iw, y1: ey, y2: ey, stroke: 'rgba(255,255,255,.4)', 'stroke-dasharray': '4 4' }));
      for (let i = 0; i <= 4; i++) { s.appendChild(sv('text', { x: (sol + iw * i / 4).toFixed(1), y: ust + ih + 14, 'text-anchor': 'middle', class: 'rc-m' }, kisa(xmax * i / 4))); s.appendChild(sv('text', { x: sol - 6, y: (py(ymin + (ymax - ymin) * i / 4) + 3).toFixed(1), 'text-anchor': 'end', class: 'rc-m' }, kisa(ymin + (ymax - ymin) * i / 4))); }
      s.appendChild(sv('text', { x: (sol + iw / 2).toFixed(1), y: H - 6, 'text-anchor': 'middle', class: 'rc-m' }, sp.x_ad)); s.appendChild(sv('text', { x: 12, y: (ust + ih / 2).toFixed(1), 'text-anchor': 'middle', class: 'rc-m', transform: `rotate(-90 12 ${(ust + ih / 2).toFixed(1)})` }, sp.y_ad));
      [['Yıldız', sol + iw - 8, ust + 16, 'end'], ['Bulmaca', sol + 8, ust + 16, 'start'], ['İş atı', sol + iw - 8, ust + ih - 10, 'end'], ['Zayıf', sol + 8, ust + ih - 10, 'start']].forEach(([c, x, y, a]) => s.appendChild(sv('text', { x, y, 'text-anchor': a, class: 'rc-tt', fill: SINIF_RENK[c] }, c.toUpperCase())));
      const par = sv('g', { filter: f.hafif }); s.appendChild(par);
      N.forEach((p, i) => {
        const cx = px(Number(p.x)), cy = py(Number(p.y)), c = sv('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 6.5, fill: SINIF_RENK[p.sinif] || SOLUK, 'fill-opacity': '.9', class: 'rc-bal', tabindex: 0, role: 'button', 'aria-label': `${p.ad}: ${sayi(p.x)} adet, ${sayi(p.y)} lira kâr` });
        c.addEventListener('mouseenter', () => bilgi(i)); c.addEventListener('focus', () => bilgi(i)); c.addEventListener('click', e => { e.stopPropagation(); secili = i; bilgi(i); }); par.appendChild(c); nokta.push(c);
        if (etiket.has(p.ad)) s.appendChild(sv('text', { x: (cx + (cx > sol + iw - 90 ? -10 : 10)).toFixed(1), y: (cy + 3).toFixed(1), 'text-anchor': cx > sol + iw - 90 ? 'end' : 'start', class: 'rc-t' }, p.ad));
      });
      gov.appendChild(s); bilgi(secili);
    }
    uyarla(gov, ciz); const l = el('div', 'rc-leg'); ['Yıldız', 'İş atı', 'Bulmaca', 'Zayıf'].forEach(c => { const e = el('span'), n = el('i'); n.style.background = SINIF_RENK[c]; n.style.boxShadow = '0 0 8px ' + SINIF_RENK[c]; e.appendChild(n); e.appendChild(document.createTextNode(`${c} (${N.filter(p => p.sinif === c).length}) · ${SINIF_ACIKLAMA[c]}`)); l.appendChild(e); }); k.appendChild(l);
  }

  // ---------- tablo ----------
  function tablo(kok, sp) {
    const K = sp.kolonlar, R0 = sp.satirlar, lim = sp.limit || 200, k = kart(sp.baslik, R0.length + ' satır');
    let ara = null; if (sp.arama) { ara = el('input', 'rc-arama'); ara.type = 'search'; ara.placeholder = 'Ara…'; ara.setAttribute('aria-label', 'Tabloda ara'); k.appendChild(ara); }
    const sar = el('div', 'rc-tablo-sar'), tb = el('table', 'rc-tablo'), bas = el('thead'), hr = el('tr'), govde = el('tbody'); sar.appendChild(tb); k.appendChild(sar);
    let sk = -1, yon = 1; const ths = [];
    K.forEach((c, i) => { const th = el('th', 'sirala' + (c.b === 'metin' && !c.sag ? '' : ' s'), c.ad); th.addEventListener('click', () => { if (sk === i) yon = -yon; else { sk = i; yon = c.b === 'metin' ? 1 : -1; } ths.forEach((t, j) => t.classList.toggle('aktif', j === sk)); ths.forEach((t, j) => { t.dataset.yon = j === sk ? (yon > 0 ? '▲' : '▼') : ''; }); ciz(); }); ths.push(th); hr.appendChild(th); });
    bas.appendChild(hr); tb.appendChild(bas); tb.appendChild(govde);
    function ciz() {
      const q = ara ? ara.value.trim().toLocaleLowerCase('tr') : ''; let R = R0.filter(r => !q || r.some((v, i) => K[i].b === 'metin' && String(v == null ? '' : v).toLocaleLowerCase('tr').includes(q)));
      if (sk >= 0) R = R.slice().sort((a, b) => { const x = a[sk], y = b[sk]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'tr')) * yon; });
      govde.replaceChildren(); R.slice(0, lim).forEach(r => { const tr = el('tr'); r.forEach((v, i) => { const c = K[i], td = el('td', (i === 0 ? 'ilk' : '') + (c.b === 'metin' && !c.sag ? '' : ' s'), bic(c.b, v)); td.setAttribute('data-et', c.ad);
        if (c.ton === 'fark' && v != null) { const e = Number(c.esik || 5); if (Number(v) > e) td.classList.add('kotu'); else if (Number(v) < -e) td.classList.add('uyari'); } tr.appendChild(td); }); govde.appendChild(tr); });
      if (!R.length) { const tr = el('tr'), td = el('td', 'ilk', 'Eşleşen kayıt yok.'); td.colSpan = K.length; tr.appendChild(td); govde.appendChild(tr); }
      else if (R.length > lim) { const tr = el('tr'), td = el('td', 'ilk', `İlk ${lim} satır gösteriliyor (${R.length}). Aramayla daraltın.`); td.colSpan = K.length; tr.appendChild(td); govde.appendChild(tr); }
    }
    if (ara) ara.addEventListener('input', ciz); ciz(); kok.appendChild(k);
  }

  // ---------- sınıflar (menü mühendisliği kartları) ----------
  function siniflar(kok, sp) {
    const k = kart(sp.baslik), g = el('div', 'rc-sinif-izgara');
    sp.siniflar.forEach(s => {
      const c = el('div', 'rc-sinif'), ad = el('div', 'rc-sinif-ad'), renk = SINIF_RENK[s.ad] || SOLUK;
      c.style.setProperty('--sc', renk); ad.appendChild(document.createTextNode(s.ad)); ad.appendChild(el('span', 'rc-sinif-n', String(s.adet_urun) + ' ürün')); c.appendChild(ad);
      c.appendChild(el('div', 'rc-sinif-ac', s.aciklama));
      const st = el('div', 'rc-sinif-st'); st.appendChild(el('span', '', 'Ciro payı ')); st.appendChild(el('b', '', bic('yuzde', s.ciro_pay))); st.appendChild(el('span', '', '  ·  Kâr payı ')); st.appendChild(el('b', '', bic('yuzde', s.kar_pay))); c.appendChild(st);
      const ch = el('div', 'rc-sinif-ch'), L = s.urunler || [];
      L.slice(0, 12).forEach(u => ch.appendChild(el('span', 'rc-chip', u))); if (L.length > 12) ch.appendChild(el('span', 'rc-chip son', '+' + (L.length - 12) + ' ürün')); if (!L.length) ch.appendChild(el('span', 'rc-chip son', 'ürün yok')); c.appendChild(ch);
      c.appendChild(el('div', 'rc-sinif-on', s.oneri)); g.appendChild(c);
    });
    k.appendChild(g); kok.appendChild(k);
  }

  // ---------- karşılaştırma özeti ----------
  const karsDegisim = (v1, v2) => { const a = Number(v1) || 0, b = Number(v2) || 0; return a > 0 ? (b / a - 1) * 100 : null; };
  const karsEtiket = d => d === null ? '—' : (d >= 0 ? '▲ ' : '▼ ') + bic('yuzde', Math.abs(d));
  const karsTon = (d, iyi) => d === null || d === 0 ? '' : ((d > 0) === (iyi !== 'azalis') ? 'iyi' : 'kotu');
  function karsilastirma(kok, sp) {
    const k = kart(sp.baslik), L = sp.satirlar, E = sp.etiketler || ['1', '2'], a = L[0], d0 = karsDegisim(a.v1, a.v2);
    const hr = el('div', 'rc-kars-hero'), yzd = el('div', 'rc-kars-yuzde ' + karsTon(d0, sp.iyi_yon), karsEtiket(d0)), alt = el('div', 'rc-kars-alt');
    alt.appendChild(el('div', '', a.ad + ' · ' + E[0] + ' → ' + E[1])); const fark = (Number(a.v2) || 0) - (Number(a.v1) || 0); alt.appendChild(el('div', 'rc-kars-fark', (fark >= 0 ? '+' : '-') + bic(a.b, Math.abs(fark))));
    hr.appendChild(yzd); hr.appendChild(alt); k.appendChild(hr);
    L.forEach(s => {
      const mx = Math.max(Number(s.v1) || 0, Number(s.v2) || 0, 1e-9), d = karsDegisim(s.v1, s.v2), r = el('div', 'rc-kars-satir'), ust = el('div', 'rc-kars-ad');
      ust.appendChild(el('span', '', s.ad)); ust.appendChild(el('span', 'rc-kars-rozet ' + karsTon(d, sp.iyi_yon), karsEtiket(d))); r.appendChild(ust);
      [[s.v1, E[0], BL, CY], [s.v2, E[1], MINT, LIME]].forEach(([v, et, c1, c2], i) => {
        const b = el('div', 'rc-kars-b'), iz = el('div', 'rc-kars-iz'), dg = el('div', 'rc-kars-dolgu');
        dg.style.width = Math.max(((Number(v) || 0) / mx) * 100, (Number(v) || 0) > 0 ? 2 : 0) + '%'; dg.style.background = `linear-gradient(90deg,${karis(c1, '#0a1030', .4)},${c1},${c2})`; dg.style.boxShadow = `0 0 12px ${c1}88`; dg.style.setProperty('--i', i); iz.appendChild(dg);
        b.appendChild(el('span', 'rc-kars-et', et)); b.appendChild(iz); b.appendChild(el('b', 'rc-kars-v', v === null || v === undefined ? '—' : bic(s.b, v))); r.appendChild(b);
      });
      k.appendChild(r);
    });
    kok.appendChild(k);
  }

  // ---------- rapor ----------
  const bosBolum = sp => !sp || !((sp.satirlar || sp.noktalar || sp.dilimler || sp.siniflar || sp.x || []).length);
  const GENIS = { sutun: 1, gruplu_sutun: 1, cizgi: 1, tablo: 1, dortlu: 1, takvim: 1, siniflar: 1, karsilastirma: 1 };
  const BOLUM = { karsilastirma, takvim, siniflar, yatay_cubuk: sira, halka, sapma, sutun: gunluk, gruplu_sutun: gruplu, cizgi, dortlu, tablo };
  function cizAnaliz(r, kap) {
    const kok = el('div', 'rc'); kap.appendChild(kok); hero(kok, r);
    if (r.kpi && r.kpi.length) kpiGoster(kok, r.kpi);
    if (!r.kayit_var) kok.appendChild(el('div', 'rc-kart rc-bos', 'Seçilen dönem için veri yok.'));
    let grid = null; const kapat = () => { if (grid && grid.children.length === 1) grid.classList.remove('iki'); grid = null; };
    (r.bolumler || []).forEach(sp => {
      if (bosBolum(sp) || !BOLUM[sp.tur]) return;
      const genis = GENIS[sp.tur] || sp.genis || (sp.tur === 'yatay_cubuk' && haftaGunleri(sp));
      if (genis) { kapat(); BOLUM[sp.tur](kok, sp); }
      else { if (grid && grid.children.length >= 2) kapat(); if (!grid) { grid = el('div', 'rc-izgara iki'); kok.appendChild(grid); } BOLUM[sp.tur](grid, sp); }      // her ızgara en çok 2 kart; tek kalan tam genişlikte
    });
    kapat();
    if (r.notlar && r.notlar.length) { const n = el('div', 'rc-notlar'); r.notlar.forEach(t => n.appendChild(el('div', '', 'ⓘ ' + t))); kok.appendChild(n); }
  }

  const CIZICILER = { analiz: cizAnaliz };     // yeni rapor türleri buraya eklenir
  window.RaporCizim = { ciz: function (r, kap) { const c = CIZICILER[r && r.tur]; if (c) c(r, kap); else kap.appendChild(el('div', 'rc-kart', 'Bu rapor türü görüntülenemiyor.')); }, para: para, sayi: sayi, trTarih: trTarih };
})();
