/* ============================================================
   CAMELL CAFE — SUPABASE CLIENT & DATA HELPERS
   Fill in your project URL and anon key below.
   ============================================================ */

const SUPABASE_URL = 'https://pcvolxfnaolhjwmhdoie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdm9seGZuYW9saGp3bWhkb2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzM4ODQsImV4cCI6MjA5NzAwOTg4NH0.ztBWE7TGTh7aFXJwHpHuwoakrAWE8XD5fMJddKiiEZM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── HTML ESCAPE (use before inserting ANY user-submitted string via innerHTML) ── */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── EMAIL FORMAT VALIDATION (client-side; real enforcement is DB CHECK constraint) ── */
function isValidEmail(email) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(email).trim());
}

/* ── IMAGE UPLOAD (Storage) ── */
const IMAGE_BUCKET = 'images';
const ALLOWED_IMAGE_TYPES = ['image/jpeg','image/png','image/svg+xml','image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

async function uploadImageFile(file, folder = 'uploads') {
  if (!file) return { url: null, error: null };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: { message: 'Format file harus JPG, JPEG, PNG, WEBP, atau SVG.' } };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { url: null, error: { message: 'Ukuran file maksimal 2 MB.' } };
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error: uploadError } = await supabaseClient.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type
  });
  if (uploadError) { console.error(uploadError); return { url: null, error: uploadError }; }
  const { data } = supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/* Extract the storage object path from a public URL, e.g.
   https://xxx.supabase.co/storage/v1/object/public/images/news/123-abc.jpg
   -> "news/123-abc.jpg" */
function getStoragePathFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

/* Delete an image from storage given its public URL. Safe to call with
   null/undefined/external URLs — silently no-ops if not one of ours. */
async function deleteImageByUrl(url) {
  const path = getStoragePathFromUrl(url);
  if (!path) return { error: null };
  const { error } = await supabaseClient.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) console.error('Failed to delete old image from storage:', error);
  return { error };
}

/* Delete old image only if it's actually being replaced by a different one. */
async function replaceImage(oldUrl, newUrl) {
  if (oldUrl && oldUrl !== newUrl) await deleteImageByUrl(oldUrl);
}

/* ── NEWS ── */
async function fetchPublishedNews(limit = null) {
  let q = supabaseClient.from('news').select('id,category,title,excerpt,image_url,bg,emoji,date_label')
    .eq('status','pub').order('created_at',{ascending:false});
  if (limit) q = q.limit(limit);
  const {data,error} = await q;
  if (error) { console.error(error); return []; }
  return data;
}
async function fetchAllNews() {
  const {data,error} = await supabaseClient.from('news').select('*').order('created_at',{ascending:false});
  if (error) { console.error(error); return []; } return data;
}
async function saveNews(entry) {
  if (entry.id) {
    const {data,error}=await supabaseClient.from('news').update(entry).eq('id',entry.id).select().single();
    return {data,error};
  } else {
    delete entry.id;
    const {data,error}=await supabaseClient.from('news').insert(entry).select().single();
    return {data,error};
  }
}
async function deleteNewsById(id) {
  const {error}=await supabaseClient.from('news').delete().eq('id',id); return {error};
}

/* ── MENU ── */
async function fetchMenuItems() {
  const {data,error}=await supabaseClient.from('menu_items').select('*')
    .order('category',{ascending:true}).order('sort_order',{ascending:true});
  if (error) { console.error(error); return []; } return data;
}
async function fetchFavoriteMenuItems() {
  const {data,error}=await supabaseClient.from('menu_items').select('id,name,description,price,image_url,badge')
    .eq('is_favorite',true).order('sort_order',{ascending:true});
  if (error) { console.error(error); return []; } return data;
}
async function saveMenuItem(item) {
  if (item.id) {
    const {data,error}=await supabaseClient.from('menu_items').update(item).eq('id',item.id).select().single();
    return {data,error};
  } else {
    delete item.id;
    const {data,error}=await supabaseClient.from('menu_items').insert(item).select().single();
    return {data,error};
  }
}
async function deleteMenuItemById(id) {
  const {error}=await supabaseClient.from('menu_items').delete().eq('id',id); return {error};
}

/* ── HERO CARD IMAGE ── */
async function fetchHeroCardImage() {
  const {data,error}=await supabaseClient.from('cafe_info').select('hero_image').limit(1).maybeSingle();
  if (error) { console.error(error); return null; }
  return data?.hero_image||null;
}

async function fetchCafeInfo() {
  const {data,error}=await supabaseClient.from('cafe_info').select('*').limit(1).maybeSingle();
  if (error) { console.error(error); return null; } return data;
}
async function saveCafeInfo(info) {
  if (info.id) { const {error}=await supabaseClient.from('cafe_info').update(info).eq('id',info.id); return {error}; }
  else { const {error}=await supabaseClient.from('cafe_info').insert(info); return {error}; }
}

/* ── AMBIANCE PHOTOS ── */
async function fetchAmbiancePhotos() {
  const {data,error}=await supabaseClient.from('ambiance_photos').select('*').order('sort_order',{ascending:true});
  if (error) { console.error(error); return []; } return data;
}
async function saveAmbiancePhoto(item) {
  if (item.id) { const {error}=await supabaseClient.from('ambiance_photos').update(item).eq('id',item.id); return {error}; }
  else { delete item.id; const {error}=await supabaseClient.from('ambiance_photos').insert(item); return {error}; }
}
async function deleteAmbiancePhoto(id) {
  const {error}=await supabaseClient.from('ambiance_photos').delete().eq('id',id); return {error};
}

