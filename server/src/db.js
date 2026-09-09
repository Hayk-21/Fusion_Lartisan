// Database layer — uses Node's built-in SQLite (node:sqlite, Node >= 22.13).
// No native compilation needed, which keeps the Windows/macOS install to "install Node, run start".
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRINT_DEFAULTS } from './printer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Where the database, uploads and backups live. On Railway set LARTISAN_DATA_DIR=/data (a mounted Volume)
// so that redeploys never touch the café's data. The menu seed always ships with the code.
const CODE_DATA_DIR = path.resolve(__dirname, '..', 'data');
export const DATA_DIR = process.env.LARTISAN_DATA_DIR ? path.resolve(process.env.LARTISAN_DATA_DIR) : CODE_DATA_DIR;
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'lartisan.db');
const SEED_PATH = path.join(CODE_DATA_DIR, 'menu.seed.json');

export const DEFAULT_SETTINGS = {
  cafe_name: "Fusion L'Artisan",
  pin: '2121',
  tax_gst: 5,          // TPS %
  tax_qst: 9.975,      // TVQ %
  currency: 'CAD',
  default_lang: 'fr',
  sound: 'chime',      // file name in public/admin/sounds (without extension) or 'custom'
  sound_volume: 1,
  repeat_alert: false, // play the chime once per order (true = repeat every 20 s while an order is still "new")
  order_number_reset: 'daily',
  thank_you_seconds: 12,
  ask_customer_name: false,
  ask_service_type: true,
  seed_version: 1,
  logo_url: '/shared/logo-mark.png',   // changed by the admin (Paramètres → Logo)
  ...PRINT_DEFAULTS,                   // receipt printer (Paramètres → Imprimante)
  print_agent_token: '',               // shared secret for the café-laptop print agent (print_mode 'agent')
  // ---- website & online ordering (Paramètres → Site web)
  site_enabled: true,
  online_ordering: true,
  temporarily_closed: false,           // manual switch: "closed today" even inside opening hours
  closed_message: { fr: '', en: '' },
  address: '1650 Avenue Lincoln, Montréal, QC H3H 1H1',
  phone: '',
  email: '',
  instagram: 'fusionlartisan',
  facebook: '',
  tagline: { fr: 'Crêperie & café — l\'art du fait maison', en: 'Crêperie & café — the art of made in-house' },
  about: { fr: "Inspirée de la tradition bretonne et portée par la passion du café, Fusion L'Artisan est une crêperie moderne où tout est fait maison avec des ingrédients simples, frais et bio. Galettes de sarrasin bio, crêpes gourmandes, café de spécialité — sur place ou à emporter.",
           en: "Inspired by Breton tradition and driven by a passion for coffee, Fusion L'Artisan is a modern crêperie where everything is made in-house with simple, fresh, organic ingredients. Organic buckwheat galettes, indulgent crêpes, specialty coffee — dine in or take out." },
  hours: { mon: { open: '09:00', close: '19:30', closed: false }, tue: { open: '09:00', close: '19:30', closed: false }, wed: { open: '09:00', close: '19:30', closed: false },
           thu: { open: '09:00', close: '19:30', closed: false }, fri: { open: '09:00', close: '19:30', closed: false }, sat: { open: '09:00', close: '19:30', closed: false }, sun: { open: '09:00', close: '19:30', closed: false } },
  timezone: 'America/Toronto',
  featured_items: ['galette-composer', 'sig-nordique', 'crepe-composer', 'ssig-emeraude-pistache', 'glace-composer', 'hot-latte-pistache'],
  pickup_lead_minutes: 15,
  pickup_slot_minutes: 15,
  pickup_last_order_minutes: 15,       // no pickup later than closing − this
  tips_enabled: true,
  tip_options: [0, 10, 15, 20],
  payment_mode: 'counter',             // 'counter' (pay at pickup) | 'stripe' | 'both'
  stripe_publishable_key: '',
  stripe_secret_key: '',
  stripe_webhook_secret: '',
  google_api_key: '',
  google_place_id: '',
  google_maps_url: 'https://www.google.com/maps/place/Fusion+L%E2%80%99artisan/@45.4954773,-73.5805995,17z',
  public_url: '',                      // e.g. https://lartisan.up.railway.app — used for Stripe redirects
};

