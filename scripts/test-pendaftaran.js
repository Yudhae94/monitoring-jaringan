'use strict';

/**
 * Perbaiki mojibake (double-encoding) pada file teks.
 *
 * Gejala: emoji dan simbol khusus menjadi karakter aneh seperti " \u00E2\u0080\u0094.
 * Penyebab: file dibaca sebagai ANSI/CP1252 lalu ditulis ulang sebagai UTF-8.
 *
 * Cara kerja: kebalikan pemetaan CP1252 -> byte asli, lalu decode UTF-8.
 *
 * Jalankan: node scripts/fix-encoding.js
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
      return null; // karakter di luar CP1252 -> bukan hasil mojibake
    }
  }
  return Buffer.from(bytes);
}

/** Kembalikan teks ke bentuk aslinya; null bila tidak perlu / gagal. */
function repair(text) {
  // Buang BOM lebih dulu: byte BOM bisa ikut ter-encode jadi "﻿"
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!MOJIBAKE.test(body)) return null;

  // Kita repairing per "run", bukan per file, karena sebuah file bisa
  // memuat karakter UTF-8 yang benar (mis. "…", "‹") BERBEDAMPINGAN
  // dengan potongan mojibake. Reversing seluruh file akan gagal di situ.
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

    // Kumpulkan seluruh run karakter kandidat
    let j = i;
    while (j < body.length && isHigh(body[j])) j += 1;
    const run = body.slice(i, j);

    const bytes = encodeCp1252(run);
    const decoded = bytes ? bytes.toString('utf8') : null;

    // Terima hanya bila hasil decode valid & benar-benar memperbaiki
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
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const roots = ['src', 'public', 'scripts'];
const exts = new Set(['.ejs', '.js', '.css', '.sql', '.md', '.html', '.json']);
let fixedCount = 0;
let scanned = 0;

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    if (!exts.has(path.extname(file))) continue;
    scanned += 1;

    const original = fs.readFileSync(file, 'utf8');
    const repaired = repair(original);
    if (repaired === null) continue;

    // Hapus BOM jika ada, lalu tulis sebagai UTF-8 bersih
    fs.writeFileSync(file, repaired.replace(/^\uFEFF/, ''), 'utf8');
    fixedCount += 1;
    console.log(`  ✓ diperbaiki: ${file}`);
  }
}

'use strict';

/**
 * Uji end-to-end alur pendaftaran warga baru.
 * Jalankan: node scripts/test-pendaftaran.js
 */

const http = require('http');
const { bootstrap } = require('../src/server');
const createApp = require('../src/app');

const PORT = 4322;
const BASE = `http://127.0.0.1:${PORT}`;

let lulus = 0;
const gagal = [];

function cek(nama, kondisi, info = '') {
  if (kondisi) {
    lulus += 1;
    console.log(`  OK   ${nama}`);
  } else {
    gagal.push(`${nama}${info ? ' - ' + info : ''}`);
    console.log(`  GAGAL ${nama}${info ? ' - ' + info : ''}`);
  }
}

