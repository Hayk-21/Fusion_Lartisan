/* Statistics view · KPIs + Chart.js charts */
(function () {
  const charts = {};
  const COLORS = ['#a05a4a', '#d9a66f', '#7a473a', '#c98a1b', '#1f8a5b', '#2f6fb3', '#b8657b', '#8a8a5c', '#5c7a8a', '#e0b8a8'];
  $('#statFrom').value = today(); $('#statTo').value = today();

  function preset(p) {
    const d = new Date();
    let from = today(), to = today();
    if (p === 'yesterday') { from = to = today(-1); }
    else if (p === '7') from = today(-6);
    else if (p === '30') from = today(-29);
    else if (p === 'month') from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    $('#statFrom').value = from; $('#statTo').value = to;
    $$('#statsPresets button').forEach(b => b.classList.toggle('active', b.dataset.preset === p));
    load();
  }
  $('#statsPresets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) preset(b.dataset.preset); });
  ['statFrom', 'statTo'].forEach(id => $('#' + id).addEventListener('change', () => { $$('#statsPresets button').forEach(b => b.classList.remove('active')); load(); }));
  $('#statsRefresh').addEventListener('click', load);
  $('#statsCsv').addEventListener('click', () => { location.href = `/api/admin/orders.csv?from=${$('#statFrom').value}&to=${$('#statTo').value}`; });

  function chart(id, cfg) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($('#' + id), cfg);
  }
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  async function load() {
    let s;
    try { s = await api(`/admin/stats?from=${$('#statFrom').value}&to=${$('#statTo').value}`); } catch (e) { toast(e.message, 'err'); return; }
    const k = s.totals;
    $('#kpis').innerHTML = [
      ['kpi.revenue', money(k.revenue)], ['kpi.orders', k.orders], ['kpi.avg', money(k.avg_ticket)], ['kpi.items', k.items_sold],
      ['kpi.subtotal', money(k.subtotal)], ['kpi.taxes', money(k.tax_gst + k.tax_qst)], ['kpi.cancelled', k.cancelled], ['kpi.prep', k.avg_prep_minutes ?? '-'], ['kpi.online', k.online_orders ?? 0], ['kpi.tips', money(k.tips || 0)],
    ].map(([l, v]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${t(l)}</div></div>`).join('');

    const en = getLang() === 'en';
    const dayLabel = d => new Date(d + 'T00:00:00').toLocaleDateString(en ? 'en-CA' : 'fr-CA', { day: 'numeric', month: 'short' });
    chart('chDay', { type: 'bar', data: { labels: s.by_day.map(d => dayLabel(d.day)), datasets: [{ data: s.by_day.map(d => d.revenue), backgroundColor: '#a05a4a', borderRadius: 6 }] },
      options: { ...base, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => money(c.raw) + ' · ' + s.by_day[c.dataIndex].orders + ' ' + t('stats.orders') } } }, scales: { y: { beginAtZero: true, ticks: { callback: v => money(v) } } } } });
    const firstBusy = s.by_hour.findIndex(h => h.orders > 0);
    const startHour = Math.min(6, firstBusy < 0 ? 6 : firstBusy);
    const hours = s.by_hour.filter(h => h.hour >= startHour && h.hour <= 23);
    chart('chHour', { type: 'bar', data: { labels: hours.map(h => h.hour + 'h'), datasets: [{ data: hours.map(h => h.orders), backgroundColor: '#d9a66f', borderRadius: 6 }] },
      options: { ...base, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    const top = s.top_items.slice(0, 10);
    chart('chItems', { type: 'bar', data: { labels: top.map(i => en ? i.name_en : i.name_fr), datasets: [{ data: top.map(i => i.qty), backgroundColor: '#7a473a', borderRadius: 6 }] },
      options: { ...base, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } });
    const menuCats = window.menuCatNames || {};
    chart('chCat', { type: 'doughnut', data: { labels: s.by_category.map(c => menuCats[c.category_id] || c.category_id), datasets: [{ data: s.by_category.map(c => c.revenue), backgroundColor: COLORS }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => ' ' + money(c.raw) } } } } });

    $('#topItemsTable tbody').innerHTML = s.top_items.map(i => `<tr><td>${esc(en ? i.name_en : i.name_fr)}</td><td>${i.qty}</td><td>${money(i.revenue)}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">-</td></tr>`;
    $('#serviceTable tbody').innerHTML =
      s.by_service.map(x => `<tr><td>${x.service_type === 'takeout' ? t('stats.takeout') : t('stats.dineIn')}</td><td>${x.orders} ${t('stats.orders')}</td><td>${money(x.revenue)}</td></tr>`).join('') +
      s.by_device.map(x => `<tr><td>${x.device === '__online__' ? '🌐 ' + t('stats.online') : '📱 ' + esc(x.device)}</td><td>${x.orders} ${t('stats.orders')}</td><td>${money(x.revenue)}</td></tr>`).join('');
  }

  async function loadCatNames() {
    try { const m = await api('/admin/menu'); window.menuCatNames = Object.fromEntries(m.categories.map(c => [c.id, tx(c.name)])); } catch {}
  }
  document.addEventListener('view', async e => { if (e.detail === 'stats') { await loadCatNames(); load(); } });
  document.addEventListener('langchange', () => { if (currentView() === 'stats') loadCatNames().then(load); });
})();
