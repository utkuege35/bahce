// ===== RAPOR GÖRÜNTÜLEME SAYFASI (alıcı için, salt okunur) =====
// Güvenlik:
//  • Bağlantıdaki jeton URL'nin '#' kısmındadır (sunucuya / yönlendirme başlığına gitmez); okunur okunmaz adres çubuğundan SİLİNİR.
//  • Rapor, kullanıcı adı ve şifre doğrulanmadan açılmaz. Doğrulama ve yetki tamamen VERİTABANI işlevlerinde (rapor_giris / rapor_liste / rapor_veri / rapor_cikis) yapılır;
//    bu sayfa yalnızca bir arayüzdür. Hangi raporların açılabileceği ("sadece son" / "tümü") SUNUCUDA belirlenir.
//  • Sunucudan gelen tüm metinler yalnızca textContent ile yazılır (HTML enjeksiyonu mümkün değil). Satır içi betik/stil ve harici kütüphane YOKTUR.
//  • Oturum yalnızca sekme ömrü boyunca (sessionStorage) tutulur; sekme kapanınca silinir.
// Akış: kullanıcı adı + şifre → en son gönderilen rapor doğrudan açılır → (izin varsa) "Geçmiş raporlar": gönderim tarihine ve başlık/açıklamaya göre arama.
(function () {
  'use strict';
  const AYAR = window.RAPOR_AYAR || {};
  const $ = id => document.getElementById(id);
  const K_JETON = 'rapor_jeton', K_OTURUM = 'rapor_oturum', K_META = 'rapor_meta', K_YAYIN = 'rapor_yayin';
  const depo = {
    al: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    yaz: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* özel gezinti vb. */ } },
    sil: k => { try { sessionStorage.removeItem(k); } catch (e) { /* yok say */ } }
  };
  let jeton = null, oturum = null, meta = null, listeBilgi = null, aktifYayin = null, aktifTarih = null, istekNo = 0;

  // ---------- yardımcılar ----------
  function el(etiket, sinif, metin) { const e = document.createElement(etiket); if (sinif) e.className = sinif; if (metin !== undefined && metin !== null) e.textContent = metin; return e; }
  const para = n => '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sayi = n => Number(n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
  const trTarih = t => { const p = String(t || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ''; };
  const gonderimTarihi = z => { try { return new Date(z).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }); } catch (e) { return ''; } };
  const gunAdi = t => { try { return new Date(t + 'T00:00:00Z').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return trTarih(t); } };
  const gunKisa = t => { try { return new Date(t + 'T00:00:00Z').toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', weekday: 'short', timeZone: 'UTC' }); } catch (e) { return trTarih(t); } };
  const gunEkle = (t, n) => { const d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const donemMetni = y => (y.donem_bas && y.donem_bit) ? (y.donem_bas === y.donem_bit ? trTarih(y.donem_bas) : trTarih(y.donem_bas) + ' – ' + trTarih(y.donem_bit)) : '';
  function ekranGoster(ad) { ['yukleniyor', 'pin', 'rapor', 'liste', 'mesaj'].forEach(x => { $('ekran-' + x).hidden = (x !== ad); }); }
  function mesajGoster(baslik, metin) { $('mesaj-baslik').textContent = baslik; $('mesaj-metin').textContent = metin; ekranGoster('mesaj'); }
  const ayarEksik = () => !AYAR.url || !AYAR.anahtar || /PROJE_KODUNUZ|GENEL_ANON/.test(AYAR.url + AYAR.anahtar);

  // ---------- sunucu çağrısı ----------
  async function rpc(fn, govde) {
    let r;
    try {
      r = await fetch(String(AYAR.url).replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: AYAR.anahtar, Authorization: 'Bearer ' + AYAR.anahtar },
        body: JSON.stringify(govde), cache: 'no-store', referrerPolicy: 'no-referrer', credentials: 'omit'
      });
    } catch (e) { return { ok: false, kod: 'ag', mesaj: 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.' }; }
    let g = null; try { g = await r.json(); } catch (e) { /* boş gövde (cikis) */ }
    if (!r.ok) return { ok: false, kod: 'sunucu', mesaj: 'Sunucu isteği kabul etmedi. Lütfen daha sonra tekrar deneyin.' };
    return g;
  }

  // ---------- başlangıç ----------
  function basla() {
    if (ayarEksik()) { mesajGoster('Rapor sayfası henüz hazır değil', 'Yönetici: rapor/ayar.js dosyasına Supabase adresi ve genel anahtar yazılmalıdır.'); return; }
    const h = location.hash.replace(/^#/, '');
    if (h) {
      if (/^[A-Za-z0-9]{40,128}$/.test(h)) depo.yaz(K_JETON, h);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* yok say */ }   // jetonu adres çubuğundan sil
    }
    jeton = depo.al(K_JETON); oturum = depo.al(K_OTURUM);
    try { meta = JSON.parse(depo.al(K_META) || 'null'); } catch (e) { meta = null; }
    if (oturum && meta && meta.bitis && new Date(meta.bitis) > new Date()) { acilis(depo.al(K_YAYIN)); }
    else if (jeton) pinEkrani('');
    else mesajGoster('Bağlantı bulunamadı', 'Bu sayfa yalnızca size gönderilen özel bağlantıyla açılır. Lütfen bağlantıyı tekrar açın.');
  }

  function pinEkrani(hata) {
    ekranGoster('pin'); $('pin-girdi').value = '';                // şifre her zaman temizlenir; kullanıcı adı kalır (yeniden yazmaya gerek yok)
    const m = $('pin-mesaj'); m.hidden = !hata; m.textContent = hata || '';
    $('pin-gonder').disabled = false; ($('kullanici-girdi').value ? $('pin-girdi') : $('kullanici-girdi')).focus();
  }

  async function pinGonder(e) {
    e.preventDefault();
    const kullanici = $('kullanici-girdi').value.trim(), sifre = $('pin-girdi').value.trim(); if (!kullanici || !sifre) return;
    $('pin-gonder').disabled = true; $('pin-mesaj').hidden = true;
    const g = await rpc('rapor_giris', { p_token: jeton, p_kullanici: kullanici, p_sifre: sifre });
    $('pin-girdi').value = '';
    if (g && g.ok) {
      oturum = g.oturum; meta = { bitis: g.bitis, tip: g.tip, gecmis: g.gecmis, isyeri: g.isyeri, en_eski: g.en_eski, en_yeni: g.en_yeni, varsayilan_tarih: g.varsayilan_tarih };
      depo.yaz(K_OTURUM, oturum); depo.yaz(K_META, JSON.stringify(meta)); depo.sil(K_YAYIN);
      acilis(null);
    } else {
      pinEkrani((g && g.mesaj) || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }

  function oturumuBitir() { depo.sil(K_OTURUM); depo.sil(K_META); depo.sil(K_YAYIN); oturum = null; meta = null; listeBilgi = null; aktifYayin = null; }
  function oturumDustu() {
    oturumuBitir();
    if (jeton) pinEkrani('Oturum süresi doldu. Şifrenizi yeniden girin.'); else mesajGoster('Oturum sona erdi', 'Lütfen bağlantıyı yeniden açın.');
  }

  async function cikis() {
    const o = oturum; oturumuBitir(); depo.sil(K_JETON); jeton = null;
    mesajGoster('Oturum kapatıldı', 'Raporu yeniden görmek için size gönderilen bağlantıyı kullanın.');
    if (o) await rpc('rapor_cikis', { p_oturum: o });
  }

  // Giriş sonrası: raporların listesini al; en son gönderileni (ya da yenilemeden önce açık olanı) aç
  async function acilis(tercihYayin) {
    ekranGoster('yukleniyor');
    const l = await rpc('rapor_liste', { p_oturum: oturum, p_bas: null, p_bit: null, p_ara: null });
    if (!l || !l.ok) { if (l && l.kod === 'oturum') { oturumDustu(); return; } mesajGoster('Rapor alınamadı', (l && l.mesaj) || 'Lütfen daha sonra tekrar deneyin.'); return; }
    listeBilgi = l;
    if (!l.yayinlar.length) { mesajGoster('Henüz rapor yok', 'Size henüz bir rapor gönderilmemiş. Gönderildiğinde bu bağlantıdan görebilirsiniz.'); return; }
    const hedef = (tercihYayin && l.yayinlar.some(y => y.id === tercihYayin)) ? tercihYayin : l.en_son;
    yayinAc(hedef, null);
  }

  // ---------- rapor ekranı ----------
  async function yayinAc(id, tarih) {
    const no = ++istekNo;
    ekranGoster('rapor');
    const u = $('rapor-uyari'); u.hidden = true; u.replaceChildren();
    const ic = $('rapor-icerik'); ic.replaceChildren(el('div', 'bos', 'Yükleniyor…'));
    const g = await rpc('rapor_veri', { p_oturum: oturum, p_yayin: id, p_tarih: tarih || null });
    if (no !== istekNo) return;                                   // daha yeni bir istek var; bu yanıtı yok say
    if (!g || !g.ok) {
      if (g && g.kod === 'oturum') { oturumDustu(); return; }
      if (g && g.kod === 'yetki') {                                // bu rapor artık açılamıyor (yeni rapor gönderildi / geri alındı)
        const yeni = await rpc('rapor_liste', { p_oturum: oturum, p_bas: null, p_bit: null, p_ara: null });
        if (yeni && yeni.ok && yeni.en_son && yeni.en_son !== id) { listeBilgi = yeni; yayinAc(yeni.en_son, null); return; }
        mesajGoster('Rapor görüntülenemiyor', 'Bu rapor artık bu bağlantıdan açılamıyor.'); return;
      }
      ic.replaceChildren(); u.textContent = (g && g.mesaj) || 'Rapor alınamadı.'; u.hidden = false;
      if (g && g.kod === 'tarih' && g.en_yeni) { const b = el('button', 'ikincil kucuk', 'Son güne dön'); b.type = 'button'; b.addEventListener('click', () => yayinAc(id, g.en_yeni)); u.appendChild(document.createElement('br')); u.appendChild(b); }
      return;
    }
    const y = g.yayin, r = g.rapor; aktifYayin = y; depo.yaz(K_YAYIN, y.id);
    const canli = y.kip === 'canli';
    if (canli) { meta.en_eski = g.en_eski; meta.en_yeni = g.en_yeni; aktifTarih = r.tarih; }
    ustBilgi(y, canli, r);
    $('tarih-alani').hidden = !canli;
    if (canli) {
      $('tarih').min = g.en_eski; $('tarih').max = g.en_yeni; $('tarih').value = r.tarih; $('tarih-metin').textContent = gunAdi(r.tarih);
      $('onceki-gun').disabled = r.tarih <= g.en_eski; $('sonraki-gun').disabled = r.tarih >= g.en_yeni;
    }
    $('guncelleme').textContent = 'Yüklendi: ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    ic.replaceChildren();
    if (!r.kayit_var) { bosDurum(ic, r, y); return; }
    window.RaporCizim.ciz(r, ic);
  }

  function ustBilgi(y, canli, r) {
    $('ust-isyeri').textContent = (meta && meta.isyeri) || '';
    $('ust-baslik').textContent = y.baslik || 'Rapor';
    const ac = $('ust-aciklama'); ac.hidden = !y.aciklama; ac.textContent = y.aciklama || '';
    const roz = $('ust-rozetler'); roz.replaceChildren();
    const rz = (m, v) => roz.appendChild(el('span', 'rozet' + (v ? ' vurgu' : ''), m));
    if (listeBilgi && y.id === listeBilgi.en_son) rz('Son gönderilen', true);
    if (canli) rz('Canlı panel · tarih seçebilirsiniz');
    else { rz('Dondurulmuş rapor'); if (donemMetni(y)) rz('Dönem: ' + donemMetni(y)); }
    if (y.zaman) rz('Gönderildi: ' + gonderimTarihi(y.zaman));
    try { document.title = (y.baslik || 'Rapor') + ((meta && meta.isyeri) ? ' · ' + meta.isyeri : ''); } catch (e) { /* yok say */ }
    const gb = $('gecmis-btn'); const var_ = !!(listeBilgi && listeBilgi.gecmis === 'tumu' && listeBilgi.toplam > 1);
    gb.hidden = !var_; gb.textContent = '📚 Geçmiş raporlar (' + (listeBilgi ? listeBilgi.toplam : 0) + ')';
  }

  function bosDurum(kap, r, y) {
    const k = el('div', 'bos'); k.appendChild(el('div', 'b', '📭'));
    k.appendChild(el('p', '', trTarih(r.tarih) + ' tarihi için kayıt bulunamadı.'));
    k.appendChild(el('p', 'alt', 'O gün henüz veri girilmemiş olabilir.'));
    const dugmeler = el('div', 'hizli');
    if (r.onceki_veri_tarihi) { const b = el('button', 'ikincil', '◀ Önceki kayıtlı gün: ' + trTarih(r.onceki_veri_tarihi)); b.type = 'button'; b.addEventListener('click', () => yayinAc(y.id, r.onceki_veri_tarihi)); dugmeler.appendChild(b); }
    if (r.sonraki_veri_tarihi) { const b = el('button', 'ikincil', 'Sonraki kayıtlı gün: ' + trTarih(r.sonraki_veri_tarihi) + ' ▶'); b.type = 'button'; b.addEventListener('click', () => yayinAc(y.id, r.sonraki_veri_tarihi)); dugmeler.appendChild(b); }
    k.appendChild(dugmeler); kap.appendChild(k);
  }

  // ---------- GEÇMİŞ RAPORLAR ----------
  async function listeEkrani() {
    ekranGoster('liste'); $('liste-isyeri').textContent = (meta && meta.isyeri) || '';
    ['liste-bas', 'liste-bit', 'liste-ara'].forEach(i => { $(i).value = ''; });
    await listeAra();
  }
  async function listeAra() {
    const ic = $('liste-icerik'); ic.replaceChildren(el('div', 'bos', 'Yükleniyor…'));
    const bas = $('liste-bas').value || null, bit = $('liste-bit').value || null, ara = $('liste-ara').value.trim() || null;
    const l = await rpc('rapor_liste', { p_oturum: oturum, p_bas: bas, p_bit: bit, p_ara: ara });
    if (!l || !l.ok) { if (l && l.kod === 'oturum') { oturumDustu(); return; } ic.replaceChildren(el('div', 'uyari', (l && l.mesaj) || 'Liste alınamadı.')); return; }
    listeBilgi = Object.assign({}, listeBilgi || {}, { toplam: l.toplam, en_son: l.en_son, gecmis: l.gecmis, tip: l.tip });
    $('liste-ozet').textContent = (bas || bit || ara) ? `${l.yayinlar.length} rapor bulundu (toplam ${l.toplam})` : `${l.toplam} rapor`;
    ic.replaceChildren();
    if (!l.yayinlar.length) { ic.appendChild(el('div', 'bos', 'Aramanıza uyan rapor bulunamadı.')); return; }
    l.yayinlar.forEach(y => {
      const k = el('button', 'liste-kart'); k.type = 'button';
      k.appendChild(el('div', 'b', y.baslik)); if (y.aciklama) k.appendChild(el('div', 'a', y.aciklama));
      const m = el('div', 'm');
      m.appendChild(el('span', '', y.kip === 'canli' ? 'Canlı panel' : 'Dönem: ' + (donemMetni(y) || '—')));
      m.appendChild(el('span', '', 'Gönderildi: ' + gonderimTarihi(y.zaman)));
      if (y.son) m.appendChild(el('span', 'rozet vurgu', 'Son gönderilen'));
      k.appendChild(m); k.addEventListener('click', () => yayinAc(y.id, null)); ic.appendChild(k);
    });
  }

  // ---------- RAPOR ÇİZİMİ: rapor/cizim.js (alıcı sayfası ve yönetici önizlemesi ortak) ----------

  // ---------- olaylar ----------
  function baglaOlaylar() {
    $('pin-form').addEventListener('submit', pinGonder);
    $('cikis').addEventListener('click', cikis);
    $('liste-cikis').addEventListener('click', cikis);
    $('gecmis-btn').addEventListener('click', listeEkrani);
    $('liste-geri').addEventListener('click', () => { if (aktifYayin) yayinAc(aktifYayin.id, aktifTarih); else acilis(null); });
    $('liste-form').addEventListener('submit', e => { e.preventDefault(); listeAra(); });
    $('liste-temizle').addEventListener('click', () => { ['liste-bas', 'liste-bit', 'liste-ara'].forEach(i => { $(i).value = ''; }); listeAra(); });
    $('onceki-gun').addEventListener('click', () => yayinAc(aktifYayin.id, gunEkle(aktifTarih, -1)));
    $('sonraki-gun').addEventListener('click', () => yayinAc(aktifYayin.id, gunEkle(aktifTarih, 1)));
    $('tarih').addEventListener('change', e => { const v = e.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) yayinAc(aktifYayin.id, v); });
    $('hizli-dun').addEventListener('click', () => yayinAc(aktifYayin.id, gunEkle(meta.en_yeni, -1)));
    $('hizli-bugun').addEventListener('click', () => yayinAc(aktifYayin.id, meta.en_yeni));
  }
  baglaOlaylar();
  basla();
})();
