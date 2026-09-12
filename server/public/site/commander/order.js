/* Online ordering page · same menu & pricing rules as the tablets, plus pickup time, tip and payment. */
import { priceLine, priceOrder } from '/shared/pricing.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STR = {
  fr: { orderOnline: 'Commander en ligne', yourOrder: 'Votre commande', clear: 'Vider', checkout: 'Passer la commande', viewCart: 'Voir la commande', empty: 'Votre commande est vide.\nTouchez un plat pour commencer.',
    from: 'à partir de', add: 'Ajouter', included: 'inclus', includedOf: '{c}/{n} inclus', extra: 'suppl.', required: 'Requis', choose: 'Choisir', qty: 'Quantité', note: 'Note pour la cuisine (allergies, sans oignon…)',
    subtotal: 'Sous-total', gst: 'TPS ({r} %)', qst: 'TVQ ({r} %)', tip: 'Pourboire', total: 'Total', items: '{n} article(s)',
    coTitle: 'Finaliser la commande', coSub: 'Ramassage au café · {addr}', name: 'Votre nom', phone: 'Téléphone', email: 'Courriel (facultatif, pour la confirmation)', pickup: 'Heure de ramassage', asap: 'Dès que possible (~{m} min, vers {t})',
    tipLabel: 'Pourboire pour l’équipe', noTip: 'Sans', payment: 'Paiement', payCounter: 'Payer au comptoir', payStripe: 'Payer en ligne (carte, Apple Pay, Google Pay)',
    payCounterNote: 'Vous réglez au comptoir (carte, débit ou comptant) en venant chercher votre commande.', payStripeNote: 'Vous serez redirigé vers une page de paiement sécurisée (Stripe).',
    back: 'Retour', confirm: 'Confirmer la commande', confirmPay: 'Payer {t}', sending: 'Envoi…',
    open: 'Ouvert · ferme à {t}', closed: 'Fermé', closedTemp: 'Fermé exceptionnellement', opensTomorrow: 'ouvre demain à {t}', opensToday: 'ouvre à {t}',
    bannerClosed: 'Le café est fermé · la commande en ligne reprend {when}. Vous pouvez consulter le menu.', bannerTemp: 'Le café est fermé pour le moment · la commande en ligne reprendra à la réouverture. Vous pouvez consulter le menu.', bannerLate: "Trop tard pour commander aujourd'hui · à demain ! Vous pouvez consulter le menu.", bannerOff: 'La commande en ligne est temporairement désactivée.',
    closedBtn: 'Café fermé · commande impossible', localTitle: 'Mode comptoir', localHint: 'Entrez le code PIN pour ouvrir le menu du café.', clear: 'Effacer', wrongPin: 'Code PIN incorrect', counterMode: 'Comptoir', localSub: 'Commande prise au comptoir · paiement sur place', nameOpt: 'Prénom du client (facultatif)', thanks: 'Commande envoyée en cuisine', giveNumber: 'Numéro de commande', newOrder: 'Nouvelle commande', autoBack: 'Retour au menu dans {s} s', fullscreen: 'Plein écran', service: 'Sur place ou à emporter ?', takeout: 'À emporter', dineIn: 'Sur place', arrival: "Heure d'arrivée", lateBtn: "Trop tard pour aujourd'hui", menuUpdated: 'Le menu a été mis à jour', errNet: 'Connexion impossible, réessayez.', cancelled: 'Paiement annulé · votre panier est conservé.', max: 'Maximum {n}' },
  en: { orderOnline: 'Order online', yourOrder: 'Your order', clear: 'Clear', checkout: 'Checkout', viewCart: 'View order', empty: 'Your order is empty.\nTap a dish to start.',
    from: 'from', add: 'Add', included: 'included', includedOf: '{c}/{n} included', extra: 'extra', required: 'Required', choose: 'Choose', qty: 'Quantity', note: 'Note for the kitchen (allergies, no onion…)',
    subtotal: 'Subtotal', gst: 'GST ({r}%)', qst: 'QST ({r}%)', tip: 'Tip', total: 'Total', items: '{n} item(s)',
    coTitle: 'Complete your order', coSub: 'Pickup at the café · {addr}', name: 'Your name', phone: 'Phone', email: 'E-mail (optional, for the confirmation)', pickup: 'Pickup time', asap: 'As soon as possible (~{m} min, around {t})',
    tipLabel: 'Tip for the team', noTip: 'None', payment: 'Payment', payCounter: 'Pay at pickup', payStripe: 'Pay online (card, Apple Pay, Google Pay)',
    payCounterNote: 'You pay at the counter (card, debit or cash) when you pick up your order.', payStripeNote: 'You will be redirected to a secure payment page (Stripe).',
    back: 'Back', confirm: 'Confirm order', confirmPay: 'Pay {t}', sending: 'Sending…',
    open: 'Open · closes at {t}', closed: 'Closed', closedTemp: 'Exceptionally closed', opensTomorrow: 'opens tomorrow at {t}', opensToday: 'opens at {t}',
    bannerClosed: 'The café is closed · online ordering resumes {when}. You can still browse the menu.', bannerTemp: 'The café is closed at the moment · online ordering resumes when it reopens. You can still browse the menu.', bannerLate: 'Too late to order today · see you tomorrow! You can still browse the menu.', bannerOff: 'Online ordering is temporarily disabled.',
    closedBtn: 'Café closed · ordering unavailable', localTitle: 'Counter mode', localHint: 'Enter the PIN to open the café menu.', clear: 'Clear', wrongPin: 'Wrong PIN', counterMode: 'Counter', localSub: 'Order taken at the counter · pay in person', nameOpt: 'Customer first name (optional)', thanks: 'Order sent to the kitchen', giveNumber: 'Order number', newOrder: 'New order', autoBack: 'Back to the menu in {s} s', fullscreen: 'Full screen', service: 'Dine in or take out?', takeout: 'Take out', dineIn: 'Dine in', arrival: 'Arrival time', lateBtn: 'Too late for today', menuUpdated: 'The menu was updated', errNet: 'Cannot connect, please retry.', cancelled: 'Payment cancelled · your cart was kept.', max: 'Maximum {n}' },
};
let lang = localStorage.getItem('site_lang') || ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
const t = (k, v = {}) => { let s = STR[lang][k] ?? STR.fr[k] ?? k; for (const [a, b] of Object.entries(v)) s = s.replace('{' + a + '}', b); return s; };
const txt = o => o ? ((lang === 'en' && o.en) ? o.en : (o.fr || o.en || '')) : '';
const money = n => { const v = (Math.round(n * 100) / 100).toFixed(2); return lang === 'en' ? '$' + v : v.replace('.', ',') + ' $'; };
const rate = r => lang === 'en' ? String(r) : String(r).replace('.', ',');
const fmtT = hhmm => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return lang === 'en' ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` : `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}`; };

let menu = null, site = null, settings = { tax_gst: 5, tax_qst: 9.975 };
let cat = null;
let cart = JSON.parse(localStorage.getItem('web_cart') || '[]');
const saveCart = () => localStorage.setItem('web_cart', JSON.stringify(cart));

// ---------------------------------------------------------------- counter mode (/local): PIN gate, fullscreen, orders straight to the kitchen
const LOCAL = location.pathname.startsWith('/local');
if (LOCAL) {
  document.body.classList.add('local');
  document.querySelector('.brand small').setAttribute('data-i18n', 'counterMode');
  const gate = $('#pinGate'); let pin = '';
  const dots = () => $$('#pinDots span').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  const unlock = () => { gate.classList.add('hidden'); };
  async function submitPin() {
    if (pin.length < 4) return;
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || t('wrongPin')); }
      unlock();
    } catch (e) { $('#pinError').textContent = e.message === 'Failed to fetch' ? t('errNet') : t('wrongPin'); }
    pin = ''; dots();
  }
  $('#pinPad').addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k; $('#pinError').textContent = '';
    if (k === 'clear') pin = ''; else if (k === 'ok') return submitPin(); else if (pin.length < 8) pin += k;
    dots(); if (pin.length === 4) submitPin();
  });
  document.addEventListener('keydown', e => { if (gate.classList.contains('hidden')) return; if (/^\d$/.test(e.key) && pin.length < 8) { pin += e.key; dots(); if (pin.length === 4) submitPin(); } else if (e.key === 'Backspace') { pin = pin.slice(0, -1); dots(); } else if (e.key === 'Enter') submitPin(); });
  // already logged in (admin session cookie) → no PIN
  fetch('/api/admin/session').then(r => r.json()).then(j => { if (!j.logged_in) gate.classList.remove('hidden'); }).catch(() => gate.classList.remove('hidden'));
  // fullscreen toggle
  const fs = $('#fsBtn'); fs.classList.remove('hidden');
  fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  document.addEventListener('fullscreenchange', () => { fs.textContent = document.fullscreenElement ? '✕ ⛶' : '⛶'; });
}

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  if (menu) { renderTabs(); renderMenu(); renderCart(); renderState(); }
}
document.querySelectorAll('.lang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; localStorage.setItem('site_lang', lang); applyLang(); });

// ---------------------------------------------------------------- data
async function load() {
  const [m, s] = await Promise.all([fetch('/api/menu').then(r => r.json()), fetch('/api/site').then(r => r.json())]);
  menu = m; site = s; settings = { ...settings, ...m.settings };
  $('#navName').textContent = s.cafe_name; $('#navLogo').src = s.logo_url || '/shared/logo-mark.png'; document.title = `${t('orderOnline')} · ${s.cafe_name}`;
  const visible = visibleCats();
  const hash = location.hash.slice(1);
  cat = visible.find(c => c.id === hash)?.id || (visible.find(c => c.id === cat)?.id) || visible[0]?.id;
  renderTabs(); renderMenu(); renderCart(); renderState();
}
const visibleCats = () => menu.categories.filter(c => c.visible !== false && menu.items.some(i => i.category_id === c.id && i.available !== false)).sort((a, b) => a.sort - b.sort);
async function refreshState() { try { site.state = await fetch('/api/site/state').then(r => r.json()); renderState(); } catch {} }

function renderState() {
  const st = site.state, badge = $('#openBadge');
  badge.className = 'badge ' + (st.open ? 'open' : 'closed');
  let hint = '';
  if (st.next) hint = st.next.today ? t('opensToday', { t: fmtT(st.next.open) }) : t('opensTomorrow', { t: fmtT(st.next.open) });
  $('#openText').textContent = st.open ? t('open', { t: fmtT(st.today.close) }) : (st.reason === 'temporarily_closed' ? t('closedTemp') : t('closed') + (hint ? ' · ' + hint : ''));
  const banner = $('#closedBanner');
  if (!st.ordering) {
    banner.classList.remove('hidden');
    banner.textContent = st.reason === 'temporarily_closed' ? (txt(site.closed_message) || t('bannerTemp')) : !st.open ? t('bannerClosed', { when: hint }) : (st.open && !st.slots.length ? t('bannerLate') : t('bannerOff'));
  } else banner.classList.add('hidden');
  const btn = $('#reviewBtn');
  if (LOCAL) { banner.classList.add('hidden'); btn.disabled = !cart.length; btn.textContent = t('checkout'); return; }
  btn.disabled = !cart.length || !st.ordering;
  btn.textContent = st.ordering ? t('checkout') : (st.open && !st.slots.length ? t('lateBtn') : t('closedBtn'));
}

// ---------------------------------------------------------------- menu
function renderTabs() {
  $('#tabs').innerHTML = visibleCats().map(c => `<button class="${c.id === cat ? 'active' : ''} ${c.daily_special ? 'special' : ''}" data-id="${c.id}">${esc(c.icon || '')} ${esc(txt(c.name))}</button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.id; history.replaceState(null, '', '#' + cat); renderTabs(); renderMenu(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
}
const minPrice = it => it.variants?.length ? Math.min(...it.variants.map(v => v.price)) : it.price;
const configurable = it => it.variants?.length || it.option_groups?.some(g => g.included > 0 || g.options.some(o => o.price));
function renderMenu() {
  const c = menu.categories.find(x => x.id === cat); if (!c) return;
  const items = menu.items.filter(i => i.category_id === cat).sort((a, b) => a.sort - b.sort);
  $('#menu').innerHTML = `<h2 class="cat-title">${esc(c.icon || '')} ${esc(txt(c.name))}</h2><p class="cat-desc">${esc(txt(c.description))}</p><div class="grid">` +
    items.map(it => `<div class="item ${it.available === false ? 'off' : ''}" data-id="${it.id}">${it.badge ? `<span class="badge-i">${esc(txt(it.badge))}</span>` : ''}${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ''}
      <div class="nm">${esc(txt(it.name))}</div><div class="ds">${esc(txt(it.description))}</div><div class="pr">${configurable(it) ? `<small>${t('from')}</small> ` : ''}${money(minPrice(it))}</div></div>`).join('') + '</div>';
  $('#menu').onclick = e => { const el = e.target.closest('.item'); if (el) openItem(el.dataset.id); };
}

