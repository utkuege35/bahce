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
  if(typeof _ysTumCheckSifirla==='function')_ysTumCheckSifirla();
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

// ===== KULLANICI YETKİLERİ SAYFASI =====

window.renderKulYetkiler = function() {
  const el = document.getElementById('kul-yetkiler-liste'); if (!el) return;

  // Filtre select doldur
  const filtreSel = document.getElementById('kul-yetki-filtre');
  if (filtreSel) {
    const secili = filtreSel.value;
    filtreSel.innerHTML = '<option value="">Tüm kullanıcılar</option>' +
      kullanicilar.filter(k => k.rol !== 'admin').map(k =>
        `<option value="${k.id}"${k.id===secili?' selected':''}>${k.ad} ${k.soyad||''} (@${k.kullanici_adi})</option>`
      ).join('');
  }

  const filtre = filtreSel?.value || '';
  const liste = kullanicilar.filter(k => k.rol !== 'admin' && (!filtre || k.id === filtre));

  if (!liste.length) {
    el.innerHTML = '<div class="bos">Kullanıcı bulunamadı.</div>';
    return;
  }

  el.innerHTML = liste.map(k => {
    const yetkiOzet = _yetkiOzetHTML(k.crud_yetkiler || {});
    const atananSablonlar = kullaniciYetkiSablonlari.filter(a => a.kullanici_id === k.id);
    const ini = (k.ad||'?')[0].toUpperCase() + (k.soyad||'')[0]?.toUpperCase()||'';
    return `<div class="card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--yesil-cok-ac);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--yesil)">${ini}</div>
          <div>
            <div style="font-size:13px;font-weight:600">${k.ad} ${k.soyad||''}</div>
            <div style="font-size:11px;color:var(--yazi3)">@${k.kullanici_adi}</div>
          </div>
        </div>
        <button class="btn sm pri" onclick="kulYetkiDuzenleAc('${k.id}')">✏ Yetkileri Düzenle</button>
      </div>
      <!-- Mevcut yetkiler özeti -->
      <div style="margin-top:10px">
        <div style="font-size:10px;font-weight:600;color:var(--yazi3);margin-bottom:5px">KULLANICI YETKİLERİ:</div>
        ${yetkiOzet || '<span style="font-size:11px;color:var(--yazi3)">Yetki tanımlanmamış</span>'}
        ${k.crud_isyeriler?.length ? `
          <div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">
            <span style="font-size:10px;color:var(--yazi3)">İşyerler:</span>
            ${k.crud_isyeriler.map(id => {
              const iy = isyerleri.find(x => x.id === id);
              return iy ? `<span style="font-size:10px;background:var(--yesil-cok-ac);color:var(--yesil);padding:1px 6px;border-radius:8px">${iy.ad}</span>` : '';
            }).join('')}
          </div>` : '<div style="font-size:10px;color:var(--yazi3);margin-top:3px">🌐 Tüm işyerlerinde geçerli</div>'}
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--krem2)">
        <div style="font-size:10px;font-weight:600;color:var(--yazi3);margin-bottom:5px">ATANAN ŞABLONLAR:</div>
        ${atananSablonlar.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${atananSablonlar.map(a => {
            const s = yetkiSablonlari.find(x => x.id === a.sablon_id);
            const iy = isyerleri.find(x => x.id === a.isyeri_id);
            return s ? `<span style="font-size:11px;background:var(--mor-ac);color:var(--mor);padding:3px 10px;border-radius:10px;display:inline-flex;align-items:center;gap:4px">
              📋 ${s.ad}${iy?' · '+iy.ad:' · Tüm işyerleri'}
              <button onclick="sablonKullaniciKaldir('${a.sablon_id}','${k.id}')" style="background:none;border:none;color:var(--mor);cursor:pointer;font-size:13px;padding:0;line-height:1;opacity:.7">×</button>
            </span>` : '';
          }).join('')}
        </div>` : '<span style="font-size:11px;color:var(--yazi3)">Şablon atanmamış</span>'}
        <button class="btn sm sec" style="margin-top:6px" onclick="sablonKullaniciEkleAcKulId('${k.id}')">+ Şablon Ekle</button>
      </div>
    </div>`;
  }).join('');
};

function _yetkiOzetHTML(yetkiler) {
  if (!yetkiler || !Object.keys(yetkiler).length) return '';
  return EKRANLAR.map(e => {
    const ey = yetkiler[e.id] || {};
    const aktif = EYLEMLER.filter(ey2 => ey[ey2.id]).map(ey2 => ey2.ikon).join('');
    if (!aktif) return '';
    return `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--yesil-cok-ac);color:var(--yesil);margin-right:4px;margin-bottom:4px;display:inline-block">${e.ad}: ${aktif}</span>`;
  }).join('');
}

