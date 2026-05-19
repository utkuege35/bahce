// ===== ŞİRKET & İŞYERLERİ =====

window.renderIsyerleri = function() {
  const el = document.getElementById('isyerleri-liste'); if (!el) return;
  if (!sirketler.length) { el.innerHTML = '<div class="bos">Henüz şirket tanımlanmamış.</div>'; return; }

  el.innerHTML = sirketler.map(s => {
    const sisBirleri = isyerleri.filter(iy => iy.sirket_id === s.id);
    return `<div class="card" style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:8px;background:var(--yesil-cok-ac);display:flex;align-items:center;justify-content:center;font-size:16px">🏢</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--yazi1)">${s.ad}</div>
            <div style="font-size:11px;color:var(--yazi3)">${s.kod||''}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn sm" onclick="sirketModalAc('${s.id}')">✏ Düzenle</button>
          <button class="btn sm pri" onclick="isyeriModalAc('${s.id}')">+ İşyeri</button>
        </div>
      </div>
      ${sisBirleri.length ? `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${sisBirleri.map(iy => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--krem);border-radius:8px;border:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">🏪</span>
              <div>
                <div style="font-size:13px;font-weight:500;color:var(--yazi1)">${iy.ad}</div>
                <div style="font-size:10px;color:var(--yazi3)">${iy.kod||''} ${!iy.aktif?'· <span style="color:var(--turuncu)">Pasif</span>':''}</div>
              </div>
            </div>
            <button class="btn sm" onclick="isyeriModalAc(null,'${iy.id}')">✏</button>
          </div>
        `).join('')}
      </div>` : '<div style="font-size:12px;color:var(--yazi3);padding:4px 0">Henüz işyeri eklenmedi.</div>'}
    </div>`;
  }).join('');
};

// Şirket modal
window.sirketModalAc = function(id) {
  document.getElementById('srk-id').value = id || '';
  if (id) {
    const s = sirketler.find(x => x.id === id);
    document.getElementById('srk-title').textContent = 'Şirketi Düzenle';
    document.getElementById('srk-ad').value = s?.ad || '';
    document.getElementById('srk-kod').value = s?.kod || '';
  } else {
    document.getElementById('srk-title').textContent = 'Yeni Şirket';
    document.getElementById('srk-ad').value = '';
    document.getElementById('srk-kod').value = '';
  }
  modalAc('modal-sirket');
};

window.sirketKaydet = async function() {
  const id = document.getElementById('srk-id').value;
  const ad = document.getElementById('srk-ad').value.trim();
  const kod = document.getElementById('srk-kod').value.trim().toUpperCase();
  if (!ad) { bil('Şirket adı zorunlu!', 'err'); return; }
  if (id) {
    await sb.from('sirketler').update({ ad, kod }).eq('id', id);
  } else {
    await sb.from('sirketler').insert({ ad, kod, aktif: true });
  }
  const { data } = await sb.from('sirketler').select('*').eq('aktif', true);
  if (data) sirketler = data;
  modalKapat('modal-sirket');
  renderIsyerleri();
  bil('Şirket kaydedildi ✓');
};

// İşyeri modal
window.isyeriModalAc = function(sirketId, isyeriId) {
  // Şirket select'i doldur
  const sel = document.getElementById('isy-sirket-id');
  sel.innerHTML = '<option value="">— Şirket seçin —</option>' +
    sirketler.map(s => `<option value="${s.id}">${s.ad}</option>`).join('');

  if (isyeriId) {
    const iy = isyerleri.find(x => x.id === isyeriId);
    document.getElementById('isy-title').textContent = 'İşyerini Düzenle';
    document.getElementById('isy-id').value = isyeriId;
    document.getElementById('isy-sirket-id').value = iy?.sirket_id || '';
    document.getElementById('isy-ad').value = iy?.ad || '';
    document.getElementById('isy-kod').value = iy?.kod || '';
    document.getElementById('isy-aktif').checked = iy?.aktif !== false;
  } else {
    document.getElementById('isy-title').textContent = 'Yeni İşyeri';
    document.getElementById('isy-id').value = '';
    document.getElementById('isy-sirket-id').value = sirketId || '';
    document.getElementById('isy-ad').value = '';
    document.getElementById('isy-kod').value = '';
    document.getElementById('isy-aktif').checked = true;
  }
  modalAc('modal-isyeri');
};

window.isyeriKaydet = async function() {
  const id = document.getElementById('isy-id').value;
  const sirket_id = document.getElementById('isy-sirket-id').value;
  const ad = document.getElementById('isy-ad').value.trim();
  const kod = document.getElementById('isy-kod').value.trim().toUpperCase();
  const aktif = document.getElementById('isy-aktif').checked;
  if (!sirket_id) { bil('Şirket seçin!', 'err'); return; }
  if (!ad) { bil('İşyeri adı zorunlu!', 'err'); return; }
  if (id) {
    await sb.from('isyerleri').update({ sirket_id, ad, kod, aktif }).eq('id', id);
  } else {
    await sb.from('isyerleri').insert({ sirket_id, ad, kod, aktif });
  }
  const { data } = await sb.from('isyerleri').select('*');
  if (data) isyerleri = data;
  modalKapat('modal-isyeri');
  renderIsyerleri();
  bil('İşyeri kaydedildi ✓');
};

// Kullanıcı modalında işyeri yetki listesi
window.doldurKmIsyeriListe = function(mevcutYetkiler) {
  const el = document.getElementById('km-isyeri-liste'); if (!el) return;
  if (!isyerleri.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--yazi3)">Henüz işyeri tanımlanmamış.</div>';
    return;
  }
  el.innerHTML = isyerleri.map(iy => {
    const sirket = sirketler.find(s => s.id === iy.sirket_id);
    const mevcut = (mevcutYetkiler || []).find(y => y.isyeri_id === iy.id);
    const secili = !!mevcut;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--krem)">
      <input type="checkbox" id="iy-chk-${iy.id}" ${secili ? 'checked' : ''}
        onchange="isyeriYetkiToggle('${iy.id}', this.checked)"
        style="width:16px;height:16px;cursor:pointer">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:500;color:var(--yazi1)">${iy.ad}</div>
        <div style="font-size:10px;color:var(--yazi3)">${sirket ? sirket.ad : ''}</div>
      </div>
      <select id="iy-rol-${iy.id}" style="font-size:11px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;background:var(--beyaz);${!secili ? 'opacity:0.4' : ''}">
        <option value="kullanici" ${mevcut?.rol === 'kullanici' || !mevcut ? 'selected' : ''}>Kullanıcı</option>
        <option value="yonetici" ${mevcut?.rol === 'yonetici' ? 'selected' : ''}>Yönetici</option>
        <option value="admin" ${mevcut?.rol === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    </div>`;
  }).join('');
};

window.isyeriYetkiToggle = function(isyeriId, secili) {
  const rolSel = document.getElementById('iy-rol-' + isyeriId);
  if (rolSel) rolSel.style.opacity = secili ? '1' : '0.4';
};

// Kullanıcı modalından işyeri yetkilerini oku
window.isyeriYetkilerOku = function() {
  return isyerleri
    .filter(iy => document.getElementById('iy-chk-' + iy.id)?.checked)
    .map(iy => ({
      isyeri_id: iy.id,
      rol: document.getElementById('iy-rol-' + iy.id)?.value || 'kullanici',
      yetkiler: {}
    }));
};
