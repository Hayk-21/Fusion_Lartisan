// Receipt printing — Star Micronics TSP650 (Star Line Mode) or any ESC/POS printer.
//
// Two transports:
//   windows : raw bytes through the Windows print spooler (the "Star TSP650" driver installed with the printer)
//             → tools/rawprint-worker.ps1, a persistent PowerShell worker (winspool RAW, no extra software)
//   network : raw TCP to <host>:9100 (Ethernet / Wi-Fi printers)
//   macos   : `lp -o raw` (kept for a future macOS setup)
//
// The ticket is built with a small command set that exists in both Star Line Mode and ESC/POS,
// selected by settings.print_cmd ('star' | 'escpos').
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PRINT_DEFAULTS = {
  print_enabled: false,
  print_mode: 'windows',        // 'windows' | 'network' | 'macos' | 'agent' (café laptop agent, when the server is in the cloud)
  print_printer_name: '',       // Windows / macOS printer name (e.g. "Star TSP650 (TSP654)")
  print_host: '',               // network mode
  print_port: 9100,
  print_cmd: 'star',            // 'star' (Star Line Mode: TSP650, TSP650II…) | 'escpos'
  print_width: 42,              // characters per line (TSP650 80 mm, font A = 42)
  print_left_margin: 3,         // blank columns on the left (the first columns are often lost at the paper edge)
  print_copies: 1,
  print_cut: true,
  print_prices: true,           // print prices/taxes on the ticket (kitchen tickets may not need them)
  print_footer: 'Merci ! Paiement au comptoir.',
  print_lang: 'fr',
};

// ---------------------------------------------------------------- byte helpers
const ESC = 0x1b, GS = 0x1d, LF = 0x0a;
const B = (...a) => Buffer.from(a);

function cmds(kind) {
  if (kind === 'escpos') {
    return {
      init: B(ESC, 0x40),
      codepage: B(ESC, 0x74, 16),                       // WPC1252
      alignLeft: B(ESC, 0x61, 0), alignCenter: B(ESC, 0x61, 1),
      boldOn: B(ESC, 0x45, 1), boldOff: B(ESC, 0x45, 0),
      big: B(GS, 0x21, 0x11), normal: B(GS, 0x21, 0x00), tall: B(GS, 0x21, 0x01),
      feed: n => B(ESC, 0x64, n),
      margins: (left, cols) => B(GS, 0x4c, (left * 12) & 0xff, (left * 12) >> 8, GS, 0x57, ((cols - 2 * left) * 12) & 0xff, ((cols - 2 * left) * 12) >> 8),   // GS L (left, dots) + GS W (printable width)
      cut: B(GS, 0x56, 66, 0),                          // partial cut with feed
    };
  }
  // Star Line Mode (TSP650 / TSP650II / TSP700 …)
  return {
    init: B(ESC, 0x40),
    codepage: B(ESC, GS, 0x74, 32),                     // Windows 1252
    alignLeft: B(ESC, GS, 0x61, 0), alignCenter: B(ESC, GS, 0x61, 1),
    boldOn: B(ESC, 0x45), boldOff: B(ESC, 0x46),
    big: B(ESC, 0x69, 1, 1), normal: B(ESC, 0x69, 0, 0), tall: B(ESC, 0x69, 1, 0),
    feed: n => B(ESC, 0x61, n),
    margins: (left, cols) => B(ESC, 0x6c, left, ESC, 0x51, cols - left),   // ESC l (left margin, columns) + ESC Q (right margin column)
    cut: B(ESC, 0x64, 3),                               // partial cut (feeds to the cutter first)
  };
}

// UTF-8 → Windows-1252 with sensible fallbacks (thermal printers do not speak UTF-8)
const CP1252_EXTRA = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
const REPLACE = { '✎': '>', '×': 'x', '☕': '', '🍽️': '', '🥡': '', '→': '->', '✓': 'OK', '★': '*', '☰': '' };
export function toCP1252(str) {
  const out = [];
  for (const ch of String(str).normalize('NFC')) {
    const code = ch.codePointAt(0);
    if (code < 0x80) out.push(code);
    else if (ch in CP1252_EXTRA) out.push(CP1252_EXTRA[ch]);
    else if (code >= 0xa0 && code <= 0xff) out.push(code);
    else if (ch in REPLACE) { for (const c of REPLACE[ch]) out.push(c.charCodeAt(0)); }
    else { const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, ''); const b = base.codePointAt(0); out.push(b && b < 0x80 ? b : 0x3f); }
  }
  return Buffer.from(out);
}