window.kulYetkiDuzenleAc = function(kulId) {
  const k = kullanicilar.find(x => x.id === kulId); if (!k) return;
  document.getElementById('ky-kullanici-id').value = kulId;
  document.getElementById('ky-title').textContent = k.ad + ' ' + (k.soyad||'') + ' — Yetkileri';
  document.getElementById('ky-kullanici-bilgi').innerHTML =
    `<strong>${k.ad} ${k.soyad||''}</strong> · @${k.kullanici_adi} · <span style="color:var(--yazi3)">${k.email}</span>`;

  // İşyeri checkboxları
  const isyeriDiv = document.getElementById('ky-isyeri-checkler');
  if (isyeriDiv) {
    const mevcutIsyeriler = k.crud_isyeriler || []; // kaydedilmiş işyeri id listesi
    isyeriDiv.innerHTML = isyerleri.map(iy => {
      const sirket = sirketler.find(s => s.id === iy.sirket_id);
      const secili = mevcutIsyeriler.includes(iy.id);
      return `<label style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:${secili?'var(--yesil-cok-ac)':'var(--beyaz)'}">
        <input type="checkbox" id="ky-iy-${iy.id}" ${secili?'checked':''}
          style="width:15px;height:15px;accent-color:var(--yesil)">
        <div>
          <div style="font-size:12px;font-weight:500">${iy.ad}</div>
          <div style="font-size:10px;color:var(--yazi3)">${sirket?sirket.ad:''}</div>
        </div>
      </label>`;
    }).join('');
  }

  _kyCrudTabloOlustur();
  _kyCrudDoldur(k.crud_yetkiler || {});
  _kyTumCheckSifirla();
  modalAc('modal-kul-yetki');
};

function _kyCrudTabloOlustur() {
  const tbody = document.getElementById('ky-crud-tablo'); if (!tbody) return;
  tbody.innerHTML = EKRANLAR.map(e => `
    <tr style="border-bottom:1px solid var(--krem2)">
      <td style="padding:8px 10px;font-weight:500">${e.ad}</td>
      ${EYLEMLER.map(ey => `
        <td style="padding:8px;text-align:center">
          <input type="checkbox" id="ky-${e.id}-${ey.id}"
            style="width:16px;height:16px;cursor:pointer;accent-color:var(--yesil)">
        </td>`).join('')}
    </tr>`).join('');
}

function _kyCrudDoldur(yetkiler) {
  EKRANLAR.forEach(e => EYLEMLER.forEach(ey => {
    const el = document.getElementById(`ky-${e.id}-${ey.id}`);
    if (el) el.checked = yetkiler?.[e.id]?.[ey.id] === true;
  }));
}

function _kyCrudOku() {
  const y = {};
  EKRANLAR.forEach(e => {
    y[e.id] = {};
    EYLEMLER.forEach(ey => {
      const el = document.getElementById(`ky-${e.id}-${ey.id}`);
      y[e.id][ey.id] = el ? el.checked : false;
    });
  });
  return y;
}

window.kyCrudHepsiniSec = function(sec) {
  EKRANLAR.forEach(e => EYLEMLER.forEach(ey => {
    const el = document.getElementById(`ky-${e.id}-${ey.id}`);
    if (el) el.checked = sec;
  }));
};

