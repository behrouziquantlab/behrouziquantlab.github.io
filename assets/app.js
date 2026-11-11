/* BQL site runtime: instant search, reveal-on-scroll, view counting, "most read". No dependencies. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reveal
  var els = document.querySelectorAll('.reveal, .card, .life li, .plan, .lvl, .ccard, .book');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) return; el.classList.add('rv'); io.observe(el); });   // above the fold: visible at once
  }
  // search (academy page)
  var q = document.getElementById('q'), out = document.getElementById('qr'), idx = null;
  if (q) {
    q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      if (!v) { out.innerHTML = ''; return; }
      var go = function () {
        var hits = idx.filter(function (x) { return (x.t + ' ' + x.s).toLowerCase().indexOf(v) >= 0; }).slice(0, 8);
        out.innerHTML = hits.length ? hits.map(function (x) { return '<a href="' + x.u + '"><small>' + x.k + '</small>' + x.t.replace(/</g, '&lt;') + '</a>'; }).join('') : '<p class="muted">—</p>';
      };
      if (idx) go(); else fetch('search.json').then(function (r) { return r.json(); }).then(function (j) { idx = j; go(); });
    });
  }
  // view counting + most read (served by the BQL store; silently skipped on a static host)
  var doc = document.querySelector('[data-slug]');
  if (doc) fetch('/api/view', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'slug=' + encodeURIComponent(doc.getAttribute('data-slug')) }).catch(function () {});
  var pop = document.getElementById('pop');
  if (pop) fetch('/api/popular').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.length) return;
    var known = {}; pop.querySelectorAll('a').forEach(function (a) { known[a.getAttribute('href')] = a.textContent; });
    var items = j.map(function (x) { var h = 'mag-' + x.slug.split('/')[1] + '.html'; return known[h] ? '<li><a href="' + h + '">' + known[h] + '</a></li>' : ''; }).join('');
    if (items) pop.innerHTML = items;
  }).catch(function () {});
})();
