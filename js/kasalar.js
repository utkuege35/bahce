// ===== KASALAR =====
let kasalar_list = [];
let kullanici_kasalar_list = [];

window.renderKasalar = async function() {
  const el = document.getElementById('kasalar-wrap');
  if (!el) return;

  // Verilerini çek
  const { data: kd } = await sb.from('kasalar').select('*').order('kod');
  if (kd) kasalar_list = kd;

  const isAdmin = aktifKullanici?.rol === 'admin';

  // Kullanıcının görebileceği kasalar
  let gorunenKasalar = kasalar_list;
  if (!isAdmin) {
    const { data: yk } = await sb.from('kullanici_kasalar')
      .select('*').eq('kullanici_id', aktifKullanici?.id);
    if (yk) kullanici_kasalar_list = yk;
    const yetkiliIds = yk?.map(x => x.kasa_id) || [];
    gorunenKasalar = kasalar_list.filter(k => yetkiliIds.includes(k.id));
  }

  // Her kasa için bakiye hesapla
  let html = '';
  for (const k of gorunenKasalar) {
    const kasaIslemleri = islemler.filter(i => i.kasa_id === k.id);
    const hareketToplam = kasaIslemleri.reduce((s, i) => s + parseFloat(i.kasa_etkisi || 0), 0);
    const bakiye = parseFloat(k.baslangic_bakiye || 0) + hareketToplam;
    const tipIkon = { nakit: '💵', banka: '🏦', pos: '💳' }[k.tip] || '💵';
    const tipAd = { nakit: 'Nakit', banka: 'Banka', pos: 'POS' }[k.tip] || k.tip;

    html += `<div class="kasa-kart${k.aktif === false ? ' pasif' : ''}">
      <div class="kasa-kart-ust">
        <div>
          <div class="kasa-kart-ad">${tipIkon} ${k.ad}</div>
          <div class="kasa-kart-kod">${k.kod} · ${tipAd}</div>
        </div>
        <div class="kasa-kart-bakiye ${bakiye < 0 ? 'neg' : 'poz'}">${para(bakiye)}</div>
      </div>
      ${k.aciklama ? `<div style="font-size:11px;color:var(--yazi3);margin-top:4px">${k.aciklama}</div>` : ''}
      ${isAdmin ? `<div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn sm" onclick="kasaDuzenleAc('${k.id}')">✏ Düzenle</button>
        <button class="btn sm ghost" onclick="kasaSil('${k.id}')">Sil</button>
        <button class="btn sm" onclick="kasaYetkiAc('${k.id}')">👥 Yetkiler</button>
      </div>` : ''}
    </div>`;
  }

  if (!gorunenKasalar.length) {
    html = `<div class="bos">Henüz kasa tanımlanmamış.</div>`;
  }

  el.innerHTML = html;
};

window.kasaModalAc = function() {
  document.getElementById('kasa-km-id').value = '';
  document.getElementById('kasa-km-ad').value = '';
  document.getElementById('kasa-km-kod').value = '';
  document.getElementById('kasa-km-tip').value = 'nakit';
  document.getElementById('kasa-km-baslangic').value = '0';
  document.getElementById('kasa-km-aciklama').value = '';
  document.getElementById('kasa-km-aktif').checked = true;
  document.getElementById('km-title').textContent = 'Yeni Kasa';
  modalAc('modal-kasa');
};

window.kasaDuzenleAc = function(id) {
  const k = kasalar_list.find(x => x.id === id);
  if (!k) return;
  document.getElementById('kasa-km-id').value = k.id;
  document.getElementById('kasa-km-ad').value = k.ad || '';
  document.getElementById('kasa-km-kod').value = k.kod || '';
  document.getElementById('kasa-km-tip').value = k.tip || 'nakit';
  document.getElementById('kasa-km-baslangic').value = k.baslangic_bakiye || 0;
  document.getElementById('kasa-km-aciklama').value = k.aciklama || '';
  document.getElementById('kasa-km-aktif').checked = k.aktif !== false;
  document.getElementById('km-title').textContent = 'Kasa Düzenle';
  modalAc('modal-kasa');
};

window.kaydetKasa_kart = async function() {
  const id = document.getElementById('kasa-km-id').value;
  const ad = document.getElementById('kasa-km-ad').value.trim();
  const kod = document.getElementById('kasa-km-kod').value.trim().toUpperCase();
  const tip = document.getElementById('kasa-km-tip').value;
  const baslangic = parseFloat(document.getElementById('kasa-km-baslangic').value) || 0;
  const aciklama = document.getElementById('kasa-km-aciklama').value.trim();
  const aktif = document.getElementById('kasa-km-aktif').checked;

  if (!ad || !kod) { bil('Ad ve Kod zorunlu!', 'err'); return; }

  const data = { ad, kod, tip, baslangic_bakiye: baslangic, aciklama: aciklama || null, aktif };

  if (id) {
    await sb.from('kasalar').update(data).eq('id', id);
  } else {
    data.id = uid();
    await sb.from('kasalar').insert(data);
  }

  modalKapat('modal-kasa');
  await renderKasalar();
  bil('Kasa kaydedildi ✓');
};

