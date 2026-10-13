'use strict';

const BaseRepository = require('./base.repository');

class PembayaranRepository extends BaseRepository {
  constructor() {
    super('pembayaran', ['tagihan_id', 'kk_id', 'tanggal', 'nominal', 'method', 'no_referensi', 'dicatat_oleh', 'keterangan']);
  }

  findDetail(id) {
    return this.db.get(
      `SELECT p.*, kk.no_kk, kk.kepala_keluarga, kk.no_rumah,
              t.periode_bulan, t.periode_tahun, j.nama AS jenis_nama,
              u.nama AS petugas
         FROM pembayaran p
         JOIN kartu_keluarga kk ON kk.id = p.kk_id
         JOIN tagihan t         ON t.id  = p.tagihan_id
         JOIN jenis_iuran j     ON j.id  = t.jenis_iuran_id
         LEFT JOIN users u      ON u.id  = p.dicatat_oleh
        WHERE p.id = ?`,
      [id]
    );
  }

  findAllFiltered({ q, kk_id, method, tanggal_dari, tanggal_sampai, limit = 10, offset = 0 } = {}) {
    let sql = `
      SELECT p.*, kk.no_kk, kk.kepala_keluarga, kk.no_rumah,
             t.periode_bulan, t.periode_tahun, j.nama AS jenis_nama, u.nama AS petugas
        FROM pembayaran p
        JOIN kartu_keluarga kk ON kk.id = p.kk_id
        JOIN tagihan t         ON t.id  = p.tagihan_id
        JOIN jenis_iuran j     ON j.id  = t.jenis_iuran_id
        LEFT JOIN users u      ON u.id  = p.dicatat_oleh
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (kk.no_kk LIKE ? OR kk.kepala_keluarga LIKE ? OR kk.no_rumah LIKE ? OR p.no_referensi LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (kk_id) { sql += ' AND p.kk_id = ?'; params.push(kk_id); }
    if (method) { sql += ' AND p.method = ?'; params.push(method); }
    if (tanggal_dari) { sql += ' AND p.tanggal >= ?'; params.push(tanggal_dari); }
    if (tanggal_sampai) { sql += ' AND p.tanggal <= ?'; params.push(tanggal_sampai); }

    sql += ' ORDER BY p.tanggal DESC, p.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, kk_id, method, tanggal_dari, tanggal_sampai } = {}) {
    let sql = `
      SELECT COUNT(*) AS n
        FROM pembayaran p
        JOIN kartu_keluarga kk ON kk.id = p.kk_id
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (kk.no_kk LIKE ? OR kk.kepala_keluarga LIKE ? OR kk.no_rumah LIKE ? OR p.no_referensi LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (kk_id) { sql += ' AND p.kk_id = ?'; params.push(kk_id); }
    if (method) { sql += ' AND p.method = ?'; params.push(method); }
    if (tanggal_dari) { sql += ' AND p.tanggal >= ?'; params.push(tanggal_dari); }
    if (tanggal_sampai) { sql += ' AND p.tanggal <= ?'; params.push(tanggal_sampai); }

    return this.db.get(sql, params).n;
  }

  findByTagihan(tagihanId) {
    return this.db.all(
      'SELECT * FROM pembayaran WHERE tagihan_id = ? ORDER BY tanggal DESC',
      [tagihanId]
    );
  }

  totalPeriode(bulan, tahun) {
    return this.db.get(
      `SELECT COALESCE(SUM(nominal),0) AS total, COUNT(*) AS jumlah
         FROM pembayaran
        WHERE strftime('%m', tanggal) = ? AND strftime('%Y', tanggal) = ?`,
      [String(bulan).padStart(2, '0'), String(tahun)]
    );
  }

  totalHariIni() {
    return this.db.get(
      `SELECT COALESCE(SUM(nominal),0) AS total, COUNT(*) AS jumlah
         FROM pembayaran WHERE tanggal = date('now','localtime')`
    );
  }

  totalKeseluruhan() {
    return this.db.get('SELECT COALESCE(SUM(nominal),0) AS total, COUNT(*) AS jumlah FROM pembayaran');
  }

  /** Riwayat pembayaran terbaru untuk dashboard */
  latest(limit = 5) {
    return this.db.all(
      `SELECT p.*, kk.kepala_keluarga, kk.no_rumah, j.nama AS jenis_nama,
              t.periode_bulan, t.periode_tahun
         FROM pembayaran p
         JOIN kartu_keluarga kk ON kk.id = p.kk_id
         JOIN tagihan t         ON t.id  = p.tagihan_id
         JOIN jenis_iuran j     ON j.id  = t.jenis_iuran_id
        ORDER BY p.id DESC LIMIT ?`,
      [limit]
    );
  }

  deleteByTagihan(tagihanId) {
    return this.db.run('DELETE FROM pembayaran WHERE tagihan_id = ?', [tagihanId]);
  }
}

module.exports = new PembayaranRepository();
