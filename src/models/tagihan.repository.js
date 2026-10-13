'use strict';

const BaseRepository = require('./base.repository');

class TagihanRepository extends BaseRepository {
  constructor() {
    super('tagihan', [
      'kk_id', 'jenis_iuran_id', 'periode_bulan', 'periode_tahun',
      'nominal', 'terbayar', 'status', 'jatuh_tempo',
    ]);
  }

  findDetail(id) {
    return this.db.get(
      `SELECT t.*, kk.no_kk, kk.kepala_keluarga, kk.no_rumah, kk.alamat,
              j.nama AS jenis_nama, j.periode AS jenis_periode
         FROM tagihan t
         JOIN kartu_keluarga kk ON kk.id = t.kk_id
         JOIN jenis_iuran j     ON j.id  = t.jenis_iuran_id
        WHERE t.id = ?`,
      [id]
    );
  }

  findAllFiltered({
    q, kk_id, jenis_iuran_id, periode_bulan, periode_tahun, status,
    limit = 10, offset = 0,
  } = {}) {
    let sql = `
      SELECT t.*, kk.no_kk, kk.kepala_keluarga, kk.no_rumah,
             j.nama AS jenis_nama
        FROM tagihan t
        JOIN kartu_keluarga kk ON kk.id = t.kk_id
        JOIN jenis_iuran j     ON j.id  = t.jenis_iuran_id
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (kk.no_kk LIKE ? OR kk.kepala_keluarga LIKE ? OR kk.no_rumah LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (kk_id) {
      sql += ' AND t.kk_id = ?';
      params.push(kk_id);
    }
    if (jenis_iuran_id) {
      sql += ' AND t.jenis_iuran_id = ?';
      params.push(jenis_iuran_id);
    }
    if (periode_bulan) {
      sql += ' AND t.periode_bulan = ?';
      params.push(periode_bulan);
    }
    if (periode_tahun) {
      sql += ' AND t.periode_tahun = ?';
      params.push(periode_tahun);
    }
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.periode_tahun DESC, t.periode_bulan DESC, kk.no_rumah + 0 ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, kk_id, jenis_iuran_id, periode_bulan, periode_tahun, status } = {}) {
    let sql = `
      SELECT COUNT(*) AS n
        FROM tagihan t
        JOIN kartu_keluarga kk ON kk.id = t.kk_id
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (kk.no_kk LIKE ? OR kk.kepala_keluarga LIKE ? OR kk.no_rumah LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (kk_id) { sql += ' AND t.kk_id = ?'; params.push(kk_id); }
    if (jenis_iuran_id) { sql += ' AND t.jenis_iuran_id = ?'; params.push(jenis_iuran_id); }
    if (periode_bulan) { sql += ' AND t.periode_bulan = ?'; params.push(periode_bulan); }
    if (periode_tahun) { sql += ' AND t.periode_tahun = ?'; params.push(periode_tahun); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }

    return this.db.get(sql, params).n;
  }

  findByKK(kkId, tahun = null) {
    let sql = `
      SELECT t.*, j.nama AS jenis_nama
        FROM tagihan t
        JOIN jenis_iuran j ON j.id = t.jenis_iuran_id
       WHERE t.kk_id = ?`;
    const params = [kkId];

    if (tahun) {
      sql += ' AND t.periode_tahun = ?';
      params.push(tahun);
    }

    sql += ' ORDER BY t.periode_tahun DESC, t.periode_bulan DESC, j.nama ASC';
    return this.db.all(sql, params);
  }

  findByKkAndPeriode(kkId, jenisIuranId, bulan, tahun) {
    return this.db.get(
      `SELECT * FROM tagihan
        WHERE kk_id = ? AND jenis_iuran_id = ? AND periode_bulan = ? AND periode_tahun = ?`,
      [kkId, jenisIuranId, bulan, tahun]
    );
  }

  /** Statistik tagihan: total tagihan, terbayar, tunggakan */
  summary({ periode_bulan, periode_tahun } = {}) {
    let sql = `
      SELECT
        COUNT(*) AS jumlah_tagihan,
        COALESCE(SUM(nominal), 0)  AS total_nominal,
        COALESCE(SUM(terbayar), 0) AS total_terbayar,
        COALESCE(SUM(CASE WHEN status != 'lunas' THEN nominal - terbayar ELSE 0 END), 0) AS total_tunggakan,
        COALESCE(SUM(CASE WHEN status = 'lunas' THEN 1 ELSE 0 END), 0) AS jumlah_lunas,
        COALESCE(SUM(CASE WHEN status = 'belum_bayar' THEN 1 ELSE 0 END), 0) AS jumlah_belum,
        COALESCE(SUM(CASE WHEN status = 'sebagian' THEN 1 ELSE 0 END), 0) AS jumlah_sebagian
      FROM tagihan WHERE 1=1`;
    const params = [];

    if (periode_bulan) { sql += ' AND periode_bulan = ?'; params.push(periode_bulan); }
    if (periode_tahun) { sql += ' AND periode_tahun = ?'; params.push(periode_tahun); }

    return this.db.get(sql, params);
  }

  /** Daftar KK yang masih menunggak pada periode tertentu */
  tunggakanPerKK(tahun) {
    return this.db.all(
      `SELECT kk.id, kk.no_kk, kk.kepala_keluarga, kk.no_rumah,
              COUNT(t.id) AS jumlah_tagihan,
              SUM(t.nominal - t.terbayar) AS total_tunggakan
         FROM tagihan t
         JOIN kartu_keluarga kk ON kk.id = t.kk_id
        WHERE t.status != 'lunas' AND t.periode_tahun = ?
        GROUP BY kk.id
        ORDER BY total_tunggakan DESC`,
      [tahun]
    );
  }

  /** Rekap per bulan untuk grafik tahunan */
  rekapBulanan(tahun) {
    const rows = this.db.all(
      `SELECT periode_bulan AS bulan,
              COALESCE(SUM(nominal), 0) AS target,
              COALESCE(SUM(terbayar), 0) AS realisasi
         FROM tagihan WHERE periode_tahun = ?
        GROUP BY periode_bulan`,
      [tahun]
    );

    const byBulan = new Map(rows.map((r) => [r.bulan, r]));
    const result = [];
    for (let b = 1; b <= 12; b += 1) {
      const row = byBulan.get(b) || { target: 0, realisasi: 0 };
      result.push({ bulan: b, target: row.target, realisasi: row.realisasi });
    }
    return result;
  }

  updateTerbayar(id, terbayar, status) {
    return this.db.run(
      `UPDATE tagihan SET terbayar = ?, status = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [terbayar, status, id]
    );
  }

  deleteByPeriode(jenisIuranId, bulan, tahun) {
    return this.db.run(
      'DELETE FROM tagihan WHERE jenis_iuran_id = ? AND periode_bulan = ? AND periode_tahun = ? AND terbayar = 0',
      [jenisIuranId, bulan, tahun]
    );
  }
}

module.exports = new TagihanRepository();
