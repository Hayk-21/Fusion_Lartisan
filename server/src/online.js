// Online ordering (website): validation, pickup slots, tips, pay-at-pickup or Stripe Checkout.
import crypto from 'node:crypto';
import { db, getMenu, getSettings, audit } from './db.js';
import { createOrder, getOrder, updateOrderFields, updateOrderStatus } from './orders.js';
import { openState, pickupSlots, resolvePickup } from './hours.js';
import { priceOrder, round2 } from './pricing.js';
import { createCheckoutSession, retrieveSession, refundPaymentIntent } from './stripe.js';

const t = (lang, fr, en) => (lang === 'en' ? en : fr);

export function paymentModes(settings) {
  const stripeReady = !!(settings.stripe_secret_key && settings.stripe_publishable_key);
  const mode = settings.payment_mode || 'counter';
  const modes = [];
  if (mode === 'counter' || mode === 'both' || !stripeReady) modes.push('counter');
  if ((mode === 'stripe' || mode === 'both') && stripeReady) modes.push('stripe');
  return modes;
}

/** Public description of the ordering state for the website. */
export function siteState(settings, now = new Date()) {
  const state = openState(settings, now);
  const slots = settings.online_ordering ? pickupSlots(settings, now) : [];
  return {
    open: state.open, reason: state.reason, today: state.today, next: state.next, now_local: state.now_local, test_mode: !!settings.test_mode,
    ordering: !!settings.online_ordering && state.open && slots.length > 0,
    slots, payment_modes: paymentModes(settings),
    tips: settings.tips_enabled ? (settings.tip_options || [0, 10, 15, 20]) : null,
    lead_minutes: settings.pickup_lead_minutes,
  };
}

/** Home page: the best sellers (last 90 days) of the "daily special" section, 4 by default. */
export function featuredItems(settings, menu) {
  const n = Number(settings.featured_count) || 4;
  const specials = new Set(menu.categories.filter(c => c.daily_special && c.visible !== false).map(c => c.id));
  let pool = menu.items.filter(i => i.available !== false && specials.has(i.category_id));
  if (!pool.length) pool = menu.items.filter(i => i.available !== false);
  const sold = salesByItem(90);
  pool.sort((a, b) => (sold[b.id] || 0) - (sold[a.id] || 0) || (a.sort ?? 0) - (b.sort ?? 0));
  return pool.slice(0, n).map(i => ({
    id: i.id, name: i.name, description: i.description, image: i.image, badge: i.badge, category_id: i.category_id,
    price: i.variants?.length ? Math.min(...i.variants.map(v => v.price)) : i.price, from: !!(i.variants?.length),
  }));
}
function salesByItem(days) {
  const out = {};
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    for (const r of db.prepare("SELECT lines FROM orders WHERE status = 'completed' AND created_at >= ?").all(since))
      for (const l of JSON.parse(r.lines)) out[l.item_id] = (out[l.item_id] || 0) + (l.qty || 1);
  } catch {}
  return out;
}

/**
 * Creates an online order. Returns { ok, status, error } or { ok:true, order, checkout_url? }.
 * payload: { lang, customer_name, customer_phone, customer_email, pickup, tip_percent|tip_amount, payment, lines, note }
 */
