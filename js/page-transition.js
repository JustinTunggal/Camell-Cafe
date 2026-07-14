/* PAGE TRANSITION ENGINE v4 */
(function () {
  var overlay = document.getElementById("page-transition-overlay");
  if (!overlay) return;

  // Move pt-cover from <html> to <body> (CSS targets body.pt-cover)
  document.body.classList.add("pt-cover");
  document.documentElement.classList.remove("pt-cover");

  // Two rAFs ensure the browser has committed the covered frame before we transition
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.body.classList.remove("pt-cover");
      document.body.classList.add("pt-entering");
      // Clean up entering class after animation completes (0.39s curtain + 0.35s fade)
      setTimeout(function () {
        document.body.classList.remove("pt-entering");
      }, 760);
    });
  });

  // Intercept internal nav links
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http") ||
        href.startsWith("tel:") || href.startsWith("mailto:")) return;
    var targetFile = href.split("?")[0].split("#")[0];
    var currentFile = location.pathname.split("/").pop() || "index.html";
    if (targetFile === currentFile) return;
    e.preventDefault();
    // Cancel any in-progress enter animation
    document.body.classList.remove("pt-entering");
    overlay.style.pointerEvents = "all";
    document.body.classList.add("pt-leaving");
    setTimeout(function () { window.location.href = href; }, 300);
  });
})();
