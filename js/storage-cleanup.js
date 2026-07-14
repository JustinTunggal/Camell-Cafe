/* ════════════════════════════════════════════════
   CAMELL — STORAGE CLEANUP TOOL
   Finds & deletes image files in the 'images' bucket
   that are no longer referenced by any DB record.
   Admin-only. Safe: always shows a list to review
   before deleting anything.
   ════════════════════════════════════════════════ */

const CLEANUP_FOLDERS = ['news','menu','ambiance','home-about','story','events','team','hero','uploads'];

/* Columns known to store image_url-style references, per table */
const IMAGE_REF_TABLES = [
  { table: 'news',             cols: ['image_url'] },
  { table: 'menu_items',       cols: ['image_url'] },
  { table: 'team_members',     cols: ['image_url'] },
  { table: 'ambiance_photos',  cols: ['image_url'] },
  { table: 'event_photos',     cols: ['image_url'] },
  { table: 'about_photos',     cols: ['image_url'] },
  { table: 'home_about_photo', cols: ['image_url'] },
  { table: 'cafe_info',        cols: ['hero_image'] },
];

async function checkCleanupSession() {
  const session = await getCurrentSession();
  if (!session) { location.href = 'dashboard.html'; return false; }
  const role = await getStaffRole();
  if (role !== 'admin') {
    await logoutAdmin();
    alert('Halaman ini hanya untuk admin.');
    location.href = 'dashboard.html';
    return false;
  }
  return true;
}

/* Recursively list every file path in a bucket folder */
async function listAllFiles(folder) {
  const { data, error } = await supabaseClient.storage.from('images').list(folder, { limit: 1000 });
  if (error) { console.error(`List failed for ${folder}:`, error); return []; }
  return (data || [])
    .filter(f => f.name && f.id) // skip placeholder/empty entries, folders have no id
    .map(f => `${folder}/${f.name}`);
}

/* Gather every image_url currently referenced across all tables */
async function gatherReferencedPaths() {
  const referenced = new Set();
  for (const { table, cols } of IMAGE_REF_TABLES) {
    const { data, error } = await supabaseClient.from(table).select(cols.join(','));
    if (error) { console.error(`Fetch failed for ${table}:`, error); continue; }
    (data || []).forEach(row => {
      cols.forEach(col => {
        const path = getStoragePathFromUrl(row[col]);
        if (path) referenced.add(path);
      });
    });
  }
  return referenced;
}

let orphanFiles = []; // [{ path, size }]

async function scanForOrphans() {
  const statusEl = document.getElementById('cleanupStatus');
  const listEl = document.getElementById('orphanList');
  statusEl.textContent = 'Memindai bucket dan database...';
  listEl.innerHTML = '';

  const referenced = await gatherReferencedPaths();

  let allFiles = [];
  for (const folder of CLEANUP_FOLDERS) {
    const files = await listAllFiles(folder);
    allFiles = allFiles.concat(files);
  }

  orphanFiles = allFiles.filter(path => !referenced.has(path));

  if (!orphanFiles.length) {
    statusEl.textContent = `Selesai. ${allFiles.length} file diperiksa, tidak ada file yatim (orphan).`;
    document.getElementById('deleteAllBtn').style.display = 'none';
    return;
  }

  statusEl.textContent = `Selesai. ${allFiles.length} file diperiksa, ${orphanFiles.length} file yatim ditemukan (tidak dipakai di database manapun).`;
  document.getElementById('deleteAllBtn').style.display = '';
  listEl.innerHTML = orphanFiles.map(path => `
    <div class="msg-item unread">
      <div class="msg-header"><div class="msg-name">${escapeHtml(path)}</div></div>
      <div class="msg-actions">
        <button class="ni-btn del" onclick="deleteSingleOrphan('${path.replace(/'/g,"\\'")}')" title="Hapus">Hapus</button>
      </div>
    </div>`).join('');
}

async function deleteSingleOrphan(path) {
  const { error } = await supabaseClient.storage.from('images').remove([path]);
  if (error) { alert('Gagal hapus ' + path + ': ' + error.message); return; }
  orphanFiles = orphanFiles.filter(p => p !== path);
  await scanForOrphans(); // re-render from current state (cheap, safe)
}

async function deleteAllOrphans() {
  if (!orphanFiles.length) return;
  if (!confirm(`Hapus ${orphanFiles.length} file yatim secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;
  const statusEl = document.getElementById('cleanupStatus');
  statusEl.textContent = 'Menghapus...';
  const { error } = await supabaseClient.storage.from('images').remove(orphanFiles);
  if (error) { alert('Gagal hapus sebagian/semua file: ' + error.message); }
  await scanForOrphans();
}

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkCleanupSession();
  if (!ok) return;
  document.getElementById('scanBtn').addEventListener('click', scanForOrphans);
  document.getElementById('deleteAllBtn').addEventListener('click', deleteAllOrphans);
});
