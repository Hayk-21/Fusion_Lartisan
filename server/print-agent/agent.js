// L'Artisan — print agent. Runs on the café laptop (where the Star TSP650 is plugged in) when the
// server is hosted in the cloud. Keeps a WebSocket to the server and prints every ticket it receives.
//
//   node print-agent/agent.js              (reads print-agent/print-agent.json)
//   node print-agent/agent.js --printers   (lists the printers installed on this computer)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { printRaw, listPrinters, PRINT_DEFAULTS } from '../src/printer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONFIG = path.join(here, 'print-agent.json');

if (process.argv.includes('--printers')) {
  const p = await listPrinters();
  console.log(p.length ? p.map(x => ' - ' + x).join('\n') : '(aucune imprimante trouvée)');
  process.exit(0);
}
if (!fs.existsSync(CONFIG)) {
  fs.writeFileSync(CONFIG, JSON.stringify({ server_url: 'https://VOTRE-APP.up.railway.app', token: 'COLLEZ-LE-JETON-DU-PANNEAU', printer_name: 'Star TSP650 (TSP654)', print_mode: 'windows', agent_name: os.hostname() }, null, 2));
  console.log(`Fichier de configuration créé : ${CONFIG}\nRemplissez server_url, token (Paramètres → Imprimante → Agent) et printer_name (node print-agent/agent.js --printers), puis relancez.`);
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
  let alive = true, ping;
  ws.on('open', () => {
    console.log(new Date().toLocaleTimeString(), 'connecté au serveur');
    ws.send(JSON.stringify({ type: 'hello', role: 'printer', token: cfg.token, device_name: cfg.agent_name || os.hostname(), printers }));
    ping = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' })); }, 25000);
  });
  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'error') { console.error('Serveur :', m.error, '— vérifiez le jeton dans print-agent.json'); return; }
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
  ws.on('close', () => { clearInterval(ping); console.log(new Date().toLocaleTimeString(), 'déconnecté — nouvelle tentative dans 5 s'); setTimeout(connect, 5000); });
  ws.on('error', e => { console.error('connexion :', e.message); });
}
connect();