// ---------------------------------------------------------------- cart
function renderCart() {
  const box = $('#cartLines');
  const count = cart.reduce((s, l) => s + l.qty, 0);
  $('#barCount').textContent = t('items', { n: count });
  if (!cart.length) { box.innerHTML = `<div class="cart-empty">${esc(t('empty')).replace('\n', '<br>')}</div>`; $('#cartTotals').innerHTML = ''; $('#barTotal').textContent = money(0); $('#reviewBtn').disabled = true; return; }
  const priced = priceOrder(menu, cart, settings, lang);
  if (!priced.ok) { cart = cart.filter(l => priceLine(menu, l, lang).ok); saveCart(); toast(priced.error, 'err'); return renderCart(); }
  box.innerHTML = priced.lines.map((l, i) => `<div class="cline"><div class="info"><div class="nm">${esc(l.name)}${l.variant_name ? ' · ' + esc(l.variant_name) : ''}</div><div class="opts">${l.options.map(o => esc(o.name)).join(', ')}</div>${l.note ? `<div class="note">✎ ${esc(l.note)}</div>` : ''}
    <div class="qty"><button data-q="-1" data-i="${i}">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}">+</button></div></div><div class="pr">${money(l.line_total)}</div></div>`).join('');
  box.onclick = e => { const b = e.target.closest('button[data-q]'); if (!b) return; const i = +b.dataset.i; cart[i].qty += +b.dataset.q; if (cart[i].qty <= 0) cart.splice(i, 1); saveCart(); renderCart(); };
  $('#cartTotals').innerHTML = `<div><span>${t('subtotal')}</span><span>${money(priced.subtotal)}</span></div><div><span>${t('gst', { r: rate(settings.tax_gst) })}</span><span>${money(priced.tax_gst)}</span></div><div><span>${t('qst', { r: rate(settings.tax_qst) })}</span><span>${money(priced.tax_qst)}</span></div><div class="tot"><span>${t('total')}</span><span>${money(priced.total)}</span></div>`;
  $('#barTotal').textContent = money(priced.total);
  $('#reviewBtn').disabled = !(site?.state?.ordering);
}
$('#cartClear').onclick = () => { cart = []; saveCart(); renderCart(); };
$('#barOpen').onclick = () => $('#cart').classList.add('open');
$('#cartClose').onclick = () => $('#cart').classList.remove('open');

