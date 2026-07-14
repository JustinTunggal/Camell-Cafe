/* ── ABOUT.JS — Story page dynamic content ── */

const COFFEE_LOADER = `
<div class="coffee-loader-wrap">
  <div class="loader">
    <div class="cup"><div class="cup-handle"></div><div class="smoke one"></div><div class="smoke two"></div><div class="smoke three"></div></div>
    <div class="load">..........................</div>
  </div>
</div>`;

const CAT_COLORS = { coffee:'nv', pastry:'lt', 'non-coffee':'sg', food:'sd' };
const CAT_ICONS  = { coffee:'coffee.svg', pastry:'croissant.svg', 'non-coffee':'tea.svg', food:'rice-bowl.svg' };

/* ── Story photo ── */
async function loadStoryPhoto() {
  const photo = await fetchAboutPhoto();
  if (!photo || !photo.image_url) return;
  const img = document.getElementById('storyPhoto');
  const fallback = document.getElementById('storyPhotoFallback');
  if (img) { img.src = photo.image_url; img.style.display = 'block'; }
  if (fallback) fallback.style.display = 'none';
}

/* ── Featured products ── */
async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredProductsGrid');
  if (!grid) return;
  grid.innerHTML = COFFEE_LOADER;
  const items = await fetchFeaturedMenuItems();
  if (!items.length) {
    grid.innerHTML = '<div class="no-data-msg">Belum ada produk unggulan yang dipilih.</div>'; return;
  }
  function formatPrice(p) { return 'Rp ' + Number(p).toLocaleString('id-ID'); }
  grid.innerHTML = items.map(item => {
    const col = CAT_COLORS[item.category] || 'nv';
    const icon = CAT_ICONS[item.category] || 'coffee.svg';
    const imgHtml = item.image_url
      ? `<img src="${item.image_url}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" loading="lazy">`
      : `<img src="assets/${icon}" alt="" class="icon-emoji">`;
    return `
      <div class="product-card">
        <div class="product-card-img ${col}" style="${item.image_url?'padding:0;overflow:hidden;':''}">${imgHtml}</div>
        <div class="product-card-body">
          <div class="product-cat">${item.category}</div>
          <div class="product-name">${item.name}</div>
          <div class="product-desc">${item.description || ''}</div>
          <div style="margin-top:8px;font-weight:700;color:var(--accent);font-size:0.9rem;">${formatPrice(item.price)}</div>
        </div>
      </div>`;
  }).join('');
}

/* ── Team reveal animation ── */
async function loadTeam() {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  const members = await fetchTeamMembers();
  if (!members.length) { grid.innerHTML = '<div class="no-data-msg">—</div>'; return; }

  grid.innerHTML = members.map(m => `
    <div class="team-reveal-card">
      <div class="trc-inner">
        <div class="trc-photo">
          ${m.image_url
            ? `<img src="${m.image_url}" alt="${m.name}" loading="lazy" onerror="this.closest('.trc-photo').innerHTML='<img src=\'assets/person.svg\' alt=\'\'  class=\'icon-emoji\'>'">` 
            : `<img src="assets/person.svg" alt="" class="icon-emoji">`}
        </div>
        <div class="trc-overlay">
          <div class="trc-name">${m.name}</div>
          <div class="trc-role">${m.role}</div>
        </div>
      </div>
    </div>`).join('');
  initTeamCarousel();
}

/* ── TEAM CAROUSEL — locked center, auto-timed (drives native scroll-snap) ── */
function initTeamCarousel() {
  if (!window.matchMedia('(max-width: 900px)').matches) return;
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.team-reveal-card'));
  if (cards.length < 2) return;
  if (grid.dataset.carouselInit) return;
  grid.dataset.carouselInit = '1';

  cards.forEach(card => {
    const inner = card.querySelector('.trc-inner');
    const photo = card.querySelector('.trc-photo');
    const img = card.querySelector('.trc-photo img');
    const overlay = card.querySelector('.trc-overlay');
    const set = (el, styles) => { if (el) Object.entries(styles).forEach(([k, v]) => el.style.setProperty(k, v, 'important')); };
    set(card, { flex: '0 0 100%', width: '100%', 'min-width': '100%', 'max-width': '100%', height: 'auto', 'border-radius': '0', display: 'flex', 'align-items': 'center', 'justify-content': 'center', background: 'transparent', 'box-shadow': 'none', overflow: 'visible' });
    set(inner, { width: '200px', height: '200px', 'min-width': '200px', 'min-height': '200px', 'max-width': '200px', 'max-height': '200px', 'border-radius': '50%', overflow: 'hidden', 'flex-shrink': '0', position: 'relative' });
    set(photo, { position: 'absolute', inset: '0', opacity: '1', 'border-radius': '50%' });
    set(img, { width: '100%', height: '100%', 'object-fit': 'cover', 'border-radius': '50%' });
    set(overlay, { opacity: '1' });
  });

  const existingControls = grid.parentElement.querySelector('.team-car-controls');
  if (existingControls) existingControls.remove();

  grid.scrollLeft = 0;

  const controls = document.createElement('div');
  controls.className = 'team-car-controls';
  const prev = document.createElement('button');
  prev.className = 'team-car-btn'; prev.innerHTML = '&#8592;'; prev.type = 'button';
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'team-car-dots';
  const next = document.createElement('button');
  next.className = 'team-car-btn'; next.innerHTML = '&#8594;'; next.type = 'button';
  controls.appendChild(prev); controls.appendChild(dotsWrap); controls.appendChild(next);
  grid.insertAdjacentElement('afterend', controls);

  const total = cards.length;
  let cur = 0;
  const dots = cards.map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'team-car-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => { go(i); startAuto(); });
    dotsWrap.appendChild(d);
    return d;
  });

  function go(n) {
    cur = (n + total) % total;
    grid.scrollTo({ left: cards[cur].offsetLeft, behavior: 'smooth' });
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  }

  let timer = null;
  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => go(cur + 1), 3000);
  }

  let scrollTimeout = null;
  grid.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      let closest = 0, minDist = Infinity;
      cards.forEach((c, i) => {
        const dist = Math.abs(c.offsetLeft - grid.scrollLeft);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      cur = closest;
      dots.forEach((d, i) => d.classList.toggle('active', i === cur));
    }, 100);
  });

  prev.addEventListener('click', () => { go(cur - 1); startAuto(); });
  next.addEventListener('click', () => { go(cur + 1); startAuto(); });
  startAuto();
}