export const db = new DatabaseSync(DB_PATH);
// (timezone is applied right after the schema below)
// All "local time" logic (order day, numbering reset, statistics, tickets) follows the café timezone, wherever the server runs.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL,
  day TEXT NOT NULL,
  customer_name TEXT,
  service_type TEXT NOT NULL DEFAULT 'dine_in',
  device_id TEXT,
  device_name TEXT,
  lang TEXT DEFAULT 'fr',
  status TEXT NOT NULL DEFAULT 'new',
  lines TEXT NOT NULL,
  subtotal REAL NOT NULL,
  tax_gst REAL NOT NULL,
  tax_qst REAL NOT NULL,
  total REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  ready_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_day ON orders(day);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT,
  app_version TEXT,
  menu_version INTEGER,
  last_seen TEXT
);
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT
);
`);

process.env.TZ = (() => { try { const r = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get(); return r ? JSON.parse(r.value) : 'America/Toronto'; } catch { return 'America/Toronto'; } })();
export function applyTimezone(tz) { if (tz) process.env.TZ = tz; }

// Column migrations (safe to run every start)
for (const [col, def] of [
  ['source', "TEXT NOT NULL DEFAULT 'tablet'"], ['pickup_time', 'TEXT'], ['tip', 'REAL NOT NULL DEFAULT 0'],
  ['payment_status', "TEXT NOT NULL DEFAULT 'unpaid'"], ['payment_method', 'TEXT'], ['payment_ref', 'TEXT'],
  ['customer_phone', 'TEXT'], ['customer_email', 'TEXT'], ['public_token', 'TEXT'],
]) {
  const cols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${def}`);
}

// simple key/value cache (Google reviews, Stripe sessions…)
export function kvGet(key) { const r = db.prepare('SELECT value, updated_at FROM kv WHERE key = ?').get(key); return r ? { value: JSON.parse(r.value), updated_at: r.updated_at } : null; }
export function kvSet(key, value) { db.prepare('INSERT INTO kv(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').run(key, JSON.stringify(value), new Date().toISOString()); }

// ------------------------------------------------------------------ settings
export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return out;
}

export function setSettings(patch) {
  const stmt = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    stmt.run(k, JSON.stringify(v));
  }
  return getSettings();
}

const SECRET_KEYS = ['pin', 'stripe_secret_key', 'stripe_webhook_secret', 'google_api_key', 'print_agent_token'];
export function publicSettings() {
  const s = getSettings();
  const out = { ...s };
  for (const k of SECRET_KEYS) delete out[k];
  return out;
}

// ------------------------------------------------------------------ menu
export function getMenu() {
  const row = db.prepare('SELECT version, data, updated_at FROM menu WHERE id = 1').get();
  if (!row) return null;
  const data = JSON.parse(row.data);
  data.version = row.version;
  data.updated_at = row.updated_at;
  return data;
}

export function saveMenu(data, { bump = true } = {}) {
  const current = db.prepare('SELECT version FROM menu WHERE id = 1').get();
  const version = current ? (bump ? current.version + 1 : current.version) : 1;
  const now = new Date().toISOString();
  const clean = { currency: data.currency || 'CAD', categories: data.categories, items: data.items };
  db.prepare(`INSERT INTO menu(id, version, data, updated_at) VALUES (1, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET version = excluded.version, data = excluded.data, updated_at = excluded.updated_at`)
    .run(version, JSON.stringify(clean), now);
  return getMenu();
}

export function seedMenuIfEmpty() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const row = db.prepare('SELECT id FROM menu WHERE id = 1').get();
  if (!row) {
    saveMenu(seed);
    setSettings({ seed_version: seed.seed_version || 1 });
    audit('menu.seeded', `${seed.categories.length} categories, ${seed.items.length} items`);
    return true;
  }
  // The shipped seed was improved (e.g. English names, pictures). If the admin has NEVER edited the menu,
  // upgrade it automatically; otherwise leave their work alone (they can use "Rétablir le menu d'origine").
  const stored = Number(getSettings().seed_version || 1);
  const edited = db.prepare(`SELECT 1 FROM audit WHERE action IN ('menu.saved','menu.imported','menu.item.patched','menu.category.patched') LIMIT 1`).get();
  if ((seed.seed_version || 1) > stored && !edited) {
    saveMenu(seed);
    setSettings({ seed_version: seed.seed_version });
    audit('menu.seed.upgraded', `seed v${seed.seed_version}`);
    return true;
  }
  return false;
}

export function resetMenuToSeed() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const m = saveMenu(seed);
  audit('menu.reset', 'menu reset to the original seed');
  return m;
}

// ------------------------------------------------------------------ devices
export function touchDevice({ id, name, app_version, menu_version }) {
  if (!id) return;
  db.prepare(`INSERT INTO devices(id, name, app_version, menu_version, last_seen) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET name = COALESCE(excluded.name, devices.name),
              app_version = COALESCE(excluded.app_version, devices.app_version),
              menu_version = COALESCE(excluded.menu_version, devices.menu_version),
              last_seen = excluded.last_seen`)
    .run(id, name ?? null, app_version ?? null, menu_version ?? null, new Date().toISOString());
}

export function listDevices() {
  return db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
}

// ------------------------------------------------------------------ audit
export function audit(action, detail = '') {
  db.prepare('INSERT INTO audit(at, action, detail) VALUES (?, ?, ?)').run(new Date().toISOString(), action, String(detail));
}

export function listAudit(limit = 200) {
  return db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?').all(limit);
}

// ------------------------------------------------------------------ helpers
export function localDay(date = new Date()) {
  // YYYY-MM-DD in the server's local timezone (the café's laptop)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function backupDatabase() {
  const dir = path.join(DATA_DIR, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `lartisan-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}
