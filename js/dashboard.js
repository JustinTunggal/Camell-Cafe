/* ════════════════════════════════════════════════
   CAMELL ADMIN DASHBOARD — Full CRUD
   ════════════════════════════════════════════════ */

let currentTab = 'news';
let newsCache = [];
let menuCache = [];
let menuFilter = 'all';
let messagesCache = [];
let ambianceCache = [];
let eventsCache = [];
let teamCache = [];

const MENU_CAT_LABELS = { coffee:'Coffee', 'non-coffee':'Non-Coffee', food:'Food', pastry:'Pastry' };

/* SVG ICONS */
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DEL  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_WA   = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.944-1.424A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>`;
const ICON_NEWS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="13" y2="16"/></svg>`;

/* ──────────── AUTH ──────────── */
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  errBox.classList.remove('show');
  if (!email || !password) { errBox.textContent = 'Email dan password wajib diisi.'; errBox.classList.add('show'); return; }
  btn.disabled = true; btn.textContent = 'Memproses...';
  const { data, error } = await loginAdmin(email, password);
  btn.disabled = false; btn.textContent = 'Masuk';
  if (error) { errBox.textContent = 'Login gagal: ' + error.message; errBox.classList.add('show'); return; }
  const role = await getStaffRole();
  if (role !== 'admin') {
    await logoutAdmin();
    errBox.textContent = 'Akun ini tidak memiliki akses admin penuh. Gunakan manager-dashboard.html.';
    errBox.classList.add('show');
    return;
  }
  showDashboard(data.session.user);
}
async function handleLogout(e) {
  e.preventDefault(); await logoutAdmin();
  document.getElementById('dashLayout').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}
function showDashboard(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashLayout').style.display = 'flex';
  const emailEl = document.getElementById('sidebarUserEmail');
  if (emailEl) emailEl.textContent = user.email;
  loadNews(); loadMenu(); loadMessagesCount(); loadReviewsCount();
  loadAmbiancePhotos(); loadHomeAbout(); loadStoryPhoto();
  loadEventPhotos(); loadTeam(); loadCafeInfoForm();
}
async function checkSession() {
  const session = await getCurrentSession();
  if (!session) { document.getElementById('loginScreen').style.display = 'flex'; document.getElementById('dashLayout').style.display = 'none'; return; }
  const role = await getStaffRole();
  if (role !== 'admin') {
    await logoutAdmin();
    const errBox = document.getElementById('loginError');
    if (errBox) { errBox.textContent = 'Akun ini tidak memiliki akses admin penuh. Gunakan manager-dashboard.html.'; errBox.classList.add('show'); }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashLayout').style.display = 'none';
    return;
  }
  showDashboard(session.user);
}

/* ──────────── INIT ──────────── */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  toggle?.addEventListener('click', () => { sidebar.classList.toggle('open'); backdrop.classList.toggle('open'); });
  backdrop?.addEventListener('click', () => { sidebar.classList.remove('open'); backdrop.classList.remove('open'); });
  document.getElementById('loginPassword')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
    }
  });

  checkSession();
});

/* ──────────── CUSTOM DROPDOWN HELPERS ──────────── */
function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
  if (!wasOpen) el.classList.add('open');
}

/* Generic dropdown: updates label span, hidden input, marks selected */
function selectDropdown(dropdownId, labelId, inputId, optionEl, label) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) {
    dropdown.querySelectorAll('.custom-select__option').forEach(o => o.classList.remove('selected'));
    optionEl.classList.add('selected');
    dropdown.classList.remove('open');
  }
  const lbl = document.getElementById(labelId);
  if (lbl) lbl.textContent = label;
  const inp = document.getElementById(inputId);
  if (inp) inp.value = optionEl.dataset.value;
  if (dropdownId === 'ciHeroBgDropdown') renderHeroCardPreview();
}

/* Menu filter dropdown (no hidden input needed) */
function selectMenuDropdown(optionEl, value, label) {
  const dropdown = document.getElementById('menuDropdown');
  if (dropdown) {
    dropdown.querySelectorAll('.custom-select__option').forEach(o => o.classList.remove('selected'));
    optionEl.classList.add('selected');
    dropdown.classList.remove('open');
  }
  const lbl = document.getElementById('menuDropdownLabel');
  if (lbl) lbl.textContent = label;
  filterMenuList(value);
}

// Make trigger clicks toggle
document.addEventListener('click', e => {
  const trigger = e.target.closest('.custom-select__trigger');
  if (trigger) {
    e.stopPropagation();
    const select = trigger.closest('.custom-select');
    const wasOpen = select.classList.contains('open');
    document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
    if (!wasOpen) select.classList.add('open');
  }
});

/* ──────────── FILE INPUT HELPER ──────────── */
function handleFileInputChange(inputId, previewId, labelId) {
  const input = document.getElementById(inputId);
  const labelEl = document.getElementById(labelId);
  const file = input?.files?.[0];
  if (!file) return;
  if (ALLOWED_IMAGE_TYPES && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    showToast('Format harus JPG, JPEG, PNG, WEBP, atau SVG.', 'danger');
    input.value = ''; return;
  }
  if (MAX_IMAGE_SIZE && file.size > MAX_IMAGE_SIZE) {
    showToast('Ukuran file maksimal 2 MB.', 'danger');
    input.value = ''; return;
  }
  if (labelEl) labelEl.textContent = file.name;
  const wrap = document.getElementById(previewId);
  if (wrap) {
    const reader = new FileReader();
    reader.onload = e => {
      wrap.querySelector('img').src = e.target.result;
      wrap.style.display = '';
      if (inputId === 'ciHeroImageFile') renderHeroCardPreview();
    };
    reader.readAsDataURL(file);
  }
}

/* Legacy compat */
function previewFileInput(inputId, previewId) {
  handleFileInputChange(inputId, previewId, null);
}

async function resolveImageUpload(fileInputId, existingUrl, folder) {
  const input = document.getElementById(fileInputId);
  const file = input?.files?.[0];
  if (!file) return { url: existingUrl || null, error: null };
  const { url, error } = await uploadImageFile(file, folder);
  if (error) return { url: existingUrl || null, error };
  return { url, error: null };
}

function updatePreview(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  if (text.trim()) { el.textContent = text; el.style.display = ''; }
  else el.style.display = 'none';
}

/* ──────────── TABS ──────────── */
const TAB_META = {
  news:     { title:'CamellNews Dashboard', btn:'+ Tambah Berita' },
  menu:     { title:'Menu Dashboard',       btn:'+ Tambah Menu' },
  messages: { title:'Pesan Masuk',          btn:null },
  reviews:  { title:'Ulasan (Moderasi)',    btn:null },
  ambiance: { title:'Foto Suasana',         btn:null },
  homeabout:{ title:'Foto Home About',      btn:null },
  storyph:  { title:'Foto Story',           btn:null },
  events:   { title:'Foto Private Event',   btn:null },
  team:     { title:'Tim Kami',             btn:'+ Tambah Anggota' },
  cafeinfo: { title:'Info Cafe',            btn:null },
};
const PANELS_WITH_LIST  = ['news','menu','messages','reviews','ambiance','homeabout','storyph','events','team','cafeinfo'];
const PANELS_WITH_FORM  = ['news','menu','ambiance','homeabout','storyph','events','team','cafeinfo'];

