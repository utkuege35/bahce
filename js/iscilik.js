// ===== İŞÇİLİK KAYITLARI =====
// Aile içi / kendi yaptığımız işlerin kişi bazlı kaydı. Süre, birim ve tutar boş geçilebilir (tutar boşsa 0).
// Ekranlar: "İşçilik Kayıtları" (günlük liste + Yeni ile excel benzeri giriş) ve ayrı "İşçilik Raporu".
// Bu kayıtlar kasa ve fatura hareketi üretmez; Panel / Finans Raporları'nı etkilemez.
let iscPersoneller = [];
let iscKalemYedek = {};   // düzenlenen kayıtta artık listede olmayan kalem adı
let iscSatirlar = [];
let iscDuzenId = null;
let iscListeVeri = {};
let iscSeciliId = null;
let iscRaporKayitlar = [];

const iscEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iscBugun = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const iscSayi = n => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const iscTarihGoster = t => { const p = String(t || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (t || ''); };
const iscBosSatir = () => ({ kisi: '', kalem: '', sure: '', birim: '', tutar: '', aciklama: '' });
const iscSatirDolu = s => !!(s.kisi || s.kalem || s.sure || s.tutar || (s.aciklama || '').trim());
const iscSureMetin = (saat, gun) => { const p = []; if (saat) p.push(iscSayi(saat) + ' saat'); if (gun) p.push(iscSayi(gun) + ' gün'); return p.length ? p.join(' · ') : '—'; };

function iscKalemSecenekleri() {
  const liste = (typeof giderKalemleri !== 'undefined' ? giderKalemleri : [])
    .filter(g => g.tip === 'kalem' && g.aktif !== false)
    .map(g => {
      const ust = giderKalemleri.find(x => x.id === g.ust_id);
      return { id: g.id, ad: (ust ? ust.ad + ' › ' : '') + g.ad };
    });
  Object.keys(iscKalemYedek).forEach(id => { if (!liste.some(k => k.id === id)) liste.push({ id, ad: iscKalemYedek[id] }); });
  return liste.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

async function iscPersonelYukle() {
  const { data } = await sb.from('cari').select('id,kod,ad,tip,aktif').eq('tip', 'personel').order('ad');
  const aktifler = (data || []).filter(c => c.aktif !== false);
  // Düzenlenen kayıttaki kişi pasife alınmış olsa da listede kalsın
  iscPersoneller.filter(p => p._yedek && !aktifler.some(a => a.id === p.id)).forEach(p => aktifler.push(p));
  iscPersoneller = aktifler;
}

// ---------- KAYIT EKRANI: günlük liste ----------
window.renderIscilik = async function () {
  if (!aktifIsyeri?.id) return;
  await iscPersonelYukle();
  const t = document.getElementById('isc-liste-tarih');
  if (t && !t.value) t.value = iscBugun();
  iscFormKapat();
  await iscListeYenile();
};

window.iscListeYenile = async function () {
  const tbEl = document.getElementById('isc-liste-tb'); if (!tbEl || !aktifIsyeri?.id) return;
  const tarih = document.getElementById('isc-liste-tarih').value || iscBugun();
  tbEl.innerHTML = '<div class="bos">Yükleniyor...</div>';
  const { data, error } = await sb.from('isci_kayitlari').select('*').eq('isyeri_id', aktifIsyeri.id).eq('tarih', tarih).order('olusturma', { ascending: true });
  if (error) { tbEl.innerHTML = '<div class="bos">Okunamadı: ' + iscEsc(error.message) + '</div>'; return; }
  iscListeVeri = {}; (data || []).forEach(r => { iscListeVeri[r.id] = r; });
  if (!iscListeVeri[iscSeciliId]) iscSeciliId = null;
  const ozEl = document.getElementById('isc-liste-ozet');
  if (!data || !data.length) { tbEl.innerHTML = '<div class="bos">Bu tarihte kayıt yok.</div>'; if (ozEl) ozEl.textContent = ''; return; }
  const saat = data.filter(r => r.birim === 'saat').reduce((a, r) => a + (Number(r.sure) || 0), 0);
  const gun = data.filter(r => r.birim === 'gun').reduce((a, r) => a + (Number(r.sure) || 0), 0);
  if (ozEl) ozEl.textContent = `${data.length} kayıt · ${iscSureMetin(saat, gun)}`;
  tbEl.innerHTML = `<div class="tw"><table><thead><tr><th>Kişi</th><th>Gider Kalemi</th><th>Süre</th><th style="text-align:right">Tutar</th><th>Açıklama</th></tr></thead><tbody>${data.map(r => `
    <tr data-id="${r.id}" onclick="iscSec('${r.id}')" ondblclick="iscSec('${r.id}');iscListeIslem('duzenle')" style="cursor:pointer;${iscSeciliId === r.id ? 'background:var(--yesil-cok-ac);' : ''}">
      <td style="font-size:12px">${iscEsc(r.kisi_ad)}</td>
      <td style="font-size:12px">${iscEsc(r.kalem_ad || '—')}</td>
      <td style="font-size:12px;white-space:nowrap">${r.sure != null ? iscSayi(r.sure) + ' ' + (r.birim === 'gun' ? 'gün' : 'saat') : '—'}</td>
      <td style="text-align:right;font-size:12px">${Number(r.tutar) ? iscSayi(r.tutar) : '—'}</td>
      <td style="font-size:12px">${iscEsc(r.aciklama || '')}</td>
    </tr>`).join('')}</tbody></table></div>`;
};

window.iscSec = function (id) {
  iscSeciliId = id;
  document.querySelectorAll('#isc-liste-tb tr[data-id]').forEach(tr => { tr.style.background = tr.dataset.id === id ? 'var(--yesil-cok-ac)' : ''; });
};

window.iscListeIslem = function (islem) {
  if (!iscSeciliId) { bil('Önce listeden bir kayıt seçin', 'err'); return; }
  const r = iscListeVeri[iscSeciliId]; if (!r) return;
  if (islem === 'duzenle') iscDuzenleAc(r);
  else if (islem === 'sil') iscSil(r.id);
};

window.iscSil = async function (id) {
  if (!(await onay('Bu işçilik kaydını silmek istiyor musunuz?', '🗑️'))) return;
  const { error } = await sb.from('isci_kayitlari').delete().eq('id', id).eq('isyeri_id', aktifIsyeri.id);
  if (error) { bil('Silinemedi: ' + error.message, 'err'); return; }
  iscSeciliId = null;
  await iscListeYenile();
  bil('Silindi ✓');
};

// ---------- KAYIT EKRANI: excel benzeri giriş ----------
function iscFormGoster(goster) {
  const l = document.getElementById('isc-liste-bolum'), f = document.getElementById('isc-form-bolum');
  if (l) l.style.display = goster ? 'none' : '';
  if (f) f.style.display = goster ? '' : 'none';
}
function iscFormKapat() { iscDuzenId = null; iscKalemYedek = {}; iscFormGoster(false); }

window.iscYeniBaslat = async function () {
  if (!aktifIsyeri?.id) { bil('İşyeri seçili değil', 'err'); return; }
  await iscPersonelYukle();
  iscDuzenId = null; iscKalemYedek = {};
  iscSatirlar = [iscBosSatir()];
  document.getElementById('isc-tarih').value = document.getElementById('isc-liste-tarih').value || iscBugun();
  iscFormCiz(); iscFormGoster(true);
  document.querySelector('#isc-satirlar [data-ilk]')?.focus();
};

function iscDuzenleAc(r) {
  iscDuzenId = r.id;
  if (!iscPersoneller.some(p => p.id === r.cari_id)) iscPersoneller.push({ id: r.cari_id, ad: r.kisi_ad, _yedek: true });
  iscKalemYedek = {};
  if (r.gider_kalem_id) iscKalemYedek[r.gider_kalem_id] = r.kalem_ad || 'Silinmiş kalem';
  iscSatirlar = [{ kisi: r.cari_id || '', kalem: r.gider_kalem_id || '', sure: r.sure ?? '', birim: r.birim || '', tutar: Number(r.tutar) ? r.tutar : '', aciklama: r.aciklama || '' }];
  document.getElementById('isc-tarih').value = r.tarih;
  iscFormCiz(); iscFormGoster(true);
}

function iscSatirHtml(s, i) {
  const kisiOpt = '<option value=""></option>' + iscPersoneller.map(p => `<option value="${p.id}"${p.id === s.kisi ? ' selected' : ''}>${iscEsc(p.ad)}</option>`).join('');
  const kalemOpt = '<option value=""></option>' + iscKalemSecenekleri().map(k => `<option value="${k.id}"${k.id === s.kalem ? ' selected' : ''}>${iscEsc(k.ad)}</option>`).join('');
  const duzenleme = !!iscDuzenId;
  return `<tr>
    <td><select ${i === 0 ? 'data-ilk="1"' : ''} onchange="iscSatirDeger(${i},'kisi',this.value)" onkeydown="satirAsagiGec(event)">${kisiOpt}</select></td>
    <td><select onchange="iscSatirDeger(${i},'kalem',this.value)" onkeydown="satirAsagiGec(event)">${kalemOpt}</select></td>
    <td><input type="number" min="0" step="0.25" value="${iscEsc(s.sure)}" style="text-align:right" oninput="iscSatirDeger(${i},'sure',this.value)" onkeydown="satirAsagiGec(event)"></td>
    <td><select onchange="iscSatirDeger(${i},'birim',this.value)" onkeydown="satirAsagiGec(event)">
      <option value=""${!s.birim ? ' selected' : ''}></option><option value="saat"${s.birim === 'saat' ? ' selected' : ''}>Saat</option><option value="gun"${s.birim === 'gun' ? ' selected' : ''}>Gün</option></select></td>
    <td><input type="number" min="0" step="0.01" value="${iscEsc(s.tutar)}" placeholder="0" style="text-align:right" oninput="iscSatirDeger(${i},'tutar',this.value)" onkeydown="satirAsagiGec(event)"></td>
    <td><input type="text" maxlength="500" value="${iscEsc(s.aciklama)}" oninput="iscSatirDeger(${i},'aciklama',this.value)" onkeydown="satirAsagiGec(event)"></td>
    <td style="white-space:nowrap;text-align:center">${duzenleme ? '' : `<button class="btn sm ghost" title="Aynı işi başka kişi için çoğalt" onclick="iscSatirCogalt(${i})">⧉</button><button class="btn sm ghost" title="Satırı sil" onclick="iscSatirSil(${i})">✕</button>`}</td>
  </tr>`;
}

function iscFormCiz() {
  const tb = document.getElementById('isc-satirlar'); if (!tb) return;
  tb.innerHTML = iscSatirlar.map(iscSatirHtml).join('');
  const uyari = document.getElementById('isc-uyari');
  if (uyari) uyari.innerHTML = !iscPersoneller.length
    ? '<div style="padding:8px 12px;font-size:12px;background:var(--turuncu-cok-ac);color:var(--turuncu);border-radius:8px;margin-bottom:8px">⚠ Personel kartı yok. Önce "Personel Kartları" ekranından kişileri ekleyin.</div>' : '';
  const b = document.getElementById('isc-form-baslik');
  if (b) b.textContent = iscDuzenId ? 'İşçilik Kaydı (Düzenle)' : 'İşçilik Kaydı';
}

// Son satıra bir şey yazılınca altına otomatik boş satır eklenir (fatura girişindeki gibi)
window.iscSatirDeger = function (i, alan, v) {
  const s = iscSatirlar[i]; if (!s) return;
  s[alan] = v;
  if (!iscDuzenId && i === iscSatirlar.length - 1 && iscSatirDolu(s)) {
    iscSatirlar.push(iscBosSatir());
    document.getElementById('isc-satirlar').insertAdjacentHTML('beforeend', iscSatirHtml(iscSatirlar[iscSatirlar.length - 1], iscSatirlar.length - 1));
  }
};
// Satırı çoğaltır: kalem, süre, birim, tutar ve açıklama kopyalanır; kişi boş gelir
window.iscSatirCogalt = function (i) {
  const s = iscSatirlar[i]; if (!s) return;
  iscSatirlar.splice(i + 1, 0, { ...s, kisi: '' });
  iscFormCiz();
};
window.iscSatirSil = function (i) {
  iscSatirlar.splice(i, 1);
  if (!iscSatirlar.length || iscSatirDolu(iscSatirlar[iscSatirlar.length - 1])) iscSatirlar.push(iscBosSatir());
  iscFormCiz();
};

window.iscKaydetmedenCik = async function () {
  const ok = await onay('Kaydetmeden çıkmak istiyor musunuz?', '⚠️', 'Evet', 'Hayır');
  if (ok) iscFormKapat();
};

window.iscKaydet = async function () {
  if (!aktifIsyeri?.id) { bil('İşyeri seçili değil', 'err'); return; }
  const tarih = document.getElementById('isc-tarih').value;
  if (!tarih) { bil('Tarih seçin!', 'err'); return; }
  const dolu = iscSatirlar.filter(iscSatirDolu);
  if (!dolu.length) { bil('Kaydedilecek satır yok', 'err'); return; }
  const kayit = [];
  for (let i = 0; i < dolu.length; i++) {
    const s = dolu[i], n = dolu.length > 1 ? `${iscSatirlar.indexOf(s) + 1}. satır: ` : '';
    if (!s.kisi) { bil(n + 'kişi seçin!', 'err'); return; }
    const sure = (s.sure === '' || s.sure == null) ? null : Number(s.sure);
    if (sure !== null && (isNaN(sure) || sure < 0)) { bil(n + 'süre geçersiz!', 'err'); return; }
    if (sure !== null && !s.birim) { bil(n + 'süre girdiyseniz birim (saat/gün) seçin!', 'err'); return; }
    const tutar = Number(s.tutar) || 0;
    if (tutar < 0) { bil(n + 'tutar eksi olamaz!', 'err'); return; }
    const p = iscPersoneller.find(x => x.id === s.kisi);
    const k = (typeof giderKalemleri !== 'undefined' ? giderKalemleri : []).find(x => x.id === s.kalem);
    kayit.push({
      isyeri_id: aktifIsyeri.id, tarih, cari_id: s.kisi, kisi_ad: p?.ad || '',
      gider_kalem_id: s.kalem || null, kalem_ad: k?.ad || iscKalemYedek[s.kalem] || null,
      sure, birim: sure !== null ? s.birim : null, tutar, aciklama: (s.aciklama || '').trim() || null
    });
  }
  let error;
  if (iscDuzenId) {
    ({ error } = await sb.from('isci_kayitlari').update(kayit[0]).eq('id', iscDuzenId).eq('isyeri_id', aktifIsyeri.id));
  } else {
    kayit.forEach(r => { r.kullanici = aktifKullanici?.ad || ''; });
    ({ error } = await sb.from('isci_kayitlari').insert(kayit));
  }
  if (error) { bil('Kaydedilemedi: ' + error.message, 'err'); return; }
  const duzenlemeydi = !!iscDuzenId;
  document.getElementById('isc-liste-tarih').value = tarih;   // kaydedilen günün listesi açılır
  iscFormKapat();
  await iscListeYenile();
  bil(duzenlemeydi ? 'Kayıt güncellendi ✓' : kayit.length + ' kayıt eklendi ✓');
};

// ---------- AYRI EKRAN: İŞÇİLİK RAPORU ----------
window.renderIscRapor = async function () {
  if (!aktifIsyeri?.id) return;
  await iscPersonelYukle();
  const b1 = document.getElementById('isc-r-bas'), b2 = document.getElementById('isc-r-bit');
  if (b1 && !b1.value) b1.value = iscBugun().slice(0, 8) + '01';
  if (b2 && !b2.value) b2.value = iscBugun();
  const k = document.getElementById('isc-r-kisi'), g = document.getElementById('isc-r-kalem');
  if (k) { const s = k.value; k.innerHTML = '<option value="">Tümü</option>' + iscPersoneller.map(p => `<option value="${p.id}">${iscEsc(p.ad)}</option>`).join(''); k.value = s; }
  if (g) { const s = g.value; g.innerHTML = '<option value="">Tümü</option>' + iscKalemSecenekleri().map(x => `<option value="${x.id}">${iscEsc(x.ad)}</option>`).join(''); g.value = s; }
  await iscRaporYenile();
};

window.iscRaporYenile = async function () {
  if (!aktifIsyeri?.id) return;
  const bas = document.getElementById('isc-r-bas').value, bit = document.getElementById('isc-r-bit').value;
  const kisi = document.getElementById('isc-r-kisi').value, kalem = document.getElementById('isc-r-kalem').value;
  let q = sb.from('isci_kayitlari').select('*').eq('isyeri_id', aktifIsyeri.id)
    .order('tarih', { ascending: false }).order('olusturma', { ascending: false }).limit(5000);
  if (bas) q = q.gte('tarih', bas);
  if (bit) q = q.lte('tarih', bit);
  if (kisi) q = q.eq('cari_id', kisi);
  if (kalem) q = q.eq('gider_kalem_id', kalem);
  const { data, error } = await q;
  if (error) { bil('Rapor okunamadı: ' + error.message, 'err'); return; }
  iscRaporKayitlar = data || [];
  iscRaporCiz();
};

function iscGrupla(anahtar) {
  const m = new Map();
  iscRaporKayitlar.forEach(r => {
    const a = anahtar(r) || '(Kalemsiz)';
    if (!m.has(a)) m.set(a, { ad: a, adet: 0, saat: 0, gun: 0, tutar: 0 });
    const g = m.get(a); g.adet++; g.tutar += Number(r.tutar) || 0;
    if (r.birim === 'saat') g.saat += Number(r.sure) || 0;
    if (r.birim === 'gun') g.gun += Number(r.sure) || 0;
  });
  return [...m.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}
function iscOzetTablo(baslik, satirlar) {
  if (!satirlar.length) return '';
  return `<div class="tw" style="margin-bottom:12px"><table><thead><tr><th>${baslik}</th><th style="text-align:right">Kayıt</th><th>Süre</th><th style="text-align:right">Tutar</th></tr></thead><tbody>`
    + satirlar.map(g => `<tr><td>${iscEsc(g.ad)}</td><td style="text-align:right">${g.adet}</td><td>${iscSureMetin(g.saat, g.gun)}</td><td style="text-align:right">${g.tutar ? iscSayi(g.tutar) + ' ₺' : '—'}</td></tr>`).join('')
    + '</tbody></table></div>';
}

function iscRaporCiz() {
  const el = document.getElementById('isc-rapor'); if (!el) return;
  if (!iscRaporKayitlar.length) { el.innerHTML = '<div class="bos">Seçilen aralıkta kayıt yok.</div>'; return; }
  const topSaat = iscRaporKayitlar.filter(r => r.birim === 'saat').reduce((a, r) => a + (Number(r.sure) || 0), 0);
  const topGun = iscRaporKayitlar.filter(r => r.birim === 'gun').reduce((a, r) => a + (Number(r.sure) || 0), 0);
  const topTutar = iscRaporKayitlar.reduce((a, r) => a + (Number(r.tutar) || 0), 0);
  const detay = iscRaporKayitlar.map(r => `<tr>
      <td style="white-space:nowrap">${iscTarihGoster(r.tarih)}</td>
      <td>${iscEsc(r.kisi_ad)}</td>
      <td>${iscEsc(r.kalem_ad || '')}</td>
      <td style="white-space:nowrap">${r.sure != null ? iscSayi(r.sure) + ' ' + (r.birim === 'gun' ? 'gün' : 'saat') : '—'}</td>
      <td style="text-align:right;white-space:nowrap">${Number(r.tutar) ? iscSayi(r.tutar) + ' ₺' : '—'}</td>
      <td style="min-width:200px">${iscEsc(r.aciklama || '')}</td>
    </tr>`).join('');
  el.innerHTML = `
    <div style="font-size:12px;color:var(--yazi2);margin-bottom:10px"><b>${iscRaporKayitlar.length}</b> kayıt · Toplam süre: <b>${iscSureMetin(topSaat, topGun)}</b>${topTutar ? ' · Toplam tutar: <b>' + iscSayi(topTutar) + ' ₺</b>' : ''}</div>
    ${iscOzetTablo('Kişiye göre', iscGrupla(r => r.kisi_ad))}
    ${iscOzetTablo('Gider kalemine göre', iscGrupla(r => r.kalem_ad))}
    <div style="font-size:11px;font-weight:600;color:var(--yazi2);text-transform:uppercase;letter-spacing:.04em;margin:6px 0 4px">Tüm kayıtlar</div>
    <div class="tw"><table><thead><tr><th>Tarih</th><th>Kişi</th><th>Kalem</th><th>Süre</th><th style="text-align:right">Tutar</th><th>Açıklama</th></tr></thead><tbody>${detay}</tbody></table></div>`;
}

// Raporda listelenen (filtreli) kayıtları Excel'in açabileceği CSV olarak indirir
window.iscCsv = function () {
  if (!iscRaporKayitlar.length) { bil('İndirilecek kayıt yok', 'err'); return; }
  const h = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const satirlar = [['Tarih', 'Kişi', 'Gider Kalemi', 'Süre', 'Birim', 'Tutar (TL)', 'Açıklama'].map(h).join(';')];
  iscRaporKayitlar.slice().reverse().forEach(r => satirlar.push([
    iscTarihGoster(r.tarih), r.kisi_ad, r.kalem_ad || '', r.sure != null ? String(r.sure).replace('.', ',') : '',
    r.sure != null ? (r.birim === 'gun' ? 'Gün' : 'Saat') : '', String(Number(r.tutar) || 0).replace('.', ','), r.aciklama || ''
  ].map(h).join(';')));
  const blob = new Blob(['﻿' + satirlar.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'iscilik_raporu_' + iscBugun() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
