/* Settings + Devices views */
(function () {
  // ---------------------------------------------------------------- settings
  async function loadSettings() {
    const s = await api('/admin/settings');
    $('#sCafeName').value = s.cafe_name; $('#sDefaultLang').value = s.default_lang || 'fr';
    $('#sAskName').checked = s.ask_customer_name !== false; $('#sAskService').checked = s.ask_service_type !== false;
    $('#sThankYou').value = s.thank_you_seconds ?? 12; $('#sNumbering').value = s.order_number_reset || 'daily';
    $('#sGst').value = s.tax_gst; $('#sQst').value = s.tax_qst;
    $('#sSound').value = s.sound || 'chime'; $('#sVolume').value = s.sound_volume ?? 1; $('#sRepeat').checked = s.repeat_alert !== false;
    $('#sPin').value = ''; $('#sPin2').value = '';
    $('#sLogoPrev').src = s.logo_url || '/shared/logo-mark.png'; $('#sWelcomePrev').src = s.welcome_image ? `/img/320/${s.welcome_image.split('/').pop()}` : '/shared/logo-mark.png';
    // printer
    $('#pEnabled').checked = !!s.print_enabled; $('#pMode').value = s.print_mode || 'windows'; $('#pHost').value = s.print_host || ''; $('#pPort').value = s.print_port || 9100;
    $('#pCmd').value = s.print_cmd || 'star'; $('#pWidth').value = s.print_width || 42; $('#pMargin').value = s.print_left_margin ?? 3; $('#pCopies').value = s.print_copies || 1;
    $('#pPrices').checked = s.print_prices !== false; $('#pCut').checked = s.print_cut !== false; $('#pFooter').value = s.print_footer || '';
    $('#pAgentPrinter').value = s.print_mode === 'agent' ? (s.print_printer_name || '') : '';
    togglePrinterBoxes(); loadPrinters(s.print_printer_name); loadAgentToken();
    loadAudit();
  }
  async function loadAudit() {
    const rows = await api('/admin/audit?limit=100').catch(() => []);
    $('#auditTable tbody').innerHTML = rows.map(r => `<tr><td class="muted">${fmtDateTime(r.at)}</td><td><b>${esc(r.action)}</b></td><td>${esc(r.detail)}</td></tr>`).join('');
  }
  $('#settingsSave').addEventListener('click', async () => {
    const patch = {
      cafe_name: $('#sCafeName').value.trim() || "L'Artisan", default_lang: $('#sDefaultLang').value,
      ask_customer_name: $('#sAskName').checked, ask_service_type: $('#sAskService').checked,
      thank_you_seconds: Number($('#sThankYou').value) || 12, order_number_reset: $('#sNumbering').value,
      tax_gst: Number($('#sGst').value), tax_qst: Number($('#sQst').value),
      sound: $('#sSound').value, sound_volume: Number($('#sVolume').value), repeat_alert: $('#sRepeat').checked,
      ...printerPatch(),
    };
    const p1 = $('#sPin').value.trim(), p2 = $('#sPin2').value.trim();
    if (p1 || p2) { if (p1 !== p2) return toast(t('settings.pinMismatch'), 'err'); patch.pin = p1; }
    try { await api('/admin/settings', { method: 'PUT', body: patch }); toast(t('settings.saved'), 'ok'); loadSettings(); }
    catch (e) { toast(e.message, 'err'); }
  });
  // ---- receipt printer
  function printerPatch() {
    const mode = $('#pMode').value;
    return { print_enabled: $('#pEnabled').checked, print_mode: mode, print_printer_name: mode === 'agent' ? $('#pAgentPrinter').value.trim() : ($('#pName').value || ''), print_host: $('#pHost').value.trim(),
      print_port: Number($('#pPort').value) || 9100, print_cmd: $('#pCmd').value, print_width: Number($('#pWidth').value) || 42, print_left_margin: Math.max(0, Math.min(8, Number($('#pMargin').value) || 0)), print_copies: Number($('#pCopies').value) || 1,
      print_prices: $('#pPrices').checked, print_cut: $('#pCut').checked, print_footer: $('#pFooter').value };
  }
  function togglePrinterBoxes() { const m = $('#pMode').value; $('#pWinBox').classList.toggle('hidden', m !== 'windows'); $('#pNetBox').classList.toggle('hidden', m !== 'network'); $('#pAgentBox').classList.toggle('hidden', m !== 'agent'); }
  // ---- print agent (server hosted online, printer on the café laptop)
  function renderAgents(agents) {
    $('#pAgents').innerHTML = agents && agents.length ? agents.map(a => `<span class="online">● ${t('settings.agentOnline', { n: esc(a.name) })}</span>${a.printers?.length ? ` <span class="muted">(${a.printers.map(esc).join(', ')})</span>` : ''}`).join('<br>') : `<span class="offline">○ ${t('settings.agentOffline')}</span>`;
    if (agents && agents.length && !$('#pAgentPrinter').value) { const star = agents[0].printers?.find(n => /star|tsp/i.test(n)); if (star) $('#pAgentPrinter').value = star; }
  }
  async function loadAgentToken() {
    try { const r = await api('/admin/print/agent-token'); $('#pToken').textContent = r.token || '-'; renderAgents(r.agents); } catch {}
  }
  $('#pTokenNew').addEventListener('click', async () => {
    if ($('#pToken').textContent !== '-' && !(await confirmDialog(t('settings.agentTokenConfirm'), { danger: true }))) return;
    try { const r = await api('/admin/print/agent-token', { method: 'POST' }); $('#pToken').textContent = r.token; toast(t('settings.agentTokenDone'), 'ok'); } catch (e) { toast(e.message, 'err'); }
  });
  $('#pTokenCopy').addEventListener('click', () => { navigator.clipboard?.writeText($('#pToken').textContent).then(() => toast(t('settings.copied'), 'ok')).catch(() => {}); });
  document.addEventListener('ws', e => { if (e.detail.type === 'print_agents' && currentView() === 'settings') renderAgents(e.detail.agents); });
  $('#pMode').addEventListener('change', togglePrinterBoxes);
  async function loadPrinters(selected) {
    const sel = $('#pName'); sel.innerHTML = '';
    try {
      const r = await api('/admin/printers');
      const names = r.printers || [];
      if (selected && !names.includes(selected)) names.unshift(selected);
      if (!names.length) sel.innerHTML = `<option value="">${t('settings.noPrinters')}</option>`;
      names.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; if (n === selected) o.selected = true; sel.appendChild(o); });
      // preselect a Star printer if nothing chosen yet
      if (!selected) { const star = names.find(n => /star|tsp/i.test(n)); if (star) sel.value = star; }
    } catch (e) { sel.innerHTML = `<option value="">${esc(e.message)}</option>`; }
  }
  $('#pRefresh').addEventListener('click', () => loadPrinters($('#pName').value));
  $('#pTest').addEventListener('click', async () => {
    $('#pTest').disabled = true;
    try { await api('/admin/print/test', { method: 'POST', body: printerPatch() }); toast(t('settings.printTestOk'), 'ok'); }
    catch (e) { toast(e.message, 'err'); }
    $('#pTest').disabled = false;
  });

  // ---- logo: upload (PNG with transparency recommended), saved immediately and pushed to tablets
  async function saveLogo(url) {
    try { await api('/admin/settings', { method: 'PUT', body: { logo_url: url } }); $('#sLogoPrev').src = url; applyLogo(url); toast(t('settings.logoSaved'), 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
  $('#logoUp').addEventListener('click', () => { $('#imageFile').onchange = async () => {
    const f = $('#imageFile').files[0]; if (!f) return;
    const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
    if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(data)) return toast('PNG / JPEG / WebP', 'err');
    try { const r = await api('/admin/upload', { method: 'POST', body: { data, name: 'logo' } }); await saveLogo(r.url); } catch (e) { toast(e.message, 'err'); }
    $('#imageFile').value = '';
  }; $('#imageFile').click(); });
  $('#logoReset').addEventListener('click', () => saveLogo('/shared/logo-mark.png'));
  // ---- welcome page photo (counter / tablets), saved immediately and pushed to the screens
  async function saveWelcome(url) {
    try { await api('/admin/settings', { method: 'PUT', body: { welcome_image: url } }); $('#sWelcomePrev').src = url ? (url.startsWith('/uploads/') ? `/img/320/${url.split('/').pop()}` : url) : '/shared/logo-mark.png'; toast(t('common.saved'), 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
  $('#welcomeUp').addEventListener('click', () => { $('#imageFile').onchange = async () => {
    const f = $('#imageFile').files[0]; if (!f) return;
    const data = await new Promise(res => { const img = new Image(); const u = URL.createObjectURL(f); img.onload = () => { const sc = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.86)); }; img.src = u; });
    try { const r = await api('/admin/upload', { method: 'POST', body: { data, name: 'accueil' } }); await saveWelcome(r.url); } catch (e) { toast(e.message, 'err'); }
    $('#imageFile').value = '';
  }; $('#imageFile').click(); });
  $('#welcomeUrl').addEventListener('click', async () => { const url = prompt(t('ed.urlPrompt'), ''); if (!url) return; try { const r = await api('/admin/images/import', { method: 'POST', body: { url, name: 'accueil' } }); await saveWelcome(r.url); } catch (e) { toast(e.message, 'err'); } });
  $('#welcomeReset').addEventListener('click', () => saveWelcome(''));
  function applyLogo(url) { document.querySelectorAll('.brand img').forEach(i => i.src = url); }
  window.applyLogo = applyLogo;
  $('#soundTest').addEventListener('click', () => {
    const a = $('#alertAudio'); a.src = 'sounds/' + $('#sSound').value + '.wav'; a.volume = Number($('#sVolume').value); a.play().catch(() => {});
  });
  $('#backupBtn').addEventListener('click', async () => { try { const r = await api('/admin/backup', { method: 'POST' }); toast(t('settings.backupDone', { f: r.file }), 'ok'); loadAudit(); } catch (e) { toast(e.message, 'err'); } });

  // ---------------------------------------------------------------- devices
  async function loadDevices() {
    try {
      const [net, devs, s] = await Promise.all([api('/admin/network'), api('/admin/devices'), api('/admin/settings')]);
      // Hosted online (Railway): the public address is what tablets must use. On a local laptop: the Wi-Fi addresses.
      const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
      const urls = [...new Set([s.public_url || '', local ? '' : location.origin, ...(local ? net.urls : [])].filter(Boolean))];
      $('#netUrls').innerHTML = urls.map(u => `<div class="url-big">${esc(u)}</div>`).join('') + `<p class="muted">${t('devices.webHint')} <b>${esc(urls[0] || '')}/tablette</b></p>`;
      renderDevices(devs, net);
    } catch (e) { toast(e.message, 'err'); }
  }
  function renderDevices(devs, net) {
    const mv = window.currentMenuVersion;
    $('#devTable tbody').innerHTML = devs.length ? devs.map(d => `<tr><td><b>${esc(d.name || d.id)}</b><br><span class="muted" style="font-size:12px">${esc(d.id)}${d.app_version ? ' · v' + esc(d.app_version) : ''}</span></td>
      <td class="${d.online ? 'online' : 'offline'}">${d.online ? '● ' + t('devices.online') : '○ ' + t('devices.offline')}</td>
      <td>${d.menu_version ?? '-'} ${mv && d.menu_version && d.menu_version < mv ? `<span class="pill warn">${t('devices.outdated')}</span>` : ''}</td>
      <td>${d.last_seen ? fmtDateTime(d.last_seen) : '-'}</td></tr>`).join('') : `<tr><td colspan="4" class="muted">${t('devices.none')}</td></tr>`;
  }
  // ---- tablet app (APK) : upload once, then tablets install it from /app (link + QR code)
  async function loadApk() {
    try {
      const r = await api('/app/info');
      const info = r.app; const url = r.url;
      $('#apkDownload').classList.toggle('hidden', !info); $('#apkPage').classList.toggle('hidden', !info); $('#apkPage').href = url;
      $('#apkInfo').textContent = info ? t('devices.appInfo', { v: info.version || '-', s: (info.size / 1048576).toFixed(1), d: fmtDateTime(info.uploaded_at), n: info.name }) : t('devices.appNone');
      const qr = $('#apkQr'); qr.innerHTML = '';
      if (info && window.qrcode) {
        const q = qrcode(0, 'M'); q.addData(url); q.make();
        qr.innerHTML = `<div style="background:#fff;padding:8px;border:1px solid var(--line);border-radius:12px">${q.createSvgTag({ cellSize: 4, margin: 0 })}</div><div><div class="muted" style="font-size:13px">${t('devices.appScan')}</div><div class="url-big small">${esc(url)}</div></div>`;
      }
    } catch (e) { $('#apkInfo').textContent = e.message; }
  }
  $('#apkUpload').addEventListener('click', () => { $('#apkFile').onchange = () => {
    const f = $('#apkFile').files[0]; if (!f) return;
    const version = prompt(t('devices.appVersionPrompt'), (f.name.match(/\d+(\.\d+)+/) || [''])[0]) ?? ''; 
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/app/apk?version=${encodeURIComponent(version)}&name=${encodeURIComponent(f.name)}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    const prog = $('#apkProgress'); prog.classList.remove('hidden');
    xhr.upload.onprogress = e => { if (e.lengthComputable) prog.textContent = t('devices.appUploading', { p: Math.round(e.loaded / e.total * 100) }); };
    xhr.onload = () => { prog.classList.add('hidden'); if (xhr.status === 200) { toast(t('devices.appUploaded'), 'ok'); loadApk(); } else { let m = xhr.statusText; try { m = JSON.parse(xhr.responseText).error; } catch {} toast(m, 'err'); } };
    xhr.onerror = () => { prog.classList.add('hidden'); toast(t('common.error'), 'err'); };
    xhr.send(f); $('#apkFile').value = '';
  }; $('#apkFile').click(); });
  $('#devRefresh').addEventListener('click', loadDevices);
  document.addEventListener('ws', e => { if (e.detail.type === 'devices' && currentView() === 'devices') renderDevices(e.detail.devices); if (e.detail.type === 'menu_updated') window.currentMenuVersion = e.detail.version; if (e.detail.type === 'welcome') window.currentMenuVersion = e.detail.menu_version; });
  document.addEventListener('view', e => { if (e.detail === 'settings') loadSettings(); if (e.detail === 'devices') { loadDevices(); loadApk(); } });
})();
