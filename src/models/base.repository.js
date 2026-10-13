'use strict';

const db = require('../database/connection');

/**
 * Base class untuk semua repository.
 * Menyediakan operasi CRUD umum supaya tidak ditulis berulang.
 */
class BaseRepository {
  /**
   * @param {string} table nama tabel
   * @param {string[]} fillable kolom yang boleh diisi dari luar
   */
  constructor(table, fillable = []) {
    this.table = table;
    this.fillable = fillable;
    this.db = db;
  }

  findById(id) {
    return db.get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  }

  findAll(limit = 100, offset = 0) {
    return db.all(`SELECT * FROM ${this.table} LIMIT ? OFFSET ?`, [limit, offset]);
  }

  count() {
    return db.get(`SELECT COUNT(*) AS n FROM ${this.table}`).n;
  }

  exists(id) {
    return !!db.get(`SELECT id FROM ${this.table} WHERE id = ?`, [id]);
  }

  /** Ambil hanya kolom yang ada di daftar fillable */
  pick(data) {
    const out = {};
    for (const key of this.fillable) {
      if (data[key] !== undefined) out[key] = data[key] === '' ? null : data[key];
    }
    return out;
  }

  create(data) {
    const payload = this.pick(data);
    const keys = Object.keys(payload);
    if (!keys.length) throw new Error(`Tidak ada data untuk disimpan ke ${this.table}`);

    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    const id = db.insert(sql, keys.map((k) => payload[k]));
    return this.findById(id);
  }

  update(id, data) {
    const payload = this.pick(data);
    const keys = Object.keys(payload);
    if (!keys.length) return this.findById(id);

    const sql = `UPDATE ${this.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.run(sql, [...keys.map((k) => payload[k]), id]);
    return this.findById(id);
  }

  delete(id) {
    return db.run(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
  }

  deleteMany(ids) {
    if (!ids.length) return { changes: 0 };
    return db.run(
      `DELETE FROM ${this.table} WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
  }

  /** Cek duplikat nilai unik pada satu kolom */
  valueExists(column, value, exceptId = null) {
    const row = exceptId
      ? db.get(`SELECT id FROM ${this.table} WHERE ${column} = ? AND id != ?`, [value, exceptId])
      : db.get(`SELECT id FROM ${this.table} WHERE ${column} = ?`, [value]);
    return !!row;
  }
}

module.exports = BaseRepository;