function switchTab(e, tab) {
  if (e) e.preventDefault();
  currentTab = tab;
  document.querySelectorAll('.sidebar-nav a[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  PANELS_WITH_LIST.forEach(t => {
    document.getElementById(`pane-${t}-list`)?.classList.toggle('active', t === tab);
  });
  PANELS_WITH_FORM.forEach(t => {
    document.getElementById(`pane-${t}-form`)?.classList.toggle('active', t === tab);
  });
  const meta = TAB_META[tab] || {};
  document.getElementById('topbarTitle').textContent = meta.title || tab;
  const addBtn = document.getElementById('addBtn');
  addBtn.textContent = meta.btn || '+ Tambah';
  addBtn.style.display = meta.btn ? '' : 'none';
  // cafeinfo: make two-col a single column so form is full width
  const twoCol = document.querySelector('.dash-two-col');
  if (twoCol) twoCol.classList.toggle('cafeinfo-single', tab === 'cafeinfo');
  updateStats();
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');
}

function openNewForm() {
  const resets = { news: resetNewsForm, menu: resetMenuForm, ambiance: resetAmbianceForm, events: resetEventsForm, team: resetTeamForm };
  if (resets[currentTab]) resets[currentTab]();
}

/* ──────────── TOAST ──────────── */
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + (type||''); t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ──────────── STATS ──────────── */
function updateStats() {
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  if (currentTab === 'news') {
    s('statLabel1','Total Berita'); s('stat1', newsCache.length);
    s('statLabel2','Dipublikasi');  s('stat2', newsCache.filter(n=>n.status==='pub').length);
    s('statLabel3','Draft');        s('stat3', newsCache.filter(n=>n.status==='dft').length);
    const cats = new Set(newsCache.map(n=>n.category));
    s('statLabel4','Kategori'); s('stat4', cats.size);
    s('statSub4', [...cats].join(' · ')||'—');
  } else if (currentTab === 'menu') {
    s('statLabel1','Total Item'); s('stat1', menuCache.length);
    s('statLabel2','Favorit');    s('stat2', menuCache.filter(m=>m.is_favorite).length);
    s('statLabel3','Featured');   s('stat3', menuCache.filter(m=>m.is_featured).length);
    const cats = new Set(menuCache.map(m=>m.category));
    s('statLabel4','Kategori'); s('stat4', cats.size);
  } else if (currentTab === 'messages') {
    const unread = messagesCache.filter(m=>!m.is_read).length;
    s('statLabel1','Total Pesan'); s('stat1', messagesCache.length);
    s('statLabel2','Belum Dibaca'); s('stat2', unread);
    s('statLabel3','Sudah Dibaca'); s('stat3', messagesCache.filter(m=>m.is_read).length);
    s('statLabel4','Hari Ini'); s('stat4', messagesCache.filter(m=>new Date(m.created_at).toDateString()===new Date().toDateString()).length);
  } else if (currentTab === 'team') {
    s('statLabel1','Total Anggota'); s('stat1', teamCache.length);
    s('statLabel2','—'); s('stat2','—'); s('statLabel3','—'); s('stat3','—'); s('statLabel4','—'); s('stat4','—');
  }
}

/* ════════════════════════════════════════════════
   NEWS
   ════════════════════════════════════════════════ */
async function loadNews() {
  newsCache = await fetchAllNews();
  renderNewsList(); updateStats();
}
function renderNewsList() {
  const list = document.getElementById('newsList');
  if (!newsCache.length) { list.innerHTML = '<div class="panel-empty">Belum ada berita. Tambah yang pertama!</div>'; return; }
  list.innerHTML = newsCache.map(n => {
    const thumb = n.image_url
      ? `<img class="ni-img" src="${n.image_url}" alt="${n.title}" onerror="this.style.display='none'">`
      : `<div class="ni-img-placeholder ni-em-navy">${ICON_NEWS}</div>`;
    return `
    <div class="news-item">
      ${thumb}
      <div class="ni-body">
        <div class="ni-cat">${n.category}</div>
        <div class="ni-title">${n.title}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
          <div class="ni-date">${n.date_label||''}</div>
          <span class="ni-badge ${n.status==='pub'?'pub':'dft'}">${n.status==='pub'?'Live':'Draft'}</span>
        </div>
      </div>
      <div class="ni-actions">
        <button class="ni-btn edit" onclick="editNews('${n.id}')" title="Edit">${ICON_EDIT}</button>
        <button class="ni-btn del"  onclick="deleteNews('${n.id}')" title="Hapus">${ICON_DEL}</button>
      </div>
    </div>`;
  }).join('');
}

async function saveNewsEntry() {
  const title   = document.getElementById('fTitle').value.trim();
  const excerpt = document.getElementById('fExcerpt').value.trim();
  if (!title || !excerpt) { showToast('Judul dan ringkasan wajib diisi!', 'danger'); return; }
  const editId = document.getElementById('newsEditId').value;
  const { url: imageUrl, error: uploadError } = await resolveImageUpload('fImageFile', document.getElementById('fImageUrl').value.trim(), 'news');
  if (uploadError) { showToast('Upload gagal: ' + uploadError.message, 'danger'); return; }
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
  const entry = {
    category: document.getElementById('fCat').value,
    title, excerpt,
    image_url: imageUrl || null,
    bg: document.getElementById('fBg').value,
    status: document.getElementById('fStatus').value
  };
  if (editId) entry.id = editId; else entry.date_label = dateStr;
  const oldImageUrl = editId ? (newsCache.find(n => String(n.id) === String(editId))?.image_url || null) : null;
  const {data, error} = await saveNews(entry);
  if (error) { showToast('Gagal: ' + error.message, 'danger'); return; }
  await replaceImage(oldImageUrl, entry.image_url);
  showToast(editId ? 'Berita diperbarui!' : 'Berita ditambahkan!', 'success');
  resetNewsForm();
  if (data) {
    const idx = newsCache.findIndex(n => String(n.id) === String(data.id));
    if (idx > -1) newsCache[idx] = data; else newsCache.unshift(data);
    renderNewsList(); updateStats();
  } else {
    await loadNews(); // fallback if server didn't return the row
  }
}

function editNews(id) {
  const n = newsCache.find(d=>String(d.id)===String(id)); if (!n) return;
  document.getElementById('newsEditId').value = n.id;
  document.getElementById('fTitle').value   = n.title;
  document.getElementById('fExcerpt').value = n.excerpt;
  document.getElementById('fImageUrl').value = n.image_url || '';
  document.getElementById('fCat').value     = n.category;
  document.getElementById('fStatus').value  = n.status;
  document.getElementById('fBg').value      = n.bg;
  // Update dropdown labels
  setDropdownValue('newsCatDropdown','newsCatLabel', n.category, n.category);
  setDropdownValue('newsStatusDropdown','newsStatusLabel', n.status, n.status === 'pub' ? 'Dipublikasi' : 'Draft');
  setDropdownValue('newsBgDropdown','newsBgLabel', n.bg, n.bg === 'navy-bg' ? 'Navy Blue' : n.bg === 'sand-bg' ? 'Sand' : 'Navy Dark');
  // Preview
  const fPrev = document.getElementById('fImgPrev');
  if (n.image_url) { fPrev.querySelector('img').src = n.image_url; fPrev.style.display=''; }
  else fPrev.style.display = 'none';
  const lbl = document.getElementById('fImageFileLabel');
  if (lbl) lbl.textContent = n.image_url ? 'Ganti foto...' : 'Pilih foto...';
  document.getElementById('newsFormTitle').textContent = 'Edit Berita';
  updatePreview('newsPreview', n.title);
}

