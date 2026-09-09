/* L'Artisan — customer menu (web version for tablets). Same behaviour as the Android app. */
import { priceLine, priceOrder, name as nameOf } from '/shared/pricing.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STR = {
  fr: { tagline: 'Crêperie & Café', hint: '💡 Choisissez une section, ajoutez vos articles puis validez votre commande.', yourOrder: 'Votre commande', clear: 'Vider', review: 'Vérifier la commande',
    empty: 'Votre commande est vide.\nTouchez un article pour commencer.', from: 'à partir de', add: 'Ajouter', included: '{n} inclus', includedOf: '{c}/{n} inclus', extra: 'suppl.', required: 'Requis', choose: 'Choisir',
    qty: 'Quantité', note: 'Note pour la cuisine (allergies, sans oignon…)', subtotal: 'Sous-total', gst: 'TPS ({r} %)', qst: 'TVQ ({r} %)', total: 'Total', reviewTitle: 'Vérifiez votre commande', reviewSub: 'Tout est bon ? Confirmez et présentez-vous au comptoir pour payer.',
    back: 'Modifier', confirm: 'Confirmer la commande', yourName: 'Votre prénom (facultatif)', service: 'Où mangez-vous ?', dineIn: 'Sur place', takeout: 'À emporter', sending: 'Envoi…',
    thanks: 'Merci !', orderNo: 'Votre numéro de commande', payHint: 'Présentez-vous au comptoir pour régler votre commande. On vous appelle dès qu\'elle est prête.', newOrder: 'Nouvelle commande',
    offline: 'Impossible de joindre le comptoir. Veuillez commander directement au comptoir.', unavailable: 'Cet article n\'est plus disponible', chooseVariant: 'Veuillez choisir une option', min: 'Choisissez au moins {n}', max: 'Maximum {n}',
    menuUpdated: 'Le menu a été mis à jour', taxesIncl: 'taxes en sus' },
  en: { tagline: 'Crêperie & Café', hint: '💡 Pick a section, add your items, then review your order.', yourOrder: 'Your order', clear: 'Clear', review: 'Review order',
    empty: 'Your order is empty.\nTap an item to start.', from: 'from', add: 'Add', included: '{n} included', includedOf: '{c}/{n} included', extra: 'extra', required: 'Required', choose: 'Choose',
    qty: 'Quantity', note: 'Note for the kitchen (allergies, no onion…)', subtotal: 'Subtotal', gst: 'GST ({r}%)', qst: 'QST ({r}%)', total: 'Total', reviewTitle: 'Review your order', reviewSub: 'All good? Confirm and come to the counter to pay.',
    back: 'Edit', confirm: 'Confirm order', yourName: 'Your first name (optional)', service: 'Where are you eating?', dineIn: 'Dine in', takeout: 'Take out', sending: 'Sending…',
    thanks: 'Thank you!', orderNo: 'Your order number', payHint: 'Please come to the counter to pay. We\'ll call you as soon as it\'s ready.', newOrder: 'New order',
    offline: 'Cannot reach the counter. Please order directly at the counter.', unavailable: 'This item is no longer available', chooseVariant: 'Please choose an option', min: 'Choose at least {n}', max: 'Maximum {n}',
    menuUpdated: 'The menu was updated', taxesIncl: 'plus taxes' },
};

// ---------------------------------------------------------------- state
let lang = localStorage.getItem('lang') || 'fr';
let menu = null;            // {categories, items, settings, version}
let settings = { tax_gst: 5, tax_qst: 9.975, ask_customer_name: true, ask_service_type: true, thank_you_seconds: 12 };
let cat = null;
let cart = [];              // [{item_id, variant_id, options:[{group_id, option_id}], qty, note, key}]
let deviceId = localStorage.getItem('device_id') || ('web-' + Math.random().toString(36).slice(2, 10));
localStorage.setItem('device_id', deviceId);
let deviceName = new URLSearchParams(location.search).get('device') || localStorage.getItem('device_name') || 'Tablette web';
localStorage.setItem('device_name', deviceName);
let idleTimer = null;