// ---------------------------------------------------------------- item sheet (same rules as the tablet)
function openItem(id) {
  const it = menu.items.find(i => i.id === id); if (!it || it.available === false) return;
  const line = { item_id: it.id, variant_id: it.variants?.[0]?.id || null, options: [], qty: 1, note: '' };
  for (const g of it.option_groups || []) if (g.type === 'single' && g.required && g.options.length) line.options.push({ group_id: g.id, option_id: g.options.find(o => o.available !== false)?.id });
  const included = g => (it.variants?.find(v => v.id === line.variant_id)?.included?.[g.id]) ?? (g.included || 0);
  const draw = () => {
    const r = priceLine(menu, line, lang);
    const body = [];
    if (it.variants?.length) body.push(`<div class="grp"><h3>${t('choose')}<span class="req">${t('required')}</span></h3><div class="opts">${it.variants.map(v => `<div class="opt radio ${v.id === line.variant_id ? 'on' : ''}" data-v="${v.id}"><span class="box">${v.id === line.variant_id ? '✓' : ''}</span><span class="txt"><span class="name">${esc(txt(v.name))} · ${money(v.price)}</span>${v.description ? `<span class="sub">${esc(txt(v.description))}</span>` : ''}</span></div>`).join('')}</div></div>`);
    for (const g of it.option_groups || []) {
      const picks = line.options.filter(o => o.group_id === g.id); const inc = included(g);
      const sections = [...new Set(g.options.map(o => txt(o.section)))];
      const counter = g.type === 'single' ? '' : inc > 0 ? `<span class="cnt">${t('includedOf', { c: Math.min(picks.length, inc), n: inc })}${g.extra_price ? ` · +${money(g.extra_price)} ${t('extra')}` : ''}</span>` : (g.max ? `<span class="cnt">${t('max', { n: g.max })}</span>` : '');
      const optHtml = o => { const idx = picks.findIndex(p => p.option_id === o.id); const on = idx >= 0; const extra = g.type !== 'single' && on && idx >= inc ? g.extra_price : 0;
        const priceTxt = (o.price ? `+${money(o.price)}` : '') + (extra ? ` +${money(extra)}` : '') || (g.type !== 'single' && inc > 0 ? t('included') : '');
        const dis = o.available === false || (g.type !== 'single' && !on && g.max && picks.length >= g.max);   // a single-choice group is never "full": picking another option just switches
        return `<div class="opt ${g.type === 'single' ? 'radio' : ''} ${on ? 'on' : ''} ${dis ? 'dis' : ''}" data-g="${g.id}" data-o="${o.id}"><span class="box">${on ? '✓' : ''}</span><span class="txt"><span class="name">${esc(txt(o.name))}</span>${priceTxt ? `<span class="sub">${priceTxt}</span>` : ''}</span></div>`; };
      body.push(`<div class="grp"><h3><span>${esc(txt(g.name))}${g.required ? `<span class="req">${t('required')}</span>` : ''}</span>${counter}</h3>${g.hint ? `<p class="hint">${esc(txt(g.hint))}</p>` : ''}` +
        (sections.length > 1 || sections[0] ? sections.map(s => `${s ? `<h4>${esc(s)}</h4>` : ''}<div class="opts">${g.options.filter(o => txt(o.section) === s).map(optHtml).join('')}</div>`).join('') : `<div class="opts">${g.options.map(optHtml).join('')}</div>`) + '</div>');
    }
    body.push(`<div class="grp"><h3>${t('qty')}</h3><div class="qty big"><button data-qd="-1">−</button><span>${line.qty}</span><button data-qd="1">+</button></div></div><div class="grp"><input class="note-in" id="noteIn" maxlength="120" placeholder="${esc(t('note'))}" value="${esc(line.note)}"></div>`);
    $('#sheetCard').innerHTML = `<div class="sheet-head"><div><h2>${esc(txt(it.name))}</h2><p>${esc(txt(it.description))}</p></div><button class="close" id="sheetClose">✕</button></div><div class="sheet-body">${body.join('')}</div>
      <div class="sheet-foot"><div class="total">${r.ok ? money(r.priced.line_total) : '-'}</div><button class="btn primary big" id="addBtn" ${r.ok ? '' : 'disabled'}>${r.ok ? t('add') : esc(r.error)}</button></div>`;
    $('#sheetClose').onclick = closeSheet;
    $('#addBtn').onclick = () => { line.note = $('#noteIn').value.trim(); const same = cart.find(c => JSON.stringify([c.item_id, c.variant_id, c.options, c.note]) === JSON.stringify([line.item_id, line.variant_id, line.options, line.note])); if (same) same.qty += line.qty; else cart.push(line); saveCart(); closeSheet(); renderCart(); toast('✓ ' + txt(it.name)); };
    $('#noteIn').oninput = e => { line.note = e.target.value; };
    $('#sheetCard').querySelectorAll('[data-qd]').forEach(b => b.onclick = () => { line.qty = Math.max(1, Math.min(20, line.qty + +b.dataset.qd)); draw(); });
    $('#sheetCard').querySelectorAll('[data-v]').forEach(b => b.onclick = () => { line.variant_id = b.dataset.v; draw(); });
    $('#sheetCard').querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
      const g = it.option_groups.find(x => x.id === b.dataset.g); const oid = b.dataset.o; const i = line.options.findIndex(p => p.group_id === g.id && p.option_id === oid);
      if (g.type === 'single') { line.options = line.options.filter(p => p.group_id !== g.id); if (i < 0 || g.required) line.options.push({ group_id: g.id, option_id: oid }); }
      else if (i >= 0) line.options.splice(i, 1); else { const n = line.options.filter(p => p.group_id === g.id).length; if (!g.max || n < g.max) line.options.push({ group_id: g.id, option_id: oid }); }
      draw();
    });
  };
  draw(); $('#sheet').classList.remove('hidden');
}
function closeSheet() { $('#sheet').classList.add('hidden'); }
$('#sheet').onclick = e => { if (e.target === $('#sheet')) closeSheet(); };

