/* Live orders ("café mode") + order history */
(function () {
  let orders = new Map();      // id -> order (active only)
  let cafeOpen = localStorage.getItem('cafe_open') === '1';
  let devicesOnline = 0, todayCount = 0;
  let repeatTimer = null, ageTimer = null;
  const audio = $('#alertAudio');

  // ---------------------------------------------------------------- audio
  function soundUrl() { const s = window.publicSettingsCache || {}; return 'sounds/' + (s.sound || 'chime') + '.wav'; }
  window.playAlert = async function () {
    const s = window.publicSettingsCache || {};
    audio.src = soundUrl(); audio.volume = s.sound_volume ?? 1;
    try { await audio.play(); } catch (e) { console.warn('audio blocked', e); }
  };
  function scheduleRepeat() {
    clearInterval(repeatTimer);
    repeatTimer = setInterval(() => {
      const s = window.publicSettingsCache || {};
      if (!cafeOpen || s.repeat_alert === false) return;
      if ([...orders.values()].some(o => o.status === 'new')) playAlert();
    }, 20000);
  }

  // ---------------------------------------------------------------- café mode
  // Opening / closing the café here also opens / closes ONLINE ordering: the website refuses orders while the café is closed
  // (server setting temporarily_closed). Tablets and the counter page (/local) keep working.
  async function setCafe(open, { remote = false } = {}) {
    if (remote) { try { await api('/admin/settings', { method: 'PUT', body: { temporarily_closed: !open } }); toast(t(open ? 'live.siteOpened' : 'live.siteClosed'), open ? 'ok' : ''); } catch (e) { toast(e.message, 'err'); } }
    cafeOpen = open; localStorage.setItem('cafe_open', open ? '1' : '0');
    $('#openCafeBtn').classList.toggle('hidden', open);
    $('#closeCafeBtn').classList.toggle('hidden', !open);
    $('#cafeClosedNote').classList.toggle('hidden', open);
    $('#kanban').classList.toggle('hidden', !open);
    if (open) { playAlert().then(() => { audio.pause(); audio.currentTime = 0; }); scheduleRepeat(); }
    else clearInterval(repeatTimer);
  }
  $('#openCafeBtn').addEventListener('click', () => setCafe(true, { remote: true }));
  $('#closeCafeBtn').addEventListener('click', () => setCafe(false, { remote: true }));
  $('#fullscreenBtn').addEventListener('click', () => {
    document.body.classList.toggle('fullscreen');
    if (document.body.classList.contains('fullscreen')) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('fullscreen'); });

  // ---------------------------------------------------------------- rendering
  function lineHtml(l) {
    const opts = l.options.map(o => esc(o.name) + (o.price ? ` <span class="muted">(+${money(o.price)})</span>` : '')).join(', ');
    return `<li><span class="q">${l.qty}×</span> <b>${esc(l.name)}</b>${l.variant_name ? ' · ' + esc(l.variant_name) : ''} <span class="muted">${money(l.line_total)}</span>
      ${opts ? `<div class="opts">${opts}</div>` : ''}${l.note ? `<div class="lnote">✎ ${esc(l.note)}</div>` : ''}</li>`;
  }
  function ageOf(o) {
    const m = Math.floor((Date.now() - new Date(o.created_at)) / 60000);
    return m < 1 ? '<1 min' : m + ' min';
  }
  function cardHtml(o) {
    const actions = {
      new: `<button class="primary" data-act="preparing">${t('live.start')}</button><button class="ghost danger-text" data-act="cancelled">${t('live.cancel')}</button>`,
      preparing: `<button class="primary" data-act="ready">${t('live.ready')}</button><button class="ghost danger-text" data-act="cancelled">${t('live.cancel')}</button>`,
      ready: `<button class="primary" data-act="completed">${t('live.done')} ➜</button>`,
    }[o.status] || '';
    const printBtn = `<button class="ghost" data-print="${o.id}" title="${t('live.print')}">🖨</button>`;
    const online = o.source === 'online';
    const payBtn = online && o.payment_status !== 'paid' ? `<button class="ghost small" data-pay="${o.id}" title="${t('live.markPaid')}">💵 ${t('live.markPaid')}</button>` : '';
    return `<div class="order st-${o.status} ${online ? 'online' : ''}" data-id="${o.id}">
      <div class="order-head">
        <div class="order-num">#${o.number}</div>
        <div class="order-meta"><b>${esc(o.customer_name || t('live.noName'))}</b>${online ? ` <span class="pill online">🌐 ${t('live.online')}</span>` : ''}<br>
          <span class="service-tag">${o.service_type === 'takeout' ? t('live.takeout') : t('live.dineIn')}</span> · ${fmtTime(o.created_at)} · <span class="age ${ageMinutes(o) >= 15 ? 'late' : ''}">${ageOf(o)}</span>
          ${online ? `<br><span class="pickup-tag">🕒 ${t('live.pickup')} <b>${esc(fmtPickup(o.pickup_time))}</b></span> · <span class="${o.payment_status === 'paid' ? 'paid' : 'unpaid'}">${o.payment_status === 'paid' ? t('live.paid') : t('live.unpaid')}</span>${o.customer_phone ? `<br><a href="tel:${esc(o.customer_phone)}" class="muted">📞 ${esc(o.customer_phone)}</a>` : ''}` : ''}
          ${o.device_name && !online ? `<br><span class="muted">${esc(o.device_name)}</span>` : ''}</div>
      </div>
      <ul class="order-lines">${o.lines.map(lineHtml).join('')}</ul>
      ${o.note ? `<div class="order-note">✎ ${esc(o.note)}</div>` : ''}
      <div class="order-foot"><div class="order-total">${money(o.total)}${o.tip ? `<small class="muted"> (${t('live.tip')} ${money(o.tip)})</small>` : ''}</div><div class="order-actions">${payBtn}${printBtn}${actions}</div></div>
    </div>`;
  }
  const ageMinutes = o => Math.floor((Date.now() - new Date(o.created_at)) / 60000);
  function fmtPickup(hhmm) { if (!hhmm) return '-'; const [h, m] = hhmm.split(':').map(Number); return getLang() === 'en' ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` : `${h} h ${String(m).padStart(2, '0')}`; }
  window.fmtPickup = fmtPickup;

  // Incremental rendering: a card is (re)built only when its order changed; otherwise only the
  // "x min" counter is refreshed in place. Nothing flickers when tablets ping or the timer ticks.
  const cardEls = new Map();   // order id -> { el, key }
  function render() {
    const cols = { new: [], preparing: [], ready: [] };
    [...orders.values()].sort((a, b) => a.id - b.id).forEach(o => { if (cols[o.status]) cols[o.status].push(o); });
    const lang = getLang();
    for (const st of Object.keys(cols)) {
      const col = $('#col-' + st);
      const list = cols[st];
      if (!list.length) {
        if (!col.querySelector('.empty-col')) col.innerHTML = `<div class="muted empty-col" style="text-align:center;padding:20px">${t('live.empty')}</div>`;
      } else {
        col.querySelector('.empty-col')?.remove();
        list.forEach((o, i) => {
          const key = `${o.status}|${o.updated_at}|${lang}`;
          let rec = cardEls.get(o.id);
          if (!rec || rec.key !== key) {
            const tpl = document.createElement('div'); tpl.innerHTML = cardHtml(o);
            const el = tpl.firstElementChild;
            if (rec) { rec.el.replaceWith(el); el.classList.add('no-anim'); } else el.classList.add('enter');
            rec = { el, key }; cardEls.set(o.id, rec);
          } else {
            const age = rec.el.querySelector('.age');
            if (age) { age.textContent = ageOf(o); age.classList.toggle('late', ageMinutes(o) >= 15); }
          }
          if (col.children[i] !== rec.el) col.insertBefore(rec.el, col.children[i] || null);
        });
        while (col.children.length > list.length) col.lastElementChild.remove();
      }
      $('#cnt-' + st).textContent = list.length;
    }
    for (const [id, rec] of cardEls) if (!orders.has(id)) { rec.el.remove(); cardEls.delete(id); }
    const n = orders.size;
    $('#liveBadge').textContent = cols.new.length; $('#liveBadge').classList.toggle('zero', !cols.new.length);
    $('#liveSummary').textContent = t('live.summary', { n, t: todayCount, d: devicesOnline });
    document.title = (cols.new.length ? `(${cols.new.length}) ` : '') + ($('#brandName').textContent || "L'Artisan") + ' · Admin';
  }
  // language change must rebuild all cards
  document.addEventListener('langchange', () => { cardEls.clear(); $$('#kanban .cards').forEach(c => c.innerHTML = ''); render(); });
  $('#kanban').addEventListener('click', async e => {
    const pb = e.target.closest('button[data-print]');
    if (pb) { pb.disabled = true; const o = orders.get(Number(pb.dataset.print)); try { await api(`/admin/orders/${pb.dataset.print}/print`, { method: 'POST' }); toast(t('live.printed', { n: o?.number }), 'ok'); } catch (err) { toast(err.message, 'err'); } pb.disabled = false; return; }
    const payb = e.target.closest('button[data-pay]');
    if (payb) { payb.disabled = true; try { applyOrder(await api(`/admin/orders/${payb.dataset.pay}/payment`, { method: 'PATCH', body: { paid: true } })); toast(t('live.paidOk'), 'ok'); } catch (err) { toast(err.message, 'err'); payb.disabled = false; } return; }
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const card = b.closest('.order'); const id = Number(card.dataset.id); const act = b.dataset.act;
    const o = orders.get(id);
    if (act === 'cancelled' && !(await confirmDialog(t('live.cancelConfirm', { n: o.number }), { danger: true }))) return;
    b.disabled = true;
    try {
      const updated = await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: act } });
      applyOrder(updated, { animateFrom: card });
    } catch (err) { toast(err.message, 'err'); b.disabled = false; }
  });

  function applyOrder(o, { animateFrom } = {}) {
    const active = ['new', 'preparing', 'ready'].includes(o.status);
    if (active) orders.set(o.id, o); else orders.delete(o.id);
    if (!active && animateFrom) { animateFrom.classList.add('leaving'); setTimeout(render, 280); } else render();
  }

  // ---------------------------------------------------------------- data
  async function refresh() {
    try {
      const [list, sum] = await Promise.all([api('/admin/orders?status=active'), api('/admin/summary')]);
      orders = new Map(list.map(o => [o.id, o]));
      todayCount = sum.today.orders + sum.active; devicesOnline = sum.devices;
      render();
    } catch (e) { console.warn(e); }
  }
  document.addEventListener('ws', e => {
    const m = e.detail;
    if (m.type === 'new_order') {
      orders.set(m.order.id, m.order); todayCount++; render();
      if (cafeOpen) { playAlert(); toast(t('live.newOrder', { n: m.order.number }), 'ok'); }
    } else if (m.type === 'order_updated') {
      applyOrder(m.order);
    } else if (m.type === 'print_error') {
      toast(t('live.printError', { n: m.order_number, e: m.error }), 'err');
    } else if (m.type === 'settings_updated') {
      const open = !m.settings.temporarily_closed; if (open !== cafeOpen) setCafe(open);
    } else if (m.type === 'devices') {
      devicesOnline = m.devices.filter(d => d.online).length;
      $('#liveSummary').textContent = t('live.summary', { n: orders.size, t: todayCount, d: devicesOnline });
    }
  });
  document.addEventListener('ws-open', refresh);
  document.addEventListener('app-start', async () => { try { const s = await api('/settings/public'); cafeOpen = !s.temporarily_closed; } catch {} setCafe(cafeOpen); refresh(); clearInterval(ageTimer); ageTimer = setInterval(() => { if (currentView() === 'live') render(); }, 30000); });
  document.addEventListener('app-stop', () => { clearInterval(ageTimer); clearInterval(repeatTimer); });
  document.addEventListener('view', e => { if (e.detail === 'live') refresh(); if (e.detail === 'history') loadHistory(); });

  // ---------------------------------------------------------------- history
  $('#histFrom').value = today(); $('#histTo').value = today();
  async function loadHistory() {
    const from = $('#histFrom').value, to = $('#histTo').value, status = $('#histStatus').value;
    const rows = await api(`/admin/orders?from=${from}&to=${to}${status ? '&status=' + status : ''}&limit=1000`).catch(() => []);
    const tb = $('#histTable tbody');
    tb.innerHTML = rows.length ? rows.map(o => `<tr data-id="${o.id}">
      <td><b>#${o.number}</b></td><td>${fmtDateTime(o.created_at)}</td><td>${esc(o.customer_name || '-')}</td>
      <td>${o.source === 'online' ? '🌐 ' + t('live.online') + (o.pickup_time ? ' · ' + esc(fmtPickup(o.pickup_time)) : '') + (o.payment_status === 'paid' ? ' · ✓' : '') : (o.service_type === 'takeout' ? t('live.takeout') : t('live.dineIn'))}</td>
      <td>${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join(', ')}</td><td><b>${money(o.total)}</b></td>
      <td><span class="status-tag ${o.status}">${t('st.' + o.status)}</span></td>
      <td><button class="small ghost" data-view-order="${o.id}">${t('history.view')}</button></td></tr>`).join('')
      : `<tr><td colspan="8" class="muted">${t('history.none')}</td></tr>`;
    tb.onclick = async e => {
      const b = e.target.closest('[data-view-order]'); if (!b) return;
      const o = rows.find(x => x.id === Number(b.dataset.viewOrder));
      modal(`<h2>#${o.number} · ${esc(o.customer_name || t('live.noName'))}</h2>
        <p class="muted">${fmtDateTime(o.created_at)} · ${o.service_type === 'takeout' ? t('live.takeout') : t('live.dineIn')} · ${o.source === 'online' ? '🌐 ' + t('live.online') : esc(o.device_name || '')} · <span class="status-tag ${o.status}">${t('st.' + o.status)}</span></p>
        ${o.source === 'online' ? `<p>🕒 ${t('live.pickup')} <b>${esc(fmtPickup(o.pickup_time))}</b> · ${o.payment_status === 'paid' ? t('live.paid') + (o.payment_method ? ' (' + esc(o.payment_method) + ')' : '') : t('live.unpaid')}${o.customer_phone ? ` · 📞 ${esc(o.customer_phone)}` : ''}${o.customer_email ? ` · ✉️ ${esc(o.customer_email)}` : ''}</p>` : ''}
        <ul class="order-lines">${o.lines.map(lineHtml).join('')}</ul>${o.note ? `<div class="order-note">✎ ${esc(o.note)}</div>` : ''}
        <table class="table"><tr><td>Sous-total / Subtotal</td><td style="text-align:right">${money(o.subtotal)}</td></tr>
        <tr><td>TPS / GST</td><td style="text-align:right">${money(o.tax_gst)}</td></tr><tr><td>TVQ / QST</td><td style="text-align:right">${money(o.tax_qst)}</td></tr>${o.tip ? `<tr><td>${t('live.tip')}</td><td style="text-align:right">${money(o.tip)}</td></tr>` : ''}
        <tr><td><b>Total</b></td><td style="text-align:right"><b>${money(o.total)}</b></td></tr></table>
        <div class="modal-actions">${['completed', 'cancelled'].includes(o.status) ? `<button class="ghost" id="reopenBtn">${t('history.reopen')}</button>` : ''}<button class="ghost" id="ticketBtn" title="${t('live.print')}">🖨 ${t('live.print')}</button><button class="primary" onclick="closeModal()">${t('common.close')}</button></div>`);
      $('#ticketBtn')?.addEventListener('click', async () => { try { await api(`/admin/orders/${o.id}/print`, { method: 'POST' }); toast(t('live.printed', { n: o.number }), 'ok'); } catch (err) { toast(err.message, 'err'); } });
      $('#reopenBtn')?.addEventListener('click', async () => { await api(`/admin/orders/${o.id}/status`, { method: 'PATCH', body: { status: 'new' } }); closeModal(); loadHistory(); refresh(); });
    };
  }
  $('#histRefresh').addEventListener('click', loadHistory);
  ['histFrom', 'histTo', 'histStatus'].forEach(id => $('#' + id).addEventListener('change', loadHistory));
  $('#histCsv').addEventListener('click', () => { location.href = `/api/admin/orders.csv?from=${$('#histFrom').value}&to=${$('#histTo').value}`; });
})();
