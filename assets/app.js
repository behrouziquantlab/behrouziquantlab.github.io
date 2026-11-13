/* BQL site runtime: instant search, reveal-on-scroll, view counting, "most read". No dependencies. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // reveal
  var els = document.querySelectorAll('.reveal, .card, .life li, .plan, .lvl, .ccard, .book');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight) return; el.classList.add('rv'); io.observe(el); });   // above the fold: visible at once
  }
  // language: remember a manual choice; on deep pages only SUGGEST the saved language (never redirect)
  var here = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
  document.querySelectorAll('.langs a[lang]').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('bql_lang', a.getAttribute('lang').toLowerCase()); } catch (e) {} });
  });
  var pref = null; try { pref = localStorage.getItem('bql_lang'); } catch (e) {}
  var NAMES = { en: 'English', fa: 'فارسی', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português', tr: 'Türkçe', 'zh-cn': '简体中文' };
  var dismissed = false; try { dismissed = sessionStorage.getItem('bql_hint_off') === '1'; } catch (e) {}
  if (pref && NAMES[pref] && pref !== here && !dismissed && /\/[a-z-]{2,5}\//.test(location.pathname)) {
    var target = location.pathname.replace(/\/(en|fa|de|fr|es|pt|tr|zh-cn)\//, '/' + pref + '/');
    var bar = document.createElement('div'); bar.className = 'langhint'; bar.setAttribute('dir', pref === 'fa' ? 'rtl' : 'ltr');
    bar.innerHTML = '<a href="' + target + '" lang="' + pref + '">' + NAMES[pref] + ' →</a><button type="button" aria-label="close">×</button>';
    bar.querySelector('a').addEventListener('click', function () { try { localStorage.setItem('bql_lang', pref); } catch (e) {} });
    bar.querySelector('button').addEventListener('click', function () { bar.remove(); try { sessionStorage.setItem('bql_hint_off', '1'); } catch (e) {} });
    document.body.appendChild(bar);
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
  // 3D hero: a perspective "market surface" (DEMO visual, simulated) drawn on a 2D canvas — no library, paused off-screen,
  // lighter on phones / weak devices / data-saver, a single static frame when the visitor prefers reduced motion.
  var cv = document.getElementById('q3d');
  if (cv && cv.getContext) {
    var cx = cv.getContext('2d'), weak = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.connection && navigator.connection.saveData) || innerWidth < 700;
    var GX = weak ? 26 : 44, GZ = weak ? 16 : 26, dpr = Math.min(window.devicePixelRatio || 1, weak ? 1 : 1.5), W = 0, H = 0, run = true, t0 = performance.now();
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function hgt(x, z, t) { return Math.sin(x * 0.35 + t * 0.6) * 0.9 + Math.cos(z * 0.45 - t * 0.4) * 0.7 + Math.sin((x + z) * 0.18 + t * 0.25) * 1.1; }
    function proj(x, y, z) { var cz = z + 9, s = H * 0.9 / cz; return [W * (document.documentElement.dir === 'rtl' ? 0.36 : 0.64) + x * s, H * 0.62 - y * s]; }
    function frame(now) {
      var t = (now - t0) / 1000; cx.clearRect(0, 0, W, H);
      for (var j = 0; j < GZ; j++) {                                  // depth rows, far → near
        var z = (GZ - j) * 0.55, a = 0.12 + 0.55 * (j / GZ); cx.beginPath();
        for (var i = 0; i < GX; i++) { var x = (i - GX / 2) * 0.5, p = proj(x, hgt(i, j, t) * 0.9 - 2.2, z); i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]); }
        cx.strokeStyle = 'rgba(45,212,191,' + a.toFixed(3) + ')'; cx.lineWidth = 1; cx.stroke();
      }
      var n = weak ? 18 : 30;                                          // floating candles (simulated)
      for (var k = 0; k < n; k++) {
        var x = (k - n / 2) * 0.62, o = Math.sin(k * 1.7 + t * 0.8) * 0.8 + 1.2, c = o + Math.sin(k * 2.3 + t * 1.1) * 0.6, z = 2.2;
        var p1 = proj(x, Math.max(o, c) + 0.35, z), p2 = proj(x, Math.min(o, c) - 0.35, z), b1 = proj(x, Math.max(o, c), z), b2 = proj(x, Math.min(o, c), z), w = Math.max(2, H * 0.9 / (z + 9) * 0.22);
        var up = c >= o; cx.strokeStyle = cx.fillStyle = up ? 'rgba(34,197,94,.75)' : 'rgba(239,68,68,.7)';
        cx.beginPath(); cx.moveTo(p1[0], p1[1]); cx.lineTo(p2[0], p2[1]); cx.stroke(); cx.fillRect(b1[0] - w / 2, b1[1], w, Math.max(1, b2[1] - b1[1]));
      }
      if (run && !reduce) requestAnimationFrame(frame);
    }
    size(); addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { var was = run; run = e[0].isIntersecting; if (run && !was && !reduce) requestAnimationFrame(frame); }).observe(cv);
    document.addEventListener('visibilitychange', function () { var was = run; run = !document.hidden; if (run && !was && !reduce) requestAnimationFrame(frame); });
    requestAnimationFrame(frame);
  }
  // subtle 3D tilt on cards (desktop pointers only)
  if (!reduce && matchMedia('(pointer:fine)').matches) document.querySelectorAll('.tilt,.card,.lcard,.acard').forEach(function (el) {
    el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = 'perspective(800px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-2px)'; });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  });
  // reading progress bar + print
  var pb = document.querySelector('.progress i');
  if (pb) addEventListener('scroll', function () { var h = document.documentElement.scrollHeight - innerHeight; pb.style.width = (h > 0 ? scrollY / h * 100 : 0).toFixed(2) + '%'; }, { passive: true });
  document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  // PDF viewer (browser's own viewer: pages, search, zoom, print, download)
  document.querySelectorAll('[data-pdfview]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = document.querySelector('.pdfbox'); if (!box) return;
      if (!box.firstChild) box.innerHTML = '<iframe src="' + b.getAttribute('data-pdfview') + '#view=FitH" title="PDF" loading="lazy"></iframe>';
      box.hidden = !box.hidden; if (!box.hidden) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
  // filters (library + research): search, selects, checkbox, sort; state kept in the URL hash so a filtered view can be shared
  document.querySelectorAll('[data-filter]').forEach(function (bar) {
    var sec = bar.parentNode, grid = sec.querySelector('[data-items]'), none = sec.querySelector('.fnone'), cnt = bar.querySelector('[data-count]');
    var items = Array.prototype.slice.call(grid.children), orig = items.slice(), F = {};
    bar.querySelectorAll('[data-f]').forEach(function (el) { F[el.getAttribute('data-f')] = el; });
    function val(k) { var el = F[k]; return !el ? '' : el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value.trim().toLowerCase(); }
    function apply() {
      var q = val('q'), shown = 0;
      items.forEach(function (it) {
        var d = it.dataset, ok = true;
        if (q && (d.s || '').indexOf(q) < 0) ok = false;
        if (val('c') && (d.c || '').toLowerCase() !== val('c')) ok = false;
        if (val('k') && d.k !== val('k')) ok = false;
        if (val('fa') && d.fa !== '1') ok = false;
        if (val('d') && d.d !== val('d')) ok = false;
        if (val('m') && d.m !== val('m')) ok = false;
        if (val('pdf') && d.pdf !== '1') ok = false;
        if (val('ser') && d.ser !== '1') ok = false;
        it.hidden = !ok; if (ok) shown++;
      });
      var s = val('sort'), arr = orig.slice();
      var by = { t: function (a, b) { return a.dataset.t.localeCompare(b.dataset.t); }, a: function (a, b) { return a.dataset.a.localeCompare(b.dataset.a); },
                 yd: function (a, b) { return b.dataset.y - a.dataset.y; }, ya: function (a, b) { return a.dataset.y - b.dataset.y; },
                 old: function (a, b) { return a.dataset.dt.localeCompare(b.dataset.dt); }, short: function (a, b) { return a.dataset.r - b.dataset.r; }, long: function (a, b) { return b.dataset.r - a.dataset.r; } }[s];
      if (by) arr.sort(by); arr.forEach(function (it) { grid.appendChild(it); });
      if (cnt) cnt.textContent = shown + ' / ' + items.length; if (none) none.hidden = shown > 0;
      var h = []; for (var k in F) { var v = val(k); if (v) h.push(k + '=' + encodeURIComponent(v)); }
      try { history.replaceState(null, '', h.length ? '#' + h.join('&') : location.pathname); } catch (e) {}
    }
    (location.hash.slice(1) || '').split('&').forEach(function (p) { var kv = p.split('='); var el = F[kv[0]]; if (!el || kv.length < 2) return; var v = decodeURIComponent(kv[1]);
      if (el.type === 'checkbox') el.checked = v === '1'; else { for (var i = 0; el.options && i < el.options.length; i++) if (el.options[i].value.toLowerCase() === v) el.value = el.options[i].value; if (!el.options) el.value = v; } });
    for (var k in F) { F[k].addEventListener(F[k].tagName === 'INPUT' && F[k].type !== 'checkbox' ? 'input' : 'change', apply); }
    document.querySelectorAll('[data-chip]').forEach(function (c) { c.addEventListener('click', function () { if (!F.c) return; F.c.value = F.c.value === c.getAttribute('data-chip') ? '' : c.getAttribute('data-chip'); apply(); bar.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }); });
    apply();
  });
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

/* v6 (2026-11-13): mobile/tablet menu — accessible toggle, closes on link click, Escape or outside click */
(function(){
  var top=document.querySelector('header.top'), btn=top&&top.querySelector('.menu'); if(!btn) return;
  function set(o){top.classList.toggle('open',o);btn.setAttribute('aria-expanded',o?'true':'false');document.documentElement.classList.toggle('menu-open',o);}
  btn.addEventListener('click',function(e){e.stopPropagation();set(!top.classList.contains('open'));});
  top.querySelectorAll('#mainnav a').forEach(function(a){a.addEventListener('click',function(){set(false);});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});
  document.addEventListener('click',function(e){if(top.classList.contains('open')&&!top.contains(e.target))set(false);});
  window.addEventListener('resize',function(){if(window.innerWidth>1100)set(false);});
})();
