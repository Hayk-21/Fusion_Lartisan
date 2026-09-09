// WebSocket hub — pushes live events to admin browsers and tablets.
//
// Client → server:  {type:'hello', role:'admin'|'tablet', device_id, device_name, app_version, menu_version}
//                   {type:'ping'}
// Server → client:  {type:'welcome', menu_version, server_time}
//                   {type:'menu_updated', version}          → tablets re-download /api/menu
//                   {type:'settings_updated', settings}
//                   {type:'new_order', order}               → admin plays the sound
//                   {type:'order_updated', order}           → tablets can show "ready"
//                   {type:'devices', devices}               → admin device list
//                   {type:'pong'}
import { WebSocketServer } from 'ws';
import { isValid, tokenFromRequest } from './auth.js';
import { getMenu, touchDevice, listDevices, getSettings, audit } from './db.js';

const clients = new Set();

export function attachHub(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (ws, req) => {
    ws.meta = { role: 'tablet', admin: isValid(tokenFromRequest(req)), alive: true, ip: req.socket.remoteAddress };
    clients.add(ws);
    ws.on('pong', () => { ws.meta.alive = true; });
    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }
      if (msg.type === 'hello' && msg.role === 'printer') {
        const token = getSettings().print_agent_token;
        if (!token || msg.token !== token) { send(ws, { type: 'error', error: 'bad token' }); ws.close(); return; }
        ws.meta.role = 'printer'; ws.meta.device_name = msg.device_name || 'print-agent'; ws.meta.printers = msg.printers || [];
        audit('print.agent.connected', ws.meta.device_name);
        send(ws, { type: 'welcome', server_time: new Date().toISOString() });
        broadcastAgents();
        return;
      }
      if (msg.type === 'print_result') {
        const p = pendingJobs.get(msg.id); if (p) { pendingJobs.delete(msg.id); clearTimeout(p.timer); msg.ok ? p.resolve() : p.reject(new Error(msg.error || 'print failed')); }
        return;
      }
      if (msg.type === 'hello') {
        ws.meta.role = msg.role === 'admin' ? 'admin' : 'tablet';
        ws.meta.device_id = msg.device_id; ws.meta.device_name = msg.device_name;
        if (ws.meta.role === 'tablet' && msg.device_id) {
          touchDevice({ id: msg.device_id, name: msg.device_name, app_version: msg.app_version, menu_version: msg.menu_version });
          broadcastDevices();
        }
        const menu = getMenu();
        send(ws, { type: 'welcome', menu_version: menu?.version || 0, server_time: new Date().toISOString() });
      } else if (msg.type === 'ping') {
        if (ws.meta.device_id) touchDevice({ id: ws.meta.device_id, menu_version: msg.menu_version });
        send(ws, { type: 'pong' });
      }
    });
    ws.on('close', () => { const wasAgent = ws.meta.role === 'printer'; clients.delete(ws); broadcastDevices(); if (wasAgent) { audit('print.agent.disconnected', ws.meta.device_name); broadcastAgents(); } });
    ws.on('error', () => { clients.delete(ws); });
  });
  // heartbeat: drop dead sockets (tablet went to sleep, Wi-Fi dropped)
  setInterval(() => {
    for (const ws of clients) {
      if (!ws.meta.alive) { try { ws.terminate(); } catch {} clients.delete(ws); continue; }
      ws.meta.alive = false; try { ws.ping(); } catch {}
    }
  }, 15_000).unref();
  return wss;
}

function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }

export function broadcast(obj, { role } = {}) {
  const s = JSON.stringify(obj);
  for (const ws of clients) {
    if (role && ws.meta.role !== role) continue;
    if (ws.readyState === 1) ws.send(s);
  }
}

export function connectedDevices() {
  const online = new Set([...clients].filter(c => c.meta.role === 'tablet' && c.meta.device_id).map(c => c.meta.device_id));
  return listDevices().map(d => ({ ...d, online: online.has(d.id) }));
}

export function broadcastDevices() {
  broadcast({ type: 'devices', devices: connectedDevices() }, { role: 'admin' });
}

export function adminCount() { return [...clients].filter(c => c.meta.role === 'admin').length; }

// ---------------------------------------------------------------- print agent (café laptop) ------------------
const pendingJobs = new Map();
export function agentsConnected() { return [...clients].filter(c => c.meta.role === 'printer' && c.readyState === 1).map(c => ({ name: c.meta.device_name, printers: c.meta.printers })); }
export function broadcastAgents() { broadcast({ type: 'print_agents', agents: agentsConnected() }, { role: 'admin' }); }
/** Sends raw ticket bytes to the connected print agent and waits for its answer. */
export function printViaAgent(buffer, { timeoutMs = 20000 } = {}) {
  const agent = [...clients].find(c => c.meta.role === 'printer' && c.readyState === 1);
  if (!agent) return Promise.reject(new Error("Agent d'impression non connecté (lancez start-print-agent.bat sur l'ordinateur du café)"));
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pendingJobs.delete(id); reject(new Error("L'agent d'impression ne répond pas")); }, timeoutMs);
    pendingJobs.set(id, { resolve, reject, timer });
    agent.send(JSON.stringify({ type: 'print', id, data: buffer.toString('base64') }));
  });
}
