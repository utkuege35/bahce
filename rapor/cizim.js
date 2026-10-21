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
  function okuYaz(o, ad, tutar, ek, fm) { o.replaceChildren(); o.appendChild(document.createTextNode(ad + ' · ')); o.appendChild(el('b', '', (fm || para)(tutar))); if (ek) o.appendChild(document.createTextNode(' · ' + ek)); }
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
  // (uzun serilerde --i ölçeklenir: toplam canlanma süresi ~1 sn'yi geçmesin)
  function gunlukKart(kok, gunL, baslik, bos, fm, sinir) {
    let veri = gunL.map(x => ({ e: x.tarih.slice(8), ad: tarihAd(x.tarih), tutar: x.tutar, kalem: x.kalem })), tur = 'günlük';
    if (gunL.length > (sinir || 62)) {            // çok uzun dönem: haftalara topla
      const h = {}; gunL.forEach(x => { const b = gunEkle(x.tarih, -hGun(x.tarih)); (h[b] = h[b] || { tutar: 0, kalem: 0 }); h[b].tutar += x.tutar; h[b].kalem += x.kalem; });
      veri = Object.keys(h).sort().map(b => ({ e: b.slice(8) + '.' + b.slice(5, 7), ad: trTarih(b) + ' haftası', tutar: h[b].tutar, kalem: h[b].kalem })); tur = 'haftalık';
    }
    const k = kart(baslik || 'Günlere göre alım', tur), o = oku(); k.appendChild(o);
    const W = Math.max(300, Math.min(920, Math.round((kok.clientWidth || 392) - 32))), H = W < 520 ? 206 : 250, sol = 46, sag = 6, ust = 8, alt = 26, iw = W - sol - sag, ih = H - ust - alt, n = veri.length, slot = iw / n, bw = Math.max(3, Math.min(26, slot * 0.68));
    const mx = Math.max(...veri.map(x => x.tutar), 1), tavan = guzelUst(mx), id = 'rcg' + (++uid);
    const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Günlere göre alım sütun grafiği' }), defs = sv('defs', {});
    degrade(defs, id + 'a', '#6ee7b7', '#3b82f6'); degrade(defs, id + 'b', '#fde68a', '#f59e0b'); s.appendChild(defs);
    for (let i = 0; i <= 3; i++) { const y = ust + ih - ih * i / 3; s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: y, y2: y, class: 'rc-izg' })); s.appendChild(sv('text', { x: sol - 5, y: y + 3, 'text-anchor': 'end', class: 'rc-t' }, kisa(tavan * i / 3))); }
    const enI = veri.findIndex(x => x.tutar === mx), sut = [], adim = Math.max(1, Math.ceil(n / 8));
    veri.forEach((x, i) => {
      const cx = sol + slot * i + slot / 2, h = x.tutar / tavan * ih;
      if (x.tutar > 0) { const r = sv('rect', { x: (cx - bw / 2).toFixed(1), y: (ust + ih - h).toFixed(1), width: bw.toFixed(1), height: Math.max(h, 1.5).toFixed(1), rx: Math.min(4, bw / 2).toFixed(1), fill: `url(#${id}${i === enI ? 'b' : 'a'})`, class: 'rc-sutun' }); r.style.setProperty('--i', (i * Math.min(1, 36 / n)).toFixed(1)); r.appendChild(sv('title', {}, `${x.ad}: ${para(x.tutar)}`)); s.appendChild(r); sut[i] = r; }
      else s.appendChild(sv('rect', { x: (cx - bw / 2).toFixed(1), y: ust + ih - 2, width: bw.toFixed(1), height: 2, rx: 1, fill: 'rgba(255,255,255,.12)' }));
      if (i % adim === 0) s.appendChild(sv('text', { x: cx.toFixed(1), y: H - 9, 'text-anchor': 'middle', class: 'rc-t' }, x.e));
      const v = sv('rect', { x: (sol + slot * i).toFixed(1), y: ust, width: slot.toFixed(1), height: ih + alt - 6, class: 'rc-vurus' }); v.addEventListener('click', () => sec(i)); s.appendChild(v);
    });
    function sec(i) { sut.forEach(r => r && r.classList.remove('sec')); if (sut[i]) sut[i].classList.add('sec'); okuYaz(o, veri[i].ad, veri[i].tutar, veri[i].kalem ? veri[i].kalem + ' kalem' : (veri[i].tutar > 0 && bos ? null : (bos || 'alım yok')), fm); }
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
  function halkaKart(ust, gr, toplam, baslik, fm) {
    fm = fm || (v => '₺' + kisa(v));
    const k = kart(baslik || 'Gruplara göre dağılım', gr.gruplar.length + (baslik ? ' dilim' : ' grup'));
    let L = gr.gruplar.slice(0, 6); if (gr.gruplar.length > 6) L.push({ ad: 'Diğer', tutar: gr.gruplar.slice(6).reduce((a, g) => a + g.tutar, 0) });
    const yaricap = 58, C = 2 * Math.PI * yaricap, kap = el('div', 'rc-halka');
    const s = sv('svg', { viewBox: '0 0 160 160', width: '150', height: '150', role: 'img', 'aria-label': 'Grup dağılımı halka grafiği' }), g = sv('g', { class: 'rc-donus' });
    g.appendChild(sv('circle', { cx: 80, cy: 80, r: yaricap, fill: 'none', stroke: 'rgba(255,255,255,.06)', 'stroke-width': 24 }));
    const dil = [], satir = []; let birik = 0;
    const merkez1 = sv('text', { x: 80, y: 80, class: 'rc-tm' }, fm(toplam)), merkez2 = sv('text', { x: 80, y: 95, class: 'rc-ts' }, 'toplam');
    function sec(i) {
      dil.forEach((d, j) => { d.classList.toggle('sec', j === i); });
      if (i < 0) { merkez1.textContent = fm(toplam); merkez2.textContent = 'toplam'; return; }
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
      r.appendChild(nokta); r.appendChild(el('span', '', x.ad)); const e = el('em'); e.appendChild(el('b', '', '%' + yuzde(x.tutar, toplam))); e.appendChild(document.createTextNode(' · ' + fm(x.tutar))); r.appendChild(e);
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
  function isiKart(ust, gunL, baslik, fm, bos) {
    fm = fm || para; bos = bos || 'alım yok';
    const k = kart(baslik || 'Alım takvimi', 'koyu = yoğun gün'), o = oku(); k.appendChild(o);
    const mx = Math.max(...gunL.map(x => x.tutar), 1), mn = Math.min(...gunL.filter(x => x.tutar > 0).map(x => x.tutar), mx), izgara = el('div', 'rc-isi');   // renk: en düşük dolu gün → en yüksek gün
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(a => izgara.appendChild(el('div', 'rc-isi-b', a)));
    for (let i = 0; i < hGun(gunL[0].tarih); i++) izgara.appendChild(el('div', 'rc-hucre dis'));
    const hc = [];
    gunL.forEach((x, i) => {
      const h = el('div', 'rc-hucre' + (x.tutar > 0 ? '' : ' yok'), String(Number(x.tarih.slice(8)))); if (x.tarih.slice(8) === '01' || i === 0) { h.appendChild(el('small', 'rc-ay', ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][Number(x.tarih.slice(5, 7)) - 1])); h.classList.add('ayb'); } h.title = `${tarihAd(x.tarih)}: ${x.tutar > 0 ? fm(x.tutar) : bos}`;
      if (x.tutar > 0) { const a = 0.2 + 0.8 * Math.sqrt(mx > mn ? (x.tutar - mn) / (mx - mn) : 1); h.style.background = `rgba(52,211,153,${a.toFixed(2)})`; if (a > 0.62) h.style.color = '#04281d'; }
      h.addEventListener('click', () => { hc.forEach(c => c.classList.remove('sec')); h.classList.add('sec'); if (x.tutar > 0) okuYaz(o, tarihAd(x.tarih), x.tutar, x.kalem ? x.kalem + ' kalem' : null, fm); else { o.replaceChildren(); o.appendChild(document.createTextNode(tarihAd(x.tarih) + ' · ' + bos)); } });
      hc.push(h); izgara.appendChild(h);
    });
    k.appendChild(izgara);
    const en = gunL.reduce((a, x) => x.tutar > a.tutar ? x : a, gunL[0]); okuYaz(o, tarihAd(en.tarih), en.tutar, 'en yoğun gün', fm);
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
  // ===================== GENEL ANALİZ RAPORU ÇİZİCİSİ =====================
  // Sunucudan gelen { baslik, kpi[], bolumler[], notlar[] } çerçevesini çizer; yeni bir rapor eklemek için yalnızca SQL yazılır.
  // Bölüm türleri: yatay_cubuk · sutun · gruplu_sutun · cizgi · sapma · dortlu · halka · tablo. Boş bölümler çizilmez.
  const SERI = [['#6ee7b7', '#3b82f6'], ['#fde68a', '#f59e0b'], ['#c4b5fd', '#7c3aed'], ['#fda4af', '#e11d48']];
  const SINIF_RENK = { 'Yıldız': '#34d399', 'İş atı': '#fbbf24', 'Bulmaca': '#60a5fa', 'Zayıf': '#f87171' };
  const SINIF_ACIKLAMA = { 'Yıldız': 'popüler ve kârlı', 'İş atı': 'popüler, düşük kâr', 'Bulmaca': 'kârlı ama az satıyor', 'Zayıf': 'az satıyor, düşük kâr' };
  const TL0 = n => (Number(n) < 0 ? '-' : '') + '₺' + Math.abs(Math.round(Number(n || 0))).toLocaleString('tr-TR');
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
  const genislik = kok => Math.max(300, Math.min(920, Math.round((kok.clientWidth || 392) - 32)));
  function analizKpi(kok, kpi) {
    const g = el('div', 'rc-kpi n' + kpi.length), TON = { iyi: 1, kotu: 1, uyari: 1 };
    kpi.forEach(t => {
      const d = el('div'), m = bic(t.b, t.v);
      d.appendChild(el('div', 'rc-kpi-e', t.e)); d.appendChild(el('div', 'rc-kpi-d' + (TON[t.ton] ? ' ' + t.ton : '') + (m.length > 11 ? ' u' : ''), m));
      if (t.k) d.appendChild(el('div', 'rc-kpi-k', t.k)); g.appendChild(d);
    });
    kok.appendChild(g);
  }
  function analizYatay(ust, sp) {
    const L = sp.satirlar, k = kart(sp.baslik), mx = Math.max(...L.map(x => Math.abs(Number(x.v))), 1e-9), renk = sp.renk === 'kirmizi' ? '#f87171' : '#34d399';
    L.forEach((x, i) => {
      const r = el('div', 'rc-sira'), orta = el('div'), yol = el('div', 'rc-yol'), d = el('div', 'rc-dolgu'), tt = el('div', 'rc-tut', bic(sp.b, x.v));
      r.appendChild(el('div', 'rc-no' + (i === 0 ? ' bir' : ''), String(i + 1))); orta.style.minWidth = '0'; orta.appendChild(el('div', 'rc-ad', x.ad));
      d.style.width = Math.max(3, Math.abs(Number(x.v)) / mx * 100) + '%'; d.style.background = `linear-gradient(90deg,${renk},${renk}99)`; d.style.setProperty('--i', i); yol.appendChild(d); orta.appendChild(yol); r.appendChild(orta);
      if (x.ek) tt.appendChild(el('small', '', x.ek)); r.appendChild(tt); k.appendChild(r);
    });
    ust.appendChild(k);
  }
  function analizHalka(ust, sp) {
    const L = sp.dilimler.map(d => ({ ad: d.ad, tutar: Number(d.v) })), toplam = L.reduce((a, g) => a + g.tutar, 0), renkDe = {}; L.forEach((g, i) => { renkDe[g.ad] = RENK[i % RENK.length]; });
    halkaKart(ust, { gruplar: L, renkDe }, toplam, sp.baslik, sp.b === 'para' ? v => '₺' + kisa(v) : v => bic(sp.b, v));
  }
  function analizSutun(kok, sp) {
    const gunL = sp.x.map((d, i) => ({ tarih: String(d).slice(0, 10), tutar: Number(sp.v[i] || 0), kalem: 0 }));
    gunlukKart(kok, gunL, sp.baslik, sp.etiket || 'kayıt yok', v => bic(sp.b, v), sp.sinir || 124);   // ~4 aya kadar günlük çubuk; daha uzunsa haftalık
  }
  function eksen(s, defs, W, H, sol, sag, ust, ih, tavan, fm, dip) {
    for (let i = 0; i <= 3; i++) { const y = ust + ih - ih * i / 3; s.appendChild(sv('line', { x1: sol, x2: W - sag, y1: y, y2: y, class: 'rc-izg' })); s.appendChild(sv('text', { x: sol - 5, y: y + 3, 'text-anchor': 'end', class: 'rc-t' }, fm((dip || 0) + (tavan - (dip || 0)) * i / 3))); }
  }
  function lejant(k, seriler) { const l = el('div', 'rc-leg'); seriler.forEach((s, i) => { const e = el('span'), n = el('i'); n.style.background = `linear-gradient(135deg,${SERI[i % 4][0]},${SERI[i % 4][1]})`; e.appendChild(n); e.appendChild(document.createTextNode(s.ad)); l.appendChild(e); }); k.appendChild(l); }
  function analizGruplu(kok, sp) {
    const k = kart(sp.baslik), o = oku(); k.appendChild(o);
    const X = sp.x, S = sp.seriler, n = X.length, ns = S.length, W = genislik(kok), H = W < 520 ? 240 : 280, sol = 52, sag = 6, ust = 10, alt = 30, iw = W - sol - sag, ih = H - ust - alt, slot = iw / n, gw = Math.min(slot * 0.82, 170), bw = gw / ns - 3;
    const mx = Math.max(...S.flatMap(s => s.v.map(v => Number(v) || 0)), 1), tavan = guzelUst(mx), id = 'rcq' + (++uid), fm = v => bic(sp.b, v), kfm = v => sp.b === 'para' ? kisa(v) : bic(sp.b, v);
    const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sp.baslik }), defs = sv('defs', {}); S.forEach((_, i) => degrade(defs, id + i, SERI[i % 4][0], SERI[i % 4][1])); s.appendChild(defs);
    eksen(s, defs, W, H, sol, sag, ust, ih, tavan, kfm); const grup = [];
    X.forEach((xe, j) => {
      const x0 = sol + slot * j + (slot - gw) / 2; grup[j] = [];
      S.forEach((se, i) => { const v = Number(se.v[j]) || 0, h = v / tavan * ih, r = sv('rect', { x: (x0 + i * (bw + 3)).toFixed(1), y: (ust + ih - h).toFixed(1), width: bw.toFixed(1), height: Math.max(h, 1.5).toFixed(1), rx: Math.min(4, bw / 2).toFixed(1), fill: `url(#${id}${i})`, class: 'rc-sutun' });
        r.style.setProperty('--i', j * ns + i); r.appendChild(sv('title', {}, `${xe} · ${se.ad}: ${fm(v)}`)); s.appendChild(r); grup[j].push(r); });
      s.appendChild(sv('text', { x: (sol + slot * j + slot / 2).toFixed(1), y: H - 10, 'text-anchor': 'middle', class: 'rc-t' }, slot < 90 ? String(xe).split(' ')[0] : xe));
      const vr = sv('rect', { x: (sol + slot * j).toFixed(1), y: ust, width: slot.toFixed(1), height: ih + alt - 6, class: 'rc-vurus' }); vr.addEventListener('click', () => sec(j)); s.appendChild(vr);
    });
    function sec(j) { grup.forEach((g, a) => g.forEach(r => r.classList.toggle('sec', a === j))); o.replaceChildren(); o.appendChild(document.createTextNode(X[j] + ' · ')); S.forEach((se, i) => { if (i) o.appendChild(document.createTextNode(' · ')); o.appendChild(document.createTextNode(se.ad + ' ')); o.appendChild(el('b', '', fm(se.v[j]))); }); }
    let son = n - 1; while (son > 0 && !Number(S[0].v[son])) son--;      // ilk serinin (örn. içinde bulunulan yıl) verisi olan son grubu seç
    sec(son); k.appendChild(s); lejant(k, S); kok.appendChild(k);
  }
  function analizCizgi(kok, sp) {
    const k = kart(sp.baslik), o = oku(); k.appendChild(o);
    const X = sp.x, S = sp.seriler, n = X.length, W = genislik(kok), H = W < 520 ? 230 : 270, sol = 46, sag = 14, ust = 22, alt = 30, iw = W - sol - sag, ih = H - ust - alt, fm = v => bic(sp.b, v);
    const tum = S.flatMap(s => s.v.filter(v => v !== null && v !== undefined).map(Number)); if (!tum.length) return;
    let mn = Math.min(...tum), mx = Math.max(...tum); const pay = Math.max((mx - mn) * 0.25, 0.5); mn = Math.floor(mn - pay); mx = Math.ceil(mx + pay);
    const px = j => sol + (n === 1 ? iw / 2 : iw * (j + 0.5) / n), py = v => ust + ih - (v - mn) / (mx - mn) * ih;
    const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sp.baslik }); eksen(s, null, W, H, sol, sag, ust, ih, mx, v => (sp.b === 'yuzde' ? (v < 0 ? '-' : '') + '%' + Math.abs(Math.round(v)) : kisa(v)), mn);
    const adim = Math.max(1, Math.ceil(n / 12));      // çok noktalı serilerde (örn. 31 gün) etiketleri seyrelt
    X.forEach((xe, j) => { if (j % adim === 0) s.appendChild(sv('text', { x: px(j).toFixed(1), y: H - 10, 'text-anchor': 'middle', class: 'rc-t' }, (iw / n < 105 ? String(xe).split(' ')[0] : xe))); });
    S.forEach((se, i) => {
      const pts = se.v.map((v, j) => (v === null || v === undefined) ? null : [px(j), py(Number(v)), Number(v)]); let seg = [];
      const bitir = () => { if (seg.length > 1) { const c = sv('path', { d: egri(seg.map(p => [p[0], p[1]])), fill: 'none', stroke: SERI[i % 4][1], 'stroke-width': 2.6, 'stroke-linecap': 'round', class: 'rc-cizgi' }); c.style.setProperty('--u', '2000'); s.appendChild(c); } seg = []; };
      pts.forEach(p => { if (p) seg.push(p); else bitir(); }); bitir();
      pts.forEach((p, j) => { if (!p) return; const nk = sv('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: n > 16 ? 2.6 : 4.5, fill: SERI[i % 4][0], stroke: '#0b1220', 'stroke-width': 2, class: 'rc-nokta-s' }); nk.appendChild(sv('title', {}, `${X[j]} · ${se.ad}: ${fm(p[2])}`)); s.appendChild(nk);
        if (n <= 12) s.appendChild(sv('text', { x: p[0].toFixed(1), y: (p[1] - 9).toFixed(1), 'text-anchor': 'middle', class: 'rc-t', fill: SERI[i % 4][0] }, fm(p[2]))); });
    });
    const okuj = j => { o.replaceChildren(); o.appendChild(document.createTextNode(X[j] + ' · ')); S.forEach((se, i) => { if (i) o.appendChild(document.createTextNode(' · ')); o.appendChild(document.createTextNode(se.ad + ' ')); o.appendChild(el('b', '', fm(se.v[j]))); }); };
    X.forEach((_, j) => { const vr = sv('rect', { x: (sol + iw * j / n).toFixed(1), y: ust, width: (iw / n).toFixed(1), height: ih + 16, class: 'rc-vurus' }); vr.addEventListener('click', () => okuj(j)); s.appendChild(vr); });
    let sn = n - 1; while (sn > 0 && S.every(se => se.v[sn] === null || se.v[sn] === undefined)) sn--;
    okuj(sn); k.appendChild(s); lejant(k, S); kok.appendChild(k);
  }
  function analizSapma(ust, sp) {
    const L = sp.satirlar, k = kart(sp.baslik), mx = Math.max(...L.map(x => Math.abs(Number(x.v))), 1e-9), kotuArtis = sp.iyi_yon === 'azalis';
    L.forEach((x, i) => {
      const v = Number(x.v), notr = sp.iyi_yon === 'notr', kotu = v === 0 ? null : (kotuArtis ? v > 0 : v < 0), renk = v === 0 ? '#94a3b8' : notr ? (v > 0 ? '#60a5fa' : '#fbbf24') : kotu ? '#f87171' : '#34d399', w = Math.abs(v) / mx * 50;   // "notr": artış/azalış iyi ya da kötü değildir (örn. stok değeri) → mavi / sarı
      const s = el('div', 'rc-sap-s'), ad = el('div'), iz = el('div', 'rc-sap-iz'), b = el('div', 'rc-sap-b'), dg = el('div', 'rc-tut', (v > 0 ? '+' : '') + bic(sp.b, v));
      ad.appendChild(el('div', 'rc-ad', x.ad)); if (x.ek) ad.appendChild(el('div', 'rc-sap-ek', x.ek)); dg.style.color = renk;
      b.style.width = Math.max(w, v === 0 ? 0 : 1.5) + '%'; b.style.left = (v >= 0 ? 50 : 50 - Math.max(w, 1.5)) + '%'; b.style.background = `linear-gradient(90deg,${renk}aa,${renk})`; b.style.transformOrigin = v >= 0 ? 'left' : 'right'; b.style.setProperty('--i', i);
      iz.appendChild(b); s.appendChild(ad); s.appendChild(dg); s.appendChild(iz); k.appendChild(s);
    });
    ust.appendChild(k);
  }
  function analizDortlu(kok, sp) {
    const N = sp.noktalar; const k = kart(sp.baslik, N.length + ' ürün'), o = oku(); k.appendChild(o);
    const W = genislik(kok), H = W < 520 ? 320 : 380, sol = 52, sag = 12, ust = 14, alt = 44, iw = W - sol - sag, ih = H - ust - alt;
    const xmax = guzelUst(Math.max(...N.map(p => Number(p.x)), Number(sp.x_esik)) * 1.08), ys = N.map(p => Number(p.y)), ymin = Math.min(0, ...ys) < 0 ? Math.floor(Math.min(...ys) * 1.1) : 0, ymax = guzelUst(Math.max(...ys, Number(sp.y_esik)) * 1.08);
    const px = v => sol + v / xmax * iw, py = v => ust + ih - (v - ymin) / (ymax - ymin) * ih, ex = px(Number(sp.x_esik)), ey = py(Number(sp.y_esik));
    const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': sp.baslik });
    [['Yıldız', ex, ust, sol + iw - ex, ey - ust], ['İş atı', ex, ey, sol + iw - ex, ust + ih - ey], ['Bulmaca', sol, ust, ex - sol, ey - ust], ['Zayıf', sol, ey, ex - sol, ust + ih - ey]].forEach(([c, x, y, w, h]) => s.appendChild(sv('rect', { x: x.toFixed(1), y: y.toFixed(1), width: Math.max(w, 0).toFixed(1), height: Math.max(h, 0).toFixed(1), fill: SINIF_RENK[c], 'fill-opacity': '.07' })));
    s.appendChild(sv('line', { x1: ex, x2: ex, y1: ust, y2: ust + ih, stroke: 'rgba(255,255,255,.35)', 'stroke-dasharray': '4 4' })); s.appendChild(sv('line', { x1: sol, x2: sol + iw, y1: ey, y2: ey, stroke: 'rgba(255,255,255,.35)', 'stroke-dasharray': '4 4' }));
    for (let i = 0; i <= 4; i++) { s.appendChild(sv('text', { x: (sol + iw * i / 4).toFixed(1), y: ust + ih + 14, 'text-anchor': 'middle', class: 'rc-t' }, kisa(xmax * i / 4))); s.appendChild(sv('text', { x: sol - 6, y: (py(ymin + (ymax - ymin) * i / 4) + 3).toFixed(1), 'text-anchor': 'end', class: 'rc-t' }, kisa(ymin + (ymax - ymin) * i / 4))); }
    s.appendChild(sv('text', { x: (sol + iw / 2).toFixed(1), y: H - 6, 'text-anchor': 'middle', class: 'rc-ts' }, sp.x_ad)); s.appendChild(sv('text', { x: 12, y: (ust + ih / 2).toFixed(1), 'text-anchor': 'middle', class: 'rc-ts', transform: `rotate(-90 12 ${(ust + ih / 2).toFixed(1)})` }, sp.y_ad));
    [['Yıldız', sol + iw - 6, ust + 14, 'end'], ['Bulmaca', sol + 6, ust + 14, 'start'], ['İş atı', sol + iw - 6, ust + ih - 8, 'end'], ['Zayıf', sol + 6, ust + ih - 8, 'start']].forEach(([c, x, y, a]) => s.appendChild(sv('text', { x, y, 'text-anchor': a, class: 'rc-t', fill: SINIF_RENK[c], 'font-weight': '700' }, c)));
    const nokta = [], oz = N.slice().sort((a, b) => b.x - a.x).slice(0, 2).concat(N.slice().sort((a, b) => b.y - a.y).slice(0, 2), N.slice().sort((a, b) => a.y - b.y).slice(0, 1)), etiket = new Set(oz.map(p => p.ad));
    function sec(i) { nokta.forEach((c, j) => c.classList.toggle('sec', j === i)); const p = N[i]; o.replaceChildren(); o.appendChild(el('b', '', p.ad)); o.appendChild(document.createTextNode(` · ${sayi(p.x)} adet · porsiyon başına ₺${sayi(p.y)} kâr · `)); const sn = el('span', '', p.sinif); sn.style.color = SINIF_RENK[p.sinif]; o.appendChild(sn); }
    N.forEach((p, i) => {
      const c = sv('circle', { cx: px(Number(p.x)).toFixed(1), cy: py(Number(p.y)).toFixed(1), r: 6, fill: SINIF_RENK[p.sinif] || '#94a3b8', 'fill-opacity': '.85', stroke: '#0b1220', 'stroke-width': 1.5, class: 'rc-nokta-s' });
      c.appendChild(sv('title', {}, `${p.ad}: ${sayi(p.x)} adet · ₺${sayi(p.y)} · ${p.sinif}`)); c.addEventListener('click', () => sec(i)); s.appendChild(c); nokta.push(c);
      if (etiket.has(p.ad)) s.appendChild(sv('text', { x: (px(Number(p.x)) + (px(Number(p.x)) > sol + iw - 90 ? -9 : 9)).toFixed(1), y: (py(Number(p.y)) + 3).toFixed(1), 'text-anchor': px(Number(p.x)) > sol + iw - 90 ? 'end' : 'start', class: 'rc-t', fill: '#eaf0ff' }, p.ad));
    });
    sec(N.reduce((m, p, i) => (p.x * p.y > N[m].x * N[m].y ? i : m), 0)); k.appendChild(s);
    const l = el('div', 'rc-leg'); ['Yıldız', 'İş atı', 'Bulmaca', 'Zayıf'].forEach(c => { const e = el('span'), n = el('i'); n.style.background = SINIF_RENK[c]; e.appendChild(n); e.appendChild(document.createTextNode(`${c} (${N.filter(p => p.sinif === c).length}) · ${SINIF_ACIKLAMA[c]}`)); l.appendChild(e); }); k.appendChild(l); kok.appendChild(k);
  }
  function analizTablo(kok, sp) {
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
  function analizTakvim(kok, sp) {
    const gunL = sp.x.map((d, i) => ({ tarih: String(d).slice(0, 10), tutar: Number(sp.v[i] || 0), kalem: 0 }));
    isiKart(kok, gunL, sp.baslik, v => bic(sp.b, v), sp.etiket || 'kayıt yok');
  }
  function analizSiniflar(kok, sp) {
    const k = kart(sp.baslik), g = el('div', 'rc-sinif-izgara');
    sp.siniflar.forEach(s => {
      const c = el('div', 'rc-sinif'), ad = el('div', 'rc-sinif-ad');
      c.style.borderTopColor = SINIF_RENK[s.ad] || '#94a3b8'; ad.style.color = SINIF_RENK[s.ad] || '#eaf0ff';
      ad.appendChild(document.createTextNode(s.ad)); ad.appendChild(el('span', 'rc-sinif-n', String(s.adet_urun) + ' ürün')); c.appendChild(ad);
      c.appendChild(el('div', 'rc-sinif-ac', s.aciklama));
      const st = el('div', 'rc-sinif-st'); st.appendChild(el('span', '', 'Ciro payı ')); st.appendChild(el('b', '', bic('yuzde', s.ciro_pay))); st.appendChild(el('span', '', '  ·  Kâr payı ')); st.appendChild(el('b', '', bic('yuzde', s.kar_pay))); c.appendChild(st);
      const ch = el('div', 'rc-sinif-ch'), L = s.urunler || [];
      L.slice(0, 12).forEach(u => ch.appendChild(el('span', 'rc-chip', u))); if (L.length > 12) ch.appendChild(el('span', 'rc-chip son', '+' + (L.length - 12) + ' ürün')); if (!L.length) ch.appendChild(el('span', 'rc-chip son', 'ürün yok')); c.appendChild(ch);
      c.appendChild(el('div', 'rc-sinif-on', s.oneri)); g.appendChild(c);
    });
    k.appendChild(g); kok.appendChild(k);
  }
  // Sade karşılaştırma özeti: ilk satırın BÜYÜK % değişimi + her satır için iki ayın yan yana çubukları ve değişim rozeti
  function karsDegisim(v1, v2) { const a = Number(v1) || 0, b = Number(v2) || 0; return a > 0 ? (b / a - 1) * 100 : null; }
  function karsEtiket(d, iyi) { return d === null ? '—' : (d >= 0 ? '▲ ' : '▼ ') + bic('yuzde', Math.abs(d)); }
  function karsTon(d, iyi) { return d === null || d === 0 ? '' : ((d > 0) === (iyi !== 'azalis') ? 'iyi' : 'kotu'); }
  function analizKars(kok, sp) {
    const k = kart(sp.baslik), L = sp.satirlar, E = sp.etiketler || ['1', '2'], a = L[0], d0 = karsDegisim(a.v1, a.v2), fm = (b, v) => bic(b, Math.round(Number(v) || 0) === Number(v) ? v : Number(v));
    const hero = el('div', 'rc-kars-hero'), yz = el('div', 'rc-kars-yuzde ' + karsTon(d0, sp.iyi_yon), karsEtiket(d0, sp.iyi_yon)), alt = el('div', 'rc-kars-alt');
    alt.appendChild(el('div', '', a.ad + ' · ' + E[0] + ' → ' + E[1]));
    const fark = (Number(a.v2) || 0) - (Number(a.v1) || 0); alt.appendChild(el('div', 'rc-kars-fark', (fark >= 0 ? '+' : '-') + bic(a.b, Math.abs(fark))));
    hero.appendChild(yz); hero.appendChild(alt); k.appendChild(hero);
    L.forEach(s => {
      const mx = Math.max(Number(s.v1) || 0, Number(s.v2) || 0, 1e-9), d = karsDegisim(s.v1, s.v2), r = el('div', 'rc-kars-satir'), ust = el('div', 'rc-kars-ad');
      ust.appendChild(el('span', '', s.ad)); ust.appendChild(el('span', 'rc-kars-rozet ' + karsTon(d, sp.iyi_yon), karsEtiket(d, sp.iyi_yon))); r.appendChild(ust);
      [[s.v1, E[0], '#60a5fa'], [s.v2, E[1], '#34d399']].forEach(([v, et, renk], i) => {
        const b = el('div', 'rc-kars-b'), iz = el('div', 'rc-kars-iz'), dg = el('div', 'rc-kars-dolgu');
        dg.style.width = Math.max(((Number(v) || 0) / mx) * 100, (Number(v) || 0) > 0 ? 2 : 0) + '%'; dg.style.background = `linear-gradient(90deg,${renk}aa,${renk})`; dg.style.setProperty('--i', i); iz.appendChild(dg);
        b.appendChild(el('span', 'rc-kars-et', et)); b.appendChild(iz); b.appendChild(el('b', 'rc-kars-v', v === null || v === undefined ? '—' : bic(s.b, v))); r.appendChild(b);
      });
      k.appendChild(r);
    });
    kok.appendChild(k);
  }
  function bosBolum(sp) { return !sp || !((sp.satirlar || sp.noktalar || sp.dilimler || sp.siniflar || sp.x || []).length); }
  const GENIS = { sutun: 1, gruplu_sutun: 1, cizgi: 1, tablo: 1, dortlu: 1, takvim: 1, siniflar: 1, karsilastirma: 1 }, BOLUM = { karsilastirma: analizKars, takvim: analizTakvim, siniflar: analizSiniflar, yatay_cubuk: analizYatay, halka: analizHalka, sapma: analizSapma, sutun: analizSutun, gruplu_sutun: analizGruplu, cizgi: analizCizgi, dortlu: analizDortlu, tablo: analizTablo };
  function cizAnaliz(r, kap) {
    const kok = el('div', 'rc'); kap.appendChild(kok);
    const h = el('section', 'rc-hero'); h.appendChild(el('div', 'rc-etiket', 'Analiz raporu')); h.appendChild(el('div', 'rc-bas', r.baslik));
    const ab = el('div', 'rc-alt'); ab.appendChild(el('span', 'rc-donem', r.donem_bas === r.donem_bit ? trTarih(r.donem_bas) : `${trTarih(r.donem_bas)} – ${trTarih(r.donem_bit)}`)); h.appendChild(ab);
    if (r.aciklama) h.appendChild(el('div', 'rc-acik', r.aciklama)); kok.appendChild(h);
    if (r.kpi && r.kpi.length) analizKpi(kok, r.kpi);
    if (!r.kayit_var) kok.appendChild(el('div', 'rc-kart rc-bos', 'Seçilen dönem için veri yok.'));
    let grid = null; const kapat = () => { if (grid && grid.children.length === 1) grid.classList.remove('iki'); grid = null; };
    (r.bolumler || []).forEach(sp => {
      if (bosBolum(sp) || !BOLUM[sp.tur]) return;
      if (GENIS[sp.tur] || sp.genis) { kapat(); BOLUM[sp.tur](kok, sp); }
      else { if (grid && grid.children.length >= 2) kapat(); if (!grid) { grid = el('div', 'rc-izgara iki'); kok.appendChild(grid); } BOLUM[sp.tur](grid, sp); }      // her ızgara en çok 2 kart; tek kalan tam genişlikte
    });
    kapat();
    if (r.notlar && r.notlar.length) { const n = el('div', 'rc-notlar'); r.notlar.forEach(t => n.appendChild(el('div', '', 'ⓘ ' + t))); kok.appendChild(n); }
  }

  const CIZICILER = { alimlar: cizAlimlar, analiz: cizAnaliz };     // yeni rapor türleri buraya eklenir
  window.RaporCizim = { ciz: function (r, kap) { const c = CIZICILER[r && r.tur]; if (c) c(r, kap); else kap.appendChild(el('div', 'rc-kart', 'Bu rapor türü görüntülenemiyor.')); }, para: para, sayi: sayi, trTarih: trTarih };
})();
