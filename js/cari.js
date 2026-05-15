// ===== CARİ (ALICI / SATICI / PERSONEL) =====

let cariListesi = [];

async function cariYukle() {
  const { data } = await sb.from('cari').select('*').order('kod');
  if (data) cariListesi = data;
}

function cariOpts(tip, seciliId = '') {
  const liste = tip ? cariListesi.filter(c => c.tip === tip && c.aktif !== false) : cariListesi.filter(c => c.aktif !== false);
  return '<option value="">—</option>' + liste.map(c =>
    `<option value="${c.id}"${c.id === seciliId ? ' selected' : ''}>[${c.kod}] ${c.ad}</option>`
  ).join('');
}

function cariOptsGider(seciliId = '') {
  const personeller = cariListesi.filter(c => c.tip === 'personel' && c.aktif !== false);
  const saticilar = cariListesi.filter(c => c.tip === 'satici' && c.aktif !== false);
  let html = '<option value="">—</option>';
  if (personeller.length) {
    html += '<optgroup label="Personel">' + personeller.map(c =>
      `<option value="${c.id}"${c.id === seciliId ? ' selected' : ''}>[${c.kod}] ${c.ad}</option>`
    ).join('') + '</optgroup>';
  }
  if (saticilar.length) {
    html += '<optgroup label="Satıcı">' + saticilar.map(c =>
      `<option value="${c.id}"${c.id === seciliId ? ' selected' : ''}>[${c.kod}] ${c.ad}</option>`
    ).join('') + '</optgroup>';
  }
  return html;
}

function kodOlusturCari(tip) {
  const prefix = { alici: 'A', satici: 'S', personel: 'P' }[tip] || 'C';
  const mevcutlar = cariListesi.filter(c => c.tip === tip && c.kod.startsWith(prefix))
    .map(c => parseInt(c.kod.slice(1))).filter(n => !isNaN(n));
  const sira = mevcutlar.length ? Math.max(...mevcutlar) + 1 : 1;
  return prefix + String(sira).padStart(3, '0');
}

