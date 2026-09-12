/* Touch-screen menu (v2): 6 photo tiles → section page with filters → item sheet → cart / confirm.
   Modes (from the URL): /local = café counter (PIN, orders straight to the kitchen)
                         /tablette = tablets (orders straight to the kitchen, tablet name)
                         /commander = public website (contact details, pickup time, pay at pickup / online) */
import { priceLine, priceOrder } from '/shared/pricing.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MODE = location.pathname.startsWith('/local') ? 'local' : location.pathname.startsWith('/tablette') ? 'tablet' : 'web';
document.body.classList.add('mode-' + MODE);

const STR = {
  fr: { back: 'Retour', confirm: 'Confirmer', confirmN: 'Confirmer · {n} · {t}', yourOrder: 'Votre commande', clear: 'Vider', empty: 'Votre commande est vide.\nTouchez un plat pour commencer.',
    from: 'à partir de', add: 'Ajouter', included: 'inclus', includedOf: '{c}/{n} inclus', extra: 'suppl.', required: 'Requis', choose: 'Choisir', qty: 'Quantité', note: 'Note pour la cuisine (allergies, sans oignon…)',
    subtotal: 'Sous-total', gst: 'TPS ({r} %)', qst: 'TVQ ({r} %)', tip: 'Pourboire', total: 'Total', items: '{n} article(s)', all: 'Tout', filters: 'Filtres', special: 'Spécial du jour', specialStrip: '⭐ Voir le spécial du jour',
    tags: { hot: 'Chaud', cold: 'Froid', special: 'Spécial du jour', donate: 'Don 1 $', popular: 'Populaire', 'gluten-free': 'Sans gluten', vegetarian: 'Végé', vegan: 'Végane', new: 'Nouveau', kids: 'Enfants' },
    noResult: 'Aucun plat pour ce filtre.', order: 'Commander', sendOrder: 'Envoyer la commande', nameOpt: 'Prénom du client (facultatif)', service: 'Sur place ou à emporter ?', dineIn: 'Sur place', takeout: 'À emporter',
    tipLabel: 'Pourboire pour l\'équipe', noTip: 'Sans', thanks: 'Commande envoyée en cuisine', giveNumber: 'Numéro de commande', newOrder: 'Nouvelle commande', autoBack: 'Retour au menu dans {s} s', payNote: 'Paiement au comptoir.',
    coTitle: 'Finaliser la commande', coSub: 'Ramassage au café · {addr}', name: 'Votre nom', phone: 'Téléphone', email: 'Courriel (facultatif)', pickup: 'Heure de ramassage', arrival: "Heure d'arrivée", asap: 'Dès que possible (~{m} min, vers {t})',
    payment: 'Paiement', payCounter: 'Payer au comptoir', payStripe: 'Payer en ligne (carte, Apple Pay, Google Pay)', payCounterNote: 'Vous réglez au comptoir (carte, débit ou comptant) en venant chercher votre commande.', payStripeNote: 'Vous serez redirigé vers une page de paiement sécurisée (Stripe).', confirmPay: 'Payer {t}', sending: 'Envoi…',
    open: 'Ouvert · ferme à {t}', closed: 'Fermé', closedTemp: 'Fermé exceptionnellement', opensTomorrow: 'ouvre demain à {t}', opensToday: 'ouvre à {t}',
    bannerClosed: 'Le café est fermé · la commande en ligne reprend {when}. Vous pouvez consulter le menu.', bannerTemp: 'Le café est fermé pour le moment · la commande en ligne reprendra à la réouverture.', bannerLate: "Trop tard pour commander aujourd'hui · à demain !", bannerOff: 'La commande en ligne est temporairement désactivée.',
    closedBtn: 'Café fermé', lateBtn: "Trop tard pour aujourd'hui", localTitle: 'Mode comptoir', localHint: 'Entrez le code PIN pour ouvrir le menu du café.', wrongPin: 'Code PIN incorrect', counter: 'Comptoir', tablet: 'Tablette', tabletName: 'Nom de cette tablette', save: 'Enregistrer',
    menuUpdated: 'Le menu a été mis à jour', errNet: 'Connexion impossible, réessayez.', cancelled: 'Paiement annulé · votre panier est conservé.', max: 'Maximum {n}', orderOnline: 'Commander en ligne' },
  en: { back: 'Back', confirm: 'Confirm', confirmN: 'Confirm · {n} · {t}', yourOrder: 'Your order', clear: 'Clear', empty: 'Your order is empty.\nTap a dish to start.',
    from: 'from', add: 'Add', included: 'included', includedOf: '{c}/{n} included', extra: 'extra', required: 'Required', choose: 'Choose', qty: 'Quantity', note: 'Note for the kitchen (allergies, no onion…)',
    subtotal: 'Subtotal', gst: 'GST ({r}%)', qst: 'QST ({r}%)', tip: 'Tip', total: 'Total', items: '{n} item(s)', all: 'All', filters: 'Filters', special: "Today's special", specialStrip: "⭐ See today's special",
    tags: { hot: 'Hot', cold: 'Cold', special: "Today's special", donate: 'Donate $1', popular: 'Popular', 'gluten-free': 'Gluten-free', vegetarian: 'Veggie', vegan: 'Vegan', new: 'New', kids: 'Kids' },
    noResult: 'No dish for this filter.', order: 'Order', sendOrder: 'Send order', nameOpt: 'Customer first name (optional)', service: 'Dine in or take out?', dineIn: 'Dine in', takeout: 'Take out',
    tipLabel: 'Tip for the team', noTip: 'None', thanks: 'Order sent to the kitchen', giveNumber: 'Order number', newOrder: 'New order', autoBack: 'Back to the menu in {s} s', payNote: 'Pay at the counter.',
    coTitle: 'Complete your order', coSub: 'Pickup at the café · {addr}', name: 'Your name', phone: 'Phone', email: 'E-mail (optional)', pickup: 'Pickup time', arrival: 'Arrival time', asap: 'As soon as possible (~{m} min, around {t})',
    payment: 'Payment', payCounter: 'Pay at pickup', payStripe: 'Pay online (card, Apple Pay, Google Pay)', payCounterNote: 'You pay at the counter (card, debit or cash) when you pick up your order.', payStripeNote: 'You will be redirected to a secure payment page (Stripe).', confirmPay: 'Pay {t}', sending: 'Sending…',
    open: 'Open · closes at {t}', closed: 'Closed', closedTemp: 'Exceptionally closed', opensTomorrow: 'opens tomorrow at {t}', opensToday: 'opens at {t}',
    bannerClosed: 'The café is closed · online ordering resumes {when}. You can still browse the menu.', bannerTemp: 'The café is closed at the moment · online ordering resumes when it reopens.', bannerLate: 'Too late to order today · see you tomorrow!', bannerOff: 'Online ordering is temporarily disabled.',
    closedBtn: 'Café closed', lateBtn: 'Too late for today', localTitle: 'Counter mode', localHint: 'Enter the PIN to open the café menu.', wrongPin: 'Wrong PIN', counter: 'Counter', tablet: 'Tablet', tabletName: 'Name of this tablet', save: 'Save',
    menuUpdated: 'The menu was updated', errNet: 'Cannot connect, please retry.', cancelled: 'Payment cancelled · your cart was kept.', max: 'Maximum {n}', orderOnline: 'Order online' },
};
let lang = localStorage.getItem('site_lang') || ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
const t = (k, v = {}) => { let s = STR[lang][k] ?? STR.fr[k] ?? k; if (typeof s !== 'string') return s; for (const [a, b] of Object.entries(v)) s = s.replace('{' + a + '}', b); return s; };
const tagName = tag => (STR[lang].tags[tag] || STR.fr.tags[tag] || tag);
const txt = o => o ? ((lang === 'en' && o.en) ? o.en : (o.fr || o.en || '')) : '';
const money = n => { const v = (Math.round(n * 100) / 100).toFixed(2); return lang === 'en' ? '$' + v : v.replace('.', ',') + ' $'; };
const rate = r => lang === 'en' ? String(r) : String(r).replace('.', ',');
const fmtT = hhmm => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return lang === 'en' ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` : `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}`; };
const minToHHMM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

let menu = null, site = null, settings = { tax_gst: 5, tax_qst: 9.975 };
let view = { page: 'home', section: null, subcat: null, tag: null };
const CART_KEY = MODE === 'web' ? 'web_cart' : 'kiosk_cart_' + MODE;
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const saved = JSON.parse(localStorage.getItem('web_customer') || '{}');
let form = { name: saved.name || '', phone: saved.phone || '', email: saved.email || '', pickup: 'asap', tip: null, payment: null, service: MODE === 'web' ? 'takeout' : 'dine_in' };
let idleTimer = null;

// ---------------------------------------------------------------- helpers
const byId = (arr, id) => arr.find(x => x.id === id);
const catsOf = sec => sec.category_ids.map(id => byId(menu.categories, id)).filter(c => c && c.visible !== false);
const itemsOfCat = cid => menu.items.filter(i => i.category_id === cid && i.available !== false).sort((a, b) => a.sort - b.sort);
const specialCat = () => menu.categories.find(c => c.daily_special && c.visible !== false);
const hasSpecial = () => { const c = specialCat(); return c && itemsOfCat(c.id).length > 0; };
const isSpecial = it => { const c = specialCat(); return (c && it.category_id === c.id) || (it.tags || []).includes('special'); };
const minPrice = it => it.variants?.length ? Math.min(...it.variants.map(v => v.price)) : it.price;
const configurable = it => it.variants?.length || it.option_groups?.some(g => g.included > 0 || g.options.some(o => o.price));
const imgOf = it => it.image || byId(menu.categories, it.category_id)?.image || (menu.sections.find(s => s.category_ids.includes(it.category_id))?.image) || '';
const cartQty = id => cart.filter(l => l.item_id === id).reduce((s, l) => s + l.qty, 0);

function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $$('.lang button').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  $('#navSub').textContent = MODE === 'local' ? t('counter') : MODE === 'tablet' ? t('tablet') : t('orderOnline');
  if (menu) render();
}
$$('.lang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; localStorage.setItem('site_lang', lang); applyLang(); });

// ---------------------------------------------------------------- data
async function load() {
  const [m, s] = await Promise.all([fetch('/api/menu').then(r => r.json()), fetch('/api/site').then(r => r.json())]);
  menu = m; site = s; settings = { ...settings, ...m.settings };
  $('#navName').textContent = s.cafe_name; $('#navLogo').src = s.logo_url || '/shared/logo-mark.png'; document.title = `${s.cafe_name} · Menu`;
  if (view.section && !byId(menu.sections, view.section)) view = { page: 'home', section: null, subcat: null, tag: null };
  render(); renderState();
}
async function refreshState() { try { site.state = await fetch('/api/site/state').then(r => r.json()); renderState(); } catch {} }

// ---------------------------------------------------------------- open / closed
function renderState() {
  const st = site.state, badge = $('#openBadge');
  badge.className = 'badge ' + (st.open ? 'open' : 'closed');
  let hint = '';
  if (st.next) hint = st.next.today ? t('opensToday', { t: fmtT(st.next.open) }) : t('opensTomorrow', { t: fmtT(st.next.open) });
  $('#openText').textContent = st.open ? t('open', { t: fmtT(st.today.close) }) : (st.reason === 'temporarily_closed' ? t('closedTemp') : t('closed') + (hint ? ' · ' + hint : ''));
  const banner = $('#closedBanner');
  if (MODE === 'web' && !st.ordering) {
    banner.classList.remove('hidden');
    banner.textContent = st.reason === 'temporarily_closed' ? (txt(site.closed_message) || t('bannerTemp')) : !st.open ? t('bannerClosed', { when: hint }) : (st.open && !st.slots.length ? t('bannerLate') : t('bannerOff'));
  } else banner.classList.add('hidden');
  renderBar();
}
const canOrder = () => MODE !== 'web' || !!site?.state?.ordering;

// ---------------------------------------------------------------- rendering
function render() { renderHome(); renderSection(); renderBar(); }
function renderHome() {
  const home = $('#home'); home.classList.toggle('hidden', view.page !== 'home');
  $('#backBtn').classList.toggle('hidden', view.page === 'home');
  if (view.page !== 'home') return;
  const secs = menu.sections.filter(s => catsOf(s).length);
  $('#tiles').innerHTML = secs.map(s => { const n = catsOf(s).reduce((k, c) => k + itemsOfCat(c.id).length, 0);
    return `<button class="tile ${s.image ? '' : 'placeholder'}" data-sec="${esc(s.id)}">${s.image ? `<img src="${esc(s.image)}" alt="">` : ''}<span class="cap"><b>${esc(txt(s.name))}</b><small>${n} ${lang === 'en' ? 'choices' : 'choix'}</small></span></button>`; }).join('');
  $('#tiles').onclick = e => { const b = e.target.closest('[data-sec]'); if (b) openSection(b.dataset.sec); };
  const strip = $('#specialStrip'); strip.classList.toggle('hidden', !hasSpecial()); strip.textContent = t('specialStrip');
  strip.onclick = () => openSection(null, 'special');
}
function openSection(id, tag = null) { view = { page: 'section', section: id, subcat: null, tag }; render(); $('#section .content').scrollTop = 0; }
function goHome() { view = { page: 'home', section: null, subcat: null, tag: null }; render(); }
function renderSection() {
  const sec = $('#section'); sec.classList.toggle('hidden', view.page !== 'section'); if (view.page !== 'section') return;
  const section = view.section ? byId(menu.sections, view.section) : null;
  const cats = section ? catsOf(section) : menu.categories.filter(c => c.visible !== false);
  const specialOnly = !section && view.tag === 'special';
  // pool of items for this page
  let pool = specialOnly ? menu.items.filter(i => i.available !== false && isSpecial(i)) : cats.flatMap(c => itemsOfCat(c.id));
  // filters: tags present in the pool (+ special when relevant)
  const tagsHere = [...new Set(pool.flatMap(i => i.tags || []))].filter(x => x !== 'special');
  if (!specialOnly && pool.some(isSpecial)) tagsHere.unshift('special');
  const ICON = { hot: '🔥', cold: '🧊', special: '⭐', donate: '💚', popular: '❤️', 'gluten-free': '🌾', vegetarian: '🥬', vegan: '🌱', new: '✨', kids: '🧒' };
  $('#filters').innerHTML = `<h4>${t('filters')}</h4><button class="chip ${!view.tag ? 'on' : ''}" data-tag="">${t('all')}</button>` +
    tagsHere.map(x => `<button class="chip ${view.tag === x ? 'on' : ''}" data-tag="${esc(x)}"><span class="ic">${ICON[x] || '🏷️'}</span>${esc(tagName(x))}</button>`).join('');
  $('#filters').onclick = e => { const b = e.target.closest('[data-tag]'); if (!b) return; view.tag = b.dataset.tag || null; if (specialOnly && !view.tag) { goHome(); return; } renderSection(); };
  $('#secTitle').textContent = section ? txt(section.name) : t('special');
  // sub-categories (only when the section groups several)
  const sub = $('#subcats');
  sub.innerHTML = cats.length > 1 && !specialOnly ? `<button class="${!view.subcat ? 'on' : ''}" data-cat="">${t('all')}</button>` + cats.map(c => `<button class="${view.subcat === c.id ? 'on' : ''}" data-cat="${esc(c.id)}">${esc(c.icon || '')} ${esc(txt(c.name))}</button>`).join('') : '';
  sub.onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; view.subcat = b.dataset.cat || null; renderSection(); };
  // items
  let shown = pool;
  if (view.subcat) shown = shown.filter(i => i.category_id === view.subcat);
  if (view.tag) shown = shown.filter(i => view.tag === 'special' ? isSpecial(i) : (i.tags || []).includes(view.tag));
  const grid = $('#grid'); let html = '';
  const groups = (!view.subcat && cats.length > 1 && !specialOnly) ? cats : [null];
  for (const c of groups) {
    const list = c ? shown.filter(i => i.category_id === c.id) : shown;
    if (!list.length) continue;
    if (c) html += `<h3 class="cat">${esc(c.icon || '')} ${esc(txt(c.name))}</h3>`;
    html += list.map(it => { const img = imgOf(it); const q = cartQty(it.id); const tags = (it.tags || []).filter(x => ['special', 'donate', 'new', 'popular'].includes(x)); if (isSpecial(it) && !tags.includes('special')) tags.unshift('special');
      return `<button class="item" data-id="${esc(it.id)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<div class="ph"></div>'}
        ${tags.length ? `<span class="tagline">${tags.map(x => `<span class="tag ${x}">${esc(tagName(x))}</span>`).join('')}</span>` : ''}${q ? `<span class="qty-badge">×${q}</span>` : ''}
        <span class="body"><span class="nm">${esc(txt(it.name))}</span><span class="ds">${esc(txt(it.description))}</span><span class="pr">${configurable(it) ? `<small>${t('from')}</small> ` : ''}${money(minPrice(it))}</span></span></button>`; }).join('');
  }
  grid.innerHTML = html || `<div class="empty">${t('noResult')}</div>`;
  grid.onclick = e => { const b = e.target.closest('.item'); if (b) openItem(b.dataset.id); };
}
function renderBar() {
  const btn = $('#cartBtn'); const count = cart.reduce((s, l) => s + l.qty, 0);
  let total = 0; if (cart.length) { const p = priceOrder(menu, cart, settings, lang); if (p.ok) total = p.total; }
  const st = site?.state;
  if (MODE === 'web' && st && !st.ordering) { btn.disabled = true; $('#cartBtnText').textContent = st.open && !st.slots.length ? t('lateBtn') : t('closedBtn'); return; }
  btn.disabled = !cart.length;
  $('#cartBtnText').textContent = cart.length ? t('confirmN', { n: t('items', { n: count }), t: money(total) }) : t('confirm');
}
$('#backBtn').onclick = goHome;
$('#cartBtn').onclick = () => openCart();
$('#brandLink').onclick = e => { if (MODE !== 'web') { e.preventDefault(); goHome(); } };

// ---------------------------------------------------------------- item sheet
function closeSheet() { $('#sheet').classList.add('hidden'); }
$('#sheet').onclick = e => { if (e.target === $('#sheet')) closeSheet(); };
function openItem(id) {
  const it = byId(menu.items, id); if (!it || it.available === false) return;
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
        const dis = o.available === false || (g.type !== 'single' && !on && g.max && picks.length >= g.max);
        return `<div class="opt ${g.type === 'single' ? 'radio' : ''} ${on ? 'on' : ''} ${dis ? 'dis' : ''}" data-g="${g.id}" data-o="${o.id}"><span class="box">${on ? '✓' : ''}</span><span class="txt"><span class="name">${esc(txt(o.name))}</span>${priceTxt ? `<span class="sub">${priceTxt}</span>` : ''}</span></div>`; };
      body.push(`<div class="grp"><h3><span>${esc(txt(g.name))}${g.required ? `<span class="req">${t('required')}</span>` : ''}</span>${counter}</h3>${g.hint ? `<p class="hint">${esc(txt(g.hint))}</p>` : ''}` +
        (sections.length > 1 || sections[0] ? sections.map(s => `${s ? `<h4>${esc(s)}</h4>` : ''}<div class="opts">${g.options.filter(o => txt(o.section) === s).map(optHtml).join('')}</div>`).join('') : `<div class="opts">${g.options.map(optHtml).join('')}</div>`) + '</div>');
    }
    body.push(`<div class="grp"><h3>${t('qty')}</h3><div class="qty"><button data-qd="-1">−</button><span>${line.qty}</span><button data-qd="1">+</button></div></div><div class="grp"><input class="note-in" id="noteIn" maxlength="120" placeholder="${esc(t('note'))}" value="${esc(line.note)}"></div>`);
    const img = imgOf(it);
    $('#sheetCard').innerHTML = `${img ? `<div class="sheet-hero"><img src="${esc(img)}" alt=""></div>` : ''}<div class="sheet-head"><div><h2>${esc(txt(it.name))}</h2><p>${esc(txt(it.description))}</p></div><button class="close" id="sheetClose">✕</button></div><div class="sheet-body">${body.join('')}</div>
      <div class="sheet-foot"><div class="total">${r.ok ? money(r.priced.line_total) : '-'}</div><button class="btn primary big" id="addBtn" ${r.ok ? '' : 'disabled'}>${r.ok ? '+ ' + t('add') : esc(r.error)}</button></div>`;
    $('#sheetClose').onclick = closeSheet;
    $('#addBtn').onclick = () => { line.note = $('#noteIn').value.trim(); const same = cart.find(c => JSON.stringify([c.item_id, c.variant_id, c.options, c.note]) === JSON.stringify([line.item_id, line.variant_id, line.options, line.note])); if (same) same.qty += line.qty; else cart.push(line); saveCart(); closeSheet(); renderSection(); renderBar(); toast('✓ ' + txt(it.name)); touch(); };
    $('#noteIn').oninput = e => { line.note = e.target.value; };
    $$('#sheetCard [data-qd]').forEach(b => b.onclick = () => { line.qty = Math.max(1, Math.min(20, line.qty + +b.dataset.qd)); draw(); });
    $$('#sheetCard [data-v]').forEach(b => b.onclick = () => { line.variant_id = b.dataset.v; draw(); });
    $$('#sheetCard [data-o]').forEach(b => b.onclick = () => {
      const g = it.option_groups.find(x => x.id === b.dataset.g); const oid = b.dataset.o; const i = line.options.findIndex(p => p.group_id === g.id && p.option_id === oid);
      if (g.type === 'single') { line.options = line.options.filter(p => p.group_id !== g.id); if (i < 0 || g.required) line.options.push({ group_id: g.id, option_id: oid }); }
      else if (i >= 0) line.options.splice(i, 1); else { const n = line.options.filter(p => p.group_id === g.id).length; if (!g.max || n < g.max) line.options.push({ group_id: g.id, option_id: oid }); }
      draw();
    });
  };
  draw(); $('#sheet').classList.remove('hidden'); touch();
}

// ---------------------------------------------------------------- cart / confirm
function closeCart() { $('#cartPanel').classList.add('hidden'); }
$('#cartPanel').onclick = e => { if (e.target === $('#cartPanel')) closeCart(); };
function openCart() {
  if (!cart.length) return;
  const p = priceOrder(menu, cart, settings, lang); if (!p.ok) { cart = cart.filter(l => priceLine(menu, l, lang).ok); saveCart(); toast(p.error, 'err'); renderBar(); return; }
  const st = site.state;
  const tips = settings.tips_enabled !== false && Array.isArray(settings.tip_options) && settings.tip_options.length ? settings.tip_options : null;
  if (form.tip == null || (tips && !tips.includes(form.tip))) form.tip = tips ? (tips.includes(10) ? 10 : tips[0]) : 0;
  const tipAmt = tips ? Math.round(p.subtotal * form.tip) / 100 : 0;
  const total = Math.round((p.total + tipAmt) * 100) / 100;
  const webModes = MODE === 'web' ? st.payment_modes : ['counter'];
  if (!form.payment || !webModes.includes(form.payment)) form.payment = webModes[0];
  const lines = p.lines.map((l, i) => { const it = byId(menu.items, cart[i].item_id); const img = it ? imgOf(it) : '';
    return `<div class="cline">${img ? `<img src="${esc(img)}" alt="">` : '<div class="ph"></div>'}<div class="info"><div class="nm">${esc(l.name)}${l.variant_name ? ' · ' + esc(l.variant_name) : ''} <span class="muted">×${l.qty}</span></div><div class="opts">${l.options.map(o => esc(o.name)).join(', ')}</div>${l.note ? `<div class="note">✎ ${esc(l.note)}</div>` : ''}</div>
      <div class="qty"><button data-q="-1" data-i="${i}">−</button><span>${l.qty}</span><button data-q="1" data-i="${i}">+</button></div><div class="pr">${money(l.line_total)}</div></div>`; }).join('');
  const web = MODE === 'web';
  const formHtml = web ? `
      <div class="row2"><div class="field"><label>${t('name')} *</label><input id="fName" value="${esc(form.name)}" maxlength="40" autocomplete="name"></div><div class="field"><label>${t('phone')} *</label><input id="fPhone" value="${esc(form.phone)}" maxlength="24" inputmode="tel" autocomplete="tel" placeholder="514 555 0123"></div></div>
      <div class="field"><label>${t('email')}</label><input id="fEmail" value="${esc(form.email)}" maxlength="80" inputmode="email" autocomplete="email"></div>
      <div class="field"><label>${t('service')}</label><div class="seg" id="svcSeg"><button data-svc="takeout" class="${form.service !== 'dine_in' ? 'on' : ''}">🥡 ${t('takeout')}</button><button data-svc="dine_in" class="${form.service === 'dine_in' ? 'on' : ''}">🍽️ ${t('dineIn')}</button></div></div>
      <div class="field"><label>${form.service === 'dine_in' ? t('arrival') : t('pickup')}</label><select id="fPickup">${st.slots.map(s => `<option value="${s.value}" ${s.value === form.pickup ? 'selected' : ''}>${s.value === 'asap' ? t('asap', { m: st.lead_minutes, t: fmtT(minToHHMM(s.minutes)) }) : fmtT(s.value)}</option>`).join('')}</select></div>`
    : `<div class="field"><label>${t('nameOpt')}</label><input id="fName" value="${esc(form.name)}" maxlength="40"></div>
      <div class="field"><label>${t('service')}</label><div class="seg" id="svcSeg"><button data-svc="dine_in" class="${form.service !== 'takeout' ? 'on' : ''}">🍽️ ${t('dineIn')}</button><button data-svc="takeout" class="${form.service === 'takeout' ? 'on' : ''}">🥡 ${t('takeout')}</button></div></div>`;
  const tipHtml = tips ? `<div class="field"><label>${t('tipLabel')}</label><div class="seg" id="tipSeg">${tips.map(x => `<button data-tip="${x}" class="${x === form.tip ? 'on' : ''}">${x === 0 ? t('noTip') : x + ' %'}</button>`).join('')}</div></div>` : '';
  const payHtml = web ? (webModes.length > 1 ? `<div class="field"><label>${t('payment')}</label><div class="seg" id="paySeg">${webModes.map(m => `<button data-pay="${m}" class="${m === form.payment ? 'on' : ''}">${m === 'stripe' ? '💳 ' + t('payStripe') : '🏪 ' + t('payCounter')}</button>`).join('')}</div></div>` : '') + `<div class="pay-note">${form.payment === 'stripe' ? t('payStripeNote') : t('payCounterNote')}</div>` : `<div class="pay-note">${t('payNote')}</div>`;
  $('#cartCard').innerHTML = `<div class="sheet-head"><div><h2>${t('yourOrder')}</h2><p>${web ? t('coSub', { addr: esc(site.address) }) : ''}</p></div><div style="display:flex;gap:8px"><button class="btn ghost" id="cartClear">${t('clear')}</button><button class="close" id="cartClose">✕</button></div></div>
    <div class="sheet-body">${lines}${formHtml}${tipHtml}${payHtml}
      <div class="totals"><div><span>${t('subtotal')}</span><span>${money(p.subtotal)}</span></div><div><span>${t('gst', { r: rate(settings.tax_gst) })}</span><span>${money(p.tax_gst)}</span></div><div><span>${t('qst', { r: rate(settings.tax_qst) })}</span><span>${money(p.tax_qst)}</span></div>${tipAmt ? `<div><span>${t('tip')}</span><span>${money(tipAmt)}</span></div>` : ''}<div class="tot"><span>${t('total')}</span><span>${money(total)}</span></div></div>
    </div>
    <div class="sheet-foot"><button class="btn big" id="backBtn2">← ${t('back')}</button><button class="btn primary big" id="confirmBtn">${web && form.payment === 'stripe' ? '💳 ' + t('confirmPay', { t: money(total) }) : '✓ ' + t('sendOrder')}</button></div>`;
  const keep = () => { form.name = $('#fName')?.value ?? form.name; form.phone = $('#fPhone')?.value ?? form.phone; form.email = $('#fEmail')?.value ?? form.email; form.pickup = $('#fPickup')?.value ?? form.pickup; if (web) localStorage.setItem('web_customer', JSON.stringify({ name: form.name, phone: form.phone, email: form.email })); };
  $('#cartClose').onclick = closeCart; $('#backBtn2').onclick = closeCart;
  $('#cartClear').onclick = () => { cart = []; saveCart(); closeCart(); render(); };
  $('#cartCard').querySelectorAll('button[data-q]').forEach(b => b.onclick = () => { keep(); const i = +b.dataset.i; cart[i].qty += +b.dataset.q; if (cart[i].qty <= 0) cart.splice(i, 1); saveCart(); renderSection(); renderBar(); if (cart.length) openCart(); else closeCart(); });
  $('#svcSeg')?.addEventListener('click', e => { const b = e.target.closest('[data-svc]'); if (!b) return; keep(); form.service = b.dataset.svc; openCart(); });
  $('#tipSeg')?.addEventListener('click', e => { const b = e.target.closest('[data-tip]'); if (!b) return; keep(); form.tip = Number(b.dataset.tip); openCart(); });
  $('#paySeg')?.addEventListener('click', e => { const b = e.target.closest('[data-pay]'); if (!b) return; keep(); form.payment = b.dataset.pay; openCart(); });
  ['fName', 'fPhone', 'fEmail'].forEach(id => { const el = $('#' + id); if (el) el.oninput = keep; });
  if ($('#fPickup')) $('#fPickup').onchange = keep;
  $('#confirmBtn').onclick = () => { keep(); submit(); };
  $('#cartPanel').classList.remove('hidden'); touch();
}
async function submit() {
  const btn = $('#confirmBtn'); btn.disabled = true; const label = btn.textContent; btn.textContent = t('sending');
  try {
    if (MODE === 'web') {
      const r = await fetch('/api/online-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, customer_name: form.name, customer_phone: form.phone, customer_email: form.email, pickup: form.pickup, tip_percent: form.tip, payment: form.payment, service_type: form.service, lines: cart }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || 'error');
      cart = []; saveCart();
      if (data.checkout_url) { location.href = data.checkout_url; return; }
      location.href = `/commander/confirmation.html?id=${data.order.id}&t=${data.order.token}`; return;
    }
    const dev = deviceInfo();
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: dev.id, device_name: dev.name, customer_name: form.name.trim(), service_type: form.service === 'takeout' ? 'takeout' : 'dine_in', lang, lines: cart, tip_percent: form.tip }) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || 'error');
    cart = []; saveCart(); form.name = ''; form.service = 'dine_in'; form.tip = null;
    let secs = Math.max(3, Math.min(120, Number(settings.thank_you_seconds) || 12));
    $('#cartCard').innerHTML = `<div class="success"><h2>${t('thanks')}</h2><p class="muted">${t('giveNumber')}</p><div class="num">#${data.number}</div><p><button class="btn primary big" id="newOrderBtn">${t('newOrder')}</button></p><p class="muted" id="autoBack">${t('autoBack', { s: secs })}</p></div>`;
    const done = () => { clearInterval(tm); closeCart(); goHome(); };
    $('#newOrderBtn').onclick = done;
    const tm = setInterval(() => { secs--; if (secs <= 0) done(); else { const p = $('#autoBack'); if (p) p.textContent = t('autoBack', { s: secs }); } }, 1000);
  } catch (e) {
    toast(e.message === 'Failed to fetch' ? t('errNet') : e.message, 'err');
    btn.disabled = false; btn.textContent = label;
    if (MODE === 'web') { await refreshState(); if (!site.state.ordering) closeCart(); }
    if (e.message !== 'Failed to fetch') load();
  }
}

