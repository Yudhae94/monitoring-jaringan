'use strict';

/**
 * Utilitas rawas file:
 *   1. fix-encoding : membalik mojibake (double-encoding UTF-8 -> CP1252 -> UTF-8)
 *   2. check-views  : memeriksa keseimbangan tag HTML pada semua file .ejs
 *
 * Jalankan:
 *   npm run fix:encoding
 *   npm run check:views
 */

const fs = require('fs');
const path = require('path');

// Peta karakter CP1252 yang berbeda dari Latin-1 (0x80-0x9F)
const CP1252_HIGH = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/** Tanda khas file yang pernah rusak (mojibake). */
const MOJIBAKE = /[\u00c3\u00c2\u00e2\u00f0\u0080-\u009f\u20ac\u0152\u0153\u0160\u0161\u017d\u017e\u0178\u02c6\u02dc\u201a\u2018\u2019\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u2122]/;

function encodeCp1252(str) {
  const bytes = [];
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
    } else if (Object.prototype.hasOwnProperty.call(CP1252_HIGH, code)) {
      bytes.push(CP1252_HIGH[code]);
    } else {
      return null; // di luar CP1252 -> bukan hasil mojibake
    }
  }
  return Buffer.from(bytes);
}

function repair(text) {
  // Buang BOM lebih dulu: byte BOM bisa ikut ter-encode
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!MOJIBAKE.test(body)) return null;

  // Repair per "run": file bisa memuat karakter UTF-8 yang benar
  // (mis. "...", "‹") berdampingan dengan potongan mojibake.
  const isHigh = (ch) => {
    const code = ch.codePointAt(0);
    if (code <= 0x7f) return false;
    return code <= 0xff || Object.prototype.hasOwnProperty.call(CP1252_HIGH, code);
  };

  let out = '';
  let changed = false;
  let i = 0;

  while (i < body.length) {
    if (!isHigh(body[i])) {
      out += body[i];
      i += 1;
      continue;
    }

    let j = i;
    while (j < body.length && isHigh(body[j])) j += 1;
    const run = body.slice(i, j);
    const bytes = encodeCp1252(run);
    const decoded = bytes ? bytes.toString('utf8') : null;

    if (decoded && !decoded.includes('\uFFFD') && decoded !== run) {
      out += decoded;
      changed = true;
    } else {
      out += run;
    }
    i = j;
  }

  return changed ? out : null;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const ROOTS = ['src', 'public', 'scripts'];
const EXTS = new Set(['.ejs', '.js', '.css', '.sql', '.md', '.html', '.json']);

/* ---------- Mode 1: perbaikan encoding ---------- */
if (!process.argv.includes('--check')) {
  let fixed = 0;
  let scanned = 0;

  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (!EXTS.has(path.extname(file))) continue;
      scanned += 1;
      const original = fs.readFileSync(file, 'utf8');
      const repaired = repair(original);
      if (repaired === null) continue;
      fs.writeFileSync(file, repaired, 'utf8');
      fixed += 1;
      console.log(`  OK diperbaiki: ${file}`);
    }
  }
  console.log(`\nDipindai ${scanned} berkas, diperbaiki ${fixed} berkas.`);
}

/* ---------- Mode 2: pemeriksa struktur tag HTML (EJS) ---------- */
const TAG_PAIRS = [
  ['div', /<div\b/g, /<\/div>/g],
  ['form', /<form\b/g, /<\/form>/g],
  ['main', /<main\b/g, /<\/main>/g],
  ['aside', /<aside\b/g, /<\/aside>/g],
  ['table', /<table\b/g, /<\/table>/g],
  ['tr', /<tr\b/g, /<\/tr>/g],
  ['td', /<td\b/g, /<\/td>/g],
  ['dl', /<dl\b/g, /<\/dl>/g],
  ['ul', /<ul\b/g, /<\/ul>/g],
  ['select', /<select\b/g, /<\/select>/g],
  ['section', /<section\b/g, /<\/section>/g],
  ['nav', /<nav\b/g, /<\/nav>/g],
  ['header', /<header\b/g, /<\/header>/g],
];

if (process.argv.includes('--check')) {
  let problems = 0;
  for (const file of walk('src/views')) {
    if (!file.endsWith('.ejs')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const [name, open, close] of TAG_PAIRS) {
      const a = (text.match(open) || []).length;
      const b = (text.match(close) || []).length;
      if (a !== b) {
        console.log(`  RUSAK ${file}: <${name}> ${a} buka / ${b} tutup`);
        problems += 1;
      }
    }
  }
  console.log(problems === 0 ? '\nStruktur tag: semua file OK.' : `\nTotal masalah: ${problems}`);
  process.exitCode = problems === 0 ? 0 : 1;
}

