// Resized, WebP-compressed copies of the pictures in /uploads, generated once and cached on disk:
//   /img/480/pexels-123.jpg  →  DATA_DIR/cache/img/480/pexels-123.jpg.webp
// A 900 px JPEG from Pexels weighs 100 to 200 KB; the 480 px WebP used by the menu cards weighs 15 to 30 KB,
// so a whole section loads in a fraction of a second, and browsers keep the files (immutable cache headers).
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.js';

const UPLOADS = path.join(DATA_DIR, 'uploads');
const CACHE = path.join(DATA_DIR, 'cache', 'img');
export const SIZES = [160, 320, 480, 640, 960, 1280];
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('[images] sharp not available, pictures are served at full size'); }

const pending = new Map();   // file@w → Promise (avoid resizing the same picture twice at once)

export async function resized(file, w) {
  const safe = path.basename(file);
  const src = path.join(UPLOADS, safe);
  if (!fs.existsSync(src)) return null;
  if (!sharp || !SIZES.includes(w)) return src;
  const out = path.join(CACHE, String(w), safe + '.webp');
  if (fs.existsSync(out)) return out;
  const key = safe + '@' + w;
  if (!pending.has(key)) {
    pending.set(key, (async () => {
      try {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        const tmp = out + '.tmp';
        await sharp(src).rotate().resize({ width: w, height: Math.round(w * 0.75), fit: 'cover', position: 'attention', withoutEnlargement: false }).webp({ quality: 76 }).toFile(tmp);
        fs.renameSync(tmp, out);
        return out;
      } catch (e) { console.warn('[images] resize failed', safe, e.message); return src; }
      finally { pending.delete(key); }
    })());
  }
  return pending.get(key);
}

// Express route: GET /img/:w/:file
export function imageRoute() {
  return async (req, res) => {
    const w = Number(req.params.w);
    const p = await resized(req.params.file, w);
    if (!p) return res.status(404).end();
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(p);
  };
}

// Warm the cache for every picture of the menu (runs in the background at start-up and after photo changes).
export async function warmImages(menu, sizes = [320, 480, 1280]) {
  if (!sharp) return 0;
  const files = new Set();
  const add = u => { if (u && String(u).startsWith('/uploads/')) files.add(path.basename(u)); };
  for (const s of menu.sections || []) add(s.image);
  for (const c of menu.categories || []) add(c.image);
  for (const i of menu.items || []) add(i.image);
  let n = 0;
  for (const f of files) for (const w of sizes) { const out = path.join(CACHE, String(w), f + '.webp'); if (!fs.existsSync(out)) { await resized(f, w); n++; } }
  return n;
}

// Turn a picture URL into its resized variant (server-side helper for pages rendered by the server).
export const imgUrl = (u, w) => (u && String(u).startsWith('/uploads/')) ? `/img/${w}/${path.basename(u)}` : u;
