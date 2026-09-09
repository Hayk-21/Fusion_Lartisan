// L'Artisan Café — local order server
// Runs on the café laptop. Tablets (Android app or browser) and the admin panel connect over Wi-Fi.
import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import { buildInstallerBat } from './agentInstaller.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, getMenu, saveMenu, seedMenuIfEmpty, resetMenuToSeed, getSettings, setSettings, publicSettings,
         touchDevice, listAudit, backupDatabase, audit, localDay, DATA_DIR, applyTimezone } from './db.js';
import { normalizeMenu } from './menuSchema.js';
import { createOrder, getOrder, listOrders, updateOrderStatus, orderToText, STATUSES } from './orders.js';
import { computeStats } from './stats.js';
import { login, logout, requireAdmin, tokenFromRequest, isValid, COOKIE } from './auth.js';
import { attachHub, broadcast, connectedDevices, broadcastDevices, printViaAgent, agentsConnected } from './hub.js';
import { startDiscovery, localAddresses, DISCOVERY_PORT } from './discovery.js';
import { buildTicket, buildTestTicket, buildWelcomeTicket, printRaw, listPrinters, warmUpPrinter, setAgentSender } from './printer.js';
import { createOnlineOrder, confirmStripePayment, refundIfPaid, siteState, featuredItems, publicOrder } from './online.js';
import { getReviews } from './google.js';
import { verifyWebhook } from './stripe.js';
import { expireUnpaidOrders, updateOrderFields } from './orders.js';
import { kvGet } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');
const UPLOADS = path.join(DATA_DIR, 'uploads');
const PORT = parseInt(process.env.PORT || '3000', 10);
const APP_VERSION = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8')).version;

fs.mkdirSync(UPLOADS, { recursive: true });
seedMenuIfEmpty();

const wrapAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const wrap = wrapAsync;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);   // Railway / reverse proxies: correct req.ip and req.protocol
app.post('/api/stripe/webhook', express.raw({ type: '*/*', limit: '1mb' }), wrapAsync(async (req, res) => {
  const s = getSettings();
  let event;
  try { event = verifyWebhook(req.body.toString('utf8'), req.headers['stripe-signature'], s.stripe_webhook_secret); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const sess = event.data.object;
    if (sess.payment_status === 'paid') {
      const r = await confirmStripePayment(Number(sess.client_reference_id || sess.metadata?.order_id), { paymentIntent: sess.payment_intent, verified: true });
      if (r?.released) releaseOrder(r.order);
    }
  } else if (event.type === 'checkout.session.expired') {
    const id = Number(event.data.object.client_reference_id);
    const o = getOrder(id); if (o && o.status === 'pending_payment') updateOrderStatus(id, 'cancelled');
  }
  res.json({ received: true });
}));
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// ---------------------------------------------------------------- static
app.use('/admin', express.static(path.join(PUBLIC, 'admin'), { index: 'index.html' }));
app.use('/shared/pricing.js', (req, res) => res.type('application/javascript').sendFile(path.join(__dirname, 'pricing.js')));
app.use('/shared', express.static(path.join(PUBLIC, 'shared'), { maxAge: '1d' }));
app.use('/uploads', express.static(UPLOADS, { maxAge: '1h' }));
app.use('/tablette', express.static(path.join(PUBLIC, 'tablet'), { index: 'index.html' }));
app.use('/commander', express.static(path.join(PUBLIC, 'site', 'commander'), { index: 'index.html' }));
app.use('/', express.static(path.join(PUBLIC, 'site'), { index: 'index.html' }));

const ok = (res, data) => res.json(data);
const fail = (res, status, error, extra = {}) => res.status(status).json({ error, ...extra });

// ---------------------------------------------------------------- public API (tablets)
function isMounted(dir) { try { return fs.readFileSync('/proc/mounts', 'utf8').split('\n').some(l => l.split(' ')[1] === dir); } catch { return null; } }
app.get('/api/health', (req, res) => {
  const m = getMenu();
  ok(res, { service: 'lartisan-cafe', version: APP_VERSION, cafe_name: getSettings().cafe_name, menu_version: m.version, server_time: new Date().toISOString(), day: localDay(), data_dir: DATA_DIR, persistent: !!process.env.LARTISAN_DATA_DIR, volume_mounted: isMounted(DATA_DIR) });
});

app.get('/api/menu', (req, res) => {
  const m = getMenu();
  const s = publicSettings();
  ok(res, { ...m, settings: { cafe_name: s.cafe_name, tax_gst: s.tax_gst, tax_qst: s.tax_qst, currency: s.currency, default_lang: s.default_lang,
    ask_customer_name: s.ask_customer_name, ask_service_type: s.ask_service_type, thank_you_seconds: s.thank_you_seconds, logo_url: s.logo_url } });
});
app.get('/api/menu/version', (req, res) => ok(res, { version: getMenu().version }));
app.get('/api/settings/public', (req, res) => ok(res, publicSettings()));

app.post('/api/devices/hello', (req, res) => {
  const { device_id, device_name, app_version, menu_version } = req.body || {};
  if (!device_id) return fail(res, 400, 'device_id required');
  touchDevice({ id: device_id, name: device_name, app_version, menu_version });
  broadcastDevices();
  ok(res, { ok: true, menu_version: getMenu().version, server_time: new Date().toISOString() });
});

app.post('/api/orders', wrap((req, res) => {
  const r = createOrder(req.body || {});
  if (!r.ok) return fail(res, r.status, r.error);
  broadcast({ type: 'new_order', order: r.order });
  ok(res, r.order);
  autoPrint(r.order);
}));

/** An order becomes visible to the kitchen: live board + automatic ticket. */
function releaseOrder(order) {
  broadcast({ type: 'new_order', order });
  autoPrint(order);
}

// ---------------------------------------------------------------- website & online ordering
function baseUrlOf(req) { return `${req.protocol}://${req.get('host')}`; }
app.get('/api/site', wrap(async (req, res) => {
  const s = getSettings(); const menu = getMenu();
  const reviews = s.google_api_key ? await getReviews(s) : (kvGet('google_reviews')?.value || null);
  const about = (s.about_from_google !== false && reviews?.summary?.fr) ? { fr: reviews.summary.fr, en: reviews.summary.en || reviews.summary.fr } : s.about;
  ok(res, {
    cafe_name: s.cafe_name, tagline: s.tagline, about, address: s.address, phone: s.phone, email: s.email, instagram: s.instagram, facebook: s.facebook,
    logo_url: s.logo_url, hours: getSettings().hours, hours_from_google: s.hours_from_google !== false && !!s.google_api_key, timezone: s.timezone, google_maps_url: s.google_maps_url, closed_message: s.closed_message,
    tax_gst: s.tax_gst, tax_qst: s.tax_qst, stripe_publishable_key: s.stripe_publishable_key || '',
    state: siteState(getSettings()), featured: featuredItems(s, menu), categories: menu.categories.filter(c => c.visible !== false).map(c => ({ id: c.id, name: c.name, icon: c.icon })),
    reviews, menu_version: menu.version,
  });
}));
app.get('/api/site/state', (req, res) => ok(res, siteState(getSettings())));
app.post('/api/online-orders', wrap(async (req, res) => {
  const r = await createOnlineOrder(req.body || {}, { baseUrl: baseUrlOf(req) });
  if (!r.ok) return fail(res, r.status, r.error);
  if (r.fresh) releaseOrder(r.fresh);
  ok(res, { order: r.order, checkout_url: r.checkout_url || null });
}));
app.get('/api/online-orders/:id', wrap(async (req, res) => {
  const o = getOrder(Number(req.params.id));
  if (!o || !o.public_token || o.public_token !== req.query.t) return fail(res, 404, 'Not found');
  // success page after Stripe: confirm if the webhook has not done it yet
  if (o.status === 'pending_payment' && req.query.session_id) {
    const r = await confirmStripePayment(o.id, { sessionId: String(req.query.session_id) });
    if (r?.released) { releaseOrder(r.order); return ok(res, publicOrder(r.order)); }
  }
  ok(res, publicOrder(o));
}));
setInterval(() => { try { expireUnpaidOrders(35); } catch {} }, 5 * 60_000).unref();

// ---------------------------------------------------------------- receipt printer
async function printOrder(order, { reprint = false } = {}) {
  const s = getSettings();
  const ticket = buildTicket(order, s, { reprint });
  const copies = Math.max(1, Math.min(5, Number(s.print_copies) || 1));
  for (let i = 0; i < copies; i++) await printRaw(ticket, s);
}
function autoPrint(order) {
  const s = getSettings();
  if (!s.print_enabled) return;
  printOrder(order).then(
    () => audit('print.ok', `#${order.number}`),
    e => { audit('print.error', `#${order.number}: ${e.message}`); broadcast({ type: 'print_error', order_number: order.number, error: e.message }, { role: 'admin' }); },
  );
}
app.get('/api/orders/:id', (req, res) => {
  const o = getOrder(Number(req.params.id));
  if (!o) return fail(res, 404, 'Not found');
  ok(res, { id: o.id, number: o.number, status: o.status, customer_name: o.customer_name, total: o.total, created_at: o.created_at });
});

