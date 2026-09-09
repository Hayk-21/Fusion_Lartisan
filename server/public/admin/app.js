/* Core: i18n, API helper, login, routing, WebSocket, toasts, modal. Views live in their own files. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  window.$ = $; window.$$ = $$;

  // ---------------------------------------------------------------- i18n
  let lang = localStorage.getItem('admin_lang') || 'fr';
  window.t = (key, vars = {}) => {
    let s = (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
    for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
    return s;
  };
  window.getLang = () => lang;
  window.tx = (obj) => obj ? (typeof obj === 'string' ? obj : ((lang === 'en' && obj.en) ? obj.en : (obj.fr || obj.en || ''))) : '';
  window.money = (n) => { const v = (Math.round((n || 0) * 100) / 100).toFixed(2); return lang === 'en' ? '$' + v : v.replace('.', ',') + ' $'; };
  window.fmtTime = (iso) => new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-CA' : 'fr-CA', { hour: '2-digit', minute: '2-digit' });
  window.fmtDateTime = (iso) => new Date(iso).toLocaleString(lang === 'en' ? 'en-CA' : 'fr-CA', { dateStyle: 'short', timeStyle: 'short' });
  window.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.today = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('.lang-switch button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  // mobile drawer
  document.getElementById('menuToggle')?.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
  document.querySelectorAll('.sidebar nav a').forEach(a => a.addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open')));
  window.setLang = (l) => { lang = l; localStorage.setItem('admin_lang', l); applyLang(); };
  $$('.lang-switch button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  // ---------------------------------------------------------------- API
  window.api = async (path, { method = 'GET', body, raw } = {}) => {
    const res = await fetch('/api' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401 && !path.startsWith('/admin/login')) { showLogin(); throw new Error('Not logged in'); }
    if (raw) return res;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
    return data;
  };

  // ---------------------------------------------------------------- toasts & modal
  window.toast = (msg, kind = '') => {
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg;
    $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3500);
  };
  window.modal = (html, { onOpen } = {}) => {
    $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden');
    if (onOpen) onOpen($('#modalBody'));
  };
  window.closeModal = () => $('#modal').classList.add('hidden');
  $('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });
  window.confirmDialog = (text, { danger = false } = {}) => new Promise(resolve => {
    modal(`<h2>${esc(text)}</h2><div class="modal-actions"><button id="mNo" class="ghost">${t('common.cancel')}</button><button id="mYes" class="${danger ? 'danger' : 'primary'}">${t('common.confirm')}</button></div>`);
    $('#mNo').onclick = () => { closeModal(); resolve(false); };
    $('#mYes').onclick = () => { closeModal(); resolve(true); };
  });

  // ---------------------------------------------------------------- login
  let pin = '';
  function renderPin() { $$('#pinDots span').forEach((s, i) => s.classList.toggle('on', i < pin.length)); }
  function showLogin() { $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); pin = ''; renderPin(); }
  function showApp() { $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); startApp(); }
  window.showLogin = showLogin;
  async function submitPin() {
    if (!pin) return;
    try {
      await api('/admin/login', { method: 'POST', body: { pin } });
      $('#loginError').textContent = ''; showApp();
    } catch (e) {
      $('#loginError').textContent = e.status === 429 ? t('login.tooMany', { s: e.data?.retry_in || 60 }) : t('login.wrong');
      pin = ''; renderPin();
    }
  }
  $('#pinPad').addEventListener('click', e => {
    const k = e.target.closest('button')?.dataset.k; if (!k) return;
    if (k === 'clear') pin = ''; else if (k === 'ok') return submitPin(); else if (pin.length < 8) pin += k;
    renderPin();
    if (pin.length === 4) setTimeout(submitPin, 120);
  });
  document.addEventListener('keydown', e => {
    if ($('#login').classList.contains('hidden')) return;
    if (/^\d$/.test(e.key) && pin.length < 8) { pin += e.key; renderPin(); if (pin.length === 4) setTimeout(submitPin, 120); }
    else if (e.key === 'Backspace') { pin = pin.slice(0, -1); renderPin(); }
    else if (e.key === 'Enter') submitPin();
  });
  $('#logoutBtn').addEventListener('click', async () => { await api('/admin/logout', { method: 'POST' }).catch(() => {}); stopApp(); showLogin(); });

  // ---------------------------------------------------------------- routing
  const views = ['live', 'history', 'menu', 'stats', 'site', 'devices', 'settings'];
  let current = null;
  window.currentView = () => current;
  function route() {
    const v = (location.hash || '#live').slice(1);
    const view = views.includes(v) ? v : 'live';
    if (current === 'menu' && view !== 'menu' && window.MenuEditor?.isDirty() && !confirm(t('menu.leave'))) { location.hash = '#menu'; return; }
    current = view;
    views.forEach(x => $('#view-' + x).classList.toggle('hidden', x !== view));
    $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    document.dispatchEvent(new CustomEvent('view', { detail: view }));
  }
  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------- websocket
  let ws = null, wsTimer = null, running = false;
  function connectWs() {
    if (!running) return;
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch { return scheduleReconnect(); }
    ws.onopen = () => { ws.send(JSON.stringify({ type: 'hello', role: 'admin' })); setConn(true); document.dispatchEvent(new CustomEvent('ws-open')); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch { return; } document.dispatchEvent(new CustomEvent('ws', { detail: m })); };
    ws.onclose = () => { setConn(false); scheduleReconnect(); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  function scheduleReconnect() { clearTimeout(wsTimer); if (running) wsTimer = setTimeout(connectWs, 2000); }
  function setConn(on) { const c = $('#connStatus'); c.classList.toggle('on', on); c.classList.toggle('off', !on); c.querySelector('span:last-child').textContent = on ? t('app.online') : t('app.offline'); }
  setInterval(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' })); }, 25000);

  async function startApp() {
    running = true; connectWs(); route();
    try { const s = await api('/settings/public'); $('#brandName').textContent = s.cafe_name; document.title = s.cafe_name + ' · Admin'; window.publicSettingsCache = s; if (s.logo_url) $('.brand img').src = s.logo_url; } catch {}
    document.dispatchEvent(new CustomEvent('app-start'));
  }
  function stopApp() { running = false; clearTimeout(wsTimer); try { ws && ws.close(); } catch {} document.dispatchEvent(new CustomEvent('app-stop')); }

  document.addEventListener('ws', e => { if (e.detail.type === 'settings_updated') { window.publicSettingsCache = e.detail.settings; $('#brandName').textContent = e.detail.settings.cafe_name; if (e.detail.settings.logo_url) $('.brand img').src = e.detail.settings.logo_url; } });

  // ---------------------------------------------------------------- boot
  applyLang();
  api('/admin/session').then(s => s.logged_in ? showApp() : showLogin()).catch(showLogin);
})();