/* ── TEAM CAROUSEL (mobile) — replaces hover-reveal ── */
function initTeamCarousel() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.team-reveal-card'));
  if (cards.length < 2) return;
  if (grid.querySelector('.team-track')) return;

  // On mobile: show photo always (disable hover-reveal)
  cards.forEach(card => {
    const photo = card.querySelector('.trc-photo');
    const overlay = card.querySelector('.trc-overlay');
    const inner = card.querySelector('.trc-inner');
    if (photo) photo.style.opacity = '1';
    if (inner) inner.style.setProperty('--after-opacity', '0');
    if (overlay) overlay.style.opacity = '1';
  });

  // Build track
  const track = document.createElement('div');
  track.className = 'team-track';
  const slideW = grid.offsetWidth;
  cards.forEach(card => {
    card.style.width = slideW + 'px';
    card.style.minWidth = slideW + 'px';
    track.appendChild(card);
  });
  grid.innerHTML = '';
  grid.appendChild(track);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'team-car-controls';
  const prev = document.createElement('button');
  prev.className = 'team-car-btn'; prev.innerHTML = '&#8592;';
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'team-car-dots';
  const next = document.createElement('button');
  next.className = 'team-car-btn'; next.innerHTML = '&#8594;';
  controls.appendChild(prev); controls.appendChild(dotsWrap); controls.appendChild(next);
  grid.insertAdjacentElement('afterend', controls);

  let cur = 0;
  const total = cards.length;
  const dots = cards.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'team-car-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => { go(i); startAuto(); });
    dotsWrap.appendChild(d);
    return d;
  });

  function go(n) {
    cur = (n + total) % total;
    track.style.transform = `translateX(-${cur * slideW}px)`;
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

loadStoryPhoto();
loadFeaturedProducts();
loadTeam();

/* ── STORY-CARD-BIG — timed centered carousel (mobile) ── */
function initStoryCarousel() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  const visual = document.querySelector('.story-visual');
  if (!visual) return;

  // Remove story floats (clutter on mobile)
  visual.querySelectorAll('.story-float').forEach(f => f.remove());

  const cards = Array.from(visual.querySelectorAll('.story-card-big'));
  if (cards.length < 1) return;

  // Single card — wrap in track so CSS layout applies, no controls
  if (cards.length === 1) {
    const track = document.createElement('div');
    track.className = 'story-carousel-track';
    track.appendChild(cards[0]);
    visual.innerHTML = '';
    visual.appendChild(track);
    return;
  }

  // Wrap in track
  const track = document.createElement('div');
  track.className = 'story-carousel-track';
  const slideW = visual.offsetWidth;
  cards.forEach(card => {
    card.style.minWidth = slideW + 'px';
    card.style.width = slideW + 'px';
    track.appendChild(card);
  });
  visual.innerHTML = '';
  visual.appendChild(track);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'story-carousel-controls';
  const prevBtn = document.createElement('button');
  prevBtn.className = 'story-car-btn';
  prevBtn.innerHTML = '&#8592;';
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'story-car-dots';
  const nextBtn = document.createElement('button');
  nextBtn.className = 'story-car-btn';
  nextBtn.innerHTML = '&#8594;';
  controls.appendChild(prevBtn);
  controls.appendChild(dotsWrap);
  controls.appendChild(nextBtn);
  visual.insertAdjacentElement('afterend', controls);

  let storyCurrent = 0;
  const total = cards.length;
  const dots = cards.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'story-car-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => { goStory(i); startStoryAuto(); });
    dotsWrap.appendChild(d);
    return d;
  });

  function goStory(n) {
    storyCurrent = (n + total) % total;
    const w = visual.offsetWidth;
    track.style.transform = `translateX(-${storyCurrent * w}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === storyCurrent));
  }

  let storyTimer = null;
  function startStoryAuto() {
    clearInterval(storyTimer);
    storyTimer = setInterval(() => goStory(storyCurrent + 1), 5000);
  }

  prevBtn.addEventListener('click', () => { goStory(storyCurrent - 1); startStoryAuto(); });
  nextBtn.addEventListener('click', () => { goStory(storyCurrent + 1); startStoryAuto(); });

  startStoryAuto();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStoryCarousel);
} else {
  initStoryCarousel();
}