// ---------------------------------------------------------------- admin auth
app.post('/api/admin/login', (req, res) => {
  const r = login(req.body?.pin, req.ip);
  if (!r.ok) return fail(res, r.status, r.error, { retry_in: r.retry_in });
  res.setHeader('Set-Cookie', `${COOKIE}=${r.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 3600}`);
  ok(res, { ok: true, token: r.token });
});
app.post('/api/admin/logout', (req, res) => {
  logout(tokenFromRequest(req));
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  ok(res, { ok: true });
});
app.get('/api/admin/session', (req, res) => ok(res, { logged_in: isValid(tokenFromRequest(req)) }));

const admin = express.Router();
admin.use(requireAdmin);

// ---------------------------------------------------------------- admin: orders
admin.get('/orders', (req, res) => {
  const { status, day, from, to, limit, offset } = req.query;
  ok(res, listOrders({ status, day, from, to, limit: Number(limit) || 200, offset: Number(offset) || 0 }));
});
admin.get('/orders/:id', (req, res) => { const o = getOrder(Number(req.params.id)); o ? ok(res, o) : fail(res, 404, 'Not found'); });
admin.patch('/orders/:id/status', wrap(async (req, res) => {
  const o = updateOrderStatus(Number(req.params.id), req.body?.status);
  if (!o) return fail(res, 404, 'Not found');
  let refund = null;
  if (req.body?.status === 'cancelled') { try { refund = await refundIfPaid(o); } catch (e) { return fail(res, 502, `Commande annulée mais remboursement Stripe impossible : ${e.message}`); } }
  const fresh = getOrder(o.id);
  broadcast({ type: 'order_updated', order: fresh });
  ok(res, { ...fresh, refunded: !!refund });
}));
admin.patch('/orders/:id/payment', wrap((req, res) => {   // mark an online "pay at pickup" order as paid at the counter
  const o = updateOrderFields(Number(req.params.id), { payment_status: req.body?.paid ? 'paid' : 'unpaid' });
  if (!o) return fail(res, 404, 'Not found');
  broadcast({ type: 'order_updated', order: o });
  ok(res, o);
}));
admin.get('/site/reviews/refresh', wrap(async (req, res) => ok(res, await getReviews(getSettings(), { force: true }))));
admin.get('/site/state', (req, res) => ok(res, siteState(getSettings())));
admin.post('/orders/:id/print', wrap(async (req, res) => {
  const o = getOrder(Number(req.params.id));
  if (!o) return fail(res, 404, 'Not found');
  try { await printOrder(o, { reprint: true }); audit('print.ok', `#${o.number} (manual)`); ok(res, { ok: true }); }
  catch (e) { audit('print.error', `#${o.number}: ${e.message}`); fail(res, 502, e.message); }
}));
admin.get('/printers', wrap(async (req, res) => ok(res, { platform: process.platform, printers: await listPrinters(), agents: agentsConnected() })));
admin.post('/print/agent-token', (req, res) => { const token = crypto.randomBytes(16).toString('hex'); setSettings({ print_agent_token: token }); audit('print.agent.token', 'regenerated'); ok(res, { token }); });
admin.get('/print/agent-token', (req, res) => ok(res, { token: getSettings().print_agent_token || '', agents: agentsConnected() }));
// one-file Windows installer with the server address + agent token baked in (Paramètres → Imprimante → Télécharger)
admin.get('/print/agent-installer', (req, res) => {
  const s = getSettings();
  let token = s.print_agent_token;
  if (!token) { token = crypto.randomBytes(16).toString('hex'); setSettings({ print_agent_token: token }); audit('print.agent.token', 'generated for installer'); }
  const serverUrl = (s.public_url || baseUrlOf(req)).replace(/\/+$/, '');
  audit('print.agent.installer', 'downloaded');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="Installer-Imprimante-LArtisan.bat"');
  res.send(buildInstallerBat({ serverUrl, token, cafeName: s.cafe_name }));
});
// ---- print agent (token-authenticated, no PIN): used by the automatic installer
function agentAuth(req, res) { const s = getSettings(); const t = req.body?.token || req.get('X-Agent-Token'); if (!s.print_agent_token || t !== s.print_agent_token) { fail(res, 401, 'bad token'); return null; } return s; }
app.post('/api/print-agent/register', (req, res) => {
  const s = agentAuth(req, res); if (!s) return;
  const patch = { print_enabled: true, print_mode: 'agent' };
  if (req.body.printer_name) patch.print_printer_name = String(req.body.printer_name).slice(0, 120);
  const out = setSettings(patch);
  audit('print.agent.registered', `${req.body.agent_name || '?'} · ${out.print_printer_name}`);
  broadcast({ type: 'settings_updated', settings: publicSettings() });
  ok(res, { ok: true, printer_name: out.print_printer_name, cafe_name: out.cafe_name });
});
app.post('/api/print-agent/welcome', wrap(async (req, res) => {   // prints the "everything is connected" ticket through the agent
  const s = agentAuth(req, res); if (!s) return;
  try { await printRaw(buildWelcomeTicket(s, { agentName: req.body.agent_name, printerName: s.print_printer_name, serverUrl: s.public_url || baseUrlOf(req) }), { ...s, print_mode: 'agent' }); ok(res, { ok: true }); }
  catch (e) { fail(res, 502, e.message); }
}));
admin.post('/print/test', wrap(async (req, res) => {
  const s = { ...getSettings(), ...(req.body || {}) };   // lets the panel test unsaved settings
  try { await printRaw(buildTestTicket(s), s); audit('print.test', s.print_mode + ' ' + (s.print_printer_name || s.print_host)); ok(res, { ok: true }); }
  catch (e) { audit('print.error', 'test: ' + e.message); fail(res, 502, e.message); }
}));
admin.get('/orders.csv', (req, res) => {
  const { from, to } = req.query;
  const rows = listOrders({ from: from || localDay(), to: to || localDay(), limit: 2000 }).reverse();
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['id', 'number', 'day', 'created_at', 'status', 'service_type', 'customer_name', 'device_name', 'subtotal', 'tax_gst', 'tax_qst', 'total', 'items'];
  const lines = [head.join(',')];
  for (const o of rows) lines.push([o.id, o.number, o.day, o.created_at, o.status, o.service_type, o.customer_name, o.device_name, o.subtotal, o.tax_gst, o.tax_qst, o.total, orderToText(o)].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${from || localDay()}_${to || localDay()}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
});

// ---------------------------------------------------------------- admin: menu
function publishMenu(menu, reason) {
  broadcast({ type: 'menu_updated', version: menu.version, reason });
  return menu;
}
admin.get('/menu', (req, res) => ok(res, getMenu()));
admin.put('/menu', wrap((req, res) => {
  const clean = normalizeMenu(req.body);
  const m = saveMenu(clean);
  audit('menu.saved', `v${m.version}: ${m.categories.length} categories, ${m.items.length} items`);
  ok(res, publishMenu(m, 'saved'));
}));
admin.patch('/menu/items/:id', wrap((req, res) => {
  const m = getMenu();
  const it = m.items.find(i => i.id === req.params.id);
  if (!it) return fail(res, 404, 'Item not found');
  const allowed = ['available', 'price', 'sort', 'name', 'description', 'badge', 'category_id'];
  for (const k of allowed) if (k in req.body) it[k] = req.body[k];
  const saved = saveMenu(normalizeMenu(m));
  audit('menu.item.patched', `${it.id}: ${Object.keys(req.body).join(',')}`);
  ok(res, publishMenu(saved, 'item'));
}));
admin.patch('/menu/categories/:id', wrap((req, res) => {
  const m = getMenu();
  const c = m.categories.find(i => i.id === req.params.id);
  if (!c) return fail(res, 404, 'Category not found');
  for (const k of ['visible', 'name', 'description', 'icon', 'sort']) if (k in req.body) c[k] = req.body[k];
  const saved = saveMenu(normalizeMenu(m));
  audit('menu.category.patched', `${c.id}: ${Object.keys(req.body).join(',')}`);
  ok(res, publishMenu(saved, 'category'));
}));
admin.post('/menu/reset', (req, res) => ok(res, publishMenu(resetMenuToSeed(), 'reset')));
admin.get('/menu/export', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="menu-${localDay()}.json"`);
  ok(res, getMenu());
});
admin.post('/menu/import', wrap((req, res) => {
  const clean = normalizeMenu(req.body);
  const m = saveMenu(clean);
  audit('menu.imported', `v${m.version}`);
  ok(res, publishMenu(m, 'imported'));
}));
admin.post('/menu/push', (req, res) => { broadcast({ type: 'menu_updated', version: getMenu().version, reason: 'manual' }); ok(res, { ok: true }); });

// image upload (base64 JSON) → /uploads/<file>
admin.post('/upload', (req, res) => {
  const { data, name = 'image' } = req.body || {};
  const m = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/.exec(data || '');
  if (!m) return fail(res, 400, 'Expected a base64 PNG/JPEG/WebP image');
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const file = `${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS, file), Buffer.from(m[3], 'base64'));
  ok(res, { url: `/uploads/${file}` });
});

