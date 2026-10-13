'use strict';

/**
 * Smoke test end-to-end.
 *
 * Menjalankan server sementara lalu memeriksa:
 *   1. Halaman publik (login, health)
 *   2. Login setiap role (admin / bendahara / warga)
 *   3. Setiap halaman utama per role -> harus HTTP 200
 *   4. Hak akses (warga tidak boleh masuk /users dan /kas)
 *   5. 404 untuk halaman tidak dikenal
 *
 * Jalankan: npm run test:smoke
 */

const http = require('http');
const createApp = require('../src/app');
const db = require('../src/database/connection');
const { bootstrap } = require('../src/server');

const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;

// ---------- HTTP helper ----------
function request(path, { method = 'GET', cookie = '', form = null, json = false } = {}) {
  return new Promise((resolve, reject) => {
    const body = form ? new URLSearchParams(form).toString() : null;

    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (json) headers.Accept = 'application/json';

    const req = http.request(BASE + path, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          location: res.headers.location,
          setCookie: res.headers['set-cookie'] || [],
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Timeout: ${method} ${path}`));
    });

    if (body) req.write(body);
    req.end();
  });
}

/** Ambil cookie session dari header Set-Cookie */
function ambilCookie(setCookie) {
  const jar = setCookie
    .map((c) => c.split(';')[0])
    .filter((c) => c && !c.includes('Path=') && !c.includes('Expires='));
  return jar.join('; ');
}

/** Ambil CSRF token dari body HTML (meta tag atau hidden input) */
function ambilCsrf(html) {
  // <meta name="csrf-token" content="...">
  let m = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
  if (m) return m[1];

  // <input type="hidden" name="_csrf" value="...">
  m = html.match(/name="_csrf"\s+value="([^"]+)"/);
  if (m) return m[1];

  // urutan atribut terbalik: value dulu, baru name
  m = html.match(/value="([^"]+)"\s+name="_csrf"/);
  return m ? m[1] : null;
}

// ---------- Pelaporan ----------
let lulus = 0;
let gagal = 0;
const kegagalan = [];

function cek(nama, kondisi, info = '') {
  if (kondisi) {
    lulus += 1;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal += 1;
    kegagalan.push(`${nama}${info ? ' — ' + info : ''}`);
    console.log(`  ✗ ${nama}${info ? ' — ' + info : ''}`);
  }
}

// ---------- Login per role ----------
async function login(email, password) {
  // 1. Ambil halaman login untuk mendapat cookie + CSRF token
  const halaman = await request('/login');
  const cookieAwal = ambilCookie(halaman.setCookie);
  const csrf = ambilCsrf(halaman.body);

  if (!csrf) throw new Error('CSRF token tidak ditemukan di halaman login.');

  // 2. Kirim kredensial
  const hasil = await request('/login', {
    method: 'POST',
    cookie: cookieAwal,
    form: { email, password, _csrf: csrf },
  });

  const cookieSession = ambilCookie(hasil.setCookie) || cookieAwal;

  return {
    berhasil: hasil.status === 302 && hasil.location === '/dashboard',
    status: hasil.status,
    location: hasil.location,
    cookie: cookieSession,
  };
}

// ---------- Daftar halaman per role ----------
const HALAMAN = {
  admin: [
    '/dashboard',
    '/kartu-keluarga',
    '/kartu-keluarga/create',
    '/warga',
    '/warga/create',
    '/iuran/tagihan',
    '/iuran/generate',
    '/iuran/pembayaran',
    '/iuran/jenis',
    '/kas',
    '/kas/create',
    '/kas/kategori',
    '/surat',
    '/surat/ajukan',
    '/surat/jenis',
    '/pengumuman',
    '/pengumuman/create',
    '/laporan',
    '/laporan/bulanan',
    '/laporan/tahunan',
    '/laporan/tunggakan',
    '/laporan/kartu-iuran',
    '/users',
    '/users/create',
    '/profil',
    '/profil/password',
  ],
  bendahara: [
    '/dashboard',
    '/kartu-keluarga',
    '/warga',
    '/iuran/tagihan',
    '/iuran/generate',
    '/iuran/pembayaran',
    '/iuran/jenis',
    '/kas',
    '/kas/create',
    '/kas/kategori',
    '/surat',
    '/surat/ajukan',
    '/surat/jenis',
    '/pengumuman',
    '/pengumuman/create',
    '/laporan',
    '/laporan/bulanan',
    '/laporan/tahunan',
    '/laporan/tunggakan',
    '/laporan/kartu-iuran',
    '/profil',
  ],
  warga: [
    '/dashboard',
    '/surat',
    '/surat/ajukan',
    '/pengumuman',
    '/profil',
    '/profil/password',
  ],
};

// Halaman yang HARUS ditolak (403) untuk role tertentu
const TERLARANG = {
  warga: ['/users', '/kas', '/iuran/tagihan', '/laporan', '/warga', '/kartu-keluarga'],
  bendahara: ['/users'],
};

// ---------- Main ----------
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  SMOKE TEST — SIM-RT Dashboard');
  console.log('='.repeat(60));

  // Siapkan database & server
  bootstrap();
  const app = createApp();
  const server = app.listen(PORT);

  await new Promise((resolve) => server.once('listening', resolve));
  console.log(`\n  Server test berjalan di ${BASE}\n`);

  try {
    // ============ 1. HALAMAN PUBLIK ============
    console.log('▶ 1. Halaman publik');

    const health = await request('/health');
    cek('GET /health -> 200', health.status === 200, `status ${health.status}`);
    try {
      const json = JSON.parse(health.body);
      cek('GET /health mengembalikan status ok', json.status === 'ok');
    } catch (e) {
      cek('GET /health JSON valid', false, e.message);
    }

    const loginPage = await request('/login');
    cek('GET /login -> 200', loginPage.status === 200, `status ${loginPage.status}`);
    cek('Halaman login memuat form', loginPage.body.includes('name="email"'));

    const css = await request('/css/style.css');
    cek('GET /css/style.css -> 200', css.status === 200, `status ${css.status}`);

    const js = await request('/js/app.js');
    cek('GET /js/app.js -> 200', js.status === 200, `status ${js.status}`);

    const loginTanpaSesi = await request('/dashboard');
    cek(
      'GET /dashboard tanpa login -> redirect ke /login',
      loginTanpaSesi.status === 302 && String(loginTanpaSesi.location).startsWith('/login'),
      `status ${loginTanpaSesi.status} -> ${loginTanpaSesi.location}`
    );

    const halaman404 = await request('/halaman-tidak-ada-xyz');
    cek('GET /halaman-ngawur -> 404', halaman404.status === 404, `status ${halaman404.status}`);

    // ============ 2. LOGIN TIAP ROLE ============
    console.log('\n▶ 2. Autentikasi');

    const akun = {
      admin: { email: 'admin@simrt.local', password: 'admin123' },
      bendahara: { email: 'bendahara@simrt.local', password: 'bendahara123' },
      warga: { email: 'warga@simrt.local', password: 'warga123' },
    };

    const sesi = {};

    for (const [role, kredensial] of Object.entries(akun)) {
      const hasil = await login(kredensial.email, kredensial.password);
      cek(
        `Login ${role} (${kredensial.email}) berhasil`,
        hasil.berhasil,
        `status ${hasil.status} -> ${hasil.location}`
      );
      sesi[role] = hasil.cookie;
    }

    // Login dengan password salah
    const salah = await login('admin@simrt.local', 'password-salah');
    cek('Login dengan password salah ditolak', !salah.berhasil, `status ${salah.status}`);

    // ============ 3. HALAMAN PER ROLE ============
    for (const [role, daftar] of Object.entries(HALAMAN)) {
      console.log(`\n▶ 3. Halaman role: ${role} (${daftar.length} halaman)`);

      for (const path of daftar) {
        const res = await request(path, { cookie: sesi[role] });
        cek(
          `[${role}] GET ${path} -> 200`,
          res.status === 200,
          `dapat ${res.status}${res.location ? ' -> ' + res.location : ''}`
        );
      }
    }

    // ============ 4. HAK AKSES ============
    console.log('\n▶ 4. Kontrol akses berbasis role');

    for (const [role, paths] of Object.entries(TERLARANG)) {
      for (const path of paths) {
        const res = await request(path, { cookie: sesi[role] });
        cek(
          `[${role}] GET ${path} ditolak (403)`,
          res.status === 403,
          `dapat ${res.status}`
        );
      }
    }

    // ============ 5. PROTEKSI CSRF ============
    console.log('\n▶ 5. Proteksi CSRF');

    const tanpaCsrf = await request('/logout', {
      method: 'POST',
      cookie: sesi.admin,
      form: { dummy: '1' },
    });
    cek(
      'POST /logout tanpa CSRF token ditolak (403)',
      tanpaCsrf.status === 403,
      `dapat ${tanpaCsrf.status}`
    );

    const loginCsrf = await request('/login', {
      method: 'POST',
      form: { email: 'admin@simrt.local', password: 'admin123' },
    });
    cek(
      'POST /login tanpa CSRF token ditolak (403)',
      loginCsrf.status === 403,
      `dapat ${loginCsrf.status}`
    );
    cek(
      'Halaman error 403 CSRF ter-render utuh (bukan stack trace)',
      loginCsrf.body.includes('403') && !loginCsrf.body.includes('is not defined'),
      loginCsrf.body.includes('is not defined') ? 'EJS gagal render: variabel app tidak terdefinisi' : ''
    );

    // ============ 6. API JSON ============
    console.log('\n▶ 6. Endpoint API');

    const chartKas = await request('/api/chart/kas?tahun=' + new Date().getFullYear(), {
      cookie: sesi.admin,
      json: true,
    });
    cek('GET /api/chart/kas -> 200', chartKas.status === 200, `status ${chartKas.status}`);
    try {
      const json = JSON.parse(chartKas.body);
      cek('Response /api/chart/kas valid & 12 bulan', json.data && json.data.length === 12);
    } catch (e) {
      cek('Response /api/chart/kas JSON valid', false, e.message);
    }

    const chartIuran = await request('/api/chart/iuran?tahun=' + new Date().getFullYear(), {
      cookie: sesi.admin,
      json: true,
    });
    cek('GET /api/chart/iuran -> 200', chartIuran.status === 200, `status ${chartIuran.status}`);

    const apiWarga = await request('/api/chart/kas', { cookie: sesi.warga, json: true });
    cek(
      'Warga ditolak akses API chart (403)',
      apiWarga.status === 403,
      `dapat ${apiWarga.status}`
    );

    // ============ 7. CETAK / PRINT ============
    console.log('\n▶ 7. Halaman cetak');

    const cetakBulanan = await request('/laporan/bulanan/cetak', { cookie: sesi.admin });
    cek('GET /laporan/bulanan/cetak -> 200', cetakBulanan.status === 200, `status ${cetakBulanan.status}`);
    cek('Halaman cetak memuat kop surat', cetakBulanan.body.includes('PENGURUS RUKUN TETANGGA'));

    const cetakTahunan = await request('/laporan/tahunan/cetak', { cookie: sesi.admin });
    cek('GET /laporan/tahunan/cetak -> 200', cetakTahunan.status === 200, `status ${cetakTahunan.status}`);

    const cetakTunggakan = await request('/laporan/tunggakan/cetak', { cookie: sesi.admin });
    cek('GET /laporan/tunggakan/cetak -> 200', cetakTunggakan.status === 200, `status ${cetakTunggakan.status}`);

    // ============ 8. DETAIL DATA ============
    console.log('\n▶ 8. Halaman detail data');

    const kkList = await request('/kartu-keluarga', { cookie: sesi.admin });
    const kkIdMatch = kkList.body.match(/\/kartu-keluarga\/(\d+)/);
    if (kkIdMatch) {
      const detail = await request(`/kartu-keluarga/${kkIdMatch[1]}`, { cookie: sesi.admin });
      cek(`GET /kartu-keluarga/${kkIdMatch[1]} -> 200`, detail.status === 200, `status ${detail.status}`);
    } else {
      cek('Menemukan ID kartu keluarga untuk uji detail', false, 'tidak ada data');
    }

    const wargaList = await request('/warga', { cookie: sesi.admin });
    const wargaIdMatch = wargaList.body.match(/\/warga\/(\d+)/);
    if (wargaIdMatch) {
      const detail = await request(`/warga/${wargaIdMatch[1]}`, { cookie: sesi.admin });
      cek(`GET /warga/${wargaIdMatch[1]} -> 200`, detail.status === 200, `status ${detail.status}`);
    } else {
      cek('Menemukan ID warga untuk uji detail', false, 'tidak ada data');
    }

    const tagihanList = await request('/iuran/tagihan', { cookie: sesi.admin });
    const tagihanIdMatch = tagihanList.body.match(/\/iuran\/tagihan\/(\d+)/);
    if (tagihanIdMatch) {
      const detail = await request(`/iuran/tagihan/${tagihanIdMatch[1]}`, { cookie: sesi.admin });
      cek(`GET /iuran/tagihan/${tagihanIdMatch[1]} -> 200`, detail.status === 200, `status ${detail.status}`);
    } else {
      cek('Menemukan ID tagihan untuk uji detail', false, 'tidak ada data');
    }

    const suratList = await request('/surat', { cookie: sesi.admin });
    const suratIdMatch = suratList.body.match(/\/surat\/(\d+)"/);
    if (suratIdMatch) {
      const detail = await request(`/surat/${suratIdMatch[1]}`, { cookie: sesi.admin });
      cek(`GET /surat/${suratIdMatch[1]} -> 200`, detail.status === 200, `status ${detail.status}`);
    } else {
      cek('Menemukan ID surat untuk uji detail', false, 'tidak ada data');
    }

    // ============ 9. LOGOUT ============
    console.log('\n▶ 9. Logout');

    const halamanAdmin = await request('/dashboard', { cookie: sesi.admin });
    const csrfAdmin = ambilCsrf(halamanAdmin.body);

    const logout = await request('/logout', {
      method: 'POST',
      cookie: sesi.admin,
      form: { _csrf: csrfAdmin },
    });
    cek('POST /logout berhasil (redirect ke /login)', logout.status === 302, `status ${logout.status}`);

    const setelahLogout = await request('/dashboard', { cookie: sesi.admin });
    cek(
      'Setelah logout, /dashboard kembali ditolak',
      setelahLogout.status === 302,
      `status ${setelahLogout.status}`
    );

  } catch (err) {
    console.error('\n✗ Smoke test error:', err.message);
    console.error(err.stack);
    gagal += 1;
    kegagalan.push(`Exception: ${err.message}`);
  } finally {
    server.close();
    db.close();
  }

  // ============ HASIL ============
  console.log('\n' + '='.repeat(60));
  console.log(`  HASIL: ${lulus} lulus, ${gagal} gagal (total ${lulus + gagal})`);
  console.log('='.repeat(60));

  if (gagal > 0) {
    console.log('\n  Kegagalan:');
    kegagalan.forEach((k) => console.log(`   • ${k}`));
    console.log('');
    process.exit(1);
  }

  console.log('\n  ✅ Semua pengujian lulus. Aplikasi berjalan tanpa error.\n');
  process.exit(0);
}

main();
