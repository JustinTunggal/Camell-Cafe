/* ── INDEX.JS — Home page dynamic content ── */

/* ── REVIEWS CAROUSEL (top 9 latest from DB, 3 per slide) ── */
function makeStars(rating) {
  const r = Math.max(1, Math.min(5, parseInt(rating) || 5));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

let testiCurrent = 0;
let testiTotal   = 0;
let testiTimer   = null;

function buildCard(r) {
  return `<div class="testi-card">
    <div class="testi-stars">${makeStars(r.rating)}</div>
    <div class="testi-quote">"${escapeHtml(r.comment || '')}"</div>
    <div class="testi-meta">
      <div class="testi-avatar">${escapeHtml(getInitials(r.name))}</div>
      <div>
        <div class="testi-name">${escapeHtml(r.name)}</div>
        <div class="testi-role">Pelanggan Camell</div>
      </div>
    </div>
  </div>`;
}

function goSlide(n) {
  testiCurrent = (n + testiTotal) % testiTotal;
  const track = document.getElementById('testiTrack');
  if (track) track.style.transform = `translateX(-${testiCurrent * 100}%)`;
  document.querySelectorAll('#testiDots .testi-dot').forEach((d, i) => {
    d.classList.toggle('active', i === testiCurrent);
  });
}

function startAutoSlide() {
  clearInterval(testiTimer);
  testiTimer = setInterval(() => goSlide(testiCurrent + 1), 6000);
}
function stopAutoSlide() {
  clearInterval(testiTimer);
}

async function renderReviews() {
  const track    = document.getElementById('testiTrack');
  const controls = document.getElementById('testiControls');
  const dotsEl   = document.getElementById('testiDots');
  if (!track) return;

  const reviews = await fetchLatest9Reviews();
  if (!reviews.length) {
    track.innerHTML = '<div class="testi-slide" style="min-width:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);padding:40px;">Belum ada ulasan.</div>';
    return;
  }

  const PER_SLIDE = 3;
  const slides = [];
  for (let i = 0; i < reviews.length; i += PER_SLIDE) {
    slides.push(reviews.slice(i, i + PER_SLIDE));
  }
  testiTotal = slides.length;

  track.innerHTML = slides.map(group =>
    `<div class="testi-slide">${group.map(buildCard).join('')}</div>`
  ).join('');

  dotsEl.innerHTML = slides.map((_, i) =>
    `<span class="testi-dot${i === 0 ? ' active' : ''}" onclick="goSlide(${i})"></span>`
  ).join('');

  if (controls) controls.style.display = '';

  document.getElementById('testiPrev').onclick = () => { goSlide(testiCurrent - 1); startAutoSlide(); };
  document.getElementById('testiNext').onclick = () => { goSlide(testiCurrent + 1); startAutoSlide(); };

  startAutoSlide();

  // Pause auto-advance while user is hovering/reading, or has keyboard focus inside
  const testiSection = document.getElementById('testimonials');
  if (testiSection && !testiSection.dataset.hoverBound) {
    testiSection.dataset.hoverBound = '1';
    testiSection.addEventListener('mouseenter', stopAutoSlide);
    testiSection.addEventListener('mouseleave', startAutoSlide);
    testiSection.addEventListener('focusin', stopAutoSlide);
    testiSection.addEventListener('focusout', startAutoSlide);
  }
}

/* ── COFFEE LOADER HTML ── */
const COFFEE_LOADER = `
<div class="coffee-loader-wrap">
  <div class="loader">
    <div class="cup">
      <div class="cup-handle"></div>
      <div class="smoke one"></div>
      <div class="smoke two"></div>
      <div class="smoke three"></div>
    </div>
    <div class="load">..........................</div>
  </div>
</div>`;

/* ── FAVORITE MENU ── */
const BADGE_MAP = { best:'Best', new:'New', fav:'Fav', top:'Top' };
function formatPrice(p) { return 'Rp ' + Number(p).toLocaleString('id-ID'); }

function renderFavoriteCard(item) {
  const badge = item.badge && BADGE_MAP[item.badge]
    ? `<span class="mc-badge${item.badge==='new'?' new-b':item.badge==='fav'?' gold-b':''}">${BADGE_MAP[item.badge]}</span>` : '';
  const imgHtml = item.image_url
    ? `<img src="${item.image_url}" alt="${item.name}" class="mc-real-img" loading="lazy" onerror="this.style.display='none'">`
    : `<span><img src="assets/coffee.svg" alt="" class="icon-emoji"></span>`;
  return `
    <div class="menu-card">
      <div class="mc-img navy mc-img-photo">${imgHtml}${badge}</div>
      <div class="mc-body">
        <div class="mc-name">${item.name}</div>
        <div class="mc-desc">${item.description || ''}</div>
        <div class="mc-footer"><span class="mc-price">${formatPrice(item.price)}</span></div>
      </div>
    </div>`;
}

async function renderFavoriteMenu() {
  const grid = document.querySelector('.menu-preview-grid');
  if (!grid) return;
  grid.innerHTML = COFFEE_LOADER;
  const items = await fetchFavoriteMenuItems();
  if (!items.length) {
    grid.innerHTML = '<div class="no-data-msg">Belum ada menu favorit yang dipilih.</div>';
    return;
  }
  grid.innerHTML = items.map(renderFavoriteCard).join('');
}

/* ── NEWS ── */
async function renderNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.innerHTML = COFFEE_LOADER;
  const data = await fetchPublishedNews(3);
  if (!data.length) {
    grid.innerHTML = '<div class="no-data-msg">Belum ada berita.</div>';
    return;
  }
  const WA_URL = 'https://wa.me/6281234567890';
  grid.innerHTML = data.map(n => {
    const imgSection = n.image_url
      ? `<div class="news-card-img" style="background-image:url('${n.image_url}');background-size:cover;background-position:center;background-repeat:no-repeat;"><span class="news-cat">${n.category}</span></div>`
      : `<div class="news-card-img ${n.bg || 'navy-bg'}"><span>${n.emoji || '🎉'}</span><span class="news-cat">${n.category}</span></div>`;
    const waMsg = encodeURIComponent('Halo Camell! Saya ingin info lebih lanjut tentang "' + n.title + '"');
    return `
    <div class="news-card">
      ${imgSection}
      <div class="news-body">
        <div class="news-date">${n.date_label}</div>
        <div class="news-title">${n.title}</div>
        <div class="news-excerpt">${n.excerpt}</div>
        <a class="news-read" href="${WA_URL}?text=${waMsg}" target="_blank" rel="noopener">Info selengkapnya →</a>
      </div>
    </div>`;
  }).join('');
}