window.kasaSil = async function(id) {
  const var_mi = islemler.some(i => i.kasa_id === id);
  if (var_mi) { bil('Bu kasaya ait işlemler var, silinemez!', 'err'); return; }
  if(!(await onay('Bu kasayı silmek istiyor musunuz?','🗑️')))return;
  await sb.from('kasalar').delete().eq('id', id);
  await renderKasalar();
  bil('Kasa silindi ✓');
};

// Kasa yetki yönetimi
window.kasaYetkiAc = async function(kasaId) {
  const k = kasalar_list.find(x => x.id === kasaId);
  if (!k) return;
  document.getElementById('ky-kasa-adi').textContent = k.ad;
  document.getElementById('ky-kasa-id').value = kasaId;

  // Tüm kullanıcıları ve mevcut yetkileri getir
  const { data: kullanicilar_all } = await sb.from('kullanicilar').select('*').order('ad');
  const { data: yetkiler } = await sb.from('kullanici_kasalar').select('*').eq('kasa_id', kasaId);

  let html = '';
  for (const u of (kullanicilar_all || [])) {
    if (u.rol === 'admin') continue; // Admin zaten her şeyi görür
    const mevcut = yetkiler?.find(y => y.kullanici_id === u.id);
    html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--krem2)">
      <span style="font-size:13px">${u.ad} ${u.soyad || ''}</span>
      <select onchange="kasaYetkiGuncelle('${u.id}','${kasaId}',this.value)"
        style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--beyaz)">
        <option value="">— Erişim yok —</option>
        <option value="goruntule" ${mevcut?.yetki === 'goruntule' ? 'selected' : ''}>👁 Görüntüle</option>
        <option value="islem" ${mevcut?.yetki === 'islem' ? 'selected' : ''}>✏ İşlem yapabilir</option>
      </select>
    </div>`;
  }
  document.getElementById('ky-kullanicilar').innerHTML = html || '<div class="bos">Kullanıcı yok</div>';
  modalAc('modal-kasa-yetki');
};

window.kasaYetkiGuncelle = async function(kullaniciId, kasaId, yetki) {
  if (!yetki) {
    await sb.from('kullanici_kasalar').delete()
      .eq('kullanici_id', kullaniciId).eq('kasa_id', kasaId);
  } else {
    await sb.from('kullanici_kasalar').upsert({
      id: uid(),
      kullanici_id: kullaniciId,
      kasa_id: kasaId,
      yetki
    }, { onConflict: 'kullanici_id,kasa_id' });
  }
  bil('Yetki güncellendi ✓');
};

// Aktif kullanıcının işlem yapabileceği kasaları döndür
window.getYetkiliKasalar = async function(sadece_islem = false) {
  // Admin tüm kasalara erişir
  if (!aktifKullanici || aktifKullanici.rol === 'admin') {
    return kasalar_list.filter(k => k.aktif !== false);
  }
  const { data: yk } = await sb.from('kullanici_kasalar')
    .select('*').eq('kullanici_id', aktifKullanici.id);
  const liste = yk || [];
  const filtreli = sadece_islem ? liste.filter(y => y.yetki === 'islem') : liste;
  const ids = filtreli.map(y => y.kasa_id);
  return kasalar_list.filter(k => ids.includes(k.id) && k.aktif !== false);
};

// Kasa select option'larını doldur — varsayılan kasayı otomatik seç
window.kasaSelectDoldur = async function(elId, sadece_islem = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  const liste = await getYetkiliKasalar(sadece_islem);
  if (!liste.length) {
    el.innerHTML = '<option value="">— Yetkili kasa yok —</option>';
    el.style.borderColor = '#e53935';
    return;
  }
  el.style.borderColor = '';
  el.innerHTML = '<option value="">— Kasa seçin —</option>' +
    liste.map(k => {
      const tipIkon = { nakit: '💵', banka: '🏦', pos: '💳' }[k.tip] || '💵';
      return `<option value="${k.id}">${tipIkon} ${k.ad}</option>`;
    }).join('');
  // Tek kasa varsa otomatik seç
  if (liste.length === 1) { el.value = liste[0].id; return; }
  // Birden fazlaysa varsayılan kasayı seç
  const varsKasaId = aktifKullanici?.varsayilan_kasa_id;
  if (varsKasaId && liste.find(k => k.id === varsKasaId)) {
    el.value = varsKasaId;
  }
};
