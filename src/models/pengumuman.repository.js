'use strict';

const BaseRepository = require('./base.repository');

class PengumumanRepository extends BaseRepository {
  constructor() {
    super('pengumuman', ['judul', 'isi', 'prioritas', 'tanggal_mulai', 'tanggal_selesai', 'is_publish', 'dibuat_oleh']);
  }

  findDetail(id) {
    return this.db.get(
      `SELECT p.*, u.nama AS penulis
         FROM pengumuman p
         LEFT JOIN users u ON u.id = p.dibuat_oleh
        WHERE p.id = ?`,
      [id]
    );
  }

  findAllFiltered({ q, prioritas, is_publish, limit = 10, offset = 0 } = {}) {
    let sql = `
      SELECT p.*, u.nama AS penulis
        FROM pengumuman p
        LEFT JOIN users u ON u.id = p.dibuat_oleh
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (p.judul LIKE ? OR p.isi LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (prioritas) { sql += ' AND p.prioritas = ?'; params.push(prioritas); }
    if (is_publish !== undefined && is_publish !== null && is_publish !== '') {
      sql += ' AND p.is_publish = ?';
      params.push(Number(is_publish));
    }

    sql += ' ORDER BY p.is_publish DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, prioritas, is_publish } = {}) {
    let sql = 'SELECT COUNT(*) AS n FROM pengumuman p WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (p.judul LIKE ? OR p.isi LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (prioritas) { sql += ' AND p.prioritas = ?'; params.push(prioritas); }
    if (is_publish !== undefined && is_publish !== null && is_publish !== '') {
      sql += ' AND p.is_publish = ?';
      params.push(Number(is_publish));
    }

    return this.db.get(sql, params).n;
  }

  /** Pengumuman yang sudah dipublikasikan dan masih berlaku */
  findPublished(limit = 10) {
    return this.db.all(
      `SELECT p.*, u.nama AS penulis
         FROM pengumuman p
         LEFT JOIN users u ON u.id = p.dibuat_oleh
        WHERE p.is_publish = 1
          AND date(p.tanggal_mulai) <= date('now','localtime')
          AND (p.tanggal_selesai IS NULL OR date(p.tanggal_selesai) >= date('now','localtime'))
        ORDER BY CASE p.prioritas WHEN 'urgent' THEN 1 WHEN 'penting' THEN 2 ELSE 3 END,
                 p.tanggal_mulai DESC
        LIMIT ?`,
      [limit]
    );
  }

  countPublished() {
    return this.db.get('SELECT COUNT(*) AS n FROM pengumuman WHERE is_publish = 1').n;
  }
}

module.exports = new PengumumanRepository();