const t = (k, v = {}) => { let s = (STR[lang][k] ?? STR.fr[k] ?? k); for (const [a, b] of Object.entries(v)) s = s.replace('{' + a + '}', b); return s; };
const rate = r => lang === 'en' ? String(r) : String(r).replace('.', ',');
const money = n => { const v = (Math.round(n * 100) / 100).toFixed(2); return lang === 'en' ? '$' + v : v.replace('.', ',') + ' $'; };
const N = o => nameOf(o, lang);
const txt = o => o ? ((lang === 'en' && o.en) ? o.en : (o.fr || o.en || '')) : '';

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  if (menu) { renderTabs(); renderMenu(); renderCart(); }
}
document.querySelectorAll('.lang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; localStorage.setItem('lang', lang); applyLang(); });

// ---------------------------------------------------------------- menu loading & live updates
async function loadMenu() {
  try {
    const r = await fetch('/api/menu'); if (!r.ok) throw new Error();
    menu = await r.json(); settings = { ...settings, ...menu.settings };
    localStorage.setItem('menu_cache', JSON.stringify(menu));
  } catch {
    const c = localStorage.getItem('menu_cache'); if (c) { menu = JSON.parse(c); settings = { ...settings, ...menu.settings }; }
  }
  if (!menu) { $('#menu').innerHTML = `<p class="cat-desc">${t('offline')}</p>`; return; }
  $('#cafeName').textContent = settings.cafe_name || "L'Artisan";
  $('#brand img').src = settings.logo_url || '/shared/logo-mark.png';
  document.title = settings.cafe_name || "L'Artisan";
  if (!localStorage.getItem('lang') && settings.default_lang) { lang = settings.default_lang; applyLang(); }
  const visible = visibleCats();
  if (!cat || !visible.find(c => c.id === cat)) cat = visible[0]?.id;
  renderTabs(); renderMenu(); renderCart();
}
const visibleCats = () => menu.categories.filter(c => c.visible !== false && menu.items.some(i => i.category_id === c.id && i.available !== false)).sort((a, b) => a.sort - b.sort);

let ws;
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  ws.onopen = () => { $('#conn').className = 'conn on'; ws.send(JSON.stringify({ type: 'hello', role: 'tablet', device_id: deviceId, device_name: deviceName, app_version: 'web-1.0', menu_version: menu?.version })); };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.type === 'menu_updated' || (m.type === 'welcome' && menu && m.menu_version !== menu.version)) { loadMenu().then(() => toast(t('menuUpdated'))); }
    if (m.type === 'settings_updated') { settings = { ...settings, ...m.settings }; $('#cafeName').textContent = settings.cafe_name; $('#brand img').src = settings.logo_url || '/shared/logo-mark.png'; renderCart(); }
  };
  ws.onclose = () => { $('#conn').className = 'conn off'; setTimeout(connect, 3000); };
  ws.onerror = () => ws.close();
}
setInterval(() => { if (ws?.readyState === 1) ws.send(JSON.stringify({ type: 'ping', menu_version: menu?.version })); }, 25000);