// ---------------------------------------------------------------- checkout
const saved = JSON.parse(localStorage.getItem('web_customer') || '{}');
let form = { name: saved.name || '', phone: saved.phone || '', email: saved.email || '', pickup: 'asap', tip: null, payment: null, service: 'takeout' };
$('#reviewBtn').onclick = async () => {
  await refreshState();
  if (!site.state.ordering) return;
  $('#cart').classList.remove('open');
  drawCheckout();
};
function drawCheckout() {
  if (LOCAL) return drawLocalCheckout();
  const st = site.state; const p = priceOrder(menu, cart, settings, lang); if (!p.ok) return toast(p.error, 'err');
  const tips = st.tips; if (form.tip == null) form.tip = tips ? (tips.includes(10) ? 10 : tips[0]) : 0;
  if (!form.payment || !st.payment_modes.includes(form.payment)) form.payment = st.payment_modes[0];
  const tipAmt = tips ? Math.round(p.subtotal * form.tip) / 100 : 0;
  const total = Math.round((p.total + tipAmt) * 100) / 100;
  const asap = st.slots[0];
  $('#sheetCard').innerHTML = `<div class="sheet-head"><div><h2>${t('coTitle')}</h2><p>${t('coSub', { addr: esc(site.address) })}</p></div><button class="close" id="sheetClose">✕</button></div>
    <div class="sheet-body">
      ${p.lines.map(l => `<div class="rev-line"><div><b>${l.qty}× ${esc(l.name)}${l.variant_name ? ' · ' + esc(l.variant_name) : ''}</b><span class="opts">${l.options.map(o => esc(o.name)).join(', ')}${l.note ? ' · ✎ ' + esc(l.note) : ''}</span></div><div><b>${money(l.line_total)}</b></div></div>`).join('')}
      <div class="row2">
        <div class="field"><label>${t('name')} *</label><input id="fName" value="${esc(form.name)}" maxlength="40" autocomplete="name"></div>
        <div class="field"><label>${t('phone')} *</label><input id="fPhone" value="${esc(form.phone)}" maxlength="24" inputmode="tel" autocomplete="tel" placeholder="514 555 0123"></div>
      </div>
      <div class="field"><label>${t('email')}</label><input id="fEmail" value="${esc(form.email)}" maxlength="80" inputmode="email" autocomplete="email"></div>
      <div class="field"><label>${t('service')}</label><div class="seg" id="svcSeg"><button data-svc="takeout" class="${form.service !== 'dine_in' ? 'on' : ''}">🥡 ${t('takeout')}</button><button data-svc="dine_in" class="${form.service === 'dine_in' ? 'on' : ''}">🍽️ ${t('dineIn')}</button></div></div>
      <div class="field"><label>${form.service === 'dine_in' ? t('arrival') : t('pickup')}</label><select id="fPickup">${st.slots.map(s => `<option value="${s.value}" ${s.value === form.pickup ? 'selected' : ''}>${s.value === 'asap' ? t('asap', { m: st.lead_minutes, t: fmtT(minToHHMM(s.minutes)) }) : fmtT(s.value)}</option>`).join('')}</select></div>
      ${tips ? `<div class="field"><label>${t('tipLabel')}</label><div class="seg" id="tipSeg">${tips.map(x => `<button data-tip="${x}" class="${x === form.tip ? 'on' : ''}">${x === 0 ? t('noTip') : x + ' %'}</button>`).join('')}</div></div>` : ''}
      ${st.payment_modes.length > 1 ? `<div class="field"><label>${t('payment')}</label><div class="seg" id="paySeg">${st.payment_modes.map(m => `<button data-pay="${m}" class="${m === form.payment ? 'on' : ''}">${m === 'stripe' ? '💳 ' + t('payStripe') : '🏪 ' + t('payCounter')}</button>`).join('')}</div></div>` : ''}
      <div class="pay-note" id="payNote">${form.payment === 'stripe' ? t('payStripeNote') : t('payCounterNote')}</div>
      <div style="margin-top:14px"><div class="rev-tot"><span>${t('subtotal')}</span><span>${money(p.subtotal)}</span></div><div class="rev-tot"><span>${t('gst', { r: rate(settings.tax_gst) })}</span><span>${money(p.tax_gst)}</span></div><div class="rev-tot"><span>${t('qst', { r: rate(settings.tax_qst) })}</span><span>${money(p.tax_qst)}</span></div>${tips ? `<div class="rev-tot"><span>${t('tip')}</span><span id="tipAmt">${money(tipAmt)}</span></div>` : ''}<div class="rev-tot big"><span>${t('total')}</span><span id="grand">${money(total)}</span></div></div>
    </div>
    <div class="sheet-foot"><button class="btn" id="backBtn">${t('back')}</button><button class="btn primary big" id="confirmBtn">${form.payment === 'stripe' ? '💳 ' + t('confirmPay', { t: money(total) }) : '✓ ' + t('confirm')}</button></div>`;
  $('#sheetClose').onclick = closeSheet; $('#backBtn').onclick = closeSheet;
  $('#tipSeg')?.addEventListener('click', e => { const b = e.target.closest('[data-tip]'); if (!b) return; form.tip = Number(b.dataset.tip); saveForm(); drawCheckout(); });
  $('#svcSeg').addEventListener('click', e => { const b = e.target.closest('[data-svc]'); if (!b) return; form.service = b.dataset.svc; saveForm(); drawCheckout(); });
  $('#paySeg')?.addEventListener('click', e => { const b = e.target.closest('[data-pay]'); if (!b) return; form.payment = b.dataset.pay; saveForm(); drawCheckout(); });
  ['fName', 'fPhone', 'fEmail'].forEach(id => $('#' + id).oninput = saveForm);
  $('#fPickup').onchange = saveForm;
  $('#confirmBtn').onclick = submit;
  $('#sheet').classList.remove('hidden');
}
// counter mode: service + tip (+ optional first name), no contact details, no pickup time, no payment step
function drawLocalCheckout() {
  const p = priceOrder(menu, cart, settings, lang); if (!p.ok) return toast(p.error, 'err');
  const tips = settings.tips_enabled !== false && Array.isArray(settings.tip_options) && settings.tip_options.length ? settings.tip_options : null;
  if (form.tip == null || (tips && !tips.includes(form.tip))) form.tip = tips ? (tips.includes(10) ? 10 : tips[0]) : 0;
  const tipAmt = tips ? Math.round(p.subtotal * form.tip) / 100 : 0;
  const total = Math.round((p.total + tipAmt) * 100) / 100;
  $('#sheetCard').innerHTML = `<div class="sheet-head"><div><h2>${t('coTitle')}</h2><p>${t('localSub')}</p></div><button class="close" id="sheetClose">✕</button></div>
    <div class="sheet-body">
      ${p.lines.map(l => `<div class="rev-line"><div><b>${l.qty}× ${esc(l.name)}${l.variant_name ? ' · ' + esc(l.variant_name) : ''}</b><span class="opts">${l.options.map(o => esc(o.name)).join(', ')}${l.note ? ' · ✎ ' + esc(l.note) : ''}</span></div><div><b>${money(l.line_total)}</b></div></div>`).join('')}
      <div class="field"><label>${t('nameOpt')}</label><input id="fName" value="${esc(form.name)}" maxlength="40"></div>
      <div class="field"><label>${t('service')}</label><div class="seg" id="svcSeg"><button data-svc="dine_in" class="${form.service !== 'takeout' ? 'on' : ''}">🍽️ ${t('dineIn')}</button><button data-svc="takeout" class="${form.service === 'takeout' ? 'on' : ''}">🥡 ${t('takeout')}</button></div></div>
      ${tips ? `<div class="field"><label>${t('tipLabel')}</label><div class="seg" id="tipSeg">${tips.map(x => `<button data-tip="${x}" class="${x === form.tip ? 'on' : ''}">${x === 0 ? t('noTip') : x + ' %'}</button>`).join('')}</div></div>` : ''}
      <div style="margin-top:14px"><div class="rev-tot"><span>${t('subtotal')}</span><span>${money(p.subtotal)}</span></div><div class="rev-tot"><span>${t('gst', { r: rate(settings.tax_gst) })}</span><span>${money(p.tax_gst)}</span></div><div class="rev-tot"><span>${t('qst', { r: rate(settings.tax_qst) })}</span><span>${money(p.tax_qst)}</span></div>${tipAmt ? `<div class="rev-tot"><span>${t('tip')}</span><span>${money(tipAmt)}</span></div>` : ''}<div class="rev-tot big"><span>${t('total')}</span><span>${money(total)}</span></div></div>
    </div>
    <div class="sheet-foot"><button class="btn" id="backBtn">${t('back')}</button><button class="btn primary big" id="confirmBtn">✓ ${t('confirm')}</button></div>`;
  $('#sheetClose').onclick = closeSheet; $('#backBtn').onclick = closeSheet;
  $('#svcSeg').addEventListener('click', e => { const b = e.target.closest('[data-svc]'); if (!b) return; form.service = b.dataset.svc; form.name = $('#fName').value; drawLocalCheckout(); });
  $('#tipSeg')?.addEventListener('click', e => { const b = e.target.closest('[data-tip]'); if (!b) return; form.tip = Number(b.dataset.tip); form.name = $('#fName').value; drawLocalCheckout(); });
  $('#confirmBtn').onclick = submitLocal;
  $('#sheet').classList.remove('hidden');
}
async function submitLocal() {
  form.name = $('#fName')?.value || '';
  const btn = $('#confirmBtn'); btn.disabled = true; const label = btn.textContent; btn.textContent = t('sending');
  try {
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: 'local-pc', device_name: 'Comptoir', customer_name: form.name.trim(), service_type: form.service === 'takeout' ? 'takeout' : 'dine_in', lang, lines: cart, tip_percent: form.tip }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'error');
    cart = []; saveCart(); form.name = ''; form.service = 'dine_in'; form.tip = null; renderCart(); renderState();
    let secs = Math.max(3, Math.min(120, Number(settings.thank_you_seconds) || 12));
    const draw = () => { $('#sheetCard').innerHTML = `<div class="success-card"><h2>${t('thanks')}</h2><p class="muted">${t('giveNumber')}</p><div class="num">#${data.number}</div><p><button class="btn primary big" id="newOrderBtn">${t('newOrder')}</button></p><p class="muted">${t('autoBack', { s: secs })}</p></div>`; $('#newOrderBtn').onclick = () => { clearInterval(tm); closeSheet(); }; };
    draw();
    const tm = setInterval(() => { secs--; if (secs <= 0) { clearInterval(tm); closeSheet(); } else { const p = $('#sheetCard .muted:last-child'); if (p) p.textContent = t('autoBack', { s: secs }); } }, 1000);
  } catch (e) {
    toast(e.message === 'Failed to fetch' ? t('errNet') : e.message, 'err');
    btn.disabled = false; btn.textContent = label;
    if (e.message !== 'Failed to fetch') load();
  }
}
const minToHHMM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function saveForm() { form.name = $('#fName')?.value ?? form.name; form.phone = $('#fPhone')?.value ?? form.phone; form.email = $('#fEmail')?.value ?? form.email; form.pickup = $('#fPickup')?.value ?? form.pickup; localStorage.setItem('web_customer', JSON.stringify({ name: form.name, phone: form.phone, email: form.email })); }
async function submit() {
  saveForm();
  const btn = $('#confirmBtn'); btn.disabled = true; const label = btn.textContent; btn.textContent = t('sending');
  try {
    const r = await fetch('/api/online-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, customer_name: form.name, customer_phone: form.phone, customer_email: form.email, pickup: form.pickup, tip_percent: form.tip, payment: form.payment, service_type: form.service, lines: cart }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'error');
    cart = []; saveCart();
    if (data.checkout_url) { location.href = data.checkout_url; return; }
    location.href = `/commander/confirmation.html?id=${data.order.id}&t=${data.order.token}`;
  } catch (e) {
    toast(e.message === 'Failed to fetch' ? t('errNet') : e.message, 'err');
    btn.disabled = false; btn.textContent = label;
    await refreshState(); if (!site.state.ordering) closeSheet();
    if (e.message !== 'Failed to fetch') load();
  }
}

// ---------------------------------------------------------------- misc
function toast(msg, kind = '') { const el = $('#toast'); el.textContent = msg; el.className = 'toast ' + kind; clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 3000); }
if (new URLSearchParams(location.search).get('cancelled')) setTimeout(() => toast(t('cancelled')), 500);
applyLang();
load().catch(() => toast(t('errNet'), 'err'));
setInterval(refreshState, 60000);
// menu updates pushed by the admin
try {
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', role: 'web' }));
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.type === 'menu_updated') load().then(() => toast(t('menuUpdated'))); if (m.type === 'settings_updated') refreshState(); };
} catch {}
