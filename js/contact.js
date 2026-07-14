/* ── CONTACT.JS ── */

function showSiteToast(msg, type) {
  const t = document.getElementById('siteToast');
  if (!t) { console.log(msg); return; }
  t.textContent = msg;
  t.className = 'site-toast ' + (type || '');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(showSiteToast._timer);
  showSiteToast._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

let selectedTopic = 'Pertanyaan Umum';

function selectTopic(btn) {
  document.querySelectorAll('.form-topic-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedTopic = btn.textContent.trim();
  const isEvent = selectedTopic.includes('Booking');
  ['eventGroup', 'guestGroup'].forEach(function(id) {
    var el = document.getElementById(id);
    el.classList.remove('field-reveal');
    if (isEvent) {
      el.style.display = '';
      void el.offsetWidth;
      el.classList.add('field-reveal');
    } else {
      el.style.display = 'none';
    }
  });
}

async function submitForm() {
  // Honeypot: real users never fill this hidden field. If filled, silently pretend success.
  const honeypot = (document.getElementById('fWebsite') || {}).value || '';
  if (honeypot.trim()) {
    document.getElementById('formContent').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
    return;
  }

  const name    = document.getElementById('fName').value.trim();
  const phone   = document.getElementById('fPhone').value.trim();
  const email   = document.getElementById('fEmail').value.trim();
  const message = document.getElementById('fMessage').value.trim();
  const btn     = document.getElementById('submitBtn');

  if (!name || !email || !message) {
    [['fName',name],['fEmail',email],['fMessage',message]].forEach(([id,val]) => {
      if (!val) { const el=document.getElementById(id); el.style.borderColor='#E05D5D'; setTimeout(()=>el.style.borderColor='',2000); }
    });
    showSiteToast('Lengkapi kolom yang wajib diisi.', 'danger');
    return;
  }

  if (!isValidEmail(email)) {
    const el = document.getElementById('fEmail');
    el.style.borderColor = '#E05D5D'; setTimeout(()=>el.style.borderColor='',2000);
    showSiteToast('Format email tidak valid.', 'danger');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  const msg = {
    topic:      selectedTopic,
    name,
    phone,
    email,
    message,
    event_date: (document.getElementById('fEventDate') || {}).value || null,
    guests:     (document.getElementById('fGuests')    || {}).value || null,
  };

  const { error } = await saveContactMessage(msg);

  btn.disabled = false;
  btn.textContent = 'Kirim Pesan →';

  if (error) { showSiteToast('Gagal mengirim pesan. Silakan coba lagi.', 'danger'); console.error(error); return; }

  document.getElementById('formContent').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'block';
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(f => f.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ── CAFE INFO ── */
async function loadCafeInfo() {
  const info = await fetchCafeInfo();
  if (!info) return;
  const setEl   = (id, val) => { const el=document.getElementById(id); if (el&&val) el.innerHTML=val; };
  const setHref = (id, val) => { const el=document.getElementById(id); if (el&&val) el.href=val; };
  setEl('cinfoMapText', (info.address||'').replace(', ','<br>'));
  setEl('cinfoAddress', info.address_full || info.address);
  setEl('cinfoHoursWeekday', info.hours_weekday);
  setEl('cinfoHoursWeekend', info.hours_weekend);
  const igEl = document.getElementById('cinfoInstagram');
  if (igEl && info.instagram) { igEl.textContent = info.instagram; igEl.href = `https://instagram.com/${info.instagram.replace('@','')}`; }
  setHref('cinfoMapsBtn', info.maps_url);
}

/* ── EVENT PHOTOS (hover label reveal) ── */
async function loadEventPhotos() {
  const grid = document.getElementById('eventPhotoGrid');
  if (!grid) return;
  const photos = await fetchEventPhotos();
  if (photos.length) {
    grid.innerHTML = photos.map(p => `
      <div class="event-photo-item">
        <div class="event-photo-img" style="background-image:url('${p.image_url}');background-size:cover;background-position:center;">
        </div>
        <div class="event-photo-label">${p.label}</div>
      </div>`).join('');
  }
  // Init carousel AFTER photos injected (mobile only)
  initEventCarousel();
}

/* ── EVENT PHOTO CAROUSEL (mobile) ── */
function initEventCarousel() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const grid = document.getElementById('eventPhotoGrid');
  if (!grid) return;
  const items = Array.from(grid.querySelectorAll('.event-photo-item'));
  if (items.length < 2) return;
  if (grid.querySelector('.event-track')) return;

  // Build track
  const track = document.createElement('div');
  track.className = 'event-track';
  const slideW = grid.offsetWidth;
  items.forEach(el => {
    el.style.minWidth = slideW + 'px';
    el.style.width = slideW + 'px';
    track.appendChild(el);
  });
  grid.innerHTML = '';
  grid.appendChild(track);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'event-car-controls';
  const prev = document.createElement('button');
  prev.className = 'event-car-btn'; prev.innerHTML = '&#8592;';
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'event-car-dots';
  const next = document.createElement('button');
  next.className = 'event-car-btn'; next.innerHTML = '&#8594;';
  controls.appendChild(prev); controls.appendChild(dotsWrap); controls.appendChild(next);
  grid.insertAdjacentElement('afterend', controls);

  let cur = 0;
  const total = items.length;
  const dots = items.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'event-car-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => { go(i); startAuto(); });
    dotsWrap.appendChild(d);
    return d;
  });

  function go(n) {
    cur = (n + total) % total;
    const w = grid.offsetWidth;
    track.style.transform = `translateX(-${cur * w}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  }

  let timer = null;
  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => go(cur + 1), 5000);
  }

  prev.addEventListener('click', () => { go(cur - 1); startAuto(); });
  next.addEventListener('click', () => { go(cur + 1); startAuto(); });
  startAuto();
}

/* ── REVIEWS CAROUSEL ── */
// Static fallback reviews (same as homepage) shown if no DB reviews yet
const STATIC_REVIEWS = [
  { name:'Riana N.', role:'Remote Worker · Google Review', comment:'Camell bukan cuma aesthetic, kopinya juga enak banget. Tempat favorit remote work saya!', rating:5 },
  { name:'Dinda P.', role:'Food Blogger · Instagram', comment:'Croissant-nya fresh banget! Setiap pagi saya pasti mampir sebelum ke kantor. Recommended!', rating:5 },
  { name:'Andi M.', role:'Content Creator · TikTok', comment:'Interior-nya cantik banget, setiap sudut bisa dijadiin foto. Kopinya juga nggak kaleng-kaleng!', rating:5 },
  { name:'Fira A.', role:'HR Manager · Google Review', comment:'Kami adakan gathering kantor di Camell — area-nya luas, pelayanan ramah, dan menunya lengkap!', rating:5 },
  { name:'Bayu L.', role:'Mahasiswa · Google Review', comment:'Spanish latte-nya kaya rasa, nggak terlalu manis. Jadi langganan setiap minggu sekarang!', rating:5 },
  { name:'Sari I.', role:'Pelanggan Setia · Instagram', comment:'Camell Toast-nya juara! Porsi kenyang, rasa enak, harga terjangkau. Pasti balik lagi.', rating:5 },
  { name:'Marco R.', role:'Freelance Designer · Google Review', comment:'Wifi kencang, colokan tersedia, kopi enak — surga buat yang kerja remote kayak aku!', rating:5 },
  { name:'Nadia P.', role:'Matcha Lover · TikTok', comment:'Matcha latte-nya saya pesan setiap hari. Kualitas bahan bakunya terasa banget, beda sama yang lain.', rating:5 },
  { name:'Yanti S.', role:'Pelanggan · Google Review', comment:'Ulang tahun anak saya di Camell — dekorasinya bagus, tim-nya sangat helpful. Terima kasih!', rating:5 },
];

function buildReviewCardHTML(r) {
  const initials = r.name ? r.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';
  return `<div class="cr-card">
    <div class="cr-card-inner">
      <div class="cr-stars">★★★★★</div>
      <div class="cr-quote">"${r.comment || ''}"</div>
      <div class="cr-meta">
        <div class="cr-avatar">${initials}</div>
        <div>
          <div class="cr-name">${r.name}</div>
          <div class="cr-role">${r.role || 'Google Review'}</div>
        </div>
      </div>
    </div>
  </div>`;
}

function buildInfiniteRow(reviews, rowEl) {
  // duplicate cards for seamless loop
  const html = reviews.map(buildReviewCardHTML).join('');
  rowEl.innerHTML = html + html; // duplicate
}

async function loadReviews() {
  const carousel = document.getElementById('reviewsCarousel');
  const topRow = document.getElementById('reviewsRowTop');
  const botRow = document.getElementById('reviewsRowBottom');
  if (!carousel || !topRow || !botRow) return;

  let reviews = await fetchTop10FiveStarReviews();
  if (!reviews.length) reviews = STATIC_REVIEWS;

  // split reviews: top row = first half, bottom row = second half (pad if fewer than 2)
  const mid = Math.ceil(reviews.length / 2);
  const topReviews = reviews.slice(0, mid);
  const botReviews = reviews.slice(mid);

  // if bottom is empty, use same as top
  const finalBot = botReviews.length ? botReviews : topReviews;

  buildInfiniteRow(topReviews, topRow);
  buildInfiniteRow(finalBot, botRow);

  carousel.style.display = '';
}

async function submitReview() {
  // Honeypot: real users never fill this hidden field. If filled, silently pretend success.
  const honeypot = (document.getElementById('reviewWebsite') || {}).value || '';
  if (honeypot.trim()) {
    document.getElementById('reviewSuccess').style.display = 'block';
    return;
  }

  const name    = document.getElementById('reviewName').value.trim();
  const comment = document.getElementById('reviewComment').value.trim();
  const ratingEl = document.querySelector('input[name="star-radio"]:checked');
  const rating  = ratingEl ? parseInt(ratingEl.value) : 0;

  if (!name || !rating) { showSiteToast('Nama dan bintang wajib diisi!', 'danger'); return; }

  const { error } = await saveReview({ name, comment, rating, status: 'pub' });
  if (error) { showSiteToast('Gagal menyimpan ulasan.', 'danger'); return; }

  document.getElementById('reviewSuccess').style.display = 'block';
  document.getElementById('reviewName').value = '';
  document.getElementById('reviewComment').value = '';
  document.querySelectorAll('input[name="star-radio"]').forEach(r => r.checked = false);

  // Optimistic: only prepend to the visible carousel if it's a 5-star review
  // (matches fetchTop10FiveStarReviews filter used by loadReviews — avoids
  // showing a card here that would be absent after a real refresh).
  if (rating === 5) {
    const topRow = document.getElementById('reviewsRowTop');
    const carousel = document.getElementById('reviewsCarousel');
    if (topRow && carousel) {
      const card = buildReviewCardHTML({ name, comment, role: 'Google Review' });
      topRow.insertAdjacentHTML('afterbegin', card);
      carousel.style.display = '';
    }
  }
}

// Init
loadCafeInfo();
loadEventPhotos();
loadReviews();