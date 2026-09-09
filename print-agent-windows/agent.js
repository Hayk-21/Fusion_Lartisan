// Fusion L'Artisan — agent d'impression (Windows). Reste connecté au serveur en ligne et imprime chaque ticket reçu.
//   node agent.js              (lit print-agent.json à côté)
//   node agent.js --printers   (liste les imprimantes Windows)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { printRaw, listPrinters, PRINT_DEFAULTS } from './lib/printer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(here, 'print-agent.json');

if (process.argv.includes('--printers')) {
  const p = await listPrinters();
  console.log(p.length ? p.join('\n') : '');
  process.exit(0);
}
if (!fs.existsSync(CONFIG)) {
  console.log('print-agent.json introuvable : lancez INSTALLER.bat pour configurer l\'agent.');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const settings = { ...PRINT_DEFAULTS, print_mode: cfg.print_mode || 'windows', print_printer_name: cfg.printer_name, print_host: cfg.print_host, print_port: cfg.print_port || 9100 };
const wsUrl = cfg.server_url.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
let printers = [];
try { printers = await listPrinters(); } catch {}
console.log(`Agent d'impression L'Artisan → ${cfg.server_url}  (imprimante : ${cfg.printer_name})`);

function connect() {
  const ws = new WebSocket(wsUrl);
  let ping;
  ws.on('open', () => {
    console.log(new Date().toLocaleTimeString(), 'connecté au serveur');
    ws.send(JSON.stringify({ type: 'hello', role: 'printer', token: cfg.token, device_name: cfg.agent_name || os.hostname(), printers }));
    ping = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' })); }, 25000);
  });
  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'error') { console.error('Serveur :', m.error, '- vérifiez le jeton dans print-agent.json (relancez INSTALLER.bat)'); return; }
    if (m.type !== 'print') return;
    try {
      await printRaw(Buffer.from(m.data, 'base64'), settings);
      ws.send(JSON.stringify({ type: 'print_result', id: m.id, ok: true }));
      console.log(new Date().toLocaleTimeString(), 'ticket imprimé');
    } catch (e) {
      ws.send(JSON.stringify({ type: 'print_result', id: m.id, ok: false, error: e.message }));
      console.error(new Date().toLocaleTimeString(), 'échec impression :', e.message);
    }
  });
  ws.on('close', () => { clearInterval(ping); console.log(new Date().toLocaleTimeString(), 'déconnecté - nouvelle tentative dans 5 s'); setTimeout(connect, 5000); });
  ws.on('error', e => { console.error('connexion :', e.message); });
}
connect();
