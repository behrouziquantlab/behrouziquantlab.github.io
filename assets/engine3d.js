/* BQL "Divergence Field" (v7, 2026-11-13) — dependency-free WebGL. It illustrates what the BQL QUANT ENGINE does:
   closed bars build a price path and its MACD, two pivots are matched, the divergence is drawn, and the confirmation
   locks the gold point after the disclosed delay. Data are simulated and labelled as such on the page.
   Progressive enhancement: the identical SVG poster stays visible without WebGL/JS, with reduced motion or data saver.
   Paused off-screen and on hidden tabs; resources released on context loss. */
(function () {                                                    // scroll story: the active step decides how far the chart has been built
  var frame = document.querySelector('[data-story]'); if (!frame || !('IntersectionObserver' in window)) return;
  var steps = Array.prototype.slice.call(document.querySelectorAll('.s8-step'));
  function set(n) { for (var k = 1; k <= 5; k++) frame.classList.toggle('show-' + k, k <= n); steps.forEach(function (s, i) { s.classList.toggle('on', i + 1 === n); }); }
  set(1); var sec = frame.closest('.s8'); if (sec) sec.classList.add('s8-live');   // without JS every step stays fully visible
  var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) set(+en.target.getAttribute('data-step')); }); }, { rootMargin: '-42% 0px -42% 0px' });
  steps.forEach(function (s) { io.observe(s); });
})();
(function () {
  var canvases = document.querySelectorAll('canvas[data-engine3d]');
  if (!canvases.length || !window.WebGLRenderingContext) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (navigator.connection && navigator.connection.saveData) return;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;
  var low = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 700;
  for (var c = 0; c < canvases.length; c++) init(canvases[c]);

  // ---- tiny matrix helpers (column-major, like WebGL expects)
  function persp(fy, a, n, f) { var t = 1 / Math.tan(fy / 2), r = 1 / (n - f); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + f) * r, -1, 0, 0, 2 * n * f * r, 0]; }
  function look(ex, ey, ez, cx, cy, cz) {
    var zx = ex - cx, zy = ey - cy, zz = ez - cz, l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz); xx /= l; xz /= l;            // up = (0,1,0)
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1];
  }
  function mul(a, b) { var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { x = clamp(x); return 1 - Math.pow(1 - x, 3); }
  function snap(x) { x = clamp(x); var k = x - 1; return 1 + 2.7 * k * k * k + 1.7 * k * k; }   // gentle back-out, used once: the confirmation

  function init(cv) {
    var D; try { D = JSON.parse(cv.getAttribute('data-engine3d')); } catch (e) { return; }
    var gl = cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true }) || cv.getContext('experimental-webgl');
    if (!gl) return;
    var box = cv.parentNode, tags = {}, n = D.n, shift = parseFloat(cv.getAttribute('data-shift')) || 0;   // full-bleed hero: scene beside the headline
    box.querySelectorAll('[data-tag]').forEach(function (el) { tags[el.getAttribute('data-tag')] = el; });

    // ---- shaders
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    function prog(vs, fs) { var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; }
    var LP = prog('attribute vec3 aP;attribute float aT;uniform mat4 uM;varying float vT;varying float vW;void main(){vT=aT;vec4 p=uM*vec4(aP,1.);vW=p.w;gl_Position=p;}',
      'precision mediump float;uniform vec4 uC;uniform float uR;uniform float uDash;varying float vT;varying float vW;' +
      'void main(){if(vT>uR)discard;if(uDash>0.&&mod(vT*uDash,1.)>.55)discard;float fog=clamp(1.-(vW-15.)/16.,.22,1.);float head=1.-smoothstep(uR-.015,uR,vT)*.6;float a=uC.a*fog*head;gl_FragColor=vec4(uC.rgb*a,a);}');
    var PP = prog('attribute vec3 aP;attribute float aT;uniform mat4 uM;uniform float uS;varying float vT;void main(){vT=aT;vec4 p=uM*vec4(aP,1.);gl_Position=p;gl_PointSize=uS*16./p.w;}',
      'precision mediump float;uniform vec4 uC;uniform float uR;uniform float uK;varying float vT;' +
      'void main(){if(vT>uR)discard;float r=length(gl_PointCoord*2.-1.);float a;' +
      'if(uK<.5)a=1.-smoothstep(.55,1.,r);else if(uK<1.5)a=1.-smoothstep(.06,.16,abs(r-.72));else a=(1.-smoothstep(.42,.5,r))+(1.-smoothstep(.06,.14,abs(r-.86)))*.45;' +
      'a*=uC.a;gl_FragColor=vec4(uC.rgb*a,a);}');
    if (!LP || !PP) return;

    // ---- geometry (world units: time along x, value along y, the four engines along z)
    var X = function (i) { return -6 + 12 * i / (n - 1); };
    var PY = function (v) { return .55 + v * 1.15; }, MY = function (v) { return -2.05 + v * .7; };
    var objs = [];
    function buf(arr, mode, prog_, extra) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
      var o = { b: b, count: arr.length / 4, mode: mode, p: prog_ }; for (var k in extra) o[k] = extra[k]; objs.push(o); return o;
    }
    function strip(pts, z) { var a = []; for (var i = 0; i < pts.length; i++) a.push(pts[i][0], pts[i][1], z, i / (pts.length - 1)); return a; }
    function ribbon(pts, z, w) {
      var a = [];
      for (var i = 0; i < pts.length; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2, t = i / (pts.length - 1);
        a.push(pts[i][0] + nx, pts[i][1] + ny, z, t, pts[i][0] - nx, pts[i][1] - ny, z, t);
      }
      return a;
    }
    var price = D.price.map(function (v, i) { return [X(i), PY(v)]; }), macd = D.macd.map(function (v, i) { return [X(i), MY(v)]; });
    var grid = [];
    for (var gx = -7.5; gx <= 7.51; gx += .75) grid.push(gx, -3.1, 1.5, 1, gx, -3.1, -9, 1);
    for (var gz = 1.5; gz >= -9.01; gz -= 1.5) grid.push(-7.5, -3.1, gz, 1, 7.5, -3.1, gz, 1);
    buf(grid, gl.LINES, LP, { c: [.42, .52, .68, .2], k: 'grid' });
    [[-2.2, .42], [-4.4, .3], [-6.6, .2]].forEach(function (L, k) {                 // the other three engines, further back
      var pts = D.price.map(function (v, i) { return [X(i) + (k + 1) * .25, PY(v * (1 - .12 * (k + 1)) + .2 * (k + 1))]; });
      buf(strip(pts, L[0]), gl.LINE_STRIP, LP, { c: [.18, .83, .75, L[1]], k: 'bg' });
    });
    buf([X(0), MY(0), 0, 0, X(n - 1), MY(0), 0, 1], gl.LINES, LP, { c: [.5, .58, .72, .22], k: 'zero', dash: 60 });
    buf(ribbon(macd, 0, .035), gl.TRIANGLE_STRIP, LP, { c: [.54, .6, .71, .9], k: 'front' });
    buf(ribbon(price, 0, .055), gl.TRIANGLE_STRIP, LP, { c: [.18, .83, .75, 1], k: 'front' });
    var dots = []; for (var i = 0; i <= D.conf; i++) dots.push(price[i][0], price[i][1], .01, i / (n - 1));
    buf(dots, gl.POINTS, PP, { c: [.9, .93, .97, .5], k: 'dots', s: 5, kind: 0 });
    buf([price[D.p1][0], price[D.p1][1], .02, D.p1 / (n - 1), price[D.p2][0], price[D.p2][1], .02, D.p2 / (n - 1), macd[D.m1][0], macd[D.m1][1], .02, D.m1 / (n - 1), macd[D.m2][0], macd[D.m2][1], .02, D.m2 / (n - 1)],
        gl.POINTS, PP, { c: [.9, .93, .97, .95], k: 'piv', s: 15, kind: 1 });
    buf(ribbon([price[D.p1], price[D.p2]], .015, .03), gl.TRIANGLE_STRIP, LP, { c: [.18, .83, .75, .95], k: 'conn', dash: 14 });
    buf(ribbon([macd[D.m1], macd[D.m2]], .015, .03), gl.TRIANGLE_STRIP, LP, { c: [.94, .27, .27, .85], k: 'conn', dash: 14 });
    var xc = X(D.conf), xp = price[D.p2][0];
    buf([xc, -2.75, 0, 0, xc, 3.6, 0, 1], gl.LINES, LP, { c: [.96, .72, .25, .55], k: 'gold' });
    buf([xp, -2.9, 0, 0, xc, -2.9, 0, 1, xp, -2.98, 0, 0, xp, -2.82, 0, 1, xc, -2.98, 0, 0, xc, -2.82, 0, 1], gl.LINES, LP, { c: [.96, .72, .25, .9], k: 'gold' });
    buf([xp, price[D.p2][1], .03, 0], gl.POINTS, PP, { c: [.96, .72, .25, 1], k: 'lock', s: 30, kind: 2 });

    var anchors = { p1: [price[D.p1][0], price[D.p1][1] + .42, 0], p2: [xp - .55, price[D.p2][1] + .42, 0], conf: [xc + .25, 3.95, 0], delay: [(xp + xc) / 2, -3.35, 0],
                    lane: [X(0) + 1.7, 2.3, 0], macd: [X(0) + .7, -1.15, 0], rd: [xp + .1, price[D.p2][1] + 1.0, 0] };
    var tP1 = D.p1 / (n - 1), tP2 = D.p2 / (n - 1);

    // ---- sizing, pointer, visibility
    var W = 0, H = 0, dpr = 1, M = null, px = 0, py = 0, tx = 0, ty = 0, visible = true, raf = 0, t0 = 0, live = false;
    function size() {
      var r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.75); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); gl.viewport(0, 0, cv.width, cv.height);
    }
    if (window.ResizeObserver) new ResizeObserver(function () { size(); kick(); }).observe(cv); else addEventListener('resize', function () { size(); kick(); });
    if (fine) {
      box.addEventListener('pointermove', function (ev) { var r = box.getBoundingClientRect(); tx = (ev.clientX - r.left) / r.width - .5; ty = (ev.clientY - r.top) / r.height - .5; kick(); });
      box.addEventListener('pointerleave', function () { tx = ty = 0; kick(); });
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }, { rootMargin: '80px' }).observe(cv);
    document.addEventListener('visibilitychange', kick);
    cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); cancelAnimationFrame(raf); raf = 0; box.classList.remove('is-live'); live = false; });

    function project(p) {
      var x = p[0], y = p[1], z = p[2], w = M[3] * x + M[7] * y + M[11] * z + M[15];
      return [((M[0] * x + M[4] * y + M[8] * z + M[12]) / w * .5 + .5) * W, (1 - ((M[1] * x + M[5] * y + M[9] * z + M[13]) / w * .5 + .5)) * H];
    }
    function draw(now) {
      raf = 0; if (!t0) t0 = now; var t = now - t0;
      px += (tx - px) * .06; py += (ty - py) * .06;
      var drift = t > 4600 ? Math.sin((t - 4600) / 2200) * .25 : 0, a = W / H, sh = a > 1.3 ? shift : 0, dist = Math.max(14.2, (a < 1.3 ? 18.5 : 23.5) / a) * (sh ? 1.7 : 1);   // phones: crop the edges slightly rather than shrink the scene
      M = mul(persp(30 * Math.PI / 180, a, .5, 60), look(.9 + px * 2.2 + drift - sh, 4.6 - py * 1.2, dist, .15 - sh, -.35, -2.4));   // elevated, slightly oblique: the four engines read as depth
      var R = ease((t - 150) / 2300), BG = ease((t - 900) / 1500), C = ease((t - 2600) / 700), G = clamp((t - 3350) / 520);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i], r = 1, al = 1, sc = 1;
        if (o.k === 'front' || o.k === 'dots' || o.k === 'piv') r = R;
        else if (o.k === 'bg') { r = R; al = BG; } else if (o.k === 'zero') r = R; else if (o.k === 'conn') r = C;
        else if (o.k === 'gold') { r = 1; al = G; } else if (o.k === 'lock') { r = G > 0 ? 1 : -1; sc = snap(G); }
        if (al <= 0 || r < 0) continue;
        gl.useProgram(o.p); gl.bindBuffer(gl.ARRAY_BUFFER, o.b);
        var aP = gl.getAttribLocation(o.p, 'aP'), aT = gl.getAttribLocation(o.p, 'aT');
        gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(aT); gl.vertexAttribPointer(aT, 1, gl.FLOAT, false, 16, 12);
        gl.uniformMatrix4fv(gl.getUniformLocation(o.p, 'uM'), false, M);
        gl.uniform4f(gl.getUniformLocation(o.p, 'uC'), o.c[0], o.c[1], o.c[2], o.c[3] * al);
        gl.uniform1f(gl.getUniformLocation(o.p, 'uR'), o.k === 'conn' ? r : r + .0001);
        if (o.p === LP) gl.uniform1f(gl.getUniformLocation(o.p, 'uDash'), o.dash || 0);
        else { gl.uniform1f(gl.getUniformLocation(o.p, 'uS'), o.s * dpr * sc); gl.uniform1f(gl.getUniformLocation(o.p, 'uK'), o.kind); }
        gl.drawArrays(o.mode, 0, o.count);
      }
      var on = { lane: R > .02, macd: R > .1, p1: R >= tP1, p2: R >= tP2, rd: G > .6, conf: G > .6, delay: G > .6 };
      for (var k in tags) {
        var q = project(anchors[k]), hw = tags[k].offsetWidth / 2 + 8;            // keep every label inside the frame on narrow screens
        q[0] = Math.min(Math.max(q[0], hw), W - hw); q[1] = Math.min(Math.max(q[1], 14), H - 14);
        tags[k].style.transform = 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px) translate(-50%,-50%)'; tags[k].classList.toggle('on', !!on[k]); }
      if (!live) { live = true; box.classList.add('is-live'); }
      var settling = t < 4600 || Math.abs(tx - px) > .002 || Math.abs(ty - py) > .002;
      if (visible && !document.hidden && (settling || !low)) raf = requestAnimationFrame(draw);   // weak devices stop after the intro; pointer moves restart it
    }
    function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw); }
    size(); kick();
  }
})();