/* ── ABOUT PHOTOS (story page image) ── */
async function fetchAboutPhoto() {
  const {data,error}=await supabaseClient.from('about_photos').select('*').limit(1).maybeSingle();
  if (error) { console.error(error); return null; } return data;
}
async function saveAboutPhoto(item) {
  if (item.id) { const {error}=await supabaseClient.from('about_photos').update(item).eq('id',item.id); return {error}; }
  else { delete item.id; const {error}=await supabaseClient.from('about_photos').insert(item); return {error}; }
}

/* ── HOME ABOUT PHOTOS (index page — 4 card slots) ── */
async function fetchHomeAboutPhotos() {
  const {data,error}=await supabaseClient.from('home_about_photo').select('*');
  if (error) { console.error(error); return []; } return data||[];
}
async function saveHomeAboutPhoto(item) {
  // find existing row by slot, then update or insert
  const {data:existing}=await supabaseClient.from('home_about_photo').select('id').eq('slot',item.slot).maybeSingle();
  if (existing?.id) {
    const {error}=await supabaseClient.from('home_about_photo').update({image_url:item.image_url}).eq('id',existing.id);
    return {error};
  } else {
    const {error}=await supabaseClient.from('home_about_photo').insert(item);
    return {error};
  }
}

/* ── TEAM MEMBERS ── */
async function fetchTeamMembers() {
  const {data,error}=await supabaseClient.from('team_members').select('*').order('sort_order',{ascending:true});
  if (error) { console.error(error); return []; } return data;
}
async function saveTeamMember(item) {
  if (item.id) {
    const {data,error}=await supabaseClient.from('team_members').update(item).eq('id',item.id).select().single();
    return {data,error};
  } else {
    delete item.id;
    const {data,error}=await supabaseClient.from('team_members').insert(item).select().single();
    return {data,error};
  }
}
async function deleteTeamMember(id) {
  const {error}=await supabaseClient.from('team_members').delete().eq('id',id); return {error};
}

/* ── ABOUT FEATURED MENU (story page) ── */
async function fetchFeaturedMenuItems() {
  const {data,error}=await supabaseClient.from('menu_items').select('*')
    .eq('is_featured',true).order('sort_order',{ascending:true});
  if (error) { console.error(error); return []; } return data;
}

/* ── PRIVATE EVENT PHOTOS ── */
async function fetchEventPhotos() {
  const {data,error}=await supabaseClient.from('event_photos').select('*').order('sort_order',{ascending:true});
  if (error) { console.error(error); return []; } return data;
}
async function saveEventPhoto(item) {
  if (item.id) { const {error}=await supabaseClient.from('event_photos').update(item).eq('id',item.id); return {error}; }
  else { delete item.id; const {error}=await supabaseClient.from('event_photos').insert(item); return {error}; }
}
async function deleteEventPhoto(id) {
  const {error}=await supabaseClient.from('event_photos').delete().eq('id',id); return {error};
}

/* ── CONTACT MESSAGES ── */
async function saveContactMessage(msg) {
  const {error}=await supabaseClient.from('contact_messages').insert(msg); return {error};
}
async function fetchContactMessages() {
  const {data,error}=await supabaseClient.from('contact_messages').select('*')
    .order('created_at',{ascending:false});
  if (error) { console.error(error); return []; } return data;
}
async function markMessageRead(id) {
  const {error}=await supabaseClient.from('contact_messages').update({is_read:true}).eq('id',id);
  return {error};
}
async function deleteMessage(id) {
  const {error}=await supabaseClient.from('contact_messages').delete().eq('id',id); return {error};
}

/* ── REVIEWS ── */
async function saveReview(review) {
  const {error}=await supabaseClient.from('reviews').insert(review); return {error};
}
async function fetchPublishedReviews() {
  const {data,error}=await supabaseClient.from('reviews').select('*')
    .eq('status','pub').order('created_at',{ascending:false}).limit(6);
  if (error) { console.error(error); return []; } return data;
}
async function fetchTop10FiveStarReviews() {
  const {data,error}=await supabaseClient.from('reviews').select('id,name,comment,rating')
    .eq('status','pub').eq('rating',5).order('created_at',{ascending:false}).limit(10);
  if (error) { console.error(error); return []; } return data||[];
}

/* ── AUTH ── */
async function loginAdmin(email, password) {
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  return {data,error};
}
async function logoutAdmin() { await supabaseClient.auth.signOut(); }
async function getCurrentSession() {
  const {data}=await supabaseClient.auth.getSession(); return data.session;
}
/* Returns 'admin' | 'manager' | null. Relies on admin_roles table + RLS
   (see supabase/migrations/001_rls_and_roles.sql). This is a UX convenience
   only — actual enforcement happens in Postgres RLS regardless of what
   this returns. */
async function getStaffRole() {
  const session = await getCurrentSession();
  if (!session) return null;
  const { data, error } = await supabaseClient
    .from('admin_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data?.role || null;
}

/* ── REVIEWS (admin) ── */
async function fetchAllReviews() {
  const {data,error}=await supabaseClient.from('reviews').select('*')
    .order('created_at',{ascending:false});
  if (error) { console.error(error); return []; } return data||[];
}
async function updateReviewStatus(id, status) {
  const {error}=await supabaseClient.from('reviews').update({status}).eq('id',id);
  return {error};
}
async function deleteReviewById(id) {
  const {error}=await supabaseClient.from('reviews').delete().eq('id',id);
  return {error};
}
/* ── TOP 9 LATEST PUBLISHED REVIEWS (homepage) ── */
async function fetchLatest9Reviews() {
  const {data,error}=await supabaseClient.from('reviews').select('id,name,comment,rating')
    .eq('status','pub').order('created_at',{ascending:false}).limit(9);
  if (error) { console.error(error); return []; } return data||[];
}