window.kulYetkiKaydet = async function() {
  const kulId = document.getElementById('ky-kullanici-id').value;
  const crudYetkiler = _kyCrudOku();
  // Seçili işyerleri oku
  const seciliIsyeriler = isyerleri
    .filter(iy => document.getElementById('ky-iy-'+iy.id)?.checked)
    .map(iy => iy.id);
  await sb.from('kullanicilar').update({
    crud_yetkiler: crudYetkiler,
    crud_isyeriler: seciliIsyeriler.length ? seciliIsyeriler : null
  }).eq('id', kulId);
  const { data } = await sb.from('kullanicilar').select('*'); if (data) kullanicilar = data;
  if (kulId === aktifKullanici?.id) {
    aktifKullanici = { ...aktifKullanici, crud_yetkiler: crudYetkiler, crud_isyeriler: seciliIsyeriler };
  }
  modalKapat('modal-kul-yetki');
  renderKulYetkiler();
  bil('Yetkiler kaydedildi ✓');
};

// Sütun tümünü seç/kaldır
window.kySutunTum = function(eylemId, sec) {
  EKRANLAR.forEach(e => {
    const el = document.getElementById(`ky-${e.id}-${eylemId}`);
    if (el && !el.disabled) el.checked = sec;
  });
};

window.ysSutunTum = function(eylemId, sec) {
  EKRANLAR.forEach(e => {
    const el = document.getElementById(`ys-${e.id}-${eylemId}`);
    if (el && !el.disabled) el.checked = sec;
  });
};

// Tümünü seç checkboxlarını sıfırla (modal açılırken)
function _kyTumCheckSifirla() {
  ['goruntule','ekle','duzenle','sil'].forEach(ey => {
    const el = document.getElementById(`ky-tum-${ey}`);
    if (el) el.checked = false;
  });
}
function _ysTumCheckSifirla() {
  ['goruntule','ekle','duzenle','sil'].forEach(ey => {
    const el = document.getElementById(`ys-tum-${ey}`);
    if (el) el.checked = false;
  });
}

window.sablonKullaniciEkleAcKulId = function(kulId) {
  // Boş sablon seçimi aç — sablon_id olmadan kullanıcı bazlı
  document.getElementById('ys-atama-sablon-id').value = '';
  const sel = document.getElementById('ys-atama-kullanici');
  sel.innerHTML = kullanicilar.filter(k=>k.rol!=='admin').map(k=>
    `<option value="${k.id}"${k.id===kulId?' selected':''}>${k.ad} ${k.soyad||''} (@${k.kullanici_adi})</option>`
  ).join('');
  const iySel = document.getElementById('ys-atama-isyeri');
  iySel.innerHTML = '<option value="">🌐 Tüm işyerleri</option>' +
    isyerleri.map(i=>`<option value="${i.id}">${i.ad}</option>`).join('');
  // Şablon seçimi için ek alan
  const mevcut = kullaniciYetkiSablonlari.filter(a=>a.kullanici_id===kulId).map(a=>a.sablon_id);
  document.getElementById('ys-atama-sablon-id').value = '';
  // Şablon select ekle
  let sablonSel = document.getElementById('ys-atama-sablon-sec');
  if (!sablonSel) {
    const div = document.createElement('div');
    div.className = 'fg';
    div.innerHTML = '<label>Şablon</label><select id="ys-atama-sablon-sec"><option value="">— Şablon seçin —</option></select>';
    document.getElementById('ys-atama-isyeri').closest('.fg').before(div);
    sablonSel = document.getElementById('ys-atama-sablon-sec');
  }
  sablonSel.innerHTML = '<option value="">— Şablon seçin —</option>' +
    yetkiSablonlari.filter(s=>!mevcut.includes(s.id)).map(s=>`<option value="${s.id}">${s.ad}</option>`).join('');
  sablonSel.onchange = () => { document.getElementById('ys-atama-sablon-id').value = sablonSel.value; };
  modalAc('modal-yetki-atama');
};
