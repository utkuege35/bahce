// ===== KASALAR ARASI TRANSFER =====
// Kasa İşlemleri → Transfer sekmesi. Bir kayıt iki bağlı kasa hareketi üretir (çıkış kasası −, giriş kasası +).
// Gelir/Gider raporlarına girmez; kasa bakiyesi ve Kasa Raporu'nda görünür. Kayıt/silme veritabanında tek işlemde yapılır.
let _ktListe = [];       // { belge_id, tarih, cikis_kasa, giris_kasa, tutar, aciklama, kullanici }
let _ktSecili = null, _ktDuzenId = null, _ktGor = false, _ktBakiyeler = {};
const _ktEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _ktTL = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _ktYerel = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const _ktTarih = t => { const p = String(t || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (t || ''); };
const _ktKasaAd = id => (typeof kasalar_list !== 'undefined' ? kasalar_list : []).find(k => String(k.id) === String(id))?.ad || '—';

window.ktGorunumListe = function () {
  _ktDuzenId = null; _ktGor = false;
  const l = document.getElementById('kt-liste-bolum'), f = document.getElementById('kt-form-bolum');
  if (f) f.style.display = 'none';
  if (l) l.style.display = '';
  document.body.classList.remove('islem-form-acik');
  ktListeYenile();
};

window.ktListeYenile = async function (bitisDegisti) {
  const tb = document.getElementById('kt-liste-tb'); if (!tb || !aktifIsyeri?.id) return;
  const basEl = document.getElementById('kt-liste-tarih'), bitEl = document.getElementById('kt-liste-bit');
  if (!basEl.dataset.ilk) { basEl.dataset.ilk = '1'; basEl.value = _ktYerel().slice(0, 4) + '-01-01'; bitEl.value = _ktYerel(); } // varsayılan: ayın 1'i – bugün
  if (!basEl.value) basEl.value = _ktYerel();
  if (bitEl.value && bitEl.value < basEl.value) { if (bitisDegisti) basEl.value = bitEl.value; else bitEl.value = basEl.value; }
  const bas = basEl.value, bit = bitEl.value || bas;
  tb.innerHTML = '<div class="bos">Yükleniyor...</div>';
  let satirlar;
  try {
    satirlar = await sbSayfali(() => _aktifIslemSorgusu().eq('alt_tur', 'kasa_transfer').gte('tarih', bas).lte('tarih', bit).order('tarih', { ascending: false }).order('ts', { ascending: false }).order('id'));
  } catch (e) { tb.innerHTML = `<div class="bos">Liste okunamadı: ${_ktEsc(e.message)}</div>`; return; }
  const grup = {};
  satirlar.forEach(r => {
    const g = grup[r.belge_id] = grup[r.belge_id] || { belge_id: r.belge_id, tarih: r.tarih, tutar: Math.abs(parseFloat(r.kasa_etkisi) || 0), aciklama: r.aciklama, kullanici: r.kullanici, ts: r.ts };
    if ((parseFloat(r.kasa_etkisi) || 0) < 0) g.cikis_kasa = r.kasa_id; else g.giris_kasa = r.kasa_id;
  });
  _ktListe = Object.values(grup);
  const oz = document.getElementById('kt-liste-ozet');
  if (oz) oz.textContent = _ktListe.length ? `${_ktListe.length} transfer · ${_ktTL(_ktListe.reduce((a, g) => a + g.tutar, 0))}` : '';
  if (!_ktListe.length) { tb.innerHTML = '<div class="bos">Bu tarih aralığında transfer yok.</div>'; _ktSecili = null; return; }
  if (!_ktListe.some(g => g.belge_id === _ktSecili)) _ktSecili = null;
  tb.innerHTML = `<div class="tw"><table><thead><tr><th>Tarih</th><th>Çıkış Kasası</th><th>Giriş Kasası</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th>Kullanıcı</th></tr></thead><tbody>${_ktListe.map(g => `
    <tr data-id="${g.belge_id}" onclick="ktSec('${g.belge_id}')" ondblclick="ktSec('${g.belge_id}');ktListeIslem('goruntule')" style="cursor:pointer;${_ktSecili === g.belge_id ? 'background:var(--yesil-cok-ac);' : ''}">
      <td style="font-size:12px">${_ktTarih(g.tarih)}</td>
      <td style="font-size:12px">${_ktEsc(_ktKasaAd(g.cikis_kasa))}</td>
      <td style="font-size:12px">${_ktEsc(_ktKasaAd(g.giris_kasa))}</td>
      <td style="font-size:11px;color:var(--yazi2)">${_ktEsc(g.aciklama || '')}</td>
      <td style="text-align:right;font-weight:500">${_ktTL(g.tutar)}</td>
      <td style="font-size:11px;color:var(--yazi3)">${_ktEsc(g.kullanici || '')}</td>
    </tr>`).join('')}</tbody></table></div>`;
};

window.ktSec = function (id) {
  _ktSecili = id;
  document.querySelectorAll('#kt-liste-tb tr[data-id]').forEach(tr => { tr.style.background = tr.dataset.id === id ? 'var(--yesil-cok-ac)' : ''; });
};

window.ktListeIslem = function (islem) {
  const id = _ktSecili;
  if (!id) { bil('Önce listeden bir kayıt seçin', 'err'); return; }
  if (islem === 'goruntule') ktAc(id, true);
  else if (islem === 'duzenle') ktAc(id, false);
  else if (islem === 'sil') ktSil(id);
};

async function _ktFormHazirla() {
  await kasaSelectDoldur('kt-cikis', true);
  await kasaSelectDoldur('kt-giris', true);
  try { _ktBakiyeler = await kasaBakiyelerDb(); } catch (e) { _ktBakiyeler = {}; }
}
function _ktFormGoster(baslik, salt) {
  document.getElementById('kt-form-baslik').textContent = baslik;
  document.querySelectorAll('#kt-form-bolum input,#kt-form-bolum select').forEach(el => { el.disabled = salt; });
  document.getElementById('kt-kaydet-btn').style.display = salt ? 'none' : '';
  document.getElementById('kt-cik-btn').textContent = salt ? 'Kapat' : 'Kaydetmeden Çık';
  document.getElementById('kt-liste-bolum').style.display = 'none';
  document.getElementById('kt-form-bolum').style.display = '';
  document.body.classList.add('islem-form-acik');
  ktBakiyeGoster();
}

window.ktYeniBaslat = async function () {
  _ktDuzenId = null; _ktGor = false;
  await _ktFormHazirla();
  document.getElementById('kt-tarih').value = _ktYerel();
  document.getElementById('kt-tutar').value = '';
  document.getElementById('kt-aciklama').value = '';
  document.getElementById('kt-cikis').value = ''; document.getElementById('kt-giris').value = '';
  _ktFormGoster('Kasa Transferi', false);
};

async function ktAc(id, salt) {
  const g = _ktListe.find(x => x.belge_id === id); if (!g) { bil('Kayıt bulunamadı', 'err'); return; }
  _ktDuzenId = id; _ktGor = salt;
  await _ktFormHazirla();
  const ekle = (el, kid) => { if (kid && ![...el.options].some(o => o.value === kid)) el.insertAdjacentHTML('beforeend', `<option value="${kid}">${_ktEsc(_ktKasaAd(kid))}</option>`); el.value = kid || ''; };
  ekle(document.getElementById('kt-cikis'), g.cikis_kasa); ekle(document.getElementById('kt-giris'), g.giris_kasa);
  document.getElementById('kt-tarih').value = g.tarih;
  document.getElementById('kt-tutar').value = g.tutar;
  document.getElementById('kt-aciklama').value = g.aciklama && g.aciklama !== 'Kasa transferi' ? g.aciklama : '';
  _ktFormGoster('Kasa Transferi' + (salt ? ' — Görüntüleme' : ' — Düzenleme'), salt);
}

window.ktBakiyeGoster = function () {
  [['kt-cikis', 'kt-cikis-bakiye'], ['kt-giris', 'kt-giris-bakiye']].forEach(([s, b]) => {
    const kid = document.getElementById(s)?.value, el = document.getElementById(b); if (!el) return;
    if (!kid) { el.textContent = ''; return; }
    const v = parseFloat(_ktBakiyeler[kid]) || 0;
    el.innerHTML = `Kasa bakiyesi: <strong style="${v < 0 ? 'color:#c62828' : ''}">${_ktTL(v)}</strong>`;
  });
};

window.ktKaydetmedenCik = async function () {
  if (_ktGor) { ktGorunumListe(); return; }
  if (await onay('Kaydetmeden çıkmak istiyor musunuz?', '⚠️', 'Evet', 'Hayır')) ktGorunumListe();
};

window.ktKaydet = async function () {
  if (_ktGor) return;
  const tarih = document.getElementById('kt-tarih').value, cikis = document.getElementById('kt-cikis').value, giris = document.getElementById('kt-giris').value;
  const tutar = parseFloat(document.getElementById('kt-tutar').value) || 0;
  if (!tarih) { bil('Tarih zorunlu!', 'err'); return; }
  if (!cikis || !giris) { bil('Çıkış ve giriş kasasını seçin!', 'err'); return; }
  if (cikis === giris) { bil('Çıkış ve giriş kasası aynı olamaz!', 'err'); return; }
  if (!(tutar > 0)) { bil('Tutar sıfırdan büyük olmalı!', 'err'); return; }
  const btn = document.getElementById('kt-kaydet-btn'); btn.disabled = true;
  try {
    const { error } = await sb.rpc('kasa_transfer_yaz', {
      p_id: _ktDuzenId, p_isyeri: aktifIsyeri.id, p_tarih: tarih, p_cikis: cikis, p_giris: giris, p_tutar: tutar,
      p_aciklama: document.getElementById('kt-aciklama').value.trim() || null, p_kullanici: aktifKullanici?.ad || null
    });
    if (error) throw error;
  } catch (e) { btn.disabled = false; bil('Kaydedilemedi: ' + e.message, 'err'); return; }
  btn.disabled = false;
  try { if (typeof islemleriYenile === 'function') await islemleriYenile(); } catch (e) { /* liste zaten sunucudan okunur */ }
  bil('Transfer kaydedildi ✓');
  ktGorunumListe();
};

async function ktSil(id) {
  if (!(await onay('Bu transferi silmek istiyor musunuz? Her iki kasadaki hareket de silinir.', '🗑️'))) return;
  const { error } = await sb.rpc('kasa_transfer_sil', { p_id: id, p_kullanici: aktifKullanici?.ad || '' });
  if (error) { bil('Silinemedi: ' + error.message, 'err'); return; }
  try { if (typeof islemleriYenile === 'function') await islemleriYenile(); } catch (e) { /* önemsiz */ }
  _ktSecili = null; bil('Transfer silindi ✓'); ktListeYenile();
}
