// Builds the one-file Windows installer of the print agent (a .bat with the agent files embedded as a zip).
// The admin downloads it from Paramètres → Imprimante; server address and agent token are baked in, so the
// person who runs it answers nothing: the script installs Node.js if needed, picks the Star printer, registers
// with the server, adds itself to Windows startup, prints a test ticket and starts the agent.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, '..', 'print-agent-windows');

// ---- minimal zip writer (deflate) — enough for a handful of small text files
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }
export function buildZip(files) {           // files: [{ name, data: Buffer }]
  const locals = [], centrals = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'); const raw = Buffer.from(f.data);
    const comp = zlib.deflateRawSync(raw); const crc = crc32(raw);
    const head = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0x21), u32(crc), u32(comp.length), u32(raw.length), u16(name.length), u16(0), name]);
    locals.push(head, comp);
    centrals.push(Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0x21), u32(crc), u32(comp.length), u32(raw.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += head.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)]);
  return Buffer.concat([...locals, cd, end]);
}

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'print-agent.json' || e.name.endsWith('.log')) continue;
    const p = path.join(dir, e.name), rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(p, rel)); else out.push({ name: rel, data: fs.readFileSync(p) });
  }
  return out;
}

/** The .bat text. `serverUrl` + `token` empty → interactive installer (asks address, PIN, printer). */
export function buildInstallerBat({ serverUrl = '', token = '', cafeName = "L'Artisan" } = {}) {
  const zip = buildZip(walk(TEMPLATE_DIR));
  const b64 = zip.toString('base64').replace(/(.{76})/g, '$1\r\n');
  const auto = serverUrl && token;
  const lines = [
    '@echo off',
    'chcp 65001 >nul',
    `title ${cafeName.replace(/[&|<>^]/g, '')} - Agent d'impression (installation)`,
    'setlocal',
    'set "DEST=%LOCALAPPDATA%\\LArtisan-PrintAgent"',
    'set "LARTISAN_LOG=%~dp0install-agent.log"',
    auto ? `set "LARTISAN_SERVER=${serverUrl}"` : 'set "LARTISAN_SERVER="',
    auto ? `set "LARTISAN_TOKEN=${token}"` : 'set "LARTISAN_TOKEN="',
    'echo.',
    'echo  ==========================================================',
    "echo   Installation de l'agent d'impression - patientez...",
    'echo  ==========================================================',
    'echo.',
    'powershell -NoProfile -ExecutionPolicy Bypass -Command ^',
    '  "$src = \'%~f0\'; $dest = \'%DEST%\';" ^',
    '  "$lines = Get-Content -LiteralPath $src; $i = [array]::IndexOf($lines, \':::PAYLOAD\' + \':::\');" ^',
    '  "$b64 = ($lines[($i+1)..($lines.Length-1)] -join \'\');" ^',
    '  "$zip = Join-Path $env:TEMP \'lartisan-print-agent.zip\'; [IO.File]::WriteAllBytes($zip, [Convert]::FromBase64String($b64));" ^',
    '  "if (Test-Path $dest) { Get-ChildItem $dest -Exclude \'print-agent.json\' | Remove-Item -Recurse -Force };" ^',
    '  "Add-Type -AssemblyName System.IO.Compression.FileSystem; New-Item -ItemType Directory -Force -Path $dest | Out-Null;" ^',
    '  "$z = [IO.Compression.ZipFile]::OpenRead($zip); foreach ($e in $z.Entries) { if ($e.Name) { $p = Join-Path $dest $e.FullName; New-Item -ItemType Directory -Force -Path (Split-Path $p) | Out-Null; [IO.Compression.ZipFileExtensions]::ExtractToFile($e, $p, $true) } }; $z.Dispose(); Remove-Item $zip"',
    'if errorlevel 1 (echo  Extraction impossible. & pause & exit /b 1)',
    'cd /d "%DEST%"',
    'call INSTALLER.bat',
    'exit /b',
    ':::PAYLOAD:::',
    b64,
  ];
  return lines.join('\r\n') + '\r\n';
}
