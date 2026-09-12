import { db, getMenu, getSettings, localDay, audit } from './db.js';
import { priceOrder } from './pricing.js';

export const STATUSES = ['pending_payment', 'new', 'preparing', 'ready', 'completed', 'cancelled'];
export const ACTIVE = ['new', 'preparing', 'ready'];

function rowToOrder(r) {
  if (!r) return null;
  return { ...r, lines: JSON.parse(r.lines) };
}

function nextNumber(day) {
  const s = getSettings();
  if (s.order_number_reset === 'never') {
    const r = db.prepare('SELECT MAX(number) AS n FROM orders').get();
    return (r?.n || 0) + 1;
  }
  const r = db.prepare('SELECT MAX(number) AS n FROM orders WHERE day = ?').get(day);
  return (r?.n || 0) + 1;
}

export function createOrder(payload, extra = {}) {
  const menu = getMenu();
  const settings = getSettings();
  const lang = payload.lang === 'en' ? 'en' : 'fr';
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  if (!lines.length) return { ok: false, status: 400, error: lang === 'en' ? 'Your order is empty' : 'Votre commande est vide' };
  if (lines.length > 60) return { ok: false, status: 400, error: 'Too many lines' };
  const priced = priceOrder(menu, lines, settings, lang);
  if (!priced.ok) return { ok: false, status: 409, error: priced.error };

  const now = new Date();
  const day = localDay(now);
  const service = payload.service_type === 'takeout' ? 'takeout' : 'dine_in';
  const customer = String(payload.customer_name || '').trim().slice(0, 40) || null;
  const note = String(payload.note || '').trim().slice(0, 300) || null;

  const tip = Math.max(0, Math.round((Number(extra.tip) || 0) * 100) / 100);
  const total = Math.round((priced.total + tip) * 100) / 100;
  const insert = db.prepare(`INSERT INTO orders(number, day, customer_name, service_type, device_id, device_name, lang, status,
      lines, subtotal, tax_gst, tax_qst, total, note, created_at, updated_at,
      source, pickup_time, tip, payment_status, payment_method, customer_phone, customer_email, public_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  // Retry once on the (rare) race where two tablets submit in the same millisecond.
  let id, number;
  for (let attempt = 0; attempt < 3; attempt++) {
    number = nextNumber(day);
    try {
      const res = insert.run(number, day, customer, service, payload.device_id || null, payload.device_name || null, lang, extra.status || 'new',
        JSON.stringify(priced.lines), priced.subtotal, priced.tax_gst, priced.tax_qst, total, note,
        now.toISOString(), now.toISOString(),
        extra.source || 'tablet', extra.pickup_time || null, tip, extra.payment_status || 'unpaid', extra.payment_method || null,
        extra.customer_phone || null, extra.customer_email || null, extra.public_token || null);
      id = Number(res.lastInsertRowid);
      break;
    } catch (e) { if (attempt === 2) throw e; }
  }
  audit('order.created', `#${number} ${total.toFixed(2)} from ${payload.device_name || payload.device_id || extra.source || 'unknown'}`);
  return { ok: true, order: getOrder(id) };
}

export function getOrder(id) {
  return rowToOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id));
}

export function listOrders({ status, day, from, to, limit = 200, offset = 0 } = {}) {
  const where = [], args = [];
  if (status === 'active') { where.push(`status IN ('new','preparing','ready')`); }
  else if (status) { where.push('status = ?'); args.push(status); }
  if (day) { where.push('day = ?'); args.push(day); }
  if (from) { where.push('day >= ?'); args.push(from); }
  if (to) { where.push('day <= ?'); args.push(to); }
  const sql = `SELECT * FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ? OFFSET ?`;
  args.push(Math.min(2000, limit), offset);
  return db.prepare(sql).all(...args).map(rowToOrder);
}

export function updateOrderStatus(id, status) {
  if (!STATUSES.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  const now = new Date().toISOString();
  const extra = status === 'ready' ? ', ready_at = ?' : status === 'completed' ? ', completed_at = ?' : '';
  const args = extra ? [status, now, now, id] : [status, now, id];
  const res = db.prepare(`UPDATE orders SET status = ?, updated_at = ?${extra} WHERE id = ?`).run(...args);
  if (!res.changes) return null;
  const o = getOrder(id);
  audit('order.status', `#${o.number} → ${status}`);
  return o;
}

export function orderToText(o, lang = 'fr') {
  // Compact plain-text representation, used for the CSV export and printing.
  const l = [];
  for (const line of o.lines) {
    const opts = line.options.map(x => x.name).join(', ');
    l.push(`${line.qty}× ${line.name}${line.variant_name ? ' (' + line.variant_name + ')' : ''}${opts ? ', ' + opts : ''}${line.note ? ' [' + line.note + ']' : ''}`);
  }
  return l.join(' | ');
}

export function updateOrderFields(id, fields) {
  const allowed = ['status', 'payment_status', 'payment_method', 'payment_ref', 'pickup_time'];
  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (!keys.length) return getOrder(id);
  const now = new Date().toISOString();
  db.prepare(`UPDATE orders SET ${keys.map(k => k + ' = ?').join(', ')}, updated_at = ? WHERE id = ?`).run(...keys.map(k => fields[k]), now, id);
  return getOrder(id);
}
export function expireUnpaidOrders(maxAgeMinutes = 35) {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60000).toISOString();
  const rows = db.prepare(`SELECT id, number FROM orders WHERE status = 'pending_payment' AND created_at < ?`).all(cutoff);
  for (const r of rows) { updateOrderStatus(r.id, 'cancelled'); audit('order.expired', `#${r.number} (unpaid)`); }
  return rows.length;
}