const money = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' $';
const pad = (s, n) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length));
function lr(left, right, width) {           // left text … right-aligned text, on one line
  const r = String(right); const room = width - r.length - 1;
  return pad(left, room) + ' ' + r;
}
function wrap(text, width, indent = 0) {
  const words = String(text).split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  const w = width - indent;
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > w) { if (cur) lines.push(cur); cur = word; } else cur = (cur + ' ' + word).trim();
  }
  if (cur) lines.push(cur);
  return lines.map(l => ' '.repeat(indent) + l);
}

// ---------------------------------------------------------------- ticket
// printable width once the left/right margins are applied (the paper edge often swallows the first columns)
function layout(settings) {
  const cols = Math.max(24, Math.min(64, Number(settings.print_width) || 42));
  const m = Math.max(0, Math.min(8, Number(settings.print_left_margin ?? 3)));
  return { cols, m, W: cols - 2 * m };
}
export function buildTicket(order, settings, { reprint = false } = {}) {
  const c = cmds(settings.print_cmd);
  const { W, m, cols } = layout(settings);
  const lang = settings.print_lang === 'en' ? 'en' : 'fr';
  const t = (fr, en) => (lang === 'en' ? en : fr);
  const parts = [c.init, c.codepage, c.margins(m, cols)];
  const line = (s = '') => { parts.push(toCP1252(s)); parts.push(B(LF)); };
  const rule = (ch = '-') => line(ch.repeat(W));

  parts.push(c.alignCenter, c.boldOn);
  line(settings.cafe_name || "L'Artisan");
  parts.push(c.boldOff);
  const d = new Date(order.created_at);
  line(d.toLocaleDateString('fr-CA') + '  ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }));
  parts.push(B(LF), c.big, c.boldOn);
  line(`#${order.number}`);
  parts.push(c.normal);
  line(order.service_type === 'takeout' ? t('À EMPORTER', 'TAKE OUT') : t('SUR PLACE', 'DINE IN'));
  if (order.source === 'online') {
    line(t('COMMANDE EN LIGNE', 'ONLINE ORDER'));
    parts.push(c.tall); line((order.service_type === 'dine_in' ? t('Arrivée : ', 'Arrival: ') : t('Ramassage : ', 'Pickup: ')) + (order.pickup_time || '')); parts.push(c.normal);
    line(order.payment_status === 'paid' ? t('PAYÉ EN LIGNE', 'PAID ONLINE') : t('À PAYER AU COMPTOIR', 'PAY AT THE COUNTER'));
  }
  parts.push(c.boldOff, c.alignLeft);
  if (order.customer_name) line(t('Client : ', 'Customer: ') + order.customer_name);
  if (order.customer_phone) line(t('Tél. : ', 'Phone: ') + order.customer_phone);
  if (order.device_name) line(t('Tablette : ', 'Tablet: ') + order.device_name);
  if (reprint) line(t('(réimpression)', '(reprint)'));
  rule('=');

  for (const l of order.lines) {
    parts.push(c.boldOn);
    const name = `${l.qty} x ${l.name}${l.variant_name ? ' - ' + l.variant_name : ''}`;
    if (settings.print_prices !== false) {
      const ls = wrap(name, W - 10); ls.forEach((s, i) => line(i === ls.length - 1 ? lr(s, money(l.line_total), W) : s));
    } else wrap(name, W).forEach(s => line(s));
    parts.push(c.boldOff);
    for (const o of l.options) {
      const extra = settings.print_prices !== false && o.price ? ` (+${money(o.price)})` : '';
      wrap('- ' + o.name + extra, W, 3).forEach(s => line(s));
    }
    if (l.note) { parts.push(c.boldOn); wrap('>> ' + l.note, W, 3).forEach(s => line(s)); parts.push(c.boldOff); }
  }
  if (order.note) { rule(); parts.push(c.boldOn); wrap(t('NOTE : ', 'NOTE: ') + order.note, W).forEach(s => line(s)); parts.push(c.boldOff); }

  if (settings.print_prices !== false) {
    rule();
    line(lr(t('Sous-total', 'Subtotal'), money(order.subtotal), W));
    line(lr('TPS / GST', money(order.tax_gst), W));
    line(lr('TVQ / QST', money(order.tax_qst), W));
    if (order.tip) line(lr(t('Pourboire', 'Tip'), money(order.tip), W));
    parts.push(c.boldOn, c.tall);
    line(lr('TOTAL', money(order.total), W));
    parts.push(c.normal, c.boldOff);
  }
  rule('=');
  if (settings.print_footer) { parts.push(c.alignCenter); wrap(settings.print_footer, W).forEach(s => line(s)); parts.push(c.alignLeft); }
  parts.push(c.feed(3));
  if (settings.print_cut !== false) parts.push(c.cut);
  return Buffer.concat(parts);
}

export function buildTestTicket(settings) {
  const now = new Date().toISOString();
  return buildTicket({
    number: 0, created_at: now, service_type: 'dine_in', customer_name: 'Test', device_name: 'Panneau admin',
    lines: [
      { qty: 1, name: 'Composez votre galette', variant_name: "L'Essentiel", line_total: 25.52, note: 'sans oignon',
        options: [{ name: 'Cheddar', price: 0 }, { name: 'Jambon de dinde', price: 0 }, { name: 'Champignons', price: 0 }, { name: 'Saumon fumé', price: 8.98 }, { name: 'Sauce pesto', price: 1.55 }] },
      { qty: 2, name: 'Cappuccino', variant_name: 'Grand (L)', line_total: 13.0, options: [{ name: "Lait d'avoine", price: 0.75 }] },
    ],
    subtotal: 38.52, tax_gst: 1.93, tax_qst: 3.84, total: 44.29, note: 'Ticket de test, ça fonctionne : é à ç œ',
  }, settings);
}

/** "Everything is connected" ticket, printed when a print agent finishes its installation. */
export function buildWelcomeTicket(settings, { agentName = '', printerName = '', serverUrl = '' } = {}) {
  const c = cmds(settings.print_cmd);
  const { W, m, cols } = layout(settings);
  const parts = [c.init, c.codepage, c.margins(m, cols), c.alignCenter];
  const line = (s = '') => { parts.push(toCP1252(s)); parts.push(B(LF)); };
  const rule = (ch = '=') => line(ch.repeat(W));
  const now = new Date();
  line(); rule('*');
  parts.push(c.big, c.boldOn); line(settings.cafe_name || "L'Artisan"); parts.push(c.normal, c.boldOff);
  rule('*'); line();
  parts.push(c.tall, c.boldOn); line('TOUT EST CONNECTÉ !'); parts.push(c.normal, c.boldOff);
  line('Everything is connected!'); line();
  line('Imprimante reliée au serveur en ligne.');
  line('Les commandes du site web et des');
  line("tablettes s'impriment ici, toutes seules."); line();
  rule('-');
  parts.push(c.alignLeft);
  const kv = (k, v) => { const s = k + ' : '; line(s + String(v || '').slice(0, Math.max(4, W - s.length))); };
  kv('Ordinateur', agentName);
  kv('Imprimante', printerName);
  kv('Serveur', serverUrl.replace(/^https?:\/\//, ''));
  kv('Date', now.toLocaleDateString('fr-CA') + ' ' + now.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }));
  parts.push(c.alignCenter);
  rule('-'); line();
  parts.push(c.boldOn); line('Bon service !'); parts.push(c.boldOff);
  line(); line(); line();
  if (settings.print_cut !== false) parts.push(c.cut);
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------- transports
let queue = Promise.resolve();
/** Serialises print jobs so two simultaneous orders never interleave on the printer. */
export function printRaw(buffer, settings) {
  const job = () => sendRaw(buffer, settings);
  const p = queue.then(job, job);
  queue = p.catch(() => {});
  return p;
}

let agentSender = null;   // injected by the server (hub.printViaAgent) to avoid a circular import
export function setAgentSender(fn) { agentSender = fn; }

async function sendRaw(buffer, settings) {
  const mode = settings.print_mode || 'windows';
  if (mode === 'agent') { if (!agentSender) throw new Error('agent transport unavailable'); return agentSender(buffer); }
  if (mode === 'network') return sendTcp(buffer, settings.print_host, Number(settings.print_port) || 9100);
  if (mode === 'macos') return sendLp(buffer, settings.print_printer_name);
  return sendWindows(buffer, settings.print_printer_name);
}

function sendTcp(buffer, host, port) {
  if (!host) throw new Error('Adresse IP de l’imprimante manquante');
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host, port, timeout: 5000 }, () => {
      sock.end(buffer, () => resolve());
    });
    sock.on('timeout', () => { sock.destroy(); reject(new Error(`Imprimante ${host}:${port} ne répond pas`)); });
    sock.on('error', e => reject(new Error(`Imprimante ${host}:${port} : ${e.message}`)));
  });
}

