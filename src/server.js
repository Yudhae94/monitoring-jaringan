'use strict';

/**
 * Entry point aplikasi.
 * Jalankan: npm start   (atau npm run dev untuk auto-reload)
 */

const fs = require('fs');
const createApp = require('./app');
const appConfig = require('./config/app');
const db = require('./database/connection');

// ---------- Persiapan folder & database ----------
function bootstrap() {
  // Pastikan folder data & upload ada
  for (const dir of [appConfig.paths.data, appConfig.paths.uploads]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // Buat tabel bila belum ada (idempoten, aman dijalankan tiap start)
  const tabelAda = db
    .all("SELECT name FROM sqlite_master WHERE type='table'")
    .some((t) => t.name === 'users');

  if (!tabelAda) {
    console.log('⚙  Database belum siap — menjalankan migrasi otomatis...');
    require('./database/migrate').migrate();
    console.log('ℹ  Database kosong. Jalankan "npm run db:seed" untuk mengisi data contoh.');
  }
}

function start() {
  bootstrap();

  const app = createApp();

  const server = app.listen(appConfig.port, () => {
    const line = '─'.repeat(58);
    console.log(`\n${line}`);
    console.log(`  ${appConfig.name} — ${appConfig.fullName}`);
    console.log(line);
    console.log(`  ${appConfig.rt.label} · Kel. ${appConfig.rt.kelurahan}, Kec. ${appConfig.rt.kecamatan}`);
    console.log(`  ${appConfig.rt.kota}, ${appConfig.rt.provinsi}`);
    console.log(line);
    console.log(`  🌐 URL     : http://localhost:${appConfig.port}`);
    console.log(`  🔐 Login   : http://localhost:${appConfig.port}/login`);
    console.log(`  💚 Health  : http://localhost:${appConfig.port}/health`);
    console.log(`  ⚙  Mode    : ${appConfig.env}`);
    console.log(`${line}\n`);
    console.log('  Akun demo:');
    console.log('    admin@simrt.local     / admin123');
    console.log('    bendahara@simrt.local / bendahara123');
    console.log('    warga@simrt.local     / warga123');
    console.log(`\n  Tekan Ctrl+C untuk menghentikan server.\n`);
  });

  // ---------- Graceful shutdown ----------
  const shutdown = (signal) => {
    console.log(`\n\n⏹  Menerima ${signal}, menutup server...`);
    server.close(() => {
      db.close();
      console.log('✓ Server & database ditutup dengan bersih.');
      process.exit(0);
    });

    // Paksa keluar bila menggantung lebih dari 5 detik
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ---------- Error level proses ----------
  process.on('unhandledRejection', (reason) => {
    console.error('\n[UNHANDLED REJECTION]', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('\n[UNCAUGHT EXCEPTION]', err);
    shutdown('UNCAUGHT EXCEPTION');
  });

  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start, bootstrap };