// ---------------------------------------------------------------- rendering
function renderTabs() {
  $('#tabs').innerHTML = visibleCats().map(c => `<button class="${c.id === cat ? 'active' : ''} ${c.daily_special ? 'special' : ''}" data-id="${c.id}">${esc(c.icon || '')} ${esc(txt(c.name))}</button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.id; renderTabs(); renderMenu(); $('#menu').scrollTop = 0; };
}
function minPrice(it) {
  if (it.variants?.length) return Math.min(...it.variants.map(v => v.price));
  return it.price;
}
function renderMenu() {
  const c = menu.categories.find(x => x.id === cat); if (!c) return;
  const items = menu.items.filter(i => i.category_id === cat).sort((a, b) => a.sort - b.sort);
  $('#menu').innerHTML = `<h2 class="cat-title">${esc(c.icon || '')} ${esc(txt(c.name))}</h2><p class="cat-desc">${esc(txt(c.description))}</p><div class="grid">` +
    items.map(it => `<div class="item ${it.available === false ? 'off' : ''}" data-id="${it.id}">
      ${it.badge ? `<span class="badge">${esc(txt(it.badge))}</span>` : ''}${it.image ? `<img src="${esc(it.image)}" alt="">` : ''}
      <div class="nm">${esc(txt(it.name))}</div><div class="ds">${esc(txt(it.description))}</div>
      <div class="pr">${it.variants?.length || it.option_groups?.some(g => g.included > 0 || g.options.some(o => o.price)) ? `<small>${t('from')}</small> ` : ''}${money(minPrice(it))}</div></div>`).join('') + '</div>';
  $('#menu').onclick = e => { const el = e.target.closest('.item'); if (el) openItem(el.dataset.id); };
}

function renderCart() {
  const box = $('#cartLines');
  if (!cart.length) { box.innerHTML = `<div class="cart-empty">${esc(t('empty')).replace('\n', '<br>')}</div>`; $('#cartTotals').innerHTML = ''; $('#reviewBtn').disabled = true; return; }
  const priced = priceOrder(menu, cart, settings, lang);
  if (!priced.ok) { cart = cart.filter(l => priceLine(menu, l, lang).ok); toast(priced.error, 'err'); return renderCart(); }
  box.innerHTML = priced.lines.map((l, i) => `<div class="cline"><div class="info"><div class="nm">${esc(l.name)}${l.variant_name ? ' — ' + esc(l.variant_name) : ''}</div>
      <div class="opts">${l.options.map(o => esc(o.name)).join(', ')}</div>${l.note ? `<div class="note">✎ ${esc(l.note)}</div>` : ''}
      <div class="qty" style="margin-top:6px"><button data-q="-1" data-i="${i}">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}">+</button></div></div>
      <div class="pr">${money(l.line_total)}</div></div>`).join('');
  box.onclick = e => { const b = e.target.closest('button[data-q]'); if (!b) return; const i = +b.dataset.i; cart[i].qty += +b.dataset.q; if (cart[i].qty <= 0) cart.splice(i, 1); renderCart(); bump(); };
  $('#cartTotals').innerHTML = `<div><span>${t('subtotal')}</span><span>${money(priced.subtotal)}</span></div><div><span>${t('gst', { r: rate(settings.tax_gst) })}</span><span>${money(priced.tax_gst)}</span></div>
    <div><span>${t('qst', { r: rate(settings.tax_qst) })}</span><span>${money(priced.tax_qst)}</span></div><div class="tot"><span>${t('total')}</span><span>${money(priced.total)}</span></div>`;
  $('#reviewBtn').disabled = false;
}
$('#cartClear').onclick = () => { cart = []; renderCart(); };

// ---------------------------------------------------------------- item sheet
function openItem(id) {
  const it = menu.items.find(i => i.id === id); if (!it || it.available === false) return;
  const line = { item_id: it.id, variant_id: it.variants?.[0]?.id || null, options: [], qty: 1, note: '' };
  // preselect the first option of required single groups
  for (const g of it.option_groups || []) if (g.type === 'single' && g.required && g.options.length) line.options.push({ group_id: g.id, option_id: g.options.find(o => o.available !== false)?.id });
  const included = g => (it.variants?.find(v => v.id === line.variant_id)?.included?.[g.id]) ?? (g.included || 0);
  const draw = () => {
    const r = priceLine(menu, line, lang);
    const body = [];
    if (it.variants?.length) body.push(`<div class="grp"><h3>${t('choose')}<span class="req">${t('required')}</span></h3><div class="opts">${it.variants.map(v => `<div class="opt radio variant ${v.id === line.variant_id ? 'on' : ''}" data-v="${v.id}"><span class="box">${v.id === line.variant_id ? '✓' : ''}</span><span class="txt"><span class="name">${esc(txt(v.name))} · ${money(v.price)}</span>${v.description ? `<span class="sub">${esc(txt(v.description))}</span>` : ''}</span></div>`).join('')}</div></div>`);
    for (const g of it.option_groups || []) {
      const picks = line.options.filter(o => o.group_id === g.id);
      const inc = included(g);
      const sections = [...new Set(g.options.map(o => txt(o.section)))];
      const counter = g.type === 'single' ? '' : inc > 0 ? `<span class="cnt">${t('includedOf', { c: Math.min(picks.length, inc), n: inc })}${g.extra_price ? ` · +${money(g.extra_price)} ${t('extra')}` : ''}</span>` : (g.max ? `<span class="cnt">${t('max', { n: g.max })}</span>` : '');
      const optHtml = o => {
        const idx = picks.findIndex(p => p.option_id === o.id); const on = idx >= 0;
        const extra = g.type !== 'single' && on && idx >= inc ? g.extra_price : 0;
        const priceTxt = (o.price ? `+${money(o.price)}` : '') + (extra ? ` +${money(extra)}` : '') || (g.type !== 'single' && inc > 0 ? t('included', { n: '' }).replace(' ', '') : '');
        const dis = o.available === false || (!on && g.max && picks.length >= g.max);
        return `<div class="opt ${g.type === 'single' ? 'radio' : ''} ${on ? 'on' : ''} ${dis ? 'dis' : ''}" data-g="${g.id}" data-o="${o.id}"><span class="box">${on ? '✓' : ''}</span><span class="txt"><span class="name">${esc(txt(o.name))}</span>${priceTxt ? `<span class="sub">${priceTxt}</span>` : ''}</span></div>`;
      };
      body.push(`<div class="grp"><h3><span>${esc(txt(g.name))}${g.required ? `<span class="req">${t('required')}</span>` : ''}</span>${counter}</h3>${g.hint ? `<p class="hint">${esc(txt(g.hint))}</p>` : ''}` +
        (sections.length > 1 || sections[0] ? sections.map(s => `${s ? `<h4>${esc(s)}</h4>` : ''}<div class="opts">${g.options.filter(o => txt(o.section) === s).map(optHtml).join('')}</div>`).join('') : `<div class="opts">${g.options.map(optHtml).join('')}</div>`) + '</div>');
    }
    body.push(`<div class="grp"><h3>${t('qty')}</h3><div class="qty big"><button data-qd="-1">−</button><span>${line.qty}</span><button data-qd="1">+</button></div></div>
      <div class="grp"><input class="note-in" id="noteIn" maxlength="120" placeholder="${esc(t('note'))}" value="${esc(line.note)}"></div>`);
    $('#sheetCard').innerHTML = `<div class="sheet-head"><div><h2>${esc(txt(it.name))}</h2><p>${esc(txt(it.description))}</p></div><button class="close" id="sheetClose">✕</button></div>
      <div class="sheet-body">${body.join('')}</div>
      <div class="sheet-foot"><div class="total">${r.ok ? money(r.priced.line_total) : '—'}</div><button class="primary big" style="width:auto;min-width:220px" id="addBtn" ${r.ok ? '' : 'disabled'}>${r.ok ? t('add') : esc(r.error)}</button></div>`;
    $('#sheetClose').onclick = closeSheet;
    $('#addBtn').onclick = () => { line.note = $('#noteIn').value.trim(); const same = cart.find(c => JSON.stringify([c.item_id, c.variant_id, c.options, c.note]) === JSON.stringify([line.item_id, line.variant_id, line.options, line.note])); if (same) same.qty += line.qty; else cart.push(line); closeSheet(); renderCart(); bump(); };
    $('#noteIn').oninput = e => { line.note = e.target.value; };
    $('#sheetCard').querySelectorAll('[data-qd]').forEach(b => b.onclick = () => { line.qty = Math.max(1, Math.min(20, line.qty + +b.dataset.qd)); draw(); });
    $('#sheetCard').querySelectorAll('[data-v]').forEach(b => b.onclick = () => { line.variant_id = b.dataset.v; draw(); });
    $('#sheetCard').querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      const g = it.option_groups.find(x => x.id === b.dataset.g); const oid = b.dataset.o;
      const i = line.options.findIndex(p => p.group_id === g.id && p.option_id === oid);
      if (g.type === 'single') { line.options = line.options.filter(p => p.group_id !== g.id); if (i < 0 || !g.required) line.options.push({ group_id: g.id, option_id: oid }); if (i >= 0 && g.required) line.options.push({ group_id: g.id, option_id: oid }); }
      else if (i >= 0) line.options.splice(i, 1);
      else { const n = line.options.filter(p => p.group_id === g.id).length; if (!g.max || n < g.max) line.options.push({ group_id: g.id, option_id: oid }); }
      draw();
    });
  };
  draw();
  $('#sheet').classList.remove('hidden');
}
function closeSheet() { $('#sheet').classList.add('hidden'); }
$('#sheet').onclick = e => { if (e.target === $('#sheet')) closeSheet(); };

// ---------------------------------------------------------------- review & confirm
let service = 'dine_in', customer = '';
$('#reviewBtn').onclick = () => {
  const p = priceOrder(menu, cart, settings, lang); if (!p.ok) return toast(p.error, 'err');
  $('#sheetCard').innerHTML = `<div class="sheet-head"><div><h2>${t('reviewTitle')}</h2><p>${t('reviewSub')}</p></div><button class="close" id="sheetClose">✕</button></div>
    <div class="sheet-body">${p.lines.map(l => `<div class="rev-line"><div><b>${l.qty}× ${esc(l.name)}${l.variant_name ? ' — ' + esc(l.variant_name) : ''}</b><span class="opts">${l.options.map(o => esc(o.name)).join(', ')}${l.note ? ' · ✎ ' + esc(l.note) : ''}</span></div><div><b>${money(l.line_total)}</b></div></div>`).join('')}
      <div style="margin-top:12px"><div class="rev-tot"><span>${t('subtotal')}</span><span>${money(p.subtotal)}</span></div><div class="rev-tot"><span>${t('gst', { r: rate(settings.tax_gst) })}</span><span>${money(p.tax_gst)}</span></div><div class="rev-tot"><span>${t('qst', { r: rate(settings.tax_qst) })}</span><span>${money(p.tax_qst)}</span></div><div class="rev-tot big"><span>${t('total')}</span><span>${money(p.total)}</span></div></div>
      ${settings.ask_customer_name !== false ? `<div class="field"><label>${t('yourName')}</label><input id="custName" maxlength="40" value="${esc(customer)}"></div>` : ''}
      ${settings.ask_service_type !== false ? `<div class="field"><label>${t('service')}</label><div class="seg"><button id="svcIn" class="${service === 'dine_in' ? 'on' : ''}">🍽️ ${t('dineIn')}</button><button id="svcOut" class="${service === 'takeout' ? 'on' : ''}">🥡 ${t('takeout')}</button></div></div>` : ''}
    </div>
    <div class="sheet-foot"><button id="backBtn">${t('back')}</button><button class="primary big" style="width:auto;min-width:260px" id="confirmBtn">✓ ${t('confirm')}</button></div>`;
  $('#sheetClose').onclick = closeSheet; $('#backBtn').onclick = closeSheet;
  $('#svcIn')?.addEventListener('click', () => { service = 'dine_in'; $('#svcIn').classList.add('on'); $('#svcOut').classList.remove('on'); });
  $('#svcOut')?.addEventListener('click', () => { service = 'takeout'; $('#svcOut').classList.add('on'); $('#svcIn').classList.remove('on'); });
  $('#confirmBtn').onclick = submit;
  $('#sheet').classList.remove('hidden');
};
async function submit() {
  const btn = $('#confirmBtn'); btn.disabled = true; btn.textContent = t('sending');
  customer = $('#custName')?.value.trim() || '';
  try {
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, device_name: deviceName, customer_name: customer, service_type: service, lang, lines: cart }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'error');
    cart = []; customer = ''; service = 'dine_in'; renderCart();
    $('#sheetCard').innerHTML = `<div class="success"><h2>${t('thanks')}</h2><p>${t('orderNo')}</p><div class="num">#${data.number}</div><p>${t('payHint')}</p><p style="margin-top:20px"><button class="primary" id="newOrderBtn">${t('newOrder')}</button></p></div>`;
    $('#newOrderBtn').onclick = closeSheet;
    setTimeout(closeSheet, (settings.thank_you_seconds || 12) * 1000);
  } catch (e) {
    toast(e.message === 'Failed to fetch' ? t('offline') : e.message, 'err');
    btn.disabled = false; btn.textContent = '✓ ' + t('confirm');
    if (e.message !== 'Failed to fetch') loadMenu();
  }
}

// ---------------------------------------------------------------- misc
function toast(msg, kind = '') { const el = $('#toast'); el.textContent = msg; el.className = 'toast ' + kind; clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 3000); }
function bump() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (cart.length) { cart = []; renderCart(); closeSheet(); } }, 5 * 60 * 1000); }
document.addEventListener('pointerdown', () => { if (cart.length) bump(); });
// long-press the logo (2 s) to rename this tablet
let pressT; $('#brand').addEventListener('pointerdown', () => { pressT = setTimeout(() => { const n = prompt('Nom de cette tablette / Tablet name', deviceName); if (n) { deviceName = n.trim(); localStorage.setItem('device_name', deviceName); ws?.readyState === 1 && ws.send(JSON.stringify({ type: 'hello', role: 'tablet', device_id: deviceId, device_name: deviceName, app_version: 'web-1.0', menu_version: menu?.version })); } }, 2000); });
$('#brand').addEventListener('pointerup', () => clearTimeout(pressT)); $('#brand').addEventListener('pointerleave', () => clearTimeout(pressT));

applyLang();
loadMenu().then(connect);
