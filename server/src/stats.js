import { db, localDay } from './db.js';
import { round2 } from './pricing.js';

// Sales statistics for a date range (inclusive, YYYY-MM-DD in the café's local time).
// Only completed orders count as sales; cancelled ones are reported separately.
export function computeStats({ from, to } = {}) {
  const today = localDay();
  from = from || today;
  to = to || today;
  const rows = db.prepare(`SELECT id, number, day, status, service_type, lines, subtotal, tax_gst, tax_qst, total, tip, source, created_at, ready_at, completed_at, device_name
                           FROM orders WHERE day >= ? AND day <= ? ORDER BY id`).all(from, to);
  const sales = rows.filter(r => r.status === 'completed');
  const cancelled = rows.filter(r => r.status === 'cancelled');
  const active = rows.filter(r => ['new', 'preparing', 'ready'].includes(r.status));

  const byDay = {}, byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0 }));
  const items = {}, categories = {}, service = { dine_in: { orders: 0, revenue: 0 }, takeout: { orders: 0, revenue: 0 } };
  const devices = {};
  let prepTotal = 0, prepCount = 0, itemsSold = 0, tips = 0, online = 0;

  for (const r of sales) {
    byDay[r.day] ??= { day: r.day, orders: 0, revenue: 0, subtotal: 0, tax: 0 };
    byDay[r.day].orders++; byDay[r.day].revenue += r.total; byDay[r.day].subtotal += r.subtotal; byDay[r.day].tax += r.tax_gst + r.tax_qst;
    const h = new Date(r.created_at).getHours();
    byHour[h].orders++; byHour[h].revenue += r.total;
    service[r.service_type] ??= { orders: 0, revenue: 0 };
    service[r.service_type].orders++; service[r.service_type].revenue += r.total;
    const dn = r.source === 'online' ? '__online__' : (r.device_name || '?');
    devices[dn] ??= { device: dn, orders: 0, revenue: 0 };
    devices[dn].orders++; devices[dn].revenue += r.total;
    tips += r.tip || 0; if (r.source === 'online') online++;
    if (r.ready_at && r.created_at) { prepTotal += (new Date(r.ready_at) - new Date(r.created_at)) / 60000; prepCount++; }
    for (const l of JSON.parse(r.lines)) {
      itemsSold += l.qty;
      const key = l.item_id;
      items[key] ??= { item_id: key, name_fr: l.name_fr || l.name, name_en: l.name_en || l.name, qty: 0, revenue: 0, category_id: l.category_id };
      items[key].qty += l.qty; items[key].revenue += l.line_total;
      const c = l.category_id || 'other';
      categories[c] ??= { category_id: c, qty: 0, revenue: 0 };
      categories[c].qty += l.qty; categories[c].revenue += l.line_total;
    }
  }
  const revenue = round2(sales.reduce((s, r) => s + r.total, 0));
  const subtotal = round2(sales.reduce((s, r) => s + r.subtotal, 0));
  const fix = o => { for (const k of ['revenue', 'subtotal', 'tax']) if (k in o) o[k] = round2(o[k]); return o; };
  // fill missing days so charts have a continuous axis
  const days = [];
  for (let d = new Date(from + 'T00:00:00'); localDay(d) <= to; d.setDate(d.getDate() + 1)) {
    const k = localDay(d);
    days.push(fix(byDay[k] || { day: k, orders: 0, revenue: 0, subtotal: 0, tax: 0 }));
    if (days.length > 400) break;
  }
  return {
    from, to,
    totals: {
      orders: sales.length,
      revenue,
      subtotal,
      tax_gst: round2(sales.reduce((s, r) => s + r.tax_gst, 0)),
      tax_qst: round2(sales.reduce((s, r) => s + r.tax_qst, 0)),
      avg_ticket: sales.length ? round2(revenue / sales.length) : 0,
      items_sold: itemsSold,
      cancelled: cancelled.length,
      active: active.length,
      tips: round2(tips),
      online_orders: online,
      avg_prep_minutes: prepCount ? round2(prepTotal / prepCount) : null,
    },
    by_day: days,
    by_hour: byHour.map(fix),
    top_items: Object.values(items).map(fix).sort((a, b) => b.qty - a.qty).slice(0, 25),
    by_category: Object.values(categories).map(fix).sort((a, b) => b.revenue - a.revenue),
    by_service: Object.entries(service).map(([k, v]) => ({ service_type: k, ...fix(v) })),
    by_device: Object.values(devices).map(fix).sort((a, b) => b.orders - a.orders),
  };
}
