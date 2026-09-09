// UDP auto-discovery so tablets can find the laptop without typing an IP.
// Tablet broadcasts "LARTISAN_DISCOVER" to 255.255.255.255:47474; the server answers with its address.
import dgram from 'node:dgram';
import os from 'node:os';

export const DISCOVERY_PORT = 47474;

export function localAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push({ iface: name, address: a.address });
    }
  }
  // Prefer typical home/office Wi-Fi ranges first
  out.sort((a, b) => score(b.address) - score(a.address));
  return out;
}
function score(ip) {
  if (ip.startsWith('192.168.')) return 3;
  if (ip.startsWith('10.')) return 2;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 1;
  return 0;
}

export function startDiscovery({ port, cafeName }) {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  sock.on('message', (msg, rinfo) => {
    if (msg.toString().trim() !== 'LARTISAN_DISCOVER') return;
    const reply = JSON.stringify({ service: 'lartisan-cafe', name: cafeName(), port, addresses: localAddresses().map(a => a.address) });
    sock.send(reply, rinfo.port, rinfo.address);
  });
  sock.on('error', e => console.warn('[discovery] disabled:', e.message));
  sock.bind(DISCOVERY_PORT, () => { try { sock.setBroadcast(true); } catch {} });
  return sock;
}