// ---------------------------------------------------------------- admin: settings, stats, devices, system
admin.get('/settings', (req, res) => ok(res, getSettings()));
admin.put('/settings', (req, res) => {
  const patch = { ...req.body };
  if ('pin' in patch) {
    patch.pin = String(patch.pin || '');
    if (!/^\d{4,8}$/.test(patch.pin)) return fail(res, 400, 'PIN must be 4 to 8 digits');
  }
  if (patch.timezone) { try { new Intl.DateTimeFormat('en', { timeZone: patch.timezone }); } catch { return fail(res, 400, 'Fuseau horaire invalide'); } }
  const s = setSettings(patch);
  applyTimezone(s.timezone);
  audit('settings.updated', Object.keys(patch).filter(k => !['pin', 'stripe_secret_key', 'stripe_webhook_secret', 'google_api_key'].includes(k)).join(','));
  broadcast({ type: 'settings_updated', settings: publicSettings() });
  warmUpPrinter(s);
  ok(res, s);
});
admin.get('/stats', (req, res) => ok(res, computeStats({ from: req.query.from, to: req.query.to })));
admin.get('/devices', (req, res) => ok(res, connectedDevices()));
admin.get('/audit', (req, res) => ok(res, listAudit(Number(req.query.limit) || 200)));
admin.get('/network', (req, res) => ok(res, { port: PORT, discovery_port: DISCOVERY_PORT, addresses: localAddresses(), urls: localAddresses().map(a => `http://${a.address}:${PORT}`) }));
admin.post('/backup', (req, res) => { const f = backupDatabase(); audit('backup', f); ok(res, { file: f }); });
admin.get('/summary', (req, res) => {
  const today = localDay();
  ok(res, { today: computeStats({ from: today, to: today }).totals, active: listOrders({ status: 'active' }).length, devices: connectedDevices().filter(d => d.online).length, menu_version: getMenu().version });
});

