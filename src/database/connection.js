'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const appConfig = require('../config/app');

/**
 * Koneksi SQLite memakai modul bawaan Node.js (`node:sqlite`, Node >= 22.5).
 *
 * Keuntungan: TIDAK perlu kompilasi native (node-gyp / Visual Studio),
 * sehingga aplikasi langsung bisa dijalankan di mana saja.
 *
 * Ini satu-satunya file yang tahu soal driver database.
 * Untuk pindah ke MySQL/PostgreSQL, cukup ganti implementasi di sini
 * tanpa mengubah models maupun services.
 */

let db = null;

/** Membuat / membuka koneksi tunggal (singleton) ke SQLite */
function getConnection() {
  if (db) return db;

  const dir = path.dirname(appConfig.paths.database);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseSync(appConfig.paths.database);

  // WAL: baca/tulis lebih cepat & aman untuk aplikasi web
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA synchronous = NORMAL');

  return db;
}

/**
 * Normalisasi parameter.
 * node:sqlite hanya menerima null / number / bigint / string / Uint8Array,
 * sehingga undefined, boolean, dan Date harus dikonversi lebih dulu.
 */
function normalizeParams(params) {
  const arr = Array.isArray(params) ? params : [params];
  return arr.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace('T', ' ');
    return p;
  });
}

/** Menjalankan satu query SELECT yang mengembalikan banyak baris */
function all(sql, params = []) {
  return getConnection().prepare(sql).all(...normalizeParams(params));
}

/** Menjalankan SELECT yang mengembalikan satu baris (atau undefined) */
function get(sql, params = []) {
  return getConnection().prepare(sql).get(...normalizeParams(params));
}

/** Menjalankan INSERT/UPDATE/DELETE, mengembalikan info perubahan */
function run(sql, params = []) {
  return getConnection().prepare(sql).run(...normalizeParams(params));
}

/** INSERT dan kembalikan id baris baru (number) */
function insert(sql, params = []) {
  const result = run(sql, params);
  return Number(result.lastInsertRowid);
}

/** Menjalankan beberapa operasi dalam satu transaksi */
function transaction(fn) {
  const conn = getConnection();
  conn.exec('BEGIN');
  try {
    const hasil = fn();
    conn.exec('COMMIT');
    return hasil;
  } catch (err) {
    try {
      conn.exec('ROLLBACK');
    } catch (rollbackErr) {
      // Abaikan error rollback agar error asli tetap terlihat
    }
    throw err;
  }
}

/** Eksekusi SQL mentah (untuk schema.sql) */
function exec(sql) {
  return getConnection().exec(sql);
}

function close() {
  if (db) {
    try {
      db.close();
    } catch (err) {
      // Sudah tertutup — abaikan
    }
    db = null;
  }
}

module.exports = { getConnection, all, get, run, insert, transaction, exec, close };