window.cariModalAc = function (tip, id) {
  document.getElementById('cm-id').value = id || '';
  document.getElementById('cm-tip').value = tip || 'alici';
  const tipAd = { alici: 'Alıcı', satici: 'Satıcı', personel: 'Personel' }[tip] || 'Cari';

  if (id) {
    const c = cariListesi.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cm-title').textContent = tipAd + ' Düzenle';
    document.getElementById('cm-ad').value = c.ad || '';
    document.getElementById('cm-kod').value = c.kod || '';
    document.getElementById('cm-telefon').value = c.telefon || '';
    document.getElementById('cm-email').value = c.email || '';
    document.getElementById('cm-adres').value = c.adres || '';
    document.getElementById('cm-vergi-no').value = c.vergi_no || '';
    document.getElementById('cm-vergi-dairesi').value = c.vergi_dairesi || '';
    document.getElementById('cm-notlar').value = c.notlar || '';
    document.getElementById('cm-aktif-satir').style.display = '';
    document.getElementById('cm-aktif').checked = c.aktif !== false;
  } else {
    document.getElementById('cm-title').textContent = 'Yeni ' + tipAd;
    ['cm-ad', 'cm-telefon', 'cm-email', 'cm-adres', 'cm-vergi-no', 'cm-vergi-dairesi', 'cm-notlar'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('cm-kod').value = kodOlusturCari(tip);
    document.getElementById('cm-aktif-satir').style.display = 'none';
  }

  // Personelde vergi alanları gizle
  const vergiGrup = document.getElementById('cm-vergi-grup');
  vergiGrup.style.display = tip === 'personel' ? 'none' : '';

  modalAc('modal-cari');
};

window.kaydetCari = async function () {
  const id = document.getElementById('cm-id').value || uid();
  const tip = document.getElementById('cm-tip').value;
  const ad = document.getElementById('cm-ad').value.trim();
  const kod = document.getElementById('cm-kod').value.trim();
  if (!ad || !kod) { bil('Ad ve kod zorunlu!', 'err'); return; }

  const dupKod = cariListesi.find(c => c.id !== id && c.kod === kod);
  if (dupKod) { bil(`"${kod}" kodu zaten kullanımda!`, 'err'); return; }
  const dupAd = cariListesi.find(c => c.id !== id && c.ad.toLowerCase() === ad.toLowerCase() && c.tip === tip);
  if (dupAd) { bil(`"${ad}" adında ${tip} zaten var!`, 'err'); return; }

  const mevcut = cariListesi.find(x => x.id === id);
  const data = {
    id, tip, ad, kod,
    telefon: document.getElementById('cm-telefon').value || null,
    email: document.getElementById('cm-email').value || null,
    adres: document.getElementById('cm-adres').value || null,
    vergi_no: document.getElementById('cm-vergi-no').value || null,
    vergi_dairesi: document.getElementById('cm-vergi-dairesi').value || null,
    notlar: document.getElementById('cm-notlar').value || null,
  };
  if (mevcut) {
    data.aktif = document.getElementById('cm-aktif').checked;
    await sb.from('cari').update(data).eq('id', id);
  } else {
    data.aktif = true;
    await sb.from('cari').insert(data);
  }

  await cariYukle();
  modalKapat('modal-cari');
  renderCari();
  // Seçim listelerini güncelle
  if (typeof doldurIslemSecleri === 'function') doldurIslemSecleri();
  bil('Kaydedildi ✓');
};

window.cariSil = async function (id) {
  const hv = islemler.some(i => i.cari_id === id);
  if (hv) {
    if (await onay('Bu cariye bağlı işlem var, silinemez.<br><small>Tamam\'a basarsan pasife alınır.</small>','⚠️'))
      await sb.from('cari').update({ aktif: false }).eq('id', id);
    else return;
  } else {
    if (!(await onay('Kalıcı olarak silmek istiyor musunuz?','🗑️'))) return;
    await sb.from('cari').delete().eq('id', id);
  }
  await cariYukle();
  renderCari();
  bil(hv ? 'Pasife alındı ✓' : 'Silindi ✓');
};

function renderCariGrup(tip, baslik, renk) {
  const liste = cariListesi.filter(c => c.tip === tip);
  if (!liste.length) return `<div style="color:var(--yazi3);font-size:12px;padding:8px 0">Henüz ${baslik.toLowerCase()} yok.</div>`;
  return liste.map(c => {
    const pasif = c.aktif === false;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--beyaz);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;${pasif ? 'opacity:0.5' : ''}">
      <div style="width:36px;height:36px;border-radius:50%;background:${renk};color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0">${(c.ad||'?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${c.ad} ${pasif ? '<span style="font-size:10px;color:var(--turuncu)">[PASİF]</span>' : ''}</div>
        <div style="font-size:11px;color:var(--yazi3);margin-top:1px">
          <span class="tree-kod">${c.kod}</span>
          ${c.telefon ? ` · 📞 ${c.telefon}` : ''}
          ${c.email ? ` · ✉ ${c.email}` : ''}
          ${c.vergi_no ? ` · VN: ${c.vergi_no}` : ''}
        </div>
        ${c.notlar ? `<div style="font-size:11px;color:var(--yazi2);margin-top:2px">📝 ${c.notlar}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn sm" onclick="cariModalAc('${tip}','${c.id}')">✏</button>
        <button class="btn sm ghost" onclick="cariSil('${c.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function renderCari() {
  const el = document.getElementById('cari-liste');
  if (!el) return;
  el.innerHTML = `
    <div style="margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--yesil);text-transform:uppercase;letter-spacing:.05em">Alıcılar</div>
        <button class="btn sm pri" onclick="cariModalAc('alici')">+ Alıcı Ekle</button>
      </div>
      ${renderCariGrup('alici', 'Alıcı', 'var(--yesil)')}
    </div>
    <div style="margin-bottom:1.2rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--mavi);text-transform:uppercase;letter-spacing:.05em">Satıcılar</div>
        <button class="btn sm sec" onclick="cariModalAc('satici')">+ Satıcı Ekle</button>
      </div>
      ${renderCariGrup('satici', 'Satıcı', 'var(--mavi)')}
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--mor);text-transform:uppercase;letter-spacing:.05em">Personel</div>
        <button class="btn sm ara" onclick="cariModalAc('personel')">+ Personel Ekle</button>
      </div>
      ${renderCariGrup('personel', 'Personel', 'var(--mor)')}
    </div>`;
}
