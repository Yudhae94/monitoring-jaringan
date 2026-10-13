'use strict';

const path = require('path');
const appConfig = require('./app');

/**
 * Konfigurasi koneksi database (SQLite via better-sqlite3).
 * Untuk pindah ke MySQL/PostgreSQL, cukup ganti adapter di
 * src/database/connection.js tanpa mengubah models/services.
 */
module.exports = {
  client: 'sqlite3',
  filename: appConfig.paths.database,
  options: {
    // WAL membuat baca/tulis lebih cepat & aman untuk aplikasi web
    verbose: appConfig.env === 'development' ? undefined : undefined,
  },
  poolSize: 1, // SQLite single-writer
  migrationsDir: path.join(__dirname, '..', 'database', 'schema.sql'),
};