function tmpFile(buffer) {
  const f = path.join(os.tmpdir(), `lartisan-ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.bin`);
  fs.writeFileSync(f, buffer);
  return f;
}

function run(cmd, args, { timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
    const timer = setTimeout(() => { p.kill(); reject(new Error('timeout')); }, timeout);
    p.on('error', e => { clearTimeout(timer); reject(e); });
    p.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error((err || out || `exit ${code}`).trim().split('\n').slice(-3).join(' '))); });
  });
}

// ---- Windows: one long-lived PowerShell worker (compiles the winspool helper once → prints in milliseconds)
const WORKER_PS1 = path.resolve(__dirname, '..', 'tools', 'rawprint-worker.ps1');
let worker = null, workerReady = null, pending = null;

function startWorker() {
  if (worker) return workerReady;
  const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', WORKER_PS1], { windowsHide: true });
  worker = p;
  let buf = '';
  workerReady = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('print worker did not start')), 30000);
    p.stdout.on('data', d => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '').trim(); buf = buf.slice(i + 1);
        if (line === 'READY') { clearTimeout(t); resolve(); }
        else if (pending) { const r = pending; pending = null; line.startsWith('OK') ? r.resolve() : r.reject(new Error(line.replace(/^ERR\s*/, '') || 'print failed')); }
      }
    });
    p.stderr.on('data', d => console.warn('[printer]', d.toString().trim()));
    p.on('exit', code => { console.warn('[printer] worker exited', code); worker = null; workerReady = null; if (pending) { const r = pending; pending = null; r.reject(new Error('print worker stopped')); } });
    p.on('error', e => { clearTimeout(t); worker = null; workerReady = null; reject(e); });
  });
  workerReady.catch(() => {});
  return workerReady;
}
/** Warm the worker at server start so the first ticket is fast too. */
export function warmUpPrinter(settings) {
  if (process.platform === 'win32' && settings.print_enabled && (settings.print_mode || 'windows') === 'windows') startWorker().catch(e => console.warn('[printer]', e.message));
}

