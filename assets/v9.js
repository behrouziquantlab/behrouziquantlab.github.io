/* v9: the hero chart tilts gently with the pointer (desktop only, off with reduced motion). */
(function () {
  var s = document.querySelector('[data-tilt]'); if (!s || !window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches || innerWidth < 1000) return;
  var card = s.querySelector('.v9-card'), rtl = document.documentElement.dir === 'rtl', base = rtl ? 16 : -16;
  s.addEventListener('pointermove', function (e) {
    var r = s.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    card.style.transform = 'rotateY(' + (base + x * 10).toFixed(2) + 'deg) rotateX(' + (7 - y * 8).toFixed(2) + 'deg)';
  });
  s.addEventListener('pointerleave', function () { card.style.transform = ''; });
})();