/* ── NEWS CAROUSEL (mobile) ── */
function initNewsCarousel() {
  /* now handled by pure CSS scroll-snap, kept as no-op for compat */
  return;
}

/* ── AMBIANCE PHOTOS ── */
async function renderAmbiance() {
  const grid = document.getElementById('ambianceGrid');
  if (!grid) return;
  const photos = await fetchAmbiancePhotos();
  if (!photos.length) return; // keep static fallback
  grid.innerHTML = photos.map(p => `
    <div class="amb-item ${p.size || 'mid'}" style="background-image:url('${p.image_url}');background-size:cover;background-position:center;background-repeat:no-repeat;">
      <div class="amb-label">${p.label}</div>
    </div>`).join('');
}

/* ── HOME ABOUT PHOTOS (4 cards) ── */
async function renderHomeAboutPhoto() {
  const photos = await fetchHomeAboutPhotos();
  const slotMap = {};
  if (photos.length) {
    photos.forEach(p => { if (p.slot && p.image_url) slotMap[p.slot] = p.image_url; });
    const slots = ['coffee_craft','photo_spots','fresh_pastry','work_space'];
    document.querySelectorAll('.avc-about-img').forEach((el, i) => {
      const url = slotMap[slots[i]];
      if (url) {
        el.style.backgroundImage = `url('${url}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        const icon = el.querySelector('.av-card-icon');
        if (icon) icon.style.display = 'none';
      }
    });
  }
  // Init carousel AFTER photos applied (mobile only)
  initAvcCarousel();
}

/* ── CAFE INFO (location section) ── */
async function renderCafeInfo() {
  const info = await fetchCafeInfo();
  if (!info) return;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  const setHref = (id, val) => { const el = document.getElementById(id); if (el && val) el.href = val; };
  setEl('locAddress', info.address_full);
  setEl('locAddressShort', info.address);
  setEl('locHoursWeekday', info.hours_weekday);
  setEl('locHoursWeekend', info.hours_weekend);
  setEl('locInstagram', info.instagram);
  const igLink = document.getElementById('locInstagramLink');
  if (igLink && info.instagram) { igLink.textContent = info.instagram; igLink.href = `https://instagram.com/${info.instagram.replace('@','')}`; }
  setHref('locMapsLink', info.maps_url);
  // update map placeholder text
  const mapText = document.getElementById('locMapText');
  if (mapText && info.address) mapText.innerHTML = info.address.replace(', ', '<br>');
  // update hero card info
  if (info.hero_name) setEl('heroCardName', info.hero_name);
  if (info.hero_desc) setEl('heroCardDesc', info.hero_desc);
  if (info.hero_open) setEl('heroOpenText', info.hero_open);
  // update hero card image if set
  if (info.hero_image) {
    const heroTop = document.querySelector('.hero-card-top');
    if (heroTop) {
      heroTop.innerHTML = `<img src="${info.hero_image}" alt="Hero" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:0;">`;
      heroTop.style.padding = '0';
      heroTop.style.overflow = 'hidden';
    }
  }
  // update maps embed if url provided
  const mapsEmbed = document.getElementById('locMapsEmbed');
  if (mapsEmbed && info.maps_url) {
    const embedUrl = info.maps_url.includes('embed') ? info.maps_url : `https://maps.google.com/maps?q=${encodeURIComponent(info.address||'')}&output=embed`;
    mapsEmbed.src = embedUrl;
    mapsEmbed.style.display = 'block';
    const mapPlh = document.getElementById('mapPlaceholder');
    if (mapPlh) mapPlh.style.display = 'none';
  }
}

// Init all
renderFavoriteMenu();
renderNews();
renderAmbiance();
renderHomeAboutPhoto();
renderCafeInfo();
renderReviews();

/* ── ABOUT-VISUAL-CARDS — now pure CSS scroll-snap on mobile ── */
function initAvcCarousel() {
  /* handled by CSS scroll-snap, kept as no-op for compat */
  return;
}