app.use('/api/admin', admin);

// ---------------------------------------------------------------- errors
app.use((req, res) => fail(res, 404, 'Not found'));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  fail(res, status, err.message || 'Server error');
});

// ---------------------------------------------------------------- start
const server = http.createServer(app);
attachHub(server);
setAgentSender(printViaAgent);
startDiscovery({ port: PORT, cafeName: () => getSettings().cafe_name });
warmUpPrinter(getSettings());

// Nightly automatic backup + cleanup of old backups (keep 30)
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 3 && now.getMinutes() === 0) {
    try {
      backupDatabase();
      const dir = path.join(DATA_DIR, 'backups');
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.db')).sort();
      while (files.length > 30) fs.unlinkSync(path.join(dir, files.shift()));
    } catch (e) { console.warn('backup failed', e.message); }
  }
}, 60_000).unref();

server.listen(PORT, '0.0.0.0', () => {
  const s = getSettings();
  const addrs = localAddresses();
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════╗');
  console.log(`  ║   ${s.cafe_name} — order server v${APP_VERSION}`.padEnd(61) + '║');
  console.log('  ╠══════════════════════════════════════════════════════════╣');
  console.log(`  ║   Website     :  http://localhost:${PORT}/  (data: ${DATA_DIR})`.slice(0, 60).padEnd(61) + '║');
  console.log(`  ║   Admin panel :  http://localhost:${PORT}/admin`.padEnd(61) + '║');
  for (const a of addrs) console.log(`  ║   Tablets     :  http://${a.address}:${PORT}   (${a.iface})`.padEnd(61) + '║');
  if (!addrs.length) console.log('  ║   (no Wi-Fi/LAN address found — connect to the network)  ║');
  console.log(`  ║   Discovery   :  UDP ${DISCOVERY_PORT}`.padEnd(61) + '║');
  console.log('  ╚══════════════════════════════════════════════════════════╝');
  console.log('');
});

process.on('SIGINT', () => { console.log('\nStopping…'); try { db.close(); } catch {} process.exit(0); });
process.on('SIGTERM', () => { try { db.close(); } catch {} process.exit(0); });
