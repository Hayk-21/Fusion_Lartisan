import crypto from 'node:crypto';
import { getSettings, audit } from './db.js';

const SESSION_HOURS = 24;
const sessions = new Map();          // token -> expiresAt (ms)
const attempts = new Map();          // ip -> { count, until }
export const COOKIE = 'lartisan_admin';

export function login(pin, ip) {
  const now = Date.now();
  const a = attempts.get(ip) || { count: 0, until: 0 };
  if (a.until > now) return { ok: false, status: 429, error: 'Too many attempts. Wait 1 minute.', retry_in: Math.ceil((a.until - now) / 1000) };
  const expected = String(getSettings().pin);
  const given = String(pin || '');
  const same = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!same) {
    a.count++;
    if (a.count >= 5) { a.until = now + 60_000; a.count = 0; }
    attempts.set(ip, a);
    audit('admin.login.failed', ip);
    return { ok: false, status: 401, error: 'Wrong PIN' };
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, now + SESSION_HOURS * 3600_000);
  audit('admin.login', ip);
  return { ok: true, token };
}

export function isValid(token) {
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(token); return false; }
  sessions.set(token, Date.now() + SESSION_HOURS * 3600_000); // sliding expiry
  return true;
}

export function logout(token) { sessions.delete(token); }

export function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}

export function tokenFromRequest(req) {
  const c = parseCookies(req.headers.cookie);
  return c[COOKIE] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
}

export function requireAdmin(req, res, next) {
  if (isValid(tokenFromRequest(req))) return next();
  res.status(401).json({ error: 'Not logged in' });
}
