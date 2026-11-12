/* BQL Reader — public-domain books. Progress, contents, in-text search, font size, light/dark, bookmark (this browser only), print. No dependencies. */
(function () {
  var slug = document.body.getAttribute('data-book'), K = 'bql_read_' + slug, st = {};
  function load() { try { st = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { st = {}; } }
  function save() { try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) {} }
  load();
  var root = document.documentElement, text = document.querySelector('.rtext');
  // back link: the visitor's language
  var lang = 'en'; try { lang = localStorage.getItem('bql_lang') || 'en'; } catch (e) {}
  if (!/^(en|fa|de|fr|es|pt|tr|zh-cn)$/.test(lang)) lang = 'en';
  var back = document.querySelector('[data-back]'); if (back) { back.href = '../../' + lang + '/book-' + slug + '.html'; if (lang === 'fa') back.textContent = '→ کتابخانه'; }
  // font + theme
  function apply() { root.style.setProperty('--rfs', (st.fs || 19) + 'px'); root.setAttribute('data-rtheme', st.th || 'dark'); }
  apply();
  document.querySelectorAll('[data-font]').forEach(function (b) { b.onclick = function () { st.fs = Math.max(14, Math.min(28, (st.fs || 19) + (+b.getAttribute('data-font')))); apply(); save(); }; });
  document.querySelector('[data-theme]').onclick = function () { st.th = (st.th || 'dark') === 'dark' ? 'light' : 'dark'; apply(); save(); };
  document.querySelector('[data-print]').onclick = function () { window.print(); };
  // contents drawer
  var toc = document.querySelector('.rtoc');
  document.querySelector('[data-toc]').onclick = function () { toc.hidden = !toc.hidden; };
  toc.addEventListener('click', function (e) { if (e.target.tagName === 'A') toc.hidden = true; });
  // progress + remember position
  var bar = document.querySelector('.progress i'), t0 = 0;
  function pct() { var h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? scrollY / h : 0; }
  addEventListener('scroll', function () {
    bar.style.width = (pct() * 100).toFixed(2) + '%';
    var now = Date.now(); if (now - t0 > 800) { t0 = now; st.pos = pct(); save(); }
  }, { passive: true });
  // bookmark: explicit mark; on open, resume at bookmark (or last position)
  var mk = document.querySelector('[data-mark]');
  function markUI() { mk.classList.toggle('on', st.mark != null); }
  mk.onclick = function () { if (st.mark != null && Math.abs(st.mark - pct()) < 0.002) st.mark = null; else st.mark = pct(); save(); markUI(); };
  markUI();
  var resume = st.mark != null ? st.mark : st.pos;
  if (!location.hash && resume > 0.01) addEventListener('load', function () { scrollTo(0, resume * (document.documentElement.scrollHeight - innerHeight)); });
  // in-text search
  var fb = document.querySelector('.rfind'), fi = fb.querySelector('input'), hits = [], cur = -1;
  document.querySelector('[data-find]').onclick = function () { fb.hidden = !fb.hidden; if (!fb.hidden) fi.focus(); };
  function clear() { document.querySelectorAll('mark.rhit').forEach(function (m) { m.replaceWith(document.createTextNode(m.textContent)); }); text.normalize(); hits = []; cur = -1; }
  function find(q) {
    clear(); if (q.length < 3) { fb.querySelector('[data-hits]').textContent = ''; return; }
    var w = document.createTreeWalker(text, NodeFilter.SHOW_TEXT), nodes = [], n, ql = q.toLowerCase();
    while ((n = w.nextNode())) if (n.nodeValue.toLowerCase().indexOf(ql) >= 0) nodes.push(n);
    nodes.slice(0, 400).forEach(function (node) {
      var s = node.nodeValue, low = s.toLowerCase(), i = 0, j, frag = document.createDocumentFragment();
      while ((j = low.indexOf(ql, i)) >= 0) { frag.appendChild(document.createTextNode(s.slice(i, j))); var m = document.createElement('mark'); m.className = 'rhit'; m.textContent = s.slice(j, j + q.length); frag.appendChild(m); hits.push(m); i = j + q.length; }
      frag.appendChild(document.createTextNode(s.slice(i))); node.replaceWith(frag);
    });
    fb.querySelector('[data-hits]').textContent = hits.length ? hits.length + (hits.length >= 400 ? '+' : '') : '0'; go(0);
  }
  function go(i) { if (!hits.length) return; if (cur >= 0) hits[cur].classList.remove('cur'); cur = (i + hits.length) % hits.length; hits[cur].classList.add('cur'); hits[cur].scrollIntoView({ block: 'center' }); }
  var tm; fi.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { find(fi.value.trim()); }, 250); });
  fi.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(cur + (e.shiftKey ? -1 : 1)); });
  fb.querySelector('[data-next]').onclick = function () { go(cur + 1); }; fb.querySelector('[data-prev]').onclick = function () { go(cur - 1); };
})();
