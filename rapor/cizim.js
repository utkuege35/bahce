// ===== RAPOR ÇİZİMİ (ortak): alıcı sayfası (rapor/index.html) ve yönetici önizlemesi (uygulama) AYNI kodu kullanır =====
// RaporCizim.ciz(rapor, kapsayici): rapor içeriğini (sunucudan gelen JSON) kapsayıcıya çizer. Tüm metinler textContent ile yazılır (HTML enjeksiyonu yok).
(function () {
  'use strict';
  const RENKLER = ['#2f7d5b', '#3b82c4', '#d9822b', '#8e5bb5', '#c4453b', '#2a9d9d', '#b5a02f', '#cc6699', '#5a7a3a', '#4f6d8f', '#a8643a', '#7a7a7a'];
  function el(etiket, sinif, metin) { const e = document.createElement(etiket); if (sinif) e.className = sinif; if (metin !== undefined && metin !== null) e.textContent = metin; return e; }
  const para = n => '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sayi = n => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
  const trTarih = t => { const p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ''; };
  const gunKisa = t => { try { return new Date(t + 'T00:00:00Z').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', weekday: 'short', timeZone: 'UTC' }); } catch (e) { return trTarih(t); } };
  function kart(renk, etiket, deger, not) {
    const k = el('div', 'kart'); k.style.borderLeftColor = renk;
    k.appendChild(el('div', 'e', etiket)); k.appendChild(el('div', 'd', deger)); if (not) k.appendChild(el('div', 'k', not)); return k;
  }

  function cizAlimlar(r, kap) {
    const o = r.ozet, S = r.satirlar || [], cokGun = r.donem_bas !== r.donem_bit;
    // --- kartlar ---
    const kartlar = el('div', 'kartlar');
    let not = cokGun ? 'Önceki dönemde alım yok' : 'Önceki gün alım yok';
    if (Number(o.onceki_tutar) > 0) { const d = (o.toplam_tutar - o.onceki_tutar) / o.onceki_tutar * 100; not = (d >= 0 ? '▲ %' : '▼ %') + Math.abs(d).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + (cokGun ? ' (önceki dönem ' : ' (önceki gün ') + para(o.onceki_tutar) + ')'; }
    kartlar.appendChild(kart(RENKLER[0], 'Toplam Alım', para(o.toplam_tutar), not));
    kartlar.appendChild(kart(RENKLER[1], 'Alınan Kalem', String(o.kalem_sayisi), 'satır'));
    kartlar.appendChild(kart(RENKLER[2], 'Belge', String(o.belge_sayisi), 'irsaliye / fatura'));
    kartlar.appendChild(kart(RENKLER[3], 'Tedarikçi', o.tedarikci_sayisi ? String(o.tedarikci_sayisi) : '—', o.tedarikci_sayisi ? 'farklı firma' : 'bilgi yok'));
    kap.appendChild(kartlar);

    // --- günlere göre (yalnızca çok günlü dönemde) ---
    if (cokGun) {
      const gunler = {}; S.forEach(s => { gunler[s.tarih] = (gunler[s.tarih] || 0) + Number(s.tutar || 0); });
      const gl = Object.keys(gunler).sort(), mx = Math.max(...gl.map(g => gunler[g]), 1);
      const bg = el('section', 'bolum'); bg.appendChild(el('h2', '', 'Günlere Göre Alım'));
      gl.forEach(g => {
        const sat = el('div', 'cubuk-satir'); sat.appendChild(el('div', 'cubuk-ad', gunKisa(g)));
        const yol = el('div', 'cubuk-yol'), dolgu = el('div', 'cubuk-dolgu'); dolgu.style.width = Math.max(2, gunler[g] / mx * 100) + '%'; dolgu.style.background = RENKLER[1];
        yol.appendChild(dolgu); sat.appendChild(yol); sat.appendChild(el('div', 'cubuk-deger', para(gunler[g]))); bg.appendChild(sat);
      });
      kap.appendChild(bg);
    }

    // --- grup dağılımı (tek ana grup varsa alt gruba, değilse ana gruba göre) ---
    const anaSayisi = new Set(S.map(s => s.grup1 || '')).size;
    const grupAdi = s => (anaSayisi <= 1 ? (s.grup2 || s.grup1) : s.grup1) || 'Diğer';
    const topla = {}; S.forEach(s => { const g = grupAdi(s); topla[g] = (topla[g] || 0) + Number(s.tutar || 0); });
    const gruplar = Object.keys(topla).map(ad => ({ ad, tutar: topla[ad] })).sort((a, b) => b.tutar - a.tutar);
    const renkDe = {}; gruplar.forEach((g, i) => { renkDe[g.ad] = RENKLER[i % RENKLER.length]; });
    const toplam = gruplar.reduce((a, g) => a + g.tutar, 0) || 1;
    const b1 = el('section', 'bolum'); b1.appendChild(el('h2', '', 'Gruplara Göre Dağılım'));
    gruplar.forEach(g => {
      const sat = el('div', 'cubuk-satir'); sat.appendChild(el('div', 'cubuk-ad', g.ad));
      const yol = el('div', 'cubuk-yol'), dolgu = el('div', 'cubuk-dolgu'); dolgu.style.width = Math.max(2, g.tutar / gruplar[0].tutar * 100) + '%'; dolgu.style.background = renkDe[g.ad];
      yol.appendChild(dolgu); sat.appendChild(yol);
      sat.appendChild(el('div', 'cubuk-deger', para(g.tutar) + '  ·  %' + (g.tutar / toplam * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })));
      b1.appendChild(sat);
    });
    kap.appendChild(b1);

    // --- detay tablosu ---
    const b2 = el('section', 'bolum'); b2.appendChild(el('h2', '', 'Alım Detayı'));
    const ara = el('input', 'arama'); ara.type = 'search'; ara.placeholder = 'Stok, tedarikçi veya belge ara…'; ara.setAttribute('aria-label', 'Detayda ara'); b2.appendChild(ara);
    const sar = el('div', 'tablo-sar'), tb = el('table'); sar.appendChild(tb); b2.appendChild(sar);
    const bas = el('thead'), hr = el('tr');
    const kolonlar = [['Stok', ''], cokGun ? ['Tarih', ''] : null, ['Miktar', 's'], ['Birim Fiyat', 's'], ['Tutar', 's'], ['Tedarikçi', ''], ['Belge', '']].filter(Boolean);
    kolonlar.forEach(([ad, c]) => hr.appendChild(el('th', c, ad)));
    bas.appendChild(hr); tb.appendChild(bas);
    const govde = el('tbody'), alt = el('tfoot'); tb.appendChild(govde); tb.appendChild(alt);
    function ciz() {
      const q = ara.value.trim().toLocaleLowerCase('tr');
      const liste = S.filter(s => !q || [s.ad, s.kod, s.tedarikci, s.belge].some(x => String(x || '').toLocaleLowerCase('tr').includes(q)));
      govde.replaceChildren(); alt.replaceChildren();
      liste.forEach(s => {
        const tr = el('tr'); const t0 = el('td', 'ilk');
        const nokta = el('span', 'grup-pt'); nokta.style.background = renkDe[grupAdi(s)] || '#888'; t0.appendChild(nokta); t0.appendChild(document.createTextNode((s.ad || '—')));
        tr.appendChild(t0);
        const hucre = (et, m, sn) => { const td = el('td', sn || '', m); td.setAttribute('data-et', et); return td; };
        if (cokGun) tr.appendChild(hucre('Tarih', trTarih(s.tarih)));
        tr.appendChild(hucre('Miktar', sayi(s.miktar) + ' ' + (s.birim || ''), 's'));
        tr.appendChild(hucre('Birim Fiyat', s.birim_fiyat == null ? '—' : para(s.birim_fiyat), 's'));
        tr.appendChild(hucre('Tutar', para(s.tutar), 's'));
        tr.appendChild(hucre('Tedarikçi', s.tedarikci || '—'));
        tr.appendChild(hucre('Belge', s.belge || '—'));
        govde.appendChild(tr);
      });
      if (!liste.length) { const tr = el('tr'), td = el('td', 'ilk', 'Eşleşen kayıt yok.'); td.colSpan = kolonlar.length; tr.appendChild(td); govde.appendChild(tr); return; }
      const tr = el('tr'); const ta = el('td', 'ilk', 'TOPLAM (' + liste.length + ' kalem)'); ta.colSpan = cokGun ? 4 : 3; tr.appendChild(ta);
      const tt = el('td', 's', para(liste.reduce((a, s) => a + Number(s.tutar || 0), 0))); tt.setAttribute('data-et', 'Toplam'); tr.appendChild(tt);
      tr.appendChild(el('td', '')); tr.appendChild(el('td', '')); alt.appendChild(tr);
    }
    ara.addEventListener('input', ciz); ciz();
    kap.appendChild(b2);
  }
  const CIZICILER = { alimlar: cizAlimlar };     // yeni rapor türleri buraya eklenir
  window.RaporCizim = { ciz: function (r, kap) { const c = CIZICILER[r && r.tur]; if (c) c(r, kap); else kap.appendChild(el('div', 'bos', 'Bu rapor türü görüntülenemiyor.')); }, para: para, sayi: sayi, trTarih: trTarih };
})();
