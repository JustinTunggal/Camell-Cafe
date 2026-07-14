let navScrollTicking = false;
window.addEventListener('scroll', () => {
  if (navScrollTicking) return;
  navScrollTicking = true;
  requestAnimationFrame(() => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 40);
    navScrollTicking = false;
  });
}, { passive: true });
