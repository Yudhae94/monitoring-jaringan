'use strict';

const BaseRepository = require('./base.repository');
const appConfig = require('../config/app');

class AktivitasLogRepository extends BaseRepository {
  constructor() {
    super('aktivitas_log', ['user_id', 'aksi', 'modul', 'deskripsi', 'ip_address']);
  }

  findAllFiltered({ q, user_id, modul, limit = 20, offset = 0 } = {}) {
    let sql = `
      SELECT l.*, u.nama AS user_nama, u.role AS user_role
        FROM aktivitas_log l
        LEFT JOIN users u ON u.id = l.user_id
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (l.deskripsi LIKE ? OR l.aksi LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (user_id) { sql += ' AND l.user_id = ?'; params.push(user_id); }
    if (modul) { sql += ' AND l.modul = ?'; params.push(modul); }

    sql += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, user_id, modul } = {}) {
    let sql = 'SELECT COUNT(*) AS n FROM aktivitas_log l WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (l.deskripsi LIKE ? OR l.aksi LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (user_id) { sql += ' AND l.user_id = ?'; params.push(user_id); }
    if (modul) { sql += ' AND l.modul = ?'; params.push(modul); }

    return this.db.get(sql, params).n;
  }

  latest(limit = 8) {
    return this.db.all(
      `SELECT l.*, u.nama AS user_nama, u.role AS user_role
         FROM aktivitas_log l
         LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.id DESC LIMIT ?`,
      [limit]
    );
  }

  /**
   * Mencatat aktivitas. Tidak pernah melempar error
   * supaya logging tidak menggagalkan aksi utama.
   */
  log({ userId = null, aksi, modul, deskripsi = null, ip = null }) {
    try {
      return this.db.insert(
        `INSERT INTO aktivitas_log (user_id, aksi, modul, deskripsi, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, aksi, modul, deskripsi, ip]
      );
    } catch (err) {
      if (appConfig.env === 'development') {
        console.warn('[aktivitas_log] gagal mencatat:', err.message);
      }
      return null;
    }
  }
}

module.exports = new AktivitasLogRepository();