export async function createOnlineOrder(payload, { baseUrl } = {}) {
  const settings = getSettings();
  const lang = payload.lang === 'en' ? 'en' : 'fr';
  if (!settings.online_ordering) return { ok: false, status: 403, error: t(lang, 'La commande en ligne est désactivée pour le moment.', 'Online ordering is currently disabled.') };
  const state = siteState(settings);
  if (!state.open) return { ok: false, status: 409, error: t(lang, 'Le café est fermé, impossible de commander pour le moment.', 'The café is closed, ordering is not possible right now.') };
  if (!state.ordering) return { ok: false, status: 409, error: t(lang, 'Trop tard pour commander aujourd’hui, revenez demain !', 'Too late to order today, see you tomorrow!') };

  const name = String(payload.customer_name || '').trim().slice(0, 40);
  const phone = String(payload.customer_phone || '').replace(/[^\d+() .-]/g, '').trim().slice(0, 24);
  const email = String(payload.customer_email || '').trim().slice(0, 80);
  if (name.length < 2) return { ok: false, status: 400, error: t(lang, 'Votre nom est requis.', 'Your name is required.') };
  if (phone.replace(/\D/g, '').length < 10) return { ok: false, status: 400, error: t(lang, 'Un numéro de téléphone valide est requis (pour vous joindre).', 'A valid phone number is required (so we can reach you).') };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, status: 400, error: t(lang, 'Courriel invalide.', 'Invalid e-mail.') };

  const pickup = resolvePickup(settings, payload.pickup);
  if (!pickup) return { ok: false, status: 400, error: t(lang, 'Heure de ramassage non disponible, choisissez-en une autre.', 'That pickup time is not available, please pick another.') };

  const modes = paymentModes(settings);
  const payment = modes.includes(payload.payment) ? payload.payment : modes[0];

  // tip: percent of subtotal (from the allowed list) or a custom amount
  const menu = getMenu();
  const priced = priceOrder(menu, Array.isArray(payload.lines) ? payload.lines : [], settings, lang);
  if (!priced.ok) return { ok: false, status: 409, error: priced.error };
  let tip = 0;
  if (settings.tips_enabled) {
    if (payload.tip_amount != null) tip = Math.max(0, Math.min(500, round2(Number(payload.tip_amount) || 0)));
    else if (payload.tip_percent != null) { const pct = Number(payload.tip_percent); if ((settings.tip_options || []).includes(pct)) tip = round2(priced.subtotal * pct / 100); }
  }

  const token = crypto.randomBytes(12).toString('hex');
  const r = createOrder(
    { lang, lines: payload.lines, customer_name: name, service_type: payload.service_type === 'dine_in' ? 'dine_in' : 'takeout', note: payload.note, device_name: t(lang, 'Site web', 'Website'), device_id: 'web' },
    { source: 'online', pickup_time: pickup.time, tip, payment_method: payment, payment_status: 'unpaid', customer_phone: phone, customer_email: email || null,
      public_token: token, status: payment === 'stripe' ? 'pending_payment' : 'new' },
  );
  if (!r.ok) return r;
  let order = r.order;

  if (payment === 'stripe') {
    try {
      const base = (settings.public_url || baseUrl || '').replace(/\/$/, '');
      const session = await createCheckoutSession(settings, order, {
        successUrl: `${base}/commander/confirmation.html?id=${order.id}&t=${token}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}/commander/?cancelled=${order.id}`,
      });
      order = updateOrderFields(order.id, { payment_ref: session.id });
      audit('online.checkout', `#${order.number} → Stripe session ${session.id}`);
      return { ok: true, order: publicOrder(order), checkout_url: session.url };
    } catch (e) {
      updateOrderStatus(order.id, 'cancelled');
      audit('online.stripe.error', e.message);
      return { ok: false, status: 502, error: t(lang, 'Le paiement en ligne est indisponible pour le moment. Choisissez « Payer au comptoir ».', 'Online payment is unavailable right now. Please choose “Pay at pickup”.') };
    }
  }
  return { ok: true, order: publicOrder(order), fresh: order };
}

/** Called by the Stripe webhook or the success page: confirms payment and releases the order to the kitchen. */
export async function confirmStripePayment(orderId, { sessionId, paymentIntent, verified = false } = {}) {
  const settings = getSettings();
  const order = getOrder(orderId);
  if (!order) return null;
  if (order.payment_status === 'paid') return { order, already: true };
  let pi = paymentIntent;
  if (!verified) {          // success-page path: double-check with Stripe before trusting the browser
    const s = await retrieveSession(settings, sessionId || order.payment_ref);
    if (s.payment_status !== 'paid' || String(s.client_reference_id) !== String(order.id)) return { order, unpaid: true };
    pi = s.payment_intent;
  }
  const updated = updateOrderFields(order.id, { payment_status: 'paid', payment_ref: pi || order.payment_ref, status: 'new' });
  audit('online.paid', `#${order.number} (${pi || ''})`);
  return { order: updated, released: true };
}

export async function refundIfPaid(order) {
  const settings = getSettings();
  if (order.payment_method !== 'stripe' || order.payment_status !== 'paid' || !order.payment_ref) return null;
  try {
    const r = await refundPaymentIntent(settings, order.payment_ref);
    updateOrderFields(order.id, { payment_status: 'refunded' });
    audit('online.refund', `#${order.number} ${r.id}`);
    return r;
  } catch (e) { audit('online.refund.error', `#${order.number}: ${e.message}`); throw e; }
}

export function publicOrder(o) {
  return { id: o.id, number: o.number, status: o.status, pickup_time: o.pickup_time, service_type: o.service_type, total: o.total, tip: o.tip, subtotal: o.subtotal, tax_gst: o.tax_gst, tax_qst: o.tax_qst,
    payment_method: o.payment_method, payment_status: o.payment_status, customer_name: o.customer_name, created_at: o.created_at, lines: o.lines, token: o.public_token };
}
