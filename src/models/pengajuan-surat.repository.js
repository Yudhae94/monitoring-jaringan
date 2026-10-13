'use strict';

const BaseRepository = require('./base.repository');

class PengajuanSuratRepository extends BaseRepository {
  constructor() {
    super('pengajuan_surat', [
      'no_surat', 'jenis_surat_id', 'user_id', 'warga_id', 'nama_pemohon',
      'nik_pemohon', 'no_hp', 'keperluan', 'keterangan', 'status',
      'catatan_admin', 'tanggal_pengajuan', 'tanggal_proses', 'diproses_oleh',
    ]);
  }

  findDetail(id) {
    return this.db.get(
      `SELECT s.*, j.kode AS jenis_kode, j.nama AS jenis_nama, j.template AS jenis_template,
              w.nama AS warga_nama, d.nama AS diproses_nama
         FROM pengajuan_surat s
         JOIN jenis_surat j  ON j.id = s.jenis_surat_id
         LEFT JOIN warga w   ON w.id = s.warga_id
         LEFT JOIN users d   ON d.id = s.diproses_oleh
        WHERE s.id = ?`,
      [id]
    );
  }

  findAllFiltered({ q, status, jenis_surat_id, user_id, limit = 10, offset = 0 } = {}) {
    let sql = `
      SELECT s.*, j.kode AS jenis_kode, j.nama AS jenis_nama, d.nama AS diproses_nama
        FROM pengajuan_surat s
        JOIN jenis_surat j ON j.id = s.jenis_surat_id
        LEFT JOIN users d  ON d.id = s.diproses_oleh
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (s.no_surat LIKE ? OR s.nama_pemohon LIKE ? OR s.keperluan LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    if (jenis_surat_id) { sql += ' AND s.jenis_surat_id = ?'; params.push(jenis_surat_id); }
    if (user_id) { sql += ' AND s.user_id = ?'; params.push(user_id); }

    sql += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, status, jenis_surat_id, user_id } = {}) {
    let sql = 'SELECT COUNT(*) AS n FROM pengajuan_surat s WHERE 1=1';
    const params = [];

    if (q) {
      sql += ' AND (s.no_surat LIKE ? OR s.nama_pemohon LIKE ? OR s.keperluan LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    if (jenis_surat_id) { sql += ' AND s.jenis_surat_id = ?'; params.push(jenis_surat_id); }
    if (user_id) { sql += ' AND s.user_id = ?'; params.push(user_id); }

    return this.db.get(sql, params).n;
  }

  countByStatus() {
    return this.db.all('SELECT status, COUNT(*) AS jumlah FROM pengajuan_surat GROUP BY status');
  }

  latest(limit = 5, userId = null) {
    let sql = `
      SELECT s.*, j.nama AS jenis_nama
        FROM pengajuan_surat s
        JOIN jenis_surat j ON j.id = s.jenis_surat_id`;
    const params = [];

    if (userId) {
      sql += ' WHERE s.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY s.id DESC LIMIT ?';
    params.push(limit);

    return this.db.all(sql, params);
  }

  /** Membuat nomor surat otomatis: 005/RT05/2026 */
  generateNoSurat(tahun) {
    const last = this.db.get(
      `SELECT no_surat FROM pengajuan_surat
        WHERE no_surat LIKE ? ORDER BY id DESC LIMIT 1`,
      [`%/${tahun}`]
    );

    let urut = 1;
    if (last && last.no_surat) {
      const parsed = parseInt(String(last.no_surat).split('/')[0], 10);
      if (!Number.isNaN(parsed)) urut = parsed + 1;
    }

    return `${String(urut).padStart(3, '0')}/RT${require('../config/app').rt.number}/${tahun}`;
  }

  updateStatus(id, { status, catatan_admin, diproses_oleh }) {
    return this.db.run(
      `UPDATE pengajuan_surat
          SET status = ?, catatan_admin = ?, diproses_oleh = ?,
              tanggal_proses = datetime('now','localtime'),
              updated_at = datetime('now','localtime')
        WHERE id = ?`,
      [status, catatan_admin || null, diproses_oleh || null, id]
    );
  }
}

module.exports = new PengajuanSuratRepository();
