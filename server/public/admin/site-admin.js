/* "Site web" view: café info, opening hours, online ordering, payment, Google reviews */
(function () {
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  let menuCache = null;

  function dayName(d) { return t('day.' + d); }
  function renderHoursGrid(hours) {
    const g = $('#hoursGrid');
    g.innerHTML = `<div class="h"></div><div class="h">${t('site.opens')}</div><div class="h">${t('site.closes')}</div><div class="h">${t('site.closedDay')}</div>` +
      DAYS.map(d => { const h = (hours || {})[d] || { open: '09:00', close: '19:30', closed: false }; return `<div><b>${dayName(d)}</b></div><input type="time" data-h="${d}" data-k="open" value="${h.open}"><input type="time" data-h="${d}" data-k="close" value="${h.close}"><input type="checkbox" data-h="${d}" data-k="closed" ${h.closed ? 'checked' : ''}>`; }).join('');
  }
  function readHours() {
    const out = {};
    for (const d of DAYS) out[d] = { open: $(`[data-h="${d}"][data-k="open"]`).value || '09:00', close: $(`[data-h="${d}"][data-k="close"]`).value || '19:30', closed: $(`[data-h="${d}"][data-k="closed"]`).checked };
    return out;
  }
  function renderFeatured(selected) {
    if (!menuCache) return;
    const lang = getLang();
    const nameOf = x => (x && typeof x === 'object') ? (x[lang] || x.fr || x.en || '') : (x || '');
    const cats = Object.fromEntries(menuCache.categories.map(c => [c.id, c]));
    const items = [...menuCache.items].sort((a, b) => (cats[a.category_id]?.sort ?? 0) - (cats[b.category_id]?.sort ?? 0));
    $('#featuredList').innerHTML = items.map(i => `<label><input type="checkbox" data-feat="${esc(i.id)}" ${selected.includes(i.id) ? 'checked' : ''}> ${esc(nameOf(i.name))} <span class="muted">· ${esc(nameOf(cats[i.category_id]?.name))}</span></label>`).join('');
  }
  function renderState(st) {
    const el = $('#siteState');
    const lang = getLang();
    const reasons = { open: t('site.stOpen', { c: st.today?.close || '' }), temporarily_closed: t('site.stTemp'), closed_today: t('site.stClosedToday'), before_opening: t('site.stBefore', { o: st.today?.open || '' }), after_closing: t('site.stAfter') };
    el.className = 'site-state ' + (st.open ? 'open' : 'closed');
    el.innerHTML = `${st.open ? '● ' : '○ '}${esc(reasons[st.reason] || st.reason)} <span class="muted">(${esc(st.now_local || '')})</span>` +
      (st.open && !st.ordering ? `<br><span class="muted">${t('site.stNoOrdering')}</span>` : '') +
      (st.next && !st.open ? `<br><span class="muted">${t('site.stNext', { d: st.next.today ? t('site.today') : (st.next.tomorrow ? t('site.tomorrow') : dayName(st.next.day)), o: st.next.open })}</span>` : '');
  }
  async function loadSite() {
    const [s, menu, st] = await Promise.all([api('/admin/settings'), api('/admin/menu'), api('/admin/site/state')]);
    menuCache = menu;
    $('#wOrdering').checked = s.online_ordering !== false; $('#wTempClosed').checked = !!s.temporarily_closed;
    $('#wClosedFr').value = s.closed_message?.fr || ''; $('#wClosedEn').value = s.closed_message?.en || '';
    renderHoursGrid(s.hours); $('#wTz').value = s.timezone || 'America/Toronto';
    $('#wLead').value = s.pickup_lead_minutes ?? 15; $('#wSlot').value = s.pickup_slot_minutes ?? 15; $('#wLast').value = s.pickup_last_order_minutes ?? 15;
    $('#wPayMode').value = s.payment_mode || 'counter'; togglePay();
    $('#wStripePk').value = s.stripe_publishable_key || ''; $('#wStripeSk').value = ''; $('#wStripeWh').value = '';
    $('#wStripeSk').placeholder = s.stripe_secret_key ? '•••••••• (' + t('site.keySet') + ')' : 'sk_live_…'; $('#wStripeWh').placeholder = s.stripe_webhook_secret ? '•••••••• (' + t('site.keySet') + ')' : 'whsec_…';
    $('#wTips').checked = s.tips_enabled !== false; $('#wTipOptions').value = (s.tip_options || [0, 10, 15, 20]).join(', ');
    $('#wAddress').value = s.address || ''; $('#wPhone').value = s.phone || ''; $('#wEmail').value = s.email || ''; $('#wInstagram').value = s.instagram || ''; $('#wFacebook').value = s.facebook || '';
    $('#wTagFr').value = s.tagline?.fr || ''; $('#wTagEn').value = s.tagline?.en || ''; $('#wAboutFr').value = s.about?.fr || ''; $('#wAboutEn').value = s.about?.en || '';
    $('#wMapsUrl').value = s.google_maps_url || ''; $('#wPublicUrl').value = s.public_url || '';
    $('#wGoogleKey').value = ''; $('#wGoogleKey').placeholder = s.google_api_key ? '•••••••• (' + t('site.keySet') + ')' : 'AIza…'; $('#wPlaceId').value = s.google_place_id || '';
    renderFeatured(s.featured_items || []);
    const base = s.public_url || location.origin;
    $('#siteOpen').href = base + '/'; $('#siteUrlLine').textContent = base + '  ·  ' + base + '/commander';
    $('#stripeWebhookUrl').textContent = base + '/api/stripe/webhook';
    renderState(st);
    $('#reviewsInfo').textContent = s.google_api_key ? '' : t('site.reviewsNoKey');
  }
  function togglePay() { $('#stripeBox').classList.toggle('hidden', $('#wPayMode').value === 'counter'); }
  $('#wPayMode').addEventListener('change', togglePay);

  $('#siteSave').addEventListener('click', async () => {
    const tips = $('#wTipOptions').value.split(/[,;\s]+/).map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 100);
    const patch = {
      online_ordering: $('#wOrdering').checked, temporarily_closed: $('#wTempClosed').checked,
      closed_message: { fr: $('#wClosedFr').value.trim(), en: $('#wClosedEn').value.trim() },
      hours: readHours(), timezone: $('#wTz').value.trim() || 'America/Toronto',
      pickup_lead_minutes: Number($('#wLead').value) || 15, pickup_slot_minutes: Number($('#wSlot').value) || 15, pickup_last_order_minutes: Number($('#wLast').value) || 0,
      payment_mode: $('#wPayMode').value, stripe_publishable_key: $('#wStripePk').value.trim(),
      tips_enabled: $('#wTips').checked, tip_options: tips.length ? [...new Set(tips)].sort((a, b) => a - b) : [0, 10, 15, 20],
      address: $('#wAddress').value.trim(), phone: $('#wPhone').value.trim(), email: $('#wEmail').value.trim(), instagram: $('#wInstagram').value.trim().replace(/^@/, ''), facebook: $('#wFacebook').value.trim(),
      tagline: { fr: $('#wTagFr').value.trim(), en: $('#wTagEn').value.trim() }, about: { fr: $('#wAboutFr').value.trim(), en: $('#wAboutEn').value.trim() },
      google_maps_url: $('#wMapsUrl').value.trim(), public_url: $('#wPublicUrl').value.trim().replace(/\/+$/, ''),
      google_place_id: $('#wPlaceId').value.trim(),
      featured_items: $$('#featuredList input:checked').map(i => i.dataset.feat),
    };
    // secrets: only sent when the admin typed a new value
    if ($('#wStripeSk').value.trim()) patch.stripe_secret_key = $('#wStripeSk').value.trim();
    if ($('#wStripeWh').value.trim()) patch.stripe_webhook_secret = $('#wStripeWh').value.trim();
    if ($('#wGoogleKey').value.trim()) patch.google_api_key = $('#wGoogleKey').value.trim();
    if (patch.payment_mode !== 'counter' && !(patch.stripe_publishable_key)) toast(t('site.stripeMissing'), 'err');
    try { await api('/admin/settings', { method: 'PUT', body: patch }); toast(t('settings.saved'), 'ok'); loadSite(); }
    catch (e) { toast(e.message, 'err'); }
  });
  $('#reviewsRefresh').addEventListener('click', async () => {
    $('#reviewsRefresh').disabled = true;
    try { const r = await api('/admin/site/reviews/refresh'); $('#reviewsInfo').textContent = r && r.rating ? t('site.reviewsOk', { r: r.rating, n: r.count }) : (r?.error || t('site.reviewsNone')); toast(t('common.saved'), 'ok'); }
    catch (e) { $('#reviewsInfo').textContent = e.message; toast(e.message, 'err'); }
    $('#reviewsRefresh').disabled = false;
  });
  document.addEventListener('view', e => { if (e.detail === 'site') loadSite().catch(err => toast(err.message, 'err')); });
  document.addEventListener('langchange', () => { if (currentView() === 'site') loadSite().catch(() => {}); });
})();