async function sendWindows(buffer, printerName) {
  if (process.platform !== 'win32') throw new Error('Impression Windows disponible seulement sur Windows (utilisez le mode réseau)');
  if (!printerName) throw new Error("Choisissez l'imprimante dans Paramètres → Imprimante");
  await startWorker();
  const f = tmpFile(buffer);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending = null; reject(new Error('timeout')); }, 15000);
      pending = { resolve: () => { clearTimeout(timer); resolve(); }, reject: e => { clearTimeout(timer); reject(e); } };
      worker.stdin.write(`${printerName}\t${f}\r\n`);
    });
  } finally { try { fs.unlinkSync(f); } catch {} }
}

async function sendLp(buffer, printerName) {
  const f = tmpFile(buffer);
  try { await run('lp', ['-d', printerName, '-o', 'raw', f]); }
  finally { try { fs.unlinkSync(f); } catch {} }
}

/** Names of the printers installed on this computer (Windows / macOS). */
export async function listPrinters() {
  try {
    if (process.platform === 'win32') {
      const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name']);
      return out.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const out = await run('lpstat', ['-p']);
      return out.split('\n').map(l => (l.match(/^printer (\S+)/) || [])[1]).filter(Boolean);
    }
  } catch (e) { return []; }
  return [];
}
