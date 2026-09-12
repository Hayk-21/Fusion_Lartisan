// Stripe Checkout (hosted page: cards, Apple Pay, Google Pay, Link) using the REST API directly — no SDK.
import crypto from 'node:crypto';

const API = 'https://api.stripe.com/v1';

function form(obj, prefix = '') {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x, i) => parts.push(...form(typeof x === 'object' ? x : { '': x }, `${key}[${i}]`).map(s => s.replace('[]=', '='))));
    else if (typeof v === 'object') parts.push(...form(v, key));
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return parts;
}

async function call(secret, path, body, method = 'POST') {
  const r = await fetch(API + path, {
    method, headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'POST' ? form(body).join('&') : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || `Stripe ${r.status}`);
  return data;
}

/** Creates a Checkout Session for an order; returns {id, url}. Amount in cents, CAD. */
export async function createCheckoutSession(settings, order, { successUrl, cancelUrl }) {
  const cents = Math.round(order.total * 100);
  return call(settings.stripe_secret_key, '/checkout/sessions', {
    mode: 'payment',
    currency: 'cad',
    success_url: successUrl, cancel_url: cancelUrl,
    client_reference_id: String(order.id),
    customer_email: order.customer_email || undefined,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    metadata: { order_id: String(order.id), order_number: String(order.number) },
    payment_intent_data: { description: `${settings.cafe_name}, commande #${order.number}`, metadata: { order_id: String(order.id) } },
    line_items: [{ quantity: 1, price_data: { currency: 'cad', unit_amount: cents, product_data: { name: `${settings.cafe_name}, commande #${order.number}`, description: order.lines.map(l => `${l.qty}× ${l.name}`).join(', ').slice(0, 500) } } }],
  });
}

export async function retrieveSession(settings, id) {
  return call(settings.stripe_secret_key, `/checkout/sessions/${id}`, null, 'GET');
}

export async function refundPaymentIntent(settings, paymentIntent) {
  return call(settings.stripe_secret_key, '/refunds', { payment_intent: paymentIntent });
}

/** Verifies a Stripe-Signature header against the raw body. Returns the parsed event or throws. */
export function verifyWebhook(rawBody, sigHeader, secret, toleranceSec = 300) {
  const parts = Object.fromEntries(String(sigHeader || '').split(',').map(p => p.split('=')));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) throw new Error('Missing Stripe signature');
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid Stripe signature');
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) throw new Error('Stale Stripe signature');
  return JSON.parse(rawBody);
}
