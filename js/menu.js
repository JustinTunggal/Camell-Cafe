/* ── MENU.JS — Dynamic menu page with coffee loader + filter animation ── */

const CATEGORY_META = {
  'coffee':     { title:'Coffee',     icon:'coffee.svg',    sub:'Biji arabica pilihan dari Gayo, Toraja, dan Flores diseduh dengan presisi.', imgClass:'nv' },
  'non-coffee': { title:'Non-Coffee', icon:'tea.svg',       sub:'Pilihan untuk yang tidak ngopi tapi tetap kece, tetap Camell.', imgClass:'sg' },
  'food':       { title:'Food',       icon:'rice-bowl.svg', sub:'Menu makanan berat cocok untuk menemani sarapan, makan siang, atau makan malammu.', imgClass:'sd' },
  'pastry':     { title:'Pastry',     icon:'croissant.svg', sub:'Dibuat in-house setiap pagi dengan bahan premium dan teknik khusus.', imgClass:'lt' },
};
const BADGE_LABELS = { best:'Best', new:'New', fav:'Fav' };

const COFFEE_LOADER = `
<div class="coffee-loader-wrap">
  <div class="loader">
    <div class="cup"><div class="cup-handle"></div><div class="smoke one"></div><div class="smoke two"></div><div class="smoke three"></div></div>
    <div class="load">..........................</div>
  </div>
</div>`;

function formatPrice(p) { return 'Rp ' + Number(p).toLocaleString('id-ID'); }

function renderItemImage(item) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META['coffee'];
  const badge = item.badge && BADGE_LABELS[item.badge]
    ? `<span class="mc2-badge ${item.badge}">${BADGE_LABELS[item.badge]}</span>` : '';
  if (item.image_url) {
    return `<div class="mc2-img mc2-img--photo ${meta.imgClass}">
      <img src="${item.image_url}" alt="${item.name}" class="mc2-real-img" loading="lazy"
           onerror="this.closest('.mc2-img').classList.add('mc2-img--fallback');this.remove();">
      ${badge}</div>`;
  }
  return `<div class="mc2-img ${meta.imgClass}">
    <span><img src="assets/${meta.icon}" alt="" class="icon-emoji"></span>${badge}</div>`;
}

function renderMenuItem(item) {
  const hot = item.hot_iced ? `<div class="mc2-hot">${item.hot_iced}</div>` : '';
  return `
    <div class="mc2" data-cat="${item.category}">
      ${renderItemImage(item)}
      <div class="mc2-body">
        <div class="mc2-name">${item.name}</div>
        <div class="mc2-desc">${item.description || ''}</div>
        <div class="mc2-footer"><div>
          <div class="mc2-price">${formatPrice(item.price)}</div>${hot}
        </div></div>
      </div>
    </div>`;
}

let allItems = [];
let currentFilter = 'all';

function applyFilter(filter, animate = true) {
  currentFilter = filter;
  const container = document.getElementById('menuContainer');

  // Update tab styles
  document.querySelectorAll('.menu-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === filter));

  if (animate) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(12px)';
  }

  const cats = ['coffee','non-coffee','food','pastry'];
  const grouped = {};
  allItems.forEach(item => {
    const cat = item.category || 'coffee';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  const visibleCats = filter === 'all'
    ? cats.filter(c => grouped[c])
    : cats.filter(c => c === filter && grouped[c]);

  if (!visibleCats.length) {
    container.innerHTML = '<div class="menu-loading">Belum ada item menu di kategori ini.</div>';
  } else {
    container.innerHTML = visibleCats.map(cat => {
      const meta = CATEGORY_META[cat] || { title: cat, icon: 'coffee.svg', sub: '' };
      return `
        <div class="menu-section" data-section="${cat}">
          <div class="menu-section-title"><img src="assets/${meta.icon}" alt="" class="icon-emoji"> ${meta.title}</div>
          <div class="menu-section-sub">${meta.sub}</div>
          <div class="menu-grid-3">${grouped[cat].map(renderMenuItem).join('')}</div>
        </div>`;
    }).join('');
  }

  if (animate) {
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    });
  }
}

async function renderMenu() {
  const container = document.getElementById('menuContainer');
  container.innerHTML = COFFEE_LOADER;
  allItems = await fetchMenuItems();
  applyFilter('all', false);
}

// Tab click
document.querySelectorAll('.menu-tab').forEach(tab => {
  tab.addEventListener('click', () => applyFilter(tab.dataset.filter));
});

renderMenu();
