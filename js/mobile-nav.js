// Mobile nav — hamburger drawer + backdrop, robust across all nav variants
(function () {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const links = nav.querySelector('.nav-links');
  if (!links) return;

  // ── CTA lives as a sibling of ul on desktop (true right-aligned layout).
  // On mobile, move it into the drawer list so it's part of the menu.
  const ctaLink = nav.querySelector(':scope > .nav-cta');
  let ctaLi = null;
  function placeCta() {
    if (!ctaLink) return;
    if (window.innerWidth <= 860) {
      if (!ctaLi) {
        ctaLi = document.createElement('li');
        ctaLi.className = 'nav-cta-item';
      }
      ctaLi.appendChild(ctaLink);
      links.appendChild(ctaLi);
    } else {
      nav.appendChild(ctaLink);
      if (ctaLi && ctaLi.parentNode) ctaLi.parentNode.removeChild(ctaLi);
    }
  }
  placeCta();
  window.addEventListener('resize', placeCta, { passive: true });

  // ── Hamburger button (injected so it always comes after nav-links in DOM)
  const toggle = document.createElement('button');
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Buka menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(toggle);

  // ── Backdrop (full-screen dark overlay behind drawer)
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  nav.appendChild(backdrop);

  // ── State
  function closeMenu() {
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    links.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  function openMenu() {
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    links.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ── Triggers
  toggle.addEventListener('click', () => {
    links.classList.contains('open') ? closeMenu() : openMenu();
  });
  backdrop.addEventListener('click', closeMenu);
  backdrop.addEventListener('touchstart', closeMenu, { passive: true });

  // Close on any nav link click (including CTA)
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // Close on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMenu();
  }, { passive: true });

  // ── Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();
