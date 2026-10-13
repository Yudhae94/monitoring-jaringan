'use strict';

/**
 * Migrasi: menjalankan src/database/schema.sql.
 * Jalankan: npm run db:migrate -- --fresh   (hapus dulu datanya)
 */

const fs = require('fs');
const path = require('path');
const db = require('./connection');
const appConfig = require('../config/app');

function dropAll() {
  const conn = db.getConnection();
  conn.exec('PRAGMA foreign_keys = OFF');
  const tables = conn
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();

  db.transaction(() => {
    for (const { name } of tables) {
      conn.prepare(`DROP TABLE IF EXISTS "${name}"`).run();
    }
  });

  conn.exec('PRAGMA foreign_keys = ON');
  console.log(`  ↳ ${tables.length} tabel lama dihapus.`);
}

function migrate({ fresh = false } = {}) {
  console.log('\n▶ Menjalankan migrasi database...');
  console.log(`  ↳ File: ${appConfig.paths.database}`);

  if (fresh) dropAll();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);

  const tables = db.all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log(`  ✓ Selesai. ${tables.length} tabel tersedia:`);
  console.log('    ' + tables.map((t) => t.name).join(', '));
  return tables;
}

if (require.main === module) {
  const fresh = process.argv.includes('--fresh');
  try {
    migrate({ fresh });
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('✗ Migrasi gagal:', err.message);
    process.exit(1);
  }
}

module.exports = { migrate, dropAll };
