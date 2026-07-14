/* ════════════════════════════════════════════════
   CAMELL MANAGER DASHBOARD — Restricted CRUD
   Scope: CamellNews · Menu · Tim Kami
   ════════════════════════════════════════════════ */

let currentTab = 'news';
let newsCache  = [];
let menuCache  = [];
let menuFilter = 'all';
let teamCache  = [];

const MENU_CAT_LABELS = { coffee:'Coffee', 'non-coffee':'Non-Coffee', food:'Food', pastry:'Pastry' };

const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const ICON_DEL  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

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
  if (role !== 'manager' && role !== 'admin') {
    await logoutAdmin();
    errBox.textContent = 'Akun ini tidak memiliki akses manager.';
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
  loadNews(); loadMenu(); loadTeam();
}
async function checkSession() {
  const session = await getCurrentSession();
  if (!session) { document.getElementById('loginScreen').style.display = 'flex'; document.getElementById('dashLayout').style.display = 'none'; return; }
  const role = await getStaffRole();
  if (role !== 'manager' && role !== 'admin') {
    await logoutAdmin();
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
  document.addEventListener('click', e => {
    if (!e.target.closest('.custom-select')) {
      document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
    }
  });
  checkSession();
});

/* ──────────── DROPDOWN HELPERS ──────────── */
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
function selectDropdown(dropdownId, labelId, inputId, optionEl, label) {
  const dropdown = document.getElementById(dropdownId);
  if (dropdown) { dropdown.querySelectorAll('.custom-select__option').forEach(o => o.classList.remove('selected')); optionEl.classList.add('selected'); dropdown.classList.remove('open'); }
  const lbl = document.getElementById(labelId); if (lbl) lbl.textContent = label;
  const inp = document.getElementById(inputId); if (inp) inp.value = optionEl.dataset.value;
}
function selectMenuDropdown(optionEl, value, label) {
  const dropdown = document.getElementById('menuDropdown');
  if (dropdown) { dropdown.querySelectorAll('.custom-select__option').forEach(o => o.classList.remove('selected')); optionEl.classList.add('selected'); dropdown.classList.remove('open'); }
  const lbl = document.getElementById('menuDropdownLabel'); if (lbl) lbl.textContent = label;
  filterMenuList(value);
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

/* ──────────── FILE INPUT ──────────── */
function handleFileInputChange(inputId, previewId, labelId) {
  const input = document.getElementById(inputId);
  const labelEl = document.getElementById(labelId);
  const file = input?.files?.[0];
  if (!file) return;
  if (ALLOWED_IMAGE_TYPES && !ALLOWED_IMAGE_TYPES.includes(file.type)) { showToast('Format harus JPG, PNG, WEBP, atau SVG.','danger'); input.value=''; return; }
  if (MAX_IMAGE_SIZE && file.size > MAX_IMAGE_SIZE) { showToast('Ukuran file maksimal 2 MB.','danger'); input.value=''; return; }
  if (labelEl) labelEl.textContent = file.name;
  const wrap = document.getElementById(previewId);
  if (wrap) { const reader = new FileReader(); reader.onload = e => { wrap.querySelector('img').src = e.target.result; wrap.style.display=''; }; reader.readAsDataURL(file); }
}
async function resolveImageUpload(fileInputId, existingUrl, folder) {
  const input = document.getElementById(fileInputId);
  const file = input?.files?.[0];
  if (!file) return { url: existingUrl || null, error: null };
  const { url, error } = await uploadImageFile(file, folder);
  if (error) return { url: existingUrl || null, error };
  return { url, error: null };
}

/* ──────────── TOAST ──────────── */
let _toastTimer;
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show' + (type ? ' '+type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ──────────── PREVIEW ──────────── */
function updatePreview(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  if (text.trim()) { el.textContent = text; el.style.display=''; }
  else el.style.display='none';
}

/* ──────────── TABS ──────────── */
const TAB_META = {
  news: { title:'CamellNews', btn:'+ Tambah Berita' },
  menu: { title:'Menu Dashboard', btn:'+ Tambah Menu' },
  team: { title:'Tim Kami', btn:'+ Tambah Anggota' },
};
const LIST_TABS = ['news','menu','team'];
const FORM_TABS = ['news','menu','team'];

function switchTab(e, tab) {
  if (e) e.preventDefault();
  currentTab = tab;
  document.querySelectorAll('.sidebar-nav a[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab===tab));
  LIST_TABS.forEach(t => document.getElementById(`pane-${t}-list`)?.classList.toggle('active', t===tab));
  FORM_TABS.forEach(t => document.getElementById(`pane-${t}-form`)?.classList.toggle('active', t===tab));
  const meta = TAB_META[tab] || {};
  document.getElementById('topbarTitle').textContent = meta.title || tab;
  const addBtn = document.getElementById('addBtn');
  if (addBtn) {
    if (meta.btn) { addBtn.textContent = meta.btn; addBtn.style.display=''; }
    else addBtn.style.display='none';
  }
  updateStats();
}

function openNewForm() {
  if (currentTab==='news') resetNewsForm();
  else if (currentTab==='menu') resetMenuForm();
  else if (currentTab==='team') resetTeamForm();
}

/* ──────────── STATS ──────────── */
function s(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function updateStats() {
  if (currentTab==='news') {
    const pub=newsCache.filter(n=>n.status==='pub').length;
    const dft=newsCache.length-pub;
    const cats=new Set(newsCache.map(n=>n.category)).size;
    s('statLabel1','Total Berita'); s('stat1',newsCache.length);
    s('statLabel2','Dipublikasi');  s('stat2',pub);
    s('statLabel3','Draft');        s('stat3',dft);
    s('statLabel4','Kategori');     s('stat4',cats);
  } else if (currentTab==='menu') {
    const cats=new Set(menuCache.map(m=>m.category)).size;
    s('statLabel1','Total Item'); s('stat1',menuCache.length);
    s('statLabel2','Favorit');    s('stat2',menuCache.filter(m=>m.is_favorite).length);
    s('statLabel3','Featured');   s('stat3',menuCache.filter(m=>m.is_featured).length);
    s('statLabel4','Kategori');   s('stat4',cats);
  } else if (currentTab==='team') {
    s('statLabel1','Total Anggota'); s('stat1',teamCache.length);
    s('statLabel2','—'); s('stat2','—');
    s('statLabel3','—'); s('stat3','—');
    s('statLabel4','—'); s('stat4','—');
  }
}

/* ══════════════════════════════════════════════════
   NEWS
══════════════════════════════════════════════════ */
async function loadNews() {
  const list = document.getElementById('newsList');
  list.innerHTML = '<div class="panel-loading">Memuat...</div>';
  newsCache = await fetchAllNews();
  renderNewsList();
  updateStats();
}
function renderNewsList() {
  const list = document.getElementById('newsList');
  if (!newsCache.length) { list.innerHTML='<div class="panel-empty">Belum ada berita.</div>'; return; }
  list.innerHTML = newsCache.map(n => `
    <div class="news-item">
      <div class="news-item-emoji">${n.emoji||'🎉'}</div>
      <div class="news-item-body">
        <div class="news-item-title">${n.title}</div>
        <div class="news-item-meta">
          <span class="cat-pill coffee">${n.category}</span>
          &nbsp;<span class="status-badge ${n.status}">${n.status==='pub'?'Live':'Draft'}</span>
          &nbsp;${n.date_label||''}
        </div>
      </div>
      <div class="news-item-actions">
        <button class="act-btn edit" title="Edit" onclick="editNews('${n.id}')">${ICON_EDIT}</button>
        <button class="act-btn del"  title="Hapus" onclick="deleteNews('${n.id}')">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
function editNews(id) {
  const n = newsCache.find(x=>String(x.id)===String(id)); if(!n) return;
  document.getElementById('newsEditId').value = n.id;
  document.getElementById('fTitle').value   = n.title||'';
  document.getElementById('fExcerpt').value = n.excerpt||'';
  document.getElementById('fImageUrl').value = n.image_url||'';
  document.getElementById('fCat').value    = n.category||'Promo';
  document.getElementById('fStatus').value = n.status||'pub';
  document.getElementById('fBg').value     = n.bg||'navy-bg';
  setDropdownValue('newsCatDropdown','newsCatLabel', n.category||'Promo', n.category||'Promo');
  setDropdownValue('newsStatusDropdown','newsStatusLabel', n.status||'pub', n.status==='pub'?'Dipublikasi':'Draft');
  setDropdownValue('newsBgDropdown','newsBgLabel', n.bg||'navy-bg', n.bg==='navy-bg'?'Navy Blue':n.bg==='sand-bg'?'Sand':'Navy Dark');
  const fPrev = document.getElementById('fImgPrev');
  if (n.image_url) { fPrev.querySelector('img').src=n.image_url; fPrev.style.display=''; }
  else fPrev.style.display='none';
  const lbl = document.getElementById('fImageFileLabel');
  if (lbl) lbl.textContent = n.image_url ? 'Ganti foto...' : 'Pilih foto...';
  updatePreview('newsPreview', n.title);
  document.getElementById('newsFormTitle').textContent = 'Edit Berita';
}
async function saveNewsEntry() {
  const title   = document.getElementById('fTitle').value.trim();
  const excerpt = document.getElementById('fExcerpt').value.trim();
  if (!title||!excerpt) { showToast('Judul dan ringkasan wajib diisi.','danger'); return; }
  const editId = document.getElementById('newsEditId').value;
  const { url: imageUrl, error: uploadError } = await resolveImageUpload('fImageFile', document.getElementById('fImageUrl').value.trim(), 'news');
  if (uploadError) { showToast('Upload gagal: '+uploadError.message,'danger'); return; }
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
  const entry = {
    category: document.getElementById('fCat').value,
    title, excerpt,
    image_url: imageUrl||null,
    bg: document.getElementById('fBg').value,
    status: document.getElementById('fStatus').value,
  };
  if (editId) entry.id = editId; else entry.date_label = dateStr;
  const oldImageUrl = editId ? (newsCache.find(n => String(n.id) === String(editId))?.image_url || null) : null;
  const {data, error} = await saveNews(entry);
  if (error) { showToast('Gagal simpan: '+error.message,'danger'); return; }
  await replaceImage(oldImageUrl, entry.image_url);
  showToast(editId ? 'Berita diperbarui!' : 'Berita ditambahkan!', 'success');
  resetNewsForm();
  if (data) {
    const idx = newsCache.findIndex(n => String(n.id) === String(data.id));
    if (idx > -1) newsCache[idx] = data; else newsCache.unshift(data);
    renderNewsList(); updateStats();
  } else {
    await loadNews();
  }
}
async function deleteNews(id) {
  if (!confirm('Hapus berita ini?')) return;
  const target = newsCache.find(n => String(n.id) === String(id));
  const {error} = await deleteNewsById(id);
  if (error) { showToast('Gagal hapus: '+error.message,'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Berita dihapus.','success');
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
  if (lbl) lbl.textContent='Pilih foto...';
}

/* ══════════════════════════════════════════════════
   MENU
══════════════════════════════════════════════════ */
async function loadMenu() {
  const list = document.getElementById('menuList');
  list.innerHTML = '<div class="panel-loading">Memuat...</div>';
  menuCache = await fetchMenuItems();
  filterMenuList(menuFilter);
  updateStats();
}
function filterMenuList(cat) {
  menuFilter = cat;
  const filtered = cat==='all' ? menuCache : menuCache.filter(m=>m.category===cat);
  renderMenuList(filtered);
}
function renderMenuList(items) {
  const list = document.getElementById('menuList');
  if (!items.length) { list.innerHTML='<div class="panel-empty">Belum ada menu.</div>'; return; }
  list.innerHTML = items.map(m => `
    <div class="menu-item">
      <div class="menu-item-img">
        ${m.image_url ? `<img src="${m.image_url}" alt="${m.name}" onerror="this.style.display='none'">` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>`}
      </div>
      <div class="menu-item-body">
        <div class="menu-item-name">${m.name}</div>
        <div class="menu-item-sub">
          <span class="cat-pill ${m.category}">${MENU_CAT_LABELS[m.category]||m.category}</span>
          &nbsp;Rp ${Number(m.price).toLocaleString('id-ID')}
          ${m.badge ? `&nbsp;<span style="font-size:0.68rem;font-weight:700;color:var(--accent)">${m.badge.toUpperCase()}</span>` : ''}
        </div>
      </div>
      <div class="news-item-actions">
        <button class="act-btn edit" title="Edit" onclick="editMenuItem('${m.id}')">${ICON_EDIT}</button>
        <button class="act-btn del"  title="Hapus" onclick="deleteMenuItem('${m.id}')">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
function editMenuItem(id) {
  const m = menuCache.find(x=>String(x.id)===String(id)); if(!m) return;
  document.getElementById('menuEditId').value = m.id;
  document.getElementById('mName').value = m.name||'';
  document.getElementById('mDesc').value = m.description||'';
  document.getElementById('mPrice').value = m.price||'';
  document.getElementById('mCat').value = m.category||'coffee';
  document.getElementById('menuCatFormLabel').textContent = MENU_CAT_LABELS[m.category]||m.category;
  document.getElementById('mBadge').value = m.badge||'';
  document.getElementById('menuBadgeLabel').textContent = m.badge ? ({best:'Best',new:'New',fav:'Fav'}[m.badge]||m.badge) : '—';
  document.getElementById('mHot').value = m.hot_iced||'';
  document.getElementById('menuHotLabel').textContent = m.hot_iced||'—';
  document.getElementById('mImageUrl').value = m.image_url||'';
  document.getElementById('mIsFavorite').checked = !!m.is_favorite;
  document.getElementById('mIsFeatured').checked = !!m.is_featured;
  const prev = document.getElementById('mImgPrev');
  if (m.image_url) { prev.querySelector('img').src=m.image_url; prev.style.display=''; }
  else prev.style.display='none';
  document.getElementById('menuFormTitle').textContent='Edit Menu';
  // Switch to menu tab if not already
  switchTab(null,'menu');
}
async function saveMenuEntry() {
  const name = document.getElementById('mName').value.trim();
  const price = document.getElementById('mPrice').value;
  if (!name||!price) { showToast('Nama dan harga wajib diisi.','danger'); return; }
  const { url: imageUrl, error: uploadError } = await resolveImageUpload('mImageFile', document.getElementById('mImageUrl').value.trim(), 'menu');
  if (uploadError) { showToast('Upload foto gagal: '+uploadError.message,'danger'); return; }
  const item = {
    id: document.getElementById('menuEditId').value||null,
    name, description: document.getElementById('mDesc').value.trim(),
    price: parseFloat(price)||0,
    category: document.getElementById('mCat').value||'coffee',
    badge: document.getElementById('mBadge').value||'',
    hot_iced: document.getElementById('mHot').value||'',
    image_url: imageUrl,
    is_favorite: document.getElementById('mIsFavorite').checked,
    is_featured: document.getElementById('mIsFeatured').checked,
  };
  if (!item.id) delete item.id;
  const oldImageUrl = item.id ? (menuCache.find(m => String(m.id) === String(item.id))?.image_url || null) : null;
  const {data, error} = await saveMenuItem(item);
  if (error) { showToast('Gagal simpan: '+error.message,'danger'); return; }
  await replaceImage(oldImageUrl, item.image_url);
  showToast('Menu disimpan!','success');
  resetMenuForm();
  if (data) {
    const idx = menuCache.findIndex(m => String(m.id) === String(data.id));
    if (idx > -1) menuCache[idx] = data; else menuCache.push(data);
    filterMenuList(menuFilter); updateStats();
  } else {
    await loadMenu();
  }
}
async function deleteMenuItem(id) {
  if (!confirm('Hapus menu ini?')) return;
  const target = menuCache.find(m => String(m.id) === String(id));
  const {error} = await deleteMenuItemById(id);
  if (error) { showToast('Gagal hapus: '+error.message,'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Menu dihapus.','success');
  menuCache = menuCache.filter(m => String(m.id) !== String(id));
  filterMenuList(menuFilter); updateStats();
}
function resetMenuForm() {
  ['menuEditId','mName','mDesc','mPrice','mImageUrl','mImageFile'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('mCat').value='coffee'; document.getElementById('menuCatFormLabel').textContent='Coffee';
  document.getElementById('mBadge').value=''; document.getElementById('menuBadgeLabel').textContent='—';
  document.getElementById('mHot').value=''; document.getElementById('menuHotLabel').textContent='—';
  document.getElementById('mIsFavorite').checked=false;
  document.getElementById('mIsFeatured').checked=false;
  document.getElementById('mImgPrev').style.display='none';
  document.getElementById('menuFormTitle').textContent='Tambah Menu';
}

/* ══════════════════════════════════════════════════
   TEAM
══════════════════════════════════════════════════ */
async function loadTeam() {
  const list = document.getElementById('teamList');
  list.innerHTML = '<div class="panel-loading">Memuat...</div>';
  teamCache = await fetchTeamMembers();
  renderTeamList();
  updateStats();
}
function renderTeamList() {
  const list = document.getElementById('teamList');
  if (!teamCache.length) { list.innerHTML='<div class="panel-empty">Belum ada anggota tim.</div>'; return; }
  list.innerHTML = teamCache.map(m => `
    <div class="team-item">
      <div class="team-avatar">
        ${m.image_url ? `<img src="${m.image_url}" alt="${m.name}" onerror="this.outerHTML='<div class=team-avatar>'+getInitials('${m.name}')+'</div>'">` : getInitials(m.name)}
      </div>
      <div class="team-item-body">
        <div class="team-item-name">${m.name}</div>
        <div class="team-item-role">${m.role}</div>
      </div>
      <div class="news-item-actions">
        <button class="act-btn edit" title="Edit" onclick="editTeamMember('${m.id}')">${ICON_EDIT}</button>
        <button class="act-btn del"  title="Hapus" onclick="removeTeamMember('${m.id}')">${ICON_DEL}</button>
      </div>
    </div>`).join('');
}
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?parts[1][0]:'')).toUpperCase();
}
function editTeamMember(id) {
  const m = teamCache.find(x=>String(x.id)===String(id)); if(!m) return;
  document.getElementById('teamEditId').value = m.id;
  document.getElementById('tName').value = m.name||'';
  document.getElementById('tRole').value = m.role||'';
  document.getElementById('tImageUrl').value = m.image_url||'';
  document.getElementById('tOrder').value = m.sort_order||0;
  const prev = document.getElementById('tImgPrev');
  if (m.image_url) { prev.querySelector('img').src=m.image_url; prev.style.display=''; }
  else prev.style.display='none';
  document.getElementById('teamFormTitle').textContent='Edit Anggota Tim';
  switchTab(null,'team');
}
async function saveTeamEntry() {
  const name = document.getElementById('tName').value.trim();
  const role = document.getElementById('tRole').value.trim();
  if (!name||!role) { showToast('Nama dan jabatan wajib diisi.','danger'); return; }
  const { url: imageUrl, error: uploadError } = await resolveImageUpload('tImageFile', document.getElementById('tImageUrl').value.trim(), 'team');
  if (uploadError) { showToast('Upload foto gagal: '+uploadError.message,'danger'); return; }
  const member = {
    id: document.getElementById('teamEditId').value||null,
    name, role,
    image_url: imageUrl,
    sort_order: parseInt(document.getElementById('tOrder').value)||0,
  };
  if (!member.id) delete member.id;
  const oldImageUrl = member.id ? (teamCache.find(m => String(m.id) === String(member.id))?.image_url || null) : null;
  const {data, error} = await saveTeamMember(member);
  if (error) { showToast('Gagal simpan: '+error.message,'danger'); return; }
  await replaceImage(oldImageUrl, member.image_url);
  showToast('Anggota tim disimpan!','success');
  resetTeamForm();
  if (data) {
    const idx = teamCache.findIndex(m => String(m.id) === String(data.id));
    if (idx > -1) teamCache[idx] = data; else teamCache.push(data);
    renderTeamList(); updateStats();
  } else {
    await loadTeam();
  }
}
async function removeTeamMember(id) {
  if (!confirm('Hapus anggota tim ini?')) return;
  const target = teamCache.find(m => String(m.id) === String(id));
  const {error} = await deleteTeamMember(id);
  if (error) { showToast('Gagal hapus: '+error.message,'danger'); return; }
  if (target?.image_url) await deleteImageByUrl(target.image_url);
  showToast('Anggota dihapus.','success');
  teamCache = teamCache.filter(m => String(m.id) !== String(id));
  renderTeamList(); updateStats();
}
function resetTeamForm() {
  ['teamEditId','tName','tRole','tImageUrl','tImageFile'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('tOrder').value='0';
  document.getElementById('tImgPrev').style.display='none';
  document.getElementById('teamFormTitle').textContent='Tambah Anggota Tim';
}
