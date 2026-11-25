// ===== İŞÇİLİK KAYITLARI =====
// Aile içi / kendi yaptığımız işlerin kişi bazlı kaydı. Süre, birim ve tutar boş geçilebilir (tutar boşsa 0).
// Bu kayıtlar kasa ve fatura hareketi üretmez; Panel / Finans Raporları'nı etkilemez. Kendi raporu bu ekrandadır.
let iscKayitlar = [];
let iscPersoneller = [];
let iscKalemYedek = {};   // düzenlenen kayıtta artık listede olmayan kalem adı
let iscSatirlar = [];
let iscDuzenId = null;

const iscEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iscBugun = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const iscSayi = n => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const iscTarihGoster = t => { const p = String(t || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (t || ''); };
const iscBosSatir = (kopya) => ({ kisi: '', kalem: kopya?.kalem || '', sure: '', birim: '', tutar: '', aciklama: kopya?.aciklama || '' });

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

window.renderIscilik = async function () {
  if (!aktifIsyeri?.id) return;
  await iscPersonelYukle();
  const t = document.getElementById('isc-tarih');
  if (t && !t.value) t.value = iscBugun();
  const b1 = document.getElementById('isc-f-bas'), b2 = document.getElementById('isc-f-bit');
  if (b1 && !b1.value) b1.value = iscBugun().slice(0, 8) + '01';
  if (b2 && !b2.value) b2.value = iscBugun();
  if (!iscSatirlar.length) iscSatirlar = [iscBosSatir()];
  iscFormCiz();
  iscFiltreDoldur();
  await iscListele();
};

function iscFiltreDoldur() {
  const k = document.getElementById('isc-f-kisi'), g = document.getElementById('isc-f-kalem');
  if (k) { const s = k.value; k.innerHTML = '<option value="">Tümü</option>' + iscPersoneller.map(p => `<option value="${p.id}">${iscEsc(p.ad)}</option>`).join(''); k.value = s; }
  if (g) { const s = g.value; g.innerHTML = '<option value="">Tümü</option>' + iscKalemSecenekleri().map(x => `<option value="${x.id}">${iscEsc(x.ad)}</option>`).join(''); g.value = s; }
}

function iscFormCiz() {
  const el = document.getElementById('isc-satirlar'); if (!el) return;
  const kisiOpt = sec => '<option value="">— Kişi seçin —</option>' + iscPersoneller.map(p => `<option value="${p.id}"${p.id === sec ? ' selected' : ''}>${iscEsc(p.ad)}</option>`).join('');
  const kalemOpt = sec => '<option value="">— Seçilmedi —</option>' + iscKalemSecenekleri().map(k => `<option value="${k.id}"${k.id === sec ? ' selected' : ''}>${iscEsc(k.ad)}</option>`).join('');
  const bos = !iscPersoneller.length
    ? '<div style="padding:8px 12px;font-size:12px;background:var(--turuncu-cok-ac);color:var(--turuncu);border-radius:8px;margin-bottom:8px">⚠ Personel kartı yok. Önce "Cari & Personel Kartları" ekranından kişileri <b>Personel</b> olarak ekleyin.</div>' : '';
  el.innerHTML = bos + iscSatirlar.map((s, i) => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">
        <div class="fg"><label>Kişi</label><select onchange="iscSatirDeger(${i},'kisi',this.value)">${kisiOpt(s.kisi)}</select></div>
        <div class="fg"><label>Gider kalemi</label><select onchange="iscSatirDeger(${i},'kalem',this.value)">${kalemOpt(s.kalem)}</select></div>
        <div class="fg"><label>Süre (boş olabilir)</label><input type="number" min="0" step="0.25" value="${iscEsc(s.sure)}" placeholder="—" oninput="iscSatirDeger(${i},'sure',this.value)"></div>
        <div class="fg"><label>Birim</label><select onchange="iscSatirDeger(${i},'birim',this.value)">
          <option value=""${!s.birim ? ' selected' : ''}>—</option><option value="saat"${s.birim === 'saat' ? ' selected' : ''}>Saat</option><option value="gun"${s.birim === 'gun' ? ' selected' : ''}>Gün</option></select></div>
        <div class="fg"><label>Tutar TL (boş = 0)</label><input type="number" min="0" step="0.01" value="${iscEsc(s.tutar)}" placeholder="0" oninput="iscSatirDeger(${i},'tutar',this.value)"></div>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;margin-top:8px">
        <div class="fg" style="flex:1"><label>Açıklama</label><input type="text" maxlength="500" value="${iscEsc(s.aciklama)}" placeholder="örn. Serada iplerin yukarı asılması" oninput="iscSatirDeger(${i},'aciklama',this.value)"></div>
        ${iscSatirlar.length > 1 ? `<button class="btn sm ghost" title="Satırı sil" onclick="iscSatirSil(${i})">✕</button>` : ''}
      </div>
    </div>`).join('');
  const baslik = document.getElementById('isc-form-baslik');
  if (baslik) baslik.textContent = iscDuzenId ? 'Kaydı Düzenle' : 'Yeni İşçilik Kaydı';
  const ekle = document.getElementById('isc-satir-ekle'); if (ekle) ekle.style.display = iscDuzenId ? 'none' : '';
  const ipt = document.getElementById('isc-iptal'); if (ipt) ipt.style.display = iscDuzenId ? '' : 'none';
}

window.iscSatirDeger = function (i, alan, v) { if (iscSatirlar[i]) iscSatirlar[i][alan] = v; };
window.iscSatirEkle = function () {
  iscSatirlar.push(iscBosSatir(iscSatirlar[iscSatirlar.length - 1])); // önceki satırın kalem ve açıklaması kopyalanır, kişi boş gelir
  iscFormCiz();
};
window.iscSatirSil = function (i) { iscSatirlar.splice(i, 1); if (!iscSatirlar.length) iscSatirlar = [iscBosSatir()]; iscFormCiz(); };
window.iscIptal = function () { iscDuzenId = null; iscSatirlar = [iscBosSatir()]; iscFormCiz(); };

window.iscKaydet = async function () {
  if (!aktifIsyeri?.id) { bil('İşyeri seçili değil', 'err'); return; }
  const tarih = document.getElementById('isc-tarih').value;
  if (!tarih) { bil('Tarih seçin!', 'err'); return; }
  const dolu = iscSatirlar.filter(s => s.kisi || s.kalem || s.sure || s.tutar || (s.aciklama || '').trim());
  if (!dolu.length) { bil('Kaydedilecek satır yok', 'err'); return; }
  const kayit = [];
  for (let i = 0; i < dolu.length; i++) {
    const s = dolu[i], n = dolu.length > 1 ? `${i + 1}. satır: ` : '';
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
  iscDuzenId = null; iscKalemYedek = {}; iscSatirlar = [iscBosSatir()];
  iscFormCiz(); iscFiltreDoldur();
  await iscListele();
  bil(duzenlemeydi ? 'Kayıt güncellendi ✓' : kayit.length + ' kayıt eklendi ✓');
};

window.iscListele = async function () {
  if (!aktifIsyeri?.id) return;
  const bas = document.getElementById('isc-f-bas').value, bit = document.getElementById('isc-f-bit').value;
  const kisi = document.getElementById('isc-f-kisi').value, kalem = document.getElementById('isc-f-kalem').value;
  let q = sb.from('isci_kayitlari').select('*').eq('isyeri_id', aktifIsyeri.id)
    .order('tarih', { ascending: false }).order('olusturma', { ascending: false }).limit(5000);
  if (bas) q = q.gte('tarih', bas);
  if (bit) q = q.lte('tarih', bit);
  if (kisi) q = q.eq('cari_id', kisi);
  if (kalem) q = q.eq('gider_kalem_id', kalem);
  const { data, error } = await q;
  if (error) { bil('Kayıtlar okunamadı: ' + error.message, 'err'); return; }
  iscKayitlar = data || [];
  iscRaporCiz();
};

function iscSureMetin(saat, gun) {
  const p = [];
  if (saat) p.push(iscSayi(saat) + ' saat');
  if (gun) p.push(iscSayi(gun) + ' gün');
  return p.length ? p.join(' · ') : '—';
}
function iscGrupla(anahtar) {
  const m = new Map();
  iscKayitlar.forEach(r => {
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
  if (!iscKayitlar.length) { el.innerHTML = '<div class="bos">Seçilen aralıkta kayıt yok.</div>'; return; }
  const topSaat = iscKayitlar.filter(r => r.birim === 'saat').reduce((a, r) => a + (Number(r.sure) || 0), 0);
  const topGun = iscKayitlar.filter(r => r.birim === 'gun').reduce((a, r) => a + (Number(r.sure) || 0), 0);
  const topTutar = iscKayitlar.reduce((a, r) => a + (Number(r.tutar) || 0), 0);
  const detay = iscKayitlar.map(r => `<tr>
      <td style="white-space:nowrap">${iscTarihGoster(r.tarih)}</td>
      <td>${iscEsc(r.kisi_ad)}</td>
      <td>${iscEsc(r.kalem_ad || '')}</td>
      <td style="white-space:nowrap">${r.sure != null ? iscSayi(r.sure) + ' ' + (r.birim === 'gun' ? 'gün' : 'saat') : '—'}</td>
      <td style="text-align:right;white-space:nowrap">${Number(r.tutar) ? iscSayi(r.tutar) + ' ₺' : '—'}</td>
      <td style="min-width:200px">${iscEsc(r.aciklama || '')}</td>
      <td style="white-space:nowrap;text-align:right"><button class="btn sm" onclick="iscDuzenle('${r.id}')">✏</button> <button class="btn sm ghost" onclick="iscSil('${r.id}')">✕</button></td>
    </tr>`).join('');
  el.innerHTML = `
    <div style="font-size:12px;color:var(--yazi2);margin-bottom:10px"><b>${iscKayitlar.length}</b> kayıt · Toplam süre: <b>${iscSureMetin(topSaat, topGun)}</b>${topTutar ? ' · Toplam tutar: <b>' + iscSayi(topTutar) + ' ₺</b>' : ''}</div>
    ${iscOzetTablo('Kişiye göre', iscGrupla(r => r.kisi_ad))}
    ${iscOzetTablo('Gider kalemine göre', iscGrupla(r => r.kalem_ad))}
    <div style="font-size:11px;font-weight:600;color:var(--yazi2);text-transform:uppercase;letter-spacing:.04em;margin:6px 0 4px">Tüm kayıtlar</div>
    <div class="tw"><table><thead><tr><th>Tarih</th><th>Kişi</th><th>Kalem</th><th>Süre</th><th style="text-align:right">Tutar</th><th>Açıklama</th><th></th></tr></thead><tbody>${detay}</tbody></table></div>`;
}

window.iscDuzenle = function (id) {
  const r = iscKayitlar.find(x => x.id === id); if (!r) return;
  iscDuzenId = id;
  if (!iscPersoneller.some(p => p.id === r.cari_id)) iscPersoneller.push({ id: r.cari_id, ad: r.kisi_ad, _yedek: true });
  iscKalemYedek = {};
  if (r.gider_kalem_id) iscKalemYedek[r.gider_kalem_id] = r.kalem_ad || 'Silinmiş kalem';
  iscSatirlar = [{ kisi: r.cari_id || '', kalem: r.gider_kalem_id || '', sure: r.sure ?? '', birim: r.birim || '', tutar: Number(r.tutar) ? r.tutar : '', aciklama: r.aciklama || '' }];
  document.getElementById('isc-tarih').value = r.tarih;
  iscFormCiz();
  document.getElementById('isc-form-karti')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.iscSil = async function (id) {
  if (!(await onay('Bu işçilik kaydını silmek istiyor musunuz?', '🗑️'))) return;
  const { error } = await sb.from('isci_kayitlari').delete().eq('id', id).eq('isyeri_id', aktifIsyeri.id);
  if (error) { bil('Silinemedi: ' + error.message, 'err'); return; }
  if (iscDuzenId === id) window.iscIptal();
  await iscListele();
  bil('Silindi ✓');
};

// Listelenen (filtreli) kayıtları Excel'in açabileceği CSV olarak indirir
window.iscCsv = function () {
  if (!iscKayitlar.length) { bil('İndirilecek kayıt yok', 'err'); return; }
  const h = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const satirlar = [['Tarih', 'Kişi', 'Gider Kalemi', 'Süre', 'Birim', 'Tutar (TL)', 'Açıklama'].map(h).join(';')];
  iscKayitlar.slice().reverse().forEach(r => satirlar.push([
    iscTarihGoster(r.tarih), r.kisi_ad, r.kalem_ad || '', r.sure != null ? String(r.sure).replace('.', ',') : '',
    r.sure != null ? (r.birim === 'gun' ? 'Gün' : 'Saat') : '', String(Number(r.tutar) || 0).replace('.', ','), r.aciklama || ''
  ].map(h).join(';')));
  const blob = new Blob(['﻿' + satirlar.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'iscilik_kayitlari_' + iscBugun() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
