/* BQL payment page — static, no secrets. On-chain checks use PUBLIC node APIs and are informative only:
   the order becomes PAID only after BQL's review (server/desk tool refuses a reused TXID). */
(function () {
  var C = JSON.parse(document.getElementById('paycfg').textContent), P = C.pub, T = C.t, W = P.w;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  // order number: created once per browser session, shown everywhere
  var oid = null; try { oid = sessionStorage.getItem('bql_order'); } catch (e) {}
  if (!oid) { var d = new Date(), r = ''; var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; var u = new Uint32Array(6); (window.crypto || window.msCrypto).getRandomValues(u); for (var i = 0; i < 6; i++) r += A[u[i] % A.length];
    oid = 'BQL-' + String(d.getUTCFullYear()).slice(2) + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2) + '-' + r; try { sessionStorage.setItem('bql_order', oid); } catch (e) {} }
  $$('[data-order]').forEach(function (e) { e.textContent = oid; });
  // method tabs
  var cur = ($('.pm.on') || {}).getAttribute ? $('.pm.on').getAttribute('data-m') : null;
  $$('.pm').forEach(function (b) { b.addEventListener('click', function () { $$('.pm').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    cur = b.getAttribute('data-m'); $$('.pane').forEach(function (p) { p.hidden = p.getAttribute('data-p') !== cur; }); }); });
  // copy
  $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-copy'), done = function () { var o = b.textContent; b.textContent = T.copied; b.classList.add('ok'); setTimeout(function () { b.textContent = o; b.classList.remove('ok'); }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, function () {}); else { var ta = document.createElement('textarea'); ta.value = v; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); } }); });
  // amounts: USDT exact; BTC/ETH from a public price API at page time (±2% accepted, final amount confirmed by BQL)
  var need = { USDT_TRC20: P.price, USDT_BEP20: P.price, BTC: null, ETH: null };
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd').then(function (r) { return r.json(); }).then(function (j) {
    if (j.bitcoin && W.BTC) { need.BTC = P.price / j.bitcoin.usd; $('[data-amt="BTC"]').textContent = need.BTC.toFixed(6) + ' BTC'; }
    if (j.ethereum && W.ETH) { need.ETH = P.price / j.ethereum.usd; $('[data-amt="ETH"]').textContent = need.ETH.toFixed(5) + ' ETH'; }
  }).catch(function () { ['BTC', 'ETH'].forEach(function (k) { var a = $('[data-amt="' + k + '"]'); if (a) { a.textContent = 'USD ' + P.price.toFixed(2); $('[data-amtnote="' + k + '"]').textContent = T.live; } }); });
  // ---- on-chain verification (public APIs, CORS-enabled)
  var USDT_TRON = 'a614f803b6fd780986a42c78ec9c7f77e6ded13c', USDT_BSC = '0x55d398326f99059ff775485246999027b3197955', TRANSFER = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  function rpc(url, method, params) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params }) }).then(function (r) { return r.json(); }).then(function (j) { return j.result; }); }
  function pad(a) { return '0x' + '0'.repeat(24) + a.toLowerCase().replace(/^0x/, ''); }
  var CHECK = {
    USDT_TRC20: function (tx) {
      return Promise.all([fetch('https://api.trongrid.io/wallet/gettransactioninfobyid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: tx }) }).then(function (r) { return r.json(); }),
                          fetch('https://api.trongrid.io/wallet/getnowblock', { method: 'POST' }).then(function (r) { return r.json(); })]).then(function (a) {
        var info = a[0], now = a[1]; if (!info || !info.id) return { nf: 1 };
        if (info.receipt && info.receipt.result && info.receipt.result !== 'SUCCESS') return { wrong: 1 };
        var amt = 0; (info.log || []).forEach(function (l) { if ((l.address || '').toLowerCase() === USDT_TRON && l.topics && l.topics[0] === TRANSFER && l.topics[2].slice(-40).toLowerCase() === P.tron_hex.toLowerCase()) amt += parseInt(l.data, 16) / 1e6; });
        var conf = now && now.block_header ? now.block_header.raw_data.number - info.blockNumber + 1 : 0; return amt ? { amt: amt, unit: 'USDT', conf: conf } : { wrong: 1 }; }); },
    USDT_BEP20: function (tx) {
      var u = 'https://bsc-rpc.publicnode.com'; return Promise.all([rpc(u, 'eth_getTransactionReceipt', [tx]), rpc(u, 'eth_blockNumber', [])]).then(function (a) {
        var rc = a[0]; if (!rc) return { nf: 1 }; if (rc.status !== '0x1') return { wrong: 1 }; var amt = 0;
        (rc.logs || []).forEach(function (l) { if (l.address.toLowerCase() === USDT_BSC && l.topics[0] === '0x' + TRANSFER && l.topics[2].toLowerCase() === pad(W.USDT_BEP20)) amt += parseInt(l.data, 16) / 1e18; });
        return amt ? { amt: amt, unit: 'USDT', conf: parseInt(a[1], 16) - parseInt(rc.blockNumber, 16) + 1 } : { wrong: 1 }; }); },
    ETH: function (tx) {
      var u = 'https://ethereum-rpc.publicnode.com'; return Promise.all([rpc(u, 'eth_getTransactionByHash', [tx]), rpc(u, 'eth_getTransactionReceipt', [tx]), rpc(u, 'eth_blockNumber', [])]).then(function (a) {
        var t = a[0], rc = a[1]; if (!t) return { nf: 1 }; if (!t.to || t.to.toLowerCase() !== W.ETH.toLowerCase()) return { wrong: 1 }; if (rc && rc.status !== '0x1') return { wrong: 1 };
        return { amt: parseInt(t.value, 16) / 1e18, unit: 'ETH', conf: rc ? parseInt(a[2], 16) - parseInt(rc.blockNumber, 16) + 1 : 0 }; }); },
    BTC: function (tx) {
      return Promise.all([fetch('https://blockstream.info/api/tx/' + tx).then(function (r) { return r.ok ? r.json() : null; }), fetch('https://blockstream.info/api/blocks/tip/height').then(function (r) { return r.text(); })]).then(function (a) {
        var t = a[0]; if (!t) return { nf: 1 }; var sat = 0; (t.vout || []).forEach(function (o) { if (o.scriptpubkey_address === W.BTC) sat += o.value; });
        if (!sat) return { wrong: 1 }; return { amt: sat / 1e8, unit: 'BTC', conf: t.status && t.status.confirmed ? parseInt(a[1], 10) - t.status.block_height + 1 : 0 }; }); }
  };
  var lastCheck = {};
  $$('[data-check]').forEach(function (b) { b.addEventListener('click', function () {
    var k = b.getAttribute('data-check'), tx = $('[data-tx="' + k + '"]').value.trim(), st = $('[data-vst="' + k + '"]');
    if (k !== 'BTC' && !/^(0x)?[0-9a-fA-F]{64}$/.test(tx) || k === 'BTC' && !/^[0-9a-fA-F]{64}$/.test(tx)) { st.className = 'vst bad'; st.textContent = T.st_nf; return; }
    if (k === 'USDT_TRC20') tx = tx.replace(/^0x/, '');
    var used = []; try { used = JSON.parse(localStorage.getItem('bql_tx') || '[]'); } catch (e) {}
    if (used.indexOf(tx.toLowerCase()) >= 0 && lastCheck[k] !== tx) { st.className = 'vst bad'; st.textContent = T.st_dup; }
    else { st.className = 'vst'; st.textContent = T.st_wait; }
    CHECK[k](tx).then(function (r) {
      if (r.nf) { st.className = 'vst bad'; st.textContent = T.st_nf; return; }
      if (r.wrong) { st.className = 'vst bad'; st.textContent = T.st_wrong; return; }
      var req = need[k], txt = r.amt.toFixed(r.unit === 'USDT' ? 2 : 6) + ' ' + r.unit;
      if (req && r.amt < req * (r.unit === 'USDT' ? 0.9999 : 0.98)) { st.className = 'vst bad'; st.textContent = T.st_low.replace('{amt}', txt); return; }
      st.className = 'vst ok'; st.textContent = T.st_ok.replace('{amt}', txt).replace('{conf}', Math.max(0, r.conf)); lastCheck[k] = tx;
      try { if (used.indexOf(tx.toLowerCase()) < 0) { used.push(tx.toLowerCase()); localStorage.setItem('bql_tx', JSON.stringify(used.slice(-50))); } } catch (e) {}
    }).catch(function () { st.className = 'vst bad'; st.textContent = T.st_err; });
  }); });
  // order email (customer's own mail app; nothing is sent from this page)
  function mailto(subject, lines) { return 'mailto:' + P.mail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n')); }
  function common() { return ['Order: ' + oid, 'Product: 3BAR ABI_PLUS licence (USD ' + P.price.toFixed(2) + ')', 'MT5 account: ' + ($('[data-mt5]').value || ''), 'Email: ' + ($('[data-email]').value || '')]; }
  var send = $('[data-send]'); if (send) send.addEventListener('click', function (e) {
    var k = cur || 'USDT_TRC20', tx = k === 'CARD' ? '' : ($('[data-tx="' + k + '"]') || {}).value || '';
    var lines = common().concat(['Method: ' + k, k === 'CARD' ? 'Tracking number: ' + (($('[data-ref]') || {}).value || '') : 'TXID: ' + tx, k === 'CARD' ? '(attach the receipt photo)' : 'Amount sent: ' + (($('[data-amt="' + k + '"]') || {}).textContent || '')]);
    send.setAttribute('href', mailto('BQL order ' + oid, lines)); });
  var mc = $('[data-mailcard]'); if (mc) mc.addEventListener('click', function () { mc.setAttribute('href', mailto('BQL card payment ' + oid, common().concat(['Method: CARD', 'Tracking number: ' + (($('[data-ref]') || {}).value || ''), '(attach the receipt photo)']))); });
})();