function request(path, { method = 'GET', cookie = '', form = null } = {}) {
  return new Promise((resolve, reject) => {
    const body = form ? new URLSearchParams(form).toString() : null;
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(BASE + path, { method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({
        status: res.statusCode, body: data, setCookie: res.headers['set-cookie'] || [],
      }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Timeout')));
    if (body) req.write(body);
    req.end();
  });
}

function ambilCookie(setCookie) {
  for (const c of setCookie) {
    // Nama cookie session configured di src/config/session.js -> 'simrt.sid'
    const m = c.match(/(simrt\.sid|sid|connect\.sid)=([^;]+)/);
    if (m) return `${m[1]}=${m[2]}`;
  }
  return '';
}

async function token(path, cookie) {
  const r = await request(path, { cookie });
  return (r.body.match(/name="_csrf" value="([^"]+)"/) || [])[1] || '';
}

async function login(email, password) {
  const page = await request('/login');
  const cookie = ambilCookie(page.setCookie);
  const t = await token('/login', cookie);
  const r = await request('/login', { method: 'POST', cookie, form: { _csrf: t, email, password } });
  return ambilCookie(r.setCookie) || cookie;
}

async function bersihkan(db) {
  db.exec("DELETE FROM users WHERE email LIKE '%@test.local'");
  db.exec("DELETE FROM pendaftaran WHERE email LIKE '%@test.local'");
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  TEST PENDAFTARAN WARGA BARU');
  console.log('='.repeat(60));

  bootstrap();
  const server = createApp().listen(PORT);
  await new Promise((r) => server.once('listening', r));

  const db = require('../src/database/connection');
  await bersihkan(db);

  // ---------- 1. HALAMAN PUBLIK ----------
  console.log('\n> 1. Halaman Publik');
  const form = await request('/daftar');
  cek('GET /daftar -> 200', form.status === 200, `status ${form.status}`);
  cek('Form memuat field NIK', form.body.includes('name="nik"'));
  cek('Form memuat email & password', form.body.includes('name="email"') && form.body.includes('name="password"'));
  cek('Form punya token CSRF', form.body.includes('name="_csrf"'));
  cek('Ada link kembali ke login', form.body.includes('href="/login"'));
  cek('Halaman login punya tombol Daftar', (await request('/login')).body.includes('daftarToggle'));

  const guestAdmin = await request('/pendaftaran');
  cek('/pendaftaran menolak tamu', guestAdmin.status === 302, `status ${guestAdmin.status}`);

  // ---------- 2. VALIDASI ----------
  console.log('\n> 2. Validasi Input');
  const c0 = ambilCookie((await request('/daftar')).setCookie);
  const t0 = await token('/daftar', c0);

  const bad = await request('/daftar', {
    method: 'POST', cookie: c0,
    form: {
      _csrf: t0, nama: 'A', email: 'bukan-email', nik: '123',
      jenis_kelamin: 'X', alamat: '', password: '123', konfirmasi_password: '999',
    },
  });
  cek('Data tidak valid -> 422', bad.status === 422, `status ${bad.status}`);
  cek('Pesan nama terlalu pendek', bad.body.includes('minimal 3 karakter'));
  cek('Pesan email tidak valid', bad.body.includes('Format email tidak valid'));
  cek('Pesan NIK 16 digit', bad.body.includes('16 digit'));
  cek('Pesan konfirmasi password', bad.body.includes('tidak cocok'));
  cek('Kolom error diberi class is-invalid', bad.body.includes('is-invalid'));
  cek('Nilai input dipertahankan', bad.body.includes('value="bukan-email"'));

  // ---------- 3. PENDAFTARAN SUKSES ----------
  console.log('\n> 3. Pendaftaran Berhasil');
  const email = `uji${Date.now()}@test.local`;
  const nik = '327601' + String(Date.now()).slice(-10);
  const good = await request('/daftar', {
    method: 'POST', cookie: c0,
    form: {
      _csrf: t0,
      nama: 'Uji Pendaftaran Warga', email, nik,
      jenis_kelamin: 'L', tempat_lahir: 'Karawang', tanggal_lahir: '1995-05-05',
      alamat: 'Jl. Uji No. 1', no_rumah: 'U-1', no_hp: '081234567890',
      password: 'rahasia123', konfirmasi_password: 'rahasia123',
    },
  });
  cek('Pendaftaran valid -> 302', good.status === 302, `status ${good.status}`);

  const sukses = await request('/daftar/terkirim', { cookie: c0 });
  cek('GET /daftar/terkirim -> 200', sukses.status === 200, `status ${sukses.status}`);
  cek('Halaman sukses menjelaskan alur', sukses.body.includes('Verifikasi Admin'));

  const row = db.get('SELECT * FROM pendaftaran WHERE email = ?', [email]);
  cek('Tersimpan di tabel pendaftaran', !!row);
  cek('Status awal = menunggu', row && row.status === 'menunggu', row && row.status);
  cek('Password di-hash (bukan teks polos)',
    row && row.password_hash !== 'rahasia123' && String(row.password_hash).startsWith('$2'));
  cek('Belum ada akun user dibuat', !db.get('SELECT id FROM users WHERE email = ?', [email]));

  // ---------- 4. DUPLIKASI ----------
  console.log('\n> 4. Cegah Pendaftaran Ganda');
  const t1 = await token('/daftar', c0);
  const dup = await request('/daftar', {
    method: 'POST', cookie: c0,
    form: {
      _csrf: t1, nama: 'Uji Ganda', email, nik: '9999999999999999',
      jenis_kelamin: 'L', alamat: 'Jl. Ganda', password: 'rahasia123', konfirmasi_password: 'rahasia123',
    },
  });
  cek('Email ganda ditolak (422)', dup.status === 422, `status ${dup.status}`);
  cek('Pesan email sudah terdaftar', dup.body.includes('sudah pernah terdaftar'));

  // ---------- 5. ADMIN ----------
  console.log('\n> 5. Admin Antrean & Persetujuan');
  const admin = await login('admin@simrt.local', 'admin123');
  const antrean = await request('/pendaftaran', { cookie: admin });
  cek('GET /pendaftaran (admin) -> 200', antrean.status === 200, `status ${antrean.status}`);
  cek('Antrean menampilkan pendaftar', antrean.body.includes('Uji Pendaftaran Warga'));
  cek('Badge jumlah tampil di sidebar', antrean.body.includes('nav-badge'));
  cek('Tombol Setujui tersedia', antrean.body.includes('/approve'));
  cek('Tombol Tolak tersedia', antrean.body.includes('data-reject-form'));

  const detail = await request(`/pendaftaran/${row.id}`, { cookie: admin });
  cek('GET /pendaftaran/:id -> 200', detail.status === 200, `status ${detail.status}`);
  cek('Detail menampilkan NIK', detail.body.includes(nik));

  const tA = await token('/pendaftaran', admin);
  const appr = await request(`/pendaftaran/${row.id}/approve`, {
    method: 'POST', cookie: admin, form: { _csrf: tA },
  });
  cek('Setujui -> 302', appr.status === 302, `status ${appr.status}`);

  const after = db.get('SELECT * FROM pendaftaran WHERE id = ?', [row.id]);
  cek('Status menjadi disetujui', after.status === 'disetujui', after.status);
  cek('Tercatat siapa yang menyetujui', after.diverifikasi_oleh !== null);

  const user = db.get('SELECT * FROM users WHERE email = ?', [email]);
  cek('Akun user dibuat', !!user);
  cek('Role dipaksa warga', user && user.role === 'warga', user && user.role);
  cek('Akun aktif', user && user.is_active === 1);
  cek('user_id tertaut ke pendaftaran', after.user_id === (user && user.id));

  // ---------- 6. LOGIN WARGA BARU ----------
  console.log('\n> 6. Login Warga Baru');
  const w = await login(email, 'rahasia123');
  const dash = await request('/dashboard', { cookie: w });
  cek('Warga baru dapat login', dash.status === 200, `status ${dash.status}`);
  cek('Dashboard menampilkan namanya', dash.body.includes('Uji Pendaftaran Warga'));

  // ---------- 7. TOLAK ----------
  console.log('\n> 7. Penolakan');
  const c1 = ambilCookie((await request('/daftar')).setCookie);
  const t2 = await token('/daftar', c1);
  const email2 = `tolak${Date.now()}@test.local`;
  await request('/daftar', {
    method: 'POST', cookie: c1,
    form: {
      _csrf: t2, nama: 'Uji Ditolak', email: email2,
      nik: '327602' + String(Date.now()).slice(-10),
      jenis_kelamin: 'P', alamat: 'Jl. Uji 2',
      password: 'rahasia123', konfirmasi_password: 'rahasia123',
    },
  });
  const row2 = db.get('SELECT * FROM pendaftaran WHERE email = ?', [email2]);
  cek('Pendaftaran kedua masuk antrean', !!row2 && row2.status === 'menunggu');

  const tR = await token('/pendaftaran', admin);
  const noReason = await request(`/pendaftaran/${row2.id}/reject`, {
    method: 'POST', cookie: admin, form: { _csrf: tR, alasan: '' },
  });
  cek('Tolak tanpa alasan ditolak (400)', noReason.status === 400, `status ${noReason.status}`);

  const tR2 = await token('/pendaftaran', admin);
  const rej = await request(`/pendaftaran/${row2.id}/reject`, {
    method: 'POST', cookie: admin, form: { _csrf: tR2, alasan: 'NIK tidak terdaftar' },
  });
  cek('Tolak dengan alasan -> 302', rej.status === 302, `status ${rej.status}`);
  const row2after = db.get('SELECT * FROM pendaftaran WHERE id = ?', [row2.id]);
  cek('Status menjadi ditolak', row2after.status === 'ditolak', row2after.status);
  cek('Alasan tersimpan', row2after.alasan_menolak === 'NIK tidak terdaftar');
  cek('Tidak ada akun dibuat saat ditolak', !db.get('SELECT id FROM users WHERE email = ?', [email2]));

  // ---------- 8. AKSES & CSRF ----------
  console.log('\n> 8. Kontrol Akses & CSRF');
  const forbidden = await request('/pendaftaran', { cookie: w });
  cek('Warga tidak boleh buka /pendaftaran (403)', forbidden.status === 403, `status ${forbidden.status}`);

  const noCsrf = await request('/daftar', {
    method: 'POST', cookie: c1,
    form: {
      nama: 'Tanpa CSRF', email: `x${Date.now()}@test.local`, nik: '1111111111111111',
      jenis_kelamin: 'L', alamat: 'x', password: 'rahasia123', konfirmasi_password: 'rahasia123',
    },
  });
  cek('POST /daftar tanpa CSRF ditolak (403)', noCsrf.status === 403, `status ${noCsrf.status}`);

  // ---------- 9. ROLE TIDAK BISA DIPILIH SENDIRI ----------
  console.log('\n> 9. Role Tidak Bisa Dipilih Sendiri');
  const c2 = ambilCookie((await request('/daftar')).setCookie);
  const t3 = await token('/daftar', c2);
  const email3 = `sneaky${Date.now()}@test.local`;
  await request('/daftar', {
    method: 'POST', cookie: c2,
    form: {
      _csrf: t3, nama: 'Coba Daftar Admin', email: email3,
      nik: '327603' + String(Date.now()).slice(-10),
      jenis_kelamin: 'L', alamat: 'Jl. Uji 3', role: 'admin',
      password: 'rahasia123', konfirmasi_password: 'rahasia123',
    },
  });
  const tA2 = await token('/pendaftaran', admin);
  const sneakyRow = db.get('SELECT * FROM pendaftaran WHERE email = ?', [email3]);
  if (sneakyRow) {
    await request(`/pendaftaran/${sneakyRow.id}/approve`, { method: 'POST', cookie: admin, form: { _csrf: tA2 } });
  }
  const sneakyUser = db.get('SELECT role FROM users WHERE email = ?', [email3]);
  cek('Walaupun kirim role=admin, akun jadi warga', sneakyUser && sneakyUser.role === 'warga',
    sneakyUser && sneakyUser.role);

  // ---------- 10. KEBERSIHAN ----------
  console.log('\n> 10. Kebersihan Data');
  cek('Password tidak pernah tampil di HTML', !antrean.body.includes('password_hash'));
  cek('Antrean tidak membocorkan hash', row && !antrean.body.includes(String(row.password_hash)));

  await bersihkan(db);
  server.close();
  db.close();

  console.log('\n' + '='.repeat(60));
  console.log(`  HASIL: ${lulus} lulus, ${gagal.length} gagal`);
  if (gagal.length) {
    console.log('\n  GAGAL:');
    gagal.forEach((g) => console.log('   - ' + g));
  }
  console.log('='.repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});

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
        console.log(`  ✗ ${file}: <${name}> ${a} buka / ${b} tutup`);
        problems += 1;
      }
    }
  }
  console.log(problems === 0 ? '\nStruktur tag: semua file OK.' : `\nTotal masalah: ${problems}`);
  process.exitCode = problems === 0 ? 0 : 1;
}