function setDropdownValue(dropdownId, labelId, value, label) {
  const dropdown = document.getElementById(dropdownId);
  const lbl = document.getElementById(labelId);
  if (lbl) lbl.textContent = label;
  if (dropdown) {
    dropdown.querySelectorAll('.custom-select__option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === value);
    });
  }
}

async function deleteNews(id) {
  if (!confirm('Yakin hapus berita ini?')) return;
  const target = newsCache.find(n => String(n.id) === String(id));
  const {error} = await deleteNewsById(id);
  if (error) { showToast(error.message, 'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Berita dihapus.');
  newsCache = newsCache.filter(n => String(n.id) !== String(id));
  renderNewsList(); updateStats();
}
function resetNewsForm() {
  document.getElementById('newsEditId').value=''; document.getElementById('fTitle').value='';
  document.getElementById('fExcerpt').value=''; document.getElementById('fImageUrl').value='';
  document.getElementById('fImageFile').value='';
  document.getElementById('fCat').value='Promo'; document.getElementById('fStatus').value='pub'; document.getElementById('fBg').value='navy-bg';
  setDropdownValue('newsCatDropdown','newsCatLabel','Promo','Promo');
  setDropdownValue('newsStatusDropdown','newsStatusLabel','pub','Dipublikasi');
  setDropdownValue('newsBgDropdown','newsBgLabel','navy-bg','Navy Blue');
  document.getElementById('newsFormTitle').textContent='Tambah Berita';
  document.getElementById('newsPreview').style.display='none';
  document.getElementById('fImgPrev').style.display='none';
  const lbl = document.getElementById('fImageFileLabel');
  if (lbl) lbl.textContent = 'Pilih foto...';
}

/* ════════════════════════════════════════════════
   MENU
   ════════════════════════════════════════════════ */
async function loadMenu() {
  menuCache = await fetchMenuItems(); renderMenuList(); updateStats();
}
function filterMenuList(cat) {
  menuFilter = cat;
  renderMenuList();
}
function formatPriceAdmin(p) { return 'Rp '+Number(p).toLocaleString('id-ID'); }
function renderMenuList() {
  const list = document.getElementById('menuList');
  const items = menuFilter==='all' ? menuCache : menuCache.filter(m=>m.category===menuFilter);
  if (!items.length) { list.innerHTML='<div class="panel-empty">Belum ada item menu.</div>'; return; }
  list.innerHTML = items.map(m => {
    const thumb = m.image_url
      ? `<img src="${m.image_url}" alt="${m.name}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`
      : `<div class="mi-icon"><img src="assets/coffee.svg" alt="" style="width:22px;height:22px;"></div>`;
    const flags = [m.is_favorite?'Favorit':'', m.is_featured?'Featured':''].filter(Boolean).join(' · ');
    return `
      <div class="menu-item-row">
        ${thumb}
        <div class="mi-body">
          <div class="mi-cat">${MENU_CAT_LABELS[m.category]||m.category}${m.badge?' · '+m.badge:''}</div>
          <div class="mi-name">${m.name}</div>
          <div class="mi-price">${formatPriceAdmin(m.price)}${m.hot_iced?' · '+m.hot_iced:''}</div>
          ${flags?`<div style="font-size:0.7rem;color:var(--accent);margin-top:2px;">${flags}</div>`:''}
        </div>
        <div class="ni-actions">
          <button class="ni-btn edit" onclick="editMenuItem('${m.id}')" title="Edit">${ICON_EDIT}</button>
          <button class="ni-btn del"  onclick="deleteMenuItem('${m.id}')" title="Hapus">${ICON_DEL}</button>
        </div>
      </div>`;
  }).join('');
}
async function saveMenuEntry() {
  const name  = document.getElementById('mName').value.trim();
  const price = document.getElementById('mPrice').value;
  if (!name || price==='') { showToast('Nama dan harga wajib diisi!', 'danger'); return; }
  const editId = document.getElementById('menuEditId').value;
  const { url: imageUrl, error: uploadError } = await resolveImageUpload('mImageFile', document.getElementById('mImageUrl').value.trim(), 'menu');
  if (uploadError) { showToast(uploadError.message, 'danger'); return; }
  const entry = {
    name, description:document.getElementById('mDesc').value.trim(),
    category:document.getElementById('mCat').value, price:Number(price),
    badge:document.getElementById('mBadge').value, hot_iced:document.getElementById('mHot').value,
    image_url: imageUrl || null,
    is_favorite:document.getElementById('mIsFavorite').checked,
    is_featured:document.getElementById('mIsFeatured').checked,
  };
  if (editId) entry.id=editId;
  else entry.sort_order = menuCache.filter(m=>m.category===entry.category).length;
  Object.keys(entry).forEach(k=>entry[k]===undefined&&delete entry[k]);
  const oldImageUrl = editId ? (menuCache.find(m => String(m.id) === String(editId))?.image_url || null) : null;
  const {data, error} = await saveMenuItem(entry);
  if (error) { showToast(error.message, 'danger'); return; }
  await replaceImage(oldImageUrl, entry.image_url);
  showToast(editId?'Menu diperbarui!':'Menu ditambahkan!','success');
  resetMenuForm();
  if (data) {
    const idx = menuCache.findIndex(m => String(m.id) === String(data.id));
    if (idx > -1) menuCache[idx] = data; else menuCache.push(data);
    renderMenuList(); updateStats();
  } else {
    await loadMenu();
  }
}
function editMenuItem(id) {
  const m = menuCache.find(d=>String(d.id)===String(id)); if (!m) return;
  document.getElementById('menuEditId').value    = m.id;
  document.getElementById('mName').value         = m.name;
  document.getElementById('mDesc').value         = m.description||'';
  document.getElementById('mCat').value          = m.category;
  document.getElementById('mPrice').value        = m.price;
  document.getElementById('mBadge').value        = m.badge||'';
  document.getElementById('mHot').value          = m.hot_iced||'';
  document.getElementById('mImageUrl').value     = m.image_url||'';
  document.getElementById('mIsFavorite').checked = !!m.is_favorite;
  document.getElementById('mIsFeatured').checked = !!m.is_featured;
  document.getElementById('mImageFile').value = '';
  setDropdownValue('menuCatFormDropdown','menuCatFormLabel', m.category, MENU_CAT_LABELS[m.category]||m.category);
  setDropdownValue('menuBadgeDropdown','menuBadgeLabel', m.badge||'', m.badge||'—');
  setDropdownValue('menuHotDropdown','menuHotLabel', m.hot_iced||'', m.hot_iced||'—');
  const mPrev = document.getElementById('mImgPrev');
  if (m.image_url) { mPrev.querySelector('img').src = m.image_url; mPrev.style.display=''; }
  else { mPrev.style.display = 'none'; }
  const lbl = document.getElementById('mImageFileLabel');
  if (lbl) lbl.textContent = m.image_url ? 'Ganti foto...' : 'Pilih foto...';
  document.getElementById('menuFormTitle').textContent='Edit Menu';
}
async function deleteMenuItem(id) {
  if (!confirm('Yakin hapus item menu ini?')) return;
  const target = menuCache.find(m => String(m.id) === String(id));
  const {error} = await deleteMenuItemById(id);
  if (error) { showToast(error.message, 'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Item dihapus.');
  menuCache = menuCache.filter(m => String(m.id) !== String(id));
  renderMenuList(); updateStats();
}
function resetMenuForm() {
  ['menuEditId','mName','mDesc','mPrice','mImageUrl','mImageFile'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mCat').value='coffee'; document.getElementById('mBadge').value=''; document.getElementById('mHot').value='';
  document.getElementById('mIsFavorite').checked=false; document.getElementById('mIsFeatured').checked=false;
  document.getElementById('mImgPrev').style.display='none';
  setDropdownValue('menuCatFormDropdown','menuCatFormLabel','coffee','Coffee');
  setDropdownValue('menuBadgeDropdown','menuBadgeLabel','','—');
  setDropdownValue('menuHotDropdown','menuHotLabel','','—');
  document.getElementById('menuFormTitle').textContent='Tambah Menu';
  const lbl = document.getElementById('mImageFileLabel');
  if (lbl) lbl.textContent = 'Pilih foto...';
}

/* ════════════════════════════════════════════════
   MESSAGES INBOX
   ════════════════════════════════════════════════ */
async function loadMessages() {
  messagesCache = await fetchContactMessages();
  renderMessages(); updateStats(); updateUnreadBadge();
}
async function loadMessagesCount() {
  messagesCache = await fetchContactMessages();
  updateUnreadBadge();
}
function updateUnreadBadge() {
  const unread = messagesCache.filter(m=>!m.is_read).length;
  const badge = document.getElementById('unreadBadge');
  badge.textContent = unread; badge.style.display = unread ? '' : 'none';
}
function renderMessages() {
  const list = document.getElementById('messagesList');
  if (!messagesCache.length) { list.innerHTML='<div class="panel-empty">Belum ada pesan masuk.</div>'; return; }
  list.innerHTML = messagesCache.map(m => `
    <div class="msg-item ${m.is_read?'read':'unread'}" id="msg-${m.id}">
      <div class="msg-header">
        <div class="msg-name">${escapeHtml(m.name)||'—'} ${m.is_read?'':'<span class="unread-dot"></span>'}</div>
        <div class="msg-date">${new Date(m.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div class="msg-topic">${escapeHtml(m.topic)||'Umum'} ${m.email?'· '+escapeHtml(m.email):''}</div>
      <div class="msg-text">${escapeHtml(m.message)||''}</div>
      ${m.event_date?`<div class="msg-extra">${escapeHtml(m.event_date)} ${m.guests?'· '+escapeHtml(m.guests):''}</div>`:''}
      <div class="msg-actions">
        ${!m.is_read?`<button class="ni-btn edit" onclick="markRead('${m.id}')" title="Tandai dibaca">${ICON_CHECK}</button>`:''}
        <button class="ni-btn del" onclick="deleteMsg('${m.id}')" title="Hapus">${ICON_DEL}</button>
        ${m.phone?`<a href="https://wa.me/${m.phone.replace(/[^0-9]/g,'')}" target="_blank" class="ni-btn msg">${ICON_WA}</a>`:''}
      </div>
    </div>`).join('');
}
async function markRead(id) {
  await markMessageRead(id); await loadMessages();
}
async function deleteMsg(id) {
  if (!confirm('Hapus pesan ini?')) return;
  await deleteMessage(id); await loadMessages(); showToast('Pesan dihapus.');
}

/* ════════════════════════════════════════════════
   REVIEWS MODERATION
   ════════════════════════════════════════════════ */
let reviewsCache = [];
async function loadReviews() {
  reviewsCache = await fetchAllReviews();
  renderReviewsList(); updatePendingReviewBadge();
}
async function loadReviewsCount() {
  reviewsCache = await fetchAllReviews();
  updatePendingReviewBadge();
}
function updatePendingReviewBadge() {
  const pending = reviewsCache.filter(r => r.status !== 'pub').length;
  const badge = document.getElementById('pendingReviewBadge');
  if (!badge) return;
  badge.textContent = pending; badge.style.display = pending ? '' : 'none';
}
function renderReviewsList() {
  const list = document.getElementById('reviewsList');
  if (!list) return;
  if (!reviewsCache.length) { list.innerHTML = '<div class="panel-empty">Belum ada ulasan.</div>'; return; }
  list.innerHTML = reviewsCache.map(r => `
    <div class="msg-item ${r.status==='pub'?'read':'unread'}">
      <div class="msg-header">
        <div class="msg-name">${escapeHtml(r.name)} ${r.status!=='pub'?'<span class="unread-dot"></span>':''}</div>
        <div class="msg-date">${r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
      </div>
      <div class="msg-topic">${'★'.repeat(Math.max(1,Math.min(5,parseInt(r.rating)||5)))} · ${r.status==='pub'?'Dipublikasi':'Menunggu Persetujuan'}</div>
      <div class="msg-text">${escapeHtml(r.comment)}</div>
      <div class="msg-actions">
        ${r.status!=='pub'?`<button class="ni-btn edit" onclick="approveReview('${r.id}')" title="Publikasikan">${ICON_CHECK}</button>`:`<button class="ni-btn edit" onclick="unpublishReview('${r.id}')" title="Sembunyikan">${ICON_EDIT}</button>`}
        <button class="ni-btn del" onclick="deleteReview('${r.id}')" title="Hapus">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
async function approveReview(id) {
  const { error } = await updateReviewStatus(id, 'pub');
  if (error) { showToast(error.message, 'danger'); return; }
  showToast('Ulasan dipublikasikan.', 'success'); await loadReviews();
}
async function unpublishReview(id) {
  const { error } = await updateReviewStatus(id, 'dft');
  if (error) { showToast(error.message, 'danger'); return; }
  showToast('Ulasan disembunyikan.'); await loadReviews();
}
async function deleteReview(id) {
  if (!confirm('Hapus ulasan ini?')) return;
  const { error } = await deleteReviewById(id);
  if (error) { showToast(error.message, 'danger'); return; }
  showToast('Ulasan dihapus.'); await loadReviews();
}

/* ════════════════════════════════════════════════
   AMBIANCE PHOTOS
   ════════════════════════════════════════════════ */
async function loadAmbiancePhotos() {
  ambianceCache = await fetchAmbiancePhotos(); renderAmbianceList(); renderAmbiancePagePreview();
}
function renderAmbianceList() {
  const list = document.getElementById('ambianceList');
  if (!ambianceCache.length) { list.innerHTML='<div class="panel-empty">Belum ada foto suasana.</div>'; return; }
  list.innerHTML = ambianceCache.map(p => `
    <div class="photo-admin-item">
      <img src="${p.image_url}" alt="${p.label}" loading="lazy" onerror="this.src='assets/photo.svg'">
      <div class="photo-admin-label">${p.label} ${p.size==='big'?'(Besar)':''}</div>
      <div class="photo-admin-actions">
        <button class="ni-btn edit" onclick="editAmbiance('${p.id}')">${ICON_EDIT}</button>
        <button class="ni-btn del"  onclick="deleteAmbiance('${p.id}')">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
async function saveAmbianceEntry() {
  const editId = document.getElementById('ambianceEditId').value;
  const { url, error: uploadError } = await resolveImageUpload('ambImageFile', document.getElementById('ambUrl').value.trim(), 'ambiance');
  if (uploadError) { showToast(uploadError.message, 'danger'); return; }
  if (!url) { showToast('Foto wajib diunggah!', 'danger'); return; }
  const entry = { image_url:url, label:document.getElementById('ambLabel').value.trim()||'Area', size:document.getElementById('ambSize').value, sort_order:Number(document.getElementById('ambOrder').value)||0 };
  if (editId) entry.id = editId;
  const oldImageUrl = editId ? (ambianceCache.find(p => String(p.id) === String(editId))?.image_url || null) : null;
  const {error} = await saveAmbiancePhoto(entry);
  if (error) { showToast(error.message, 'danger'); return; }
  await replaceImage(oldImageUrl, entry.image_url);
  showToast(editId?'Foto diperbarui!':'Foto ditambahkan!','success');
  resetAmbianceForm(); await loadAmbiancePhotos();
}
function editAmbiance(id) {
  const p = ambianceCache.find(d=>String(d.id)===String(id)); if (!p) return;
  document.getElementById('ambianceEditId').value = p.id;
  document.getElementById('ambUrl').value   = p.image_url;
  document.getElementById('ambLabel').value = p.label;
  document.getElementById('ambSize').value  = p.size||'mid';
  document.getElementById('ambOrder').value = p.sort_order||0;
  document.getElementById('ambImageFile').value = '';
  setDropdownValue('ambSizeDropdown','ambSizeLabel', p.size||'mid', p.size==='big'?'Besar (full width)':'Normal');
  const ambPrev = document.getElementById('ambImgPrev');
  if (p.image_url) { ambPrev.querySelector('img').src = p.image_url; ambPrev.style.display=''; }
  else { ambPrev.style.display = 'none'; }
  const lbl = document.getElementById('ambImageFileLabel');
  if (lbl) lbl.textContent = p.image_url ? 'Ganti foto...' : 'Pilih foto...';
  document.getElementById('ambianceFormTitle').textContent='Edit Foto Suasana';
}
async function deleteAmbiance(id) {
  if (!confirm('Hapus foto ini?')) return;
  const target = ambianceCache.find(p => String(p.id) === String(id));
  const {error} = await deleteAmbiancePhoto(id);
  if (error) { showToast(error.message, 'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Foto dihapus.'); await loadAmbiancePhotos();
}
function resetAmbianceForm() {
  ['ambianceEditId','ambUrl','ambLabel','ambImageFile'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ambSize').value='mid'; document.getElementById('ambOrder').value='0';
  document.getElementById('ambImgPrev').style.display='none';
  setDropdownValue('ambSizeDropdown','ambSizeLabel','mid','Normal');
  document.getElementById('ambianceFormTitle').textContent='Tambah Foto Suasana';
  const lbl = document.getElementById('ambImageFileLabel');
  if (lbl) lbl.textContent = 'Pilih foto...';
}

/* ════════════════════════════════════════════════
   HOME ABOUT PHOTO
   ════════════════════════════════════════════════ */
// homeAboutData replaced by 4-slot system
const HA_SLOTS = [
  { key:'coffee_craft', label:'Coffee Craft' },
  { key:'photo_spots',  label:'Photo Spots'  },
  { key:'fresh_pastry', label:'Fresh Pastry' },
  { key:'work_space',   label:'Work Space'   },
];

async function loadHomeAbout() {
  const photos = await fetchHomeAboutPhotos();
  const slotMap = {};
  photos.forEach(p => { if (p.slot) slotMap[p.slot] = p; });
  HA_SLOTS.forEach(({ key }) => {
    const prev = document.getElementById(`haPreview_${key}`);
    const urlInput = document.getElementById(`homeAboutUrl_${key}`);
    const p = slotMap[key];
    if (p?.image_url) {
      if (urlInput) urlInput.value = p.image_url;
      if (prev) prev.innerHTML = `<img src="${p.image_url}" style="width:100%;height:80px;object-fit:cover;display:block;">`;
      const lbl = document.getElementById(`haFileLabel_${key}`);
      if (lbl) lbl.textContent = 'Ganti foto...';
    }
  });
  renderHomeAboutPagePreview();
}

async function saveHomeAboutEntry() {
  let saved = 0, errors = 0;
  for (const { key } of HA_SLOTS) {
    const fileInput = document.getElementById(`haFile_${key}`);
    const existingUrl = document.getElementById(`homeAboutUrl_${key}`)?.value.trim() || '';
    if (!fileInput?.files?.length && !existingUrl) continue; // skip empty slots
    const { url, error: uploadError } = await resolveImageUpload(`haFile_${key}`, existingUrl, 'home-about');
    if (uploadError) { errors++; continue; }
    if (!url) continue;
    const { error } = await saveHomeAboutPhoto({ slot: key, image_url: url });
    if (error) { errors++; continue; }
    if (fileInput?.files?.length) await replaceImage(existingUrl, url);
    saved++;
  }
  if (errors) showToast(`${errors} slot gagal disimpan`, 'danger');
  else showToast(`${saved} foto berhasil disimpan!`, 'success');
  await loadHomeAbout();
}


/* ════════════════════════════════════════════════
   STORY PHOTO
   ════════════════════════════════════════════════ */
let storyPhData = null;
async function loadStoryPhoto() {
  storyPhData = await fetchAboutPhoto();
  const preview = document.getElementById('storyPhPreview');
  if (!preview) return;
  if (storyPhData?.image_url) {
    preview.innerHTML = `<img src="${storyPhData.image_url}" alt="Story" style="width:100%;max-height:300px;object-fit:contain;border-radius:12px;margin:12px 0;background:#f5f0e8;">`;
    document.getElementById('storyPhEditId').value = storyPhData.id;
    document.getElementById('storyPhUrl').value    = storyPhData.image_url;
    const spPrev = document.getElementById('storyPhImgPrev');
    if (spPrev) { spPrev.querySelector('img').src = storyPhData.image_url; spPrev.style.display=''; }
    const lbl = document.getElementById('storyPhImageFileLabel');
    if (lbl) lbl.textContent = 'Ganti foto...';
  } else {
    preview.innerHTML = '<div class="panel-empty">Belum ada foto. Unggah di form.</div>';
  }
  renderStoryPagePreview();
}
async function saveStoryPhEntry() {
  const editId = document.getElementById('storyPhEditId').value;
  const oldUrl = storyPhData?.image_url || null;
  const { url, error: uploadError } = await resolveImageUpload('storyPhImageFile', document.getElementById('storyPhUrl').value.trim(), 'story');
  if (uploadError) { showToast(uploadError.message, 'danger'); return; }
  if (!url) { showToast('Foto wajib diunggah!', 'danger'); return; }
  const entry = { image_url: url };
  if (editId) entry.id = editId;
  const {error} = await saveAboutPhoto(entry);
  if (error) { showToast(error.message, 'danger'); return; }
  await replaceImage(oldUrl, url);
  document.getElementById('storyPhImageFile').value = '';
  showToast('Foto Story disimpan!','success'); await loadStoryPhoto();
}

/* ════════════════════════════════════════════════
   EVENT PHOTOS
   ════════════════════════════════════════════════ */
async function loadEventPhotos() {
  eventsCache = await fetchEventPhotos(); renderEventsList(); renderEventsPagePreview();
}
function renderEventsList() {
  const list = document.getElementById('eventsList');
  if (!eventsCache.length) { list.innerHTML='<div class="panel-empty">Belum ada foto event.</div>'; return; }
  list.innerHTML = eventsCache.map(p=>`
    <div class="photo-admin-item">
      <img src="${p.image_url}" alt="${p.label}" loading="lazy" onerror="this.src='assets/photo.svg'">
      <div class="photo-admin-label">${p.label}</div>
      <div class="photo-admin-actions">
        <button class="ni-btn edit" onclick="editEvent('${p.id}')">${ICON_EDIT}</button>
        <button class="ni-btn del"  onclick="deleteEvent('${p.id}')">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
async function saveEventsEntry() {
  const editId = document.getElementById('eventsEditId').value;
  const { url, error: uploadError } = await resolveImageUpload('evImageFile', document.getElementById('evUrl').value.trim(), 'events');
  if (uploadError) { showToast(uploadError.message, 'danger'); return; }
  if (!url) { showToast('Foto wajib diunggah!', 'danger'); return; }
  const entry = { image_url:url, label:document.getElementById('evLabel').value.trim()||'Event', sort_order:Number(document.getElementById('evOrder').value)||0 };
  if (editId) entry.id = editId;
  const oldImageUrl = editId ? (eventsCache.find(p => String(p.id) === String(editId))?.image_url || null) : null;
  const {error} = await saveEventPhoto(entry);
  if (error) { showToast(error.message, 'danger'); return; }
  await replaceImage(oldImageUrl, entry.image_url);
  showToast(editId?'Foto diperbarui!':'Foto ditambahkan!','success');
  resetEventsForm(); await loadEventPhotos();
}
function editEvent(id) {
  const p = eventsCache.find(d=>String(d.id)===String(id)); if (!p) return;
  document.getElementById('eventsEditId').value = p.id;
  document.getElementById('evUrl').value   = p.image_url;
  document.getElementById('evLabel').value = p.label;
  document.getElementById('evOrder').value = p.sort_order||0;
  document.getElementById('evImageFile').value = '';
  const evPrev = document.getElementById('evImgPrev');
  if (p.image_url) { evPrev.querySelector('img').src = p.image_url; evPrev.style.display=''; }
  else { evPrev.style.display = 'none'; }
  const lbl = document.getElementById('evImageFileLabel');
  if (lbl) lbl.textContent = p.image_url ? 'Ganti foto...' : 'Pilih foto...';
  document.getElementById('eventsFormTitle').textContent='Edit Foto Event';
}
async function deleteEvent(id) {
  if (!confirm('Hapus foto ini?')) return;
  const target = eventsCache.find(p => String(p.id) === String(id));
  const {error} = await deleteEventPhoto(id);
  if (error) { showToast(error.message, 'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Foto dihapus.'); await loadEventPhotos();
}
function resetEventsForm() {
  ['eventsEditId','evUrl','evLabel','evImageFile'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('evOrder').value='0'; document.getElementById('evImgPrev').style.display='none';
  document.getElementById('eventsFormTitle').textContent='Tambah Foto Event';
  const lbl = document.getElementById('evImageFileLabel');
  if (lbl) lbl.textContent = 'Pilih foto...';
}

/* ════════════════════════════════════════════════
   TEAM
   ════════════════════════════════════════════════ */
async function loadTeam() {
  teamCache = await fetchTeamMembers(); renderTeamList(); renderTeamPagePreview(); updateStats();
}
function renderTeamList() {
  const list = document.getElementById('teamList');
  if (!teamCache.length) { list.innerHTML='<div class="panel-empty">Belum ada anggota tim.</div>'; return; }
  list.innerHTML = teamCache.map(m=>`
    <div class="menu-item-row">
      ${m.image_url
        ? `<img src="${m.image_url}" alt="${m.name}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
        : `<div class="mi-icon" style="border-radius:50%;"><img src="assets/person.svg" alt="" style="width:22px;height:22px;"></div>`}
      <div class="mi-body">
        <div class="mi-name">${m.name}</div>
        <div class="mi-price">${m.role}</div>
      </div>
      <div class="ni-actions">
        <button class="ni-btn edit" onclick="editTeam('${m.id}')">${ICON_EDIT}</button>
        <button class="ni-btn del"  onclick="deleteTeamMem('${m.id}')">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
async function saveTeamEntry() {
  const name = document.getElementById('tName').value.trim();
  const role = document.getElementById('tRole').value.trim();
  if (!name||!role) { showToast('Nama dan jabatan wajib diisi!','danger'); return; }
  const editId = document.getElementById('teamEditId').value;
  const { url: imageUrl, error: uploadError } = await resolveImageUpload('tImageFile', document.getElementById('tImageUrl').value.trim(), 'team');
  if (uploadError) { showToast(uploadError.message,'danger'); return; }
  const entry = { name, role, image_url: imageUrl || null, sort_order:Number(document.getElementById('tOrder').value)||0 };
  if (editId) entry.id = editId;
  const oldImageUrl = editId ? (teamCache.find(m => String(m.id) === String(editId))?.image_url || null) : null;
  const {data, error} = await saveTeamMember(entry);
  if (error) { showToast(error.message,'danger'); return; }
  await replaceImage(oldImageUrl, entry.image_url);
  showToast(editId?'Anggota diperbarui!':'Anggota ditambahkan!','success');
  resetTeamForm();
  if (data) {
    const idx = teamCache.findIndex(m => String(m.id) === String(data.id));
    if (idx > -1) teamCache[idx] = data; else teamCache.push(data);
    renderTeamList(); renderTeamPagePreview(); updateStats();
  } else {
    await loadTeam();
  }
}
function editTeam(id) {
  const m = teamCache.find(d=>String(d.id)===String(id)); if (!m) return;
  document.getElementById('teamEditId').value  = m.id;
  document.getElementById('tName').value       = m.name;
  document.getElementById('tRole').value       = m.role;
  document.getElementById('tImageUrl').value   = m.image_url||'';
  document.getElementById('tOrder').value      = m.sort_order||0;
  document.getElementById('tImageFile').value = '';
  const tPrev = document.getElementById('tImgPrev');
  if (m.image_url) { tPrev.querySelector('img').src = m.image_url; tPrev.style.display=''; }
  else { tPrev.style.display = 'none'; }
  const lbl = document.getElementById('tImageFileLabel');
  if (lbl) lbl.textContent = m.image_url ? 'Ganti foto...' : 'Pilih foto...';
  document.getElementById('teamFormTitle').textContent='Edit Anggota Tim';
}
async function deleteTeamMem(id) {
  if (!confirm('Hapus anggota ini?')) return;
  const target = teamCache.find(m => String(m.id) === String(id));
  const {error} = await deleteTeamMember(id);
  if (error) { showToast(error.message,'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Anggota dihapus.');
  teamCache = teamCache.filter(m => String(m.id) !== String(id));
  renderTeamList(); renderTeamPagePreview(); updateStats();
}
function resetTeamForm() {
  ['teamEditId','tName','tRole','tImageUrl','tImageFile','tOrder'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('tImgPrev').style.display='none';
  document.getElementById('teamFormTitle').textContent='Tambah Anggota Tim';
  const lbl = document.getElementById('tImageFileLabel');
  if (lbl) lbl.textContent = 'Pilih foto...';
}

/* ════════════════════════════════════════════════
   TAMPILAN PAGE PREVIEWS
   ════════════════════════════════════════════════ */

function renderAmbiancePagePreview() {
  const block = document.getElementById('ambiancePagePreview');
  const inner = document.getElementById('ambiancePagePreviewInner');
  if (!block || !inner) return;
  if (!ambianceCache.length) { block.style.display = 'none'; return; }
  block.style.display = '';
  // Sort: big first, then mid
  const sorted = [...ambianceCache].sort((a,b) => {
    if (a.size==='big' && b.size!=='big') return -1;
    if (b.size==='big' && a.size!=='big') return 1;
    return (a.sort_order||0)-(b.sort_order||0);
  });
  const bigItem = sorted.find(p=>p.size==='big');
  const midItems = sorted.filter(p=>p.size!=='big').slice(0,4);
  const makeItem = (p, cls) => `
    <div class="ppv-amb-item ${cls}">
      ${p ? `<img src="${p.image_url}" alt="${p.label}" loading="lazy">
             <div class="ppv-label">${p.label}</div>`
          : `<div class="ppv-amb-empty">—</div>`}
    </div>`;
  inner.innerHTML = `
    <div class="ppv-ambiance-grid">
      ${makeItem(bigItem,'big')}
      ${midItems.map(p=>makeItem(p,'')).join('')}
      ${Array(Math.max(0,4-midItems.length)).fill('<div class="ppv-amb-item"><div class="ppv-amb-empty">—</div></div>').join('')}
    </div>`;
}

function renderHomeAboutPagePreview() {
  const block = document.getElementById('homeAboutPagePreview');
  const inner = document.getElementById('homeAboutPagePreviewInner');
  if (!block || !inner) return;
  const slots = [
    { key:'coffee_craft', label:'Coffee Craft' },
    { key:'photo_spots',  label:'Photo Spots'  },
    { key:'fresh_pastry', label:'Fresh Pastry' },
    { key:'work_space',   label:'Work Space'   },
  ];
  const anyPhoto = slots.some(s => {
    const v = document.getElementById(`homeAboutUrl_${s.key}`)?.value;
    return v && v.length > 0;
  });
  if (!anyPhoto) { block.style.display = 'none'; return; }
  block.style.display = '';
  inner.innerHTML = `<div class="ppv-about-cards">
    ${slots.map(s => {
      const url = document.getElementById(`homeAboutUrl_${s.key}`)?.value || '';
      const prev = document.getElementById(`haPreview_${s.key}`)?.querySelector('img')?.src || '';
      const src = url || prev || '';
      return `<div class="ppv-about-card">
        ${src ? `<img src="${src}" alt="${s.label}">` : `<div class="ppv-about-card-empty">${s.label}</div>`}
        <div class="ppv-card-label">${s.label}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderStoryPagePreview() {
  const block = document.getElementById('storyPagePreview');
  const inner = document.getElementById('storyPagePreviewInner');
  if (!block || !inner) return;
  const imgSrc = storyPhData?.image_url || '';
  if (!imgSrc) { block.style.display = 'none'; return; }
  block.style.display = '';
  inner.innerHTML = `
    <div class="ppv-story-wrap">
      <img src="${imgSrc}" alt="Story">
      <div class="ppv-story-overlay">
        <div class="ppv-story-text">
          <div class="ppv-story-tag">Our Story</div>
          <div class="ppv-story-title">Cerita di balik<br>setiap cangkir.</div>
        </div>
      </div>
    </div>`;
}

function renderEventsPagePreview() {
  const block = document.getElementById('eventsPagePreview');
  const inner = document.getElementById('eventsPagePreviewInner');
  if (!block || !inner) return;
  if (!eventsCache.length) { block.style.display = 'none'; return; }
  block.style.display = '';
  inner.innerHTML = `<div class="ppv-events-grid">
    ${eventsCache.map(p => `
      <div class="ppv-ev-item">
        <img src="${p.image_url}" alt="${p.label}" loading="lazy">
        <div class="ppv-label">${p.label}</div>
      </div>`).join('')}
  </div>`;
}

function renderTeamPagePreview() {
  const block = document.getElementById('teamPagePreview');
  const inner = document.getElementById('teamPagePreviewInner');
  if (!block || !inner) return;
  if (!teamCache.length) { block.style.display = 'none'; return; }
  block.style.display = '';
  inner.innerHTML = `<div class="ppv-team-grid">
    ${teamCache.map(m => `
      <div class="ppv-team-card">
        ${m.image_url
          ? `<img src="${m.image_url}" alt="${m.name}">`
          : `<div class="ppv-team-avatar">${m.name.charAt(0).toUpperCase()}</div>`}
        <div class="ppv-team-name">${m.name}</div>
        <div class="ppv-team-role">${m.role}</div>
      </div>`).join('')}
  </div>`;
}

/* ════════════════════════════════════════════════
   HERO CARD LIVE PREVIEW
   ════════════════════════════════════════════════ */
function renderHeroCardPreview() {
  const el = document.getElementById('heroCardPreview');
  if (!el) return;
  const name      = document.getElementById('ciHeroName')?.value  || 'Signature Navy Latte';
  const desc      = document.getElementById('ciHeroDesc')?.value  || 'Espresso · Butterfly Pea · Oat Milk';
  const badge1    = document.getElementById('ciHeroBadge1')?.value || '';
  const badge2    = document.getElementById('ciHeroBadge2')?.value || '';
  const toastLbl  = document.getElementById('ciHeroToastLabel')?.value || '';
  const toastSub  = document.getElementById('ciHeroToastSub')?.value  || '';
  const wifiLbl   = document.getElementById('ciHeroWifiLabel')?.value  || '';
  const wifiSpd   = document.getElementById('ciHeroWifiSpeed')?.value  || '';
  const bgColor   = document.getElementById('ciHeroBgColor')?.value    || '#2E5F8A';
  const imgSrc    = document.getElementById('ciHeroImgPrev')?.querySelector('img')?.src || '';
  const imgEl     = imgSrc && !imgSrc.endsWith('#')
    ? `<img src="${imgSrc}" alt="hero" style="width:100%;height:140px;object-fit:cover;border-radius:10px 10px 0 0;">`
    : `<div style="width:100%;height:140px;background:${bgColor};border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:center;">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)"/><path d="M10 26 Q10 22 13 22 Q12 19 14 17 Q14 14 17 14 Q17 11 20 12 Q22 10 24 13 Q27 12 27 16 Q29 17 29 20 Q31 20 31 23 Q31 26 29 26 L10 26 Z" fill="white" opacity="0.6"/></svg>
      </div>`;
  const toastHtml = toastLbl
    ? `<div style="position:absolute;top:10px;right:10px;background:#fff;border-radius:10px;padding:6px 10px;display:flex;align-items:center;gap:7px;box-shadow:0 2px 8px rgba(0,0,0,.12);font-size:0.72rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#c8843b"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="none" stroke="#c8843b" stroke-width="2"/></svg>
        <div><div style="font-weight:700;color:#222;line-height:1.2;">${toastLbl}</div>${toastSub?`<div style="color:#888;">${toastSub}</div>`:''}</div>
      </div>` : '';
  const badgesHtml = (badge1||badge2)
    ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        ${badge1?`<span style="border:1px solid #c8a96e;color:#8a6535;font-size:0.68rem;font-weight:600;padding:2px 10px;border-radius:20px;">${badge1}</span>`:''}
        ${badge2?`<span style="border:1px solid #c8a96e;color:#8a6535;font-size:0.68rem;font-weight:600;padding:2px 10px;border-radius:20px;">${badge2}</span>`:''}
      </div>` : '';
  const wifiHtml = wifiLbl
    ? `<div style="position:absolute;bottom:-16px;left:12px;background:#fff;border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,.10);font-size:0.72rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E5F8A" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <div><div style="font-weight:700;color:#222;">${wifiLbl}</div>${wifiSpd?`<div style="color:#888;">${wifiSpd}</div>`:''}</div>
      </div>` : '';
  el.innerHTML = `
    <div style="max-width:260px;font-family:'Poppins',sans-serif;position:relative;padding-bottom:${wifiLbl?'24px':'0'};">
      <div style="border-radius:12px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.10);overflow:visible;">
        <div style="position:relative;">${imgEl}${toastHtml}</div>
        <div style="padding:14px 14px 16px;">
          <div style="font-weight:700;font-size:0.95rem;color:#1a1a1a;">${name}</div>
          <div style="color:#2E5F8A;font-size:0.75rem;margin-top:3px;">${desc}</div>
          ${badgesHtml}
          <div style="display:flex;align-items:center;gap:5px;margin-top:10px;font-size:0.72rem;color:#555;">
            <span style="width:7px;height:7px;background:#4caf50;border-radius:50%;display:inline-block;"></span>Open
          </div>
          <div style="position:relative;margin-top:8px;height:${wifiLbl?'20px':'0'};">${wifiHtml}</div>
        </div>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════
   CAFE INFO
   ════════════════════════════════════════════════ */
async function loadCafeInfoForm() {
  const info = await fetchCafeInfo(); if (!info) return;
  document.getElementById('cafeInfoId').value  = info.id||'';
  document.getElementById('ciAddress').value   = info.address||'';
  document.getElementById('ciAddressFull').value = info.address_full||'';
  document.getElementById('ciWeekday').value   = info.hours_weekday||'';
  document.getElementById('ciWeekend').value   = info.hours_weekend||'';
  document.getElementById('ciInstagram').value = info.instagram||'';
  document.getElementById('ciWhatsapp').value  = info.whatsapp||'';
  document.getElementById('ciEmail').value     = info.email||'';
  document.getElementById('ciMaps').value      = info.maps_url||'';
  const hn = document.getElementById('ciHeroName'); if (hn) { hn.value = info.hero_name||''; hn.addEventListener('input', renderHeroCardPreview); }
  const hd = document.getElementById('ciHeroDesc'); if (hd) { hd.value = info.hero_desc||''; hd.addEventListener('input', renderHeroCardPreview); }
  const hiUrl = document.getElementById('ciHeroImageUrl'); if (hiUrl) hiUrl.value = info.hero_image||'';
  // New hero card fields
  const b1 = document.getElementById('ciHeroBadge1'); if (b1) { b1.value = info.hero_badge1||''; b1.addEventListener('input', renderHeroCardPreview); }
  const b2 = document.getElementById('ciHeroBadge2'); if (b2) { b2.value = info.hero_badge2||''; b2.addEventListener('input', renderHeroCardPreview); }
  const tl = document.getElementById('ciHeroToastLabel'); if (tl) { tl.value = info.hero_toast_label||''; tl.addEventListener('input', renderHeroCardPreview); }
  const ts = document.getElementById('ciHeroToastSub'); if (ts) { ts.value = info.hero_toast_sub||''; ts.addEventListener('input', renderHeroCardPreview); }
  const wl = document.getElementById('ciHeroWifiLabel'); if (wl) { wl.value = info.hero_wifi_label||''; wl.addEventListener('input', renderHeroCardPreview); }
  const ws = document.getElementById('ciHeroWifiSpeed'); if (ws) { ws.value = info.hero_wifi_speed||''; ws.addEventListener('input', renderHeroCardPreview); }
  // Background color dropdown
  const bgColor = info.hero_bg_color || '#2E5F8A';
  const bgInput = document.getElementById('ciHeroBgColor'); if (bgInput) bgInput.value = bgColor;
  const bgLabelMap = { '#2E5F8A':'Navy Blue', '#1a3a52':'Navy Dark', '#4a3728':'Espresso Brown', '#3d5a3e':'Matcha Green' };
  const bgLbl = document.getElementById('ciHeroBgLabel'); if (bgLbl) bgLbl.textContent = bgLabelMap[bgColor] || 'Navy Blue';
  const bgDrop = document.getElementById('ciHeroBgDropdown');
  if (bgDrop) { bgDrop.querySelectorAll('.custom-select__option').forEach(o => o.classList.toggle('selected', o.dataset.value === bgColor)); }
  
  if (info.hero_image) {
    const prev = document.getElementById('ciHeroImgPrev');
    if (prev) { prev.querySelector('img').src = info.hero_image; prev.style.display=''; }
    const lbl = document.getElementById('ciHeroImageFileLabel');
    if (lbl) lbl.textContent = 'Ganti foto hero card...';
  }
  renderHeroCardPreview();
}
async function saveCafeInfoEntry() {
  const editId = document.getElementById('cafeInfoId').value;
  const oldHeroUrl = document.getElementById('ciHeroImageUrl')?.value?.trim() || null;
  const { url: heroImageUrl, error: heroImgErr } = await resolveImageUpload('ciHeroImageFile', oldHeroUrl||'', 'hero');
  if (heroImgErr) { showToast('Upload foto hero gagal: ' + heroImgErr.message, 'danger'); return; }
  const entry = {
    address:       document.getElementById('ciAddress').value.trim(),
    address_full:  document.getElementById('ciAddressFull').value.trim(),
    hours_weekday: document.getElementById('ciWeekday').value.trim(),
    hours_weekend: document.getElementById('ciWeekend').value.trim(),
    instagram:     document.getElementById('ciInstagram').value.trim(),
    whatsapp:      document.getElementById('ciWhatsapp').value.trim(),
    email:         document.getElementById('ciEmail').value.trim(),
    maps_url:      document.getElementById('ciMaps').value.trim(),
    hero_name:     (document.getElementById('ciHeroName')?.value||'').trim(),
    hero_desc:     (document.getElementById('ciHeroDesc')?.value||'').trim(),
    hero_badge1:   (document.getElementById('ciHeroBadge1')?.value||'').trim(),
    hero_badge2:   (document.getElementById('ciHeroBadge2')?.value||'').trim(),
    hero_toast_label: (document.getElementById('ciHeroToastLabel')?.value||'').trim(),
    hero_toast_sub:   (document.getElementById('ciHeroToastSub')?.value||'').trim(),
    hero_wifi_label:  (document.getElementById('ciHeroWifiLabel')?.value||'').trim(),
    hero_wifi_speed:  (document.getElementById('ciHeroWifiSpeed')?.value||'').trim(),
    hero_bg_color:    (document.getElementById('ciHeroBgColor')?.value||'#2E5F8A').trim(),
    updated_at:    new Date().toISOString(),
  };
  if (heroImageUrl) entry.hero_image = heroImageUrl;
  if (editId) entry.id = editId;
  const {error} = await saveCafeInfo(entry);
  if (error) { showToast(error.message,'danger'); return; }
  if (heroImageUrl) await replaceImage(oldHeroUrl, heroImageUrl);
  showToast('Info cafe disimpan!','success'); await loadCafeInfoForm();
}

/* ════════════════════════════════════════════════
   REALTIME — New message notifications
   ════════════════════════════════════════════════ */
function setupRealtimeNotifications() {
  supabaseClient
    .channel('contact_messages_changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, payload => {
      messagesCache.unshift(payload.new);
      updateUnreadBadge();
      showToast(`Pesan baru dari ${payload.new.name||'seseorang'}!`, 'success');
      if (currentTab === 'messages') renderMessages();
    })
    .subscribe();
}

const _origShowDashboard = showDashboard;
window.showDashboard = function(user) {
  _origShowDashboard(user);
  setupRealtimeNotifications();
};
