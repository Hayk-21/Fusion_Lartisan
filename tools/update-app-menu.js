#!/usr/bin/env node
// Copies the CURRENT menu from a running server into the Android app's bundled assets,
// so a freshly installed tablet already has the latest menu even before it connects.
//   node tools/update-app-menu.js            (server on http://localhost:3000)
//   node tools/update-app-menu.js http://192.168.1.20:3000
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'android-app', 'app', 'src', 'main', 'assets', 'menu.json');
const res = await fetch(base + '/api/menu');
if (!res.ok) { console.error('Server answered', res.status); process.exit(1); }
const menu = await res.json();
fs.writeFileSync(out, JSON.stringify(menu, null, 2));
console.log(`Wrote menu v${menu.version} (${menu.categories.length} categories, ${menu.items.length} items) to ${out}`);
console.log('Now rebuild the APK in Android Studio to ship it.');