// ---------------------------------------------------------------- device identity (tablets / counter)
function deviceInfo() {
  if (MODE === 'local') return { id: 'local-pc', name: 'Comptoir' };
  let id = localStorage.getItem('tablet_id'); if (!id) { id = 'web-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('tablet_id', id); }
  const q = new URLSearchParams(location.search).get('device'); if (q) localStorage.setItem('tablet_name', q);
  return { id, name: localStorage.getItem('tablet_name') || 'Tablette' };
}
if (MODE === 'tablet') {
  deviceInfo();
  // long-press on the logo → rename the tablet
  let pressTimer; const brand = $('#brandLink');
  const start = () => { pressTimer = setTimeout(() => { const n = prompt(t('tabletName'), localStorage.getItem('tablet_name') || 'Tablette 1'); if (n) { localStorage.setItem('tablet_name', n.trim()); hello(); } }, 1500); };
  const stop = () => clearTimeout(pressTimer);
  brand.addEventListener('touchstart', start, { passive: true }); brand.addEventListener('mousedown', start); ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => brand.addEventListener(ev, stop));
}
// counter mode: PIN gate + fullscreen
if (MODE === 'local') {
  const gate = $('#pinGate'); let pin = '';
  const dots = () => $$('#pinDots span').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  async function submitPin() {
    if (pin.length < 4) return;
    try { const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }); if (!r.ok) throw new Error('bad'); gate.classList.add('hidden'); }
    catch (e) { $('#pinError').textContent = e.message === 'Failed to fetch' ? t('errNet') : t('wrongPin'); }
    pin = ''; dots();
  }
  $('#pinPad').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; const k = b.dataset.k; $('#pinError').textContent = ''; if (k === 'clear') pin = ''; else if (k === 'ok') return submitPin(); else if (pin.length < 8) pin += k; dots(); if (pin.length === 4) submitPin(); });
  document.addEventListener('keydown', e => { if (gate.classList.contains('hidden')) return; if (/^\d$/.test(e.key) && pin.length < 8) { pin += e.key; dots(); if (pin.length === 4) submitPin(); } else if (e.key === 'Backspace') { pin = pin.slice(0, -1); dots(); } else if (e.key === 'Enter') submitPin(); });
  fetch('/api/admin/session').then(r => r.json()).then(j => { if (!j.logged_in) gate.classList.remove('hidden'); }).catch(() => gate.classList.remove('hidden'));
}
if (MODE !== 'web') {
  const fs = $('#fsBtn'); fs.classList.remove('hidden');
  fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  document.addEventListener('fullscreenchange', () => { fs.textContent = document.fullscreenElement ? '✕' : '⛶'; });
}
// abandoned cart on a kiosk: back to the home page after 5 minutes without a touch
function touch() { if (MODE === 'web') return; clearTimeout(idleTimer); idleTimer = setTimeout(() => { cart = []; saveCart(); closeSheet(); closeCart(); goHome(); }, 5 * 60 * 1000); }
['click', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (cart.length) touch(); }, { passive: true }));

// ---------------------------------------------------------------- misc
function toast(msg, kind = '') { const el = $('#toast'); el.textContent = msg; el.className = 'toast ' + kind; clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 2500); }
if (new URLSearchParams(location.search).get('cancelled')) setTimeout(() => toast(t('cancelled')), 500);
applyLang();
load().catch(() => toast(t('errNet'), 'err'));
setInterval(refreshState, 60000);
let ws;
function hello() { try { if (ws && ws.readyState === 1) { const d = deviceInfo(); ws.send(JSON.stringify(MODE === 'tablet' ? { type: 'hello', role: 'tablet', device_id: d.id, device_name: d.name, app_version: 'web-2.0', menu_version: menu?.version } : { type: 'hello', role: 'web' })); } } catch {} }
function connectWs() {
  try {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    ws.onopen = hello;
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.type === 'menu_updated') load().then(() => toast(t('menuUpdated'))); if (m.type === 'settings_updated') { refreshState(); load(); } };
    ws.onclose = () => setTimeout(connectWs, 3000);
  } catch {}
}
connectWs();
