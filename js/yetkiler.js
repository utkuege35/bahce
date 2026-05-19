// ===== YETKİ ŞABLONLARI =====

window.renderYetkiler = function() {
  const el = document.getElementById('yetkiler-liste'); if (!el) return;
  if (!yetkiSablonlari.length) {
    el.innerHTML = '<div class="bos">Henüz yetki şablonu tanımlanmamış.<br><small>Şablon oluşturup kullanıcılara atayabilirsiniz.</small></div>';
    return;
  }
  el.innerHTML = yetkiSablonlari.map(s => {
    const isyeri = isyerleri.find(i => i.id === s.isyeri_id);
    const atananlar = kullanicilar.filter(k =>
      kullaniciYetkiSablonlari.some(a => a.sablon_id === s.id && a.kullanici_id === k.id)
    );
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--yazi1)">${s.ad}</div>
          <div style="font-size:11px;color:var(--yazi3);margin-top:2px">
            ${isyeri ? `🏪 ${isyeri.ad}` : '🌐 Tüm işyerleri'}
            ${s.aciklama ? ' · ' + s.aciklama : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn sm" onclick="sablonGoruntule('${s.id}')">👁</button>
          <button class="btn sm" onclick="sablonDuzenle('${s.id}')">✏</button>
          <button class="btn sm ghost" onclick="sablonSil('${s.id}')">✕</button>
        </div>
      </div>
      <!-- Yetki özeti -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
        ${EKRANLAR.map(e => {
          const ey = s.yetkiler?.[e.id] || {};
          const aktifEylemler = EYLEMLER.filter(ey2 => ey[ey2.id]).map(ey2 => ey2.ikon).join('');
          if(!aktifEylemler) return '';
          return `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--yesil-cok-ac);color:var(--yesil)">${e.ad}: ${aktifEylemler}</span>`;
        }).join('')}
      </div>
      <!-- Atanan kullanıcılar -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--yazi3)">Atanan:</span>
        ${atananlar.length ? atananlar.map(k => `
          <span style="font-size:11px;background:var(--krem2);padding:2px 8px;border-radius:10px;display:inline-flex;align-items:center;gap:4px">
            ${k.ad} ${k.soyad||''}
            <button onclick="sablonKullaniciKaldir('${s.id}','${k.id}')" style="background:none;border:none;color:var(--turuncu);cursor:pointer;font-size:12px;padding:0;line-height:1">×</button>
          </span>`).join('') :
          '<span style="font-size:11px;color:var(--yazi3)">Henüz kimse atanmamış</span>'
        }
        <button class="btn sm sec" onclick="sablonKullaniciEkleAc('${s.id}')">+ Kullanıcı Ekle</button>
      </div>
    </div>`;
  }).join('');
};

// Şablon modal aç (yeni)
window.sablonModalAc = function() {
  document.getElementById('ys-id').value = '';
  document.getElementById('ys-title').textContent = 'Yeni Yetki Şablonu';
  document.getElementById('ys-ad').value = '';
  document.getElementById('ys-aciklama').value = '';
  document.getElementById('ys-isyeri').value = '';
  _sablonYetkiDoldur({});
  modalAc('modal-yetki-sablon');
  setTimeout(() => modalMod('modal-yetki-sablon', 'duzenle'), 50);
};

// Görüntüle
window.sablonGoruntule = function(id) {
  const s = yetkiSablonlari.find(x => x.id === id); if (!s) return;
  _sablonFormuDoldur(s);
  document.getElementById('ys-title').textContent = s.ad + ' — Görüntüleme';
  modalAc('modal-yetki-sablon');
  setTimeout(() => modalMod('modal-yetki-sablon', 'goruntule'), 50);
};

// Düzenle
window.sablonDuzenle = function(id) {
  const s = yetkiSablonlari.find(x => x.id === id); if (!s) return;
  _sablonFormuDoldur(s);
  document.getElementById('ys-title').textContent = s.ad + ' — Düzenle';
  modalAc('modal-yetki-sablon');
  setTimeout(() => modalMod('modal-yetki-sablon', 'duzenle'), 50);
};

function _sablonFormuDoldur(s) {
  document.getElementById('ys-id').value = s.id;
  document.getElementById('ys-ad').value = s.ad || '';
  document.getElementById('ys-aciklama').value = s.aciklama || '';
  // İşyeri select doldur
  const sel = document.getElementById('ys-isyeri');
  sel.innerHTML = '<option value="">🌐 Tüm işyerleri (genel)</option>' +
    isyerleri.map(i => `<option value="${i.id}"${i.id === s.isyeri_id ? ' selected' : ''}>${i.ad}</option>`).join('');
  _sablonYetkiDoldur(s.yetkiler || {});
}

function _sablonYetkiDoldur(yetkiler) {
  EKRANLAR.forEach(e => {
    EYLEMLER.forEach(ey => {
      const el = document.getElementById(`ys-${e.id}-${ey.id}`);
      if (el) el.checked = yetkiler?.[e.id]?.[ey.id] === true;
    });
  });
}

function _sablonYetkilerOku() {
  const y = {};
  EKRANLAR.forEach(e => {
    y[e.id] = {};
    EYLEMLER.forEach(ey => {
      const el = document.getElementById(`ys-${e.id}-${ey.id}`);
      y[e.id][ey.id] = el ? el.checked : false;
    });
  });
  return y;
}

window.sablonKaydet = async function() {
  const id = document.getElementById('ys-id').value;
  const ad = document.getElementById('ys-ad').value.trim();
  const aciklama = document.getElementById('ys-aciklama').value.trim();
  const isyeri_id = document.getElementById('ys-isyeri').value || null;
  const yetkiler = _sablonYetkilerOku();
  if (!ad) { bil('Şablon adı zorunlu!', 'err'); return; }
  if (id) {
    await sb.from('yetki_sablonlari').update({ ad, aciklama, isyeri_id, yetkiler }).eq('id', id);
  } else {
    await sb.from('yetki_sablonlari').insert({ ad, aciklama, isyeri_id, yetkiler, aktif: true });
  }
  await _yetkiYenile();
  modalKapat('modal-yetki-sablon');
  renderYetkiler();
  bil('Şablon kaydedildi ✓');
};

window.sablonSil = async function(id) {
  const s = yetkiSablonlari.find(x => x.id === id);
  if (!(await onay(`<b>${s?.ad}</b> şablonu silinecek. Atamalar da kaldırılır.`, '🗑️'))) return;
  await sb.from('kullanici_yetki_sablonlari').delete().eq('sablon_id', id);
  await sb.from('yetki_sablonlari').delete().eq('id', id);
  await _yetkiYenile();
  renderYetkiler();
  bil('Şablon silindi ✓');
};

// Kullanıcı atama
window.sablonKullaniciEkleAc = function(sablonId) {
  document.getElementById('ys-atama-sablon-id').value = sablonId;
  const sel = document.getElementById('ys-atama-kullanici');
  const zatenAtananlar = kullaniciYetkiSablonlari.filter(a => a.sablon_id === sablonId).map(a => a.kullanici_id);
  sel.innerHTML = '<option value="">— Kullanıcı seçin —</option>' +
    kullanicilar.filter(k => k.rol !== 'admin' && !zatenAtananlar.includes(k.id))
      .map(k => `<option value="${k.id}">${k.ad} ${k.soyad || ''} (@${k.kullanici_adi})</option>`).join('');
  const iySel = document.getElementById('ys-atama-isyeri');
  iySel.innerHTML = '<option value="">🌐 Tüm işyerleri</option>' +
    isyerleri.map(i => `<option value="${i.id}">${i.ad}</option>`).join('');
  modalAc('modal-yetki-atama');
};

window.sablonKullaniciKaydet = async function() {
  const sablonId = document.getElementById('ys-atama-sablon-id').value;
  const kulId = document.getElementById('ys-atama-kullanici').value;
  const isyeriId = document.getElementById('ys-atama-isyeri').value || null;
  if (!kulId) { bil('Kullanıcı seçin!', 'err'); return; }
  await sb.from('kullanici_yetki_sablonlari').insert({
    kullanici_id: kulId, sablon_id: sablonId, isyeri_id: isyeriId
  });
  await _yetkiYenile();
  modalKapat('modal-yetki-atama');
  renderYetkiler();
  bil('Kullanıcı eklendi ✓');
};

window.sablonKullaniciKaldir = async function(sablonId, kulId) {
  if (!(await onay('Bu kullanıcıyı şablondan kaldır?', '⚠️'))) return;
  await sb.from('kullanici_yetki_sablonlari').delete()
    .eq('sablon_id', sablonId).eq('kullanici_id', kulId);
  await _yetkiYenile();
  renderYetkiler();
  bil('Kaldırıldı ✓');
};

// Yetki verilerini yenile
async function _yetkiYenile() {
  const [{data:ys},{data:kys}] = await Promise.all([
    sb.from('yetki_sablonlari').select('*').eq('aktif', true),
    sb.from('kullanici_yetki_sablonlari').select('*')
  ]);
  if (ys) yetkiSablonlari = ys;
  if (kys) kullaniciYetkiSablonlari = kys;
}

// Tüm sayfada yetki butonlarını uygula
window.yetkiButonlariUygula = function() {
  if (aktifKullanici?.rol === 'admin') return; // Admin için gerek yok

  const butonMap = {
    // stoklar
    'btn-yeni-stok': ['stok','ekle'],
    'btn-yeni-stok-grup': ['stok','ekle'],
    // urunler
    'btn-yeni-urun': ['urunler','ekle'],
    'btn-yeni-urun-grup': ['urunler','ekle'],
    'btn-yeni-ara-urun': ['urunler','ekle'],
  };

  Object.entries(butonMap).forEach(([id, [ekran, eylem]]) => {
    const el = document.getElementById(id);
    if (el && !yetkiVar(ekran, eylem)) el.style.display = 'none';
  });
};

// Yetki tablosunu doldur (modal açıldığında)
window.sablonYetkiTabloOlustur = function() {
  const tbody = document.getElementById('ys-yetki-tablo');
  if (!tbody) return;
  tbody.innerHTML = EKRANLAR.map(e => `
    <tr style="border-bottom:1px solid var(--krem2)">
      <td style="padding:8px 10px;font-weight:500">${e.ad}</td>
      ${EYLEMLER.map(ey => `
        <td style="padding:8px;text-align:center">
          <input type="checkbox" id="ys-${e.id}-${ey.id}"
            style="width:16px;height:16px;cursor:pointer;accent-color:var(--yesil)">
        </td>`).join('')}
    </tr>`).join('');
};

window.sablonHepsiniSec = function(sec) {
  EKRANLAR.forEach(e => EYLEMLER.forEach(ey => {
    const el = document.getElementById(`ys-${e.id}-${ey.id}`);
    if (el && !el.disabled) el.checked = sec;
  }));
};
