'use strict';

const BaseRepository = require('./base.repository');

class WargaRepository extends BaseRepository {
  constructor() {
    super('warga', [
      'kk_id', 'nik', 'nama', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
      'agama', 'status_perkawinan', 'pendidikan', 'pekerjaan', 'kewarganegaraan',
      'status_keluarga', 'no_hp', 'is_active',
    ]);
  }

  findWithKK(id) {
    return this.db.get(
      `SELECT w.*, kk.no_kk, kk.kepala_keluarga, kk.alamat, kk.no_rumah
         FROM warga w
         JOIN kartu_keluarga kk ON kk.id = w.kk_id
        WHERE w.id = ?`,
      [id]
    );
  }

  findAllFiltered({ q, kk_id, jenis_kelamin, status_keluarga, limit = 10, offset = 0 } = {}) {
    let sql = `
      SELECT w.*, kk.no_kk, kk.no_rumah, kk.kepala_keluarga AS nama_kk
        FROM warga w
        JOIN kartu_keluarga kk ON kk.id = w.kk_id
       WHERE w.is_active = 1 AND kk.is_active = 1`;
    const params = [];

    if (q) {
      sql += ' AND (w.nama LIKE ? OR w.nik LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (kk_id) {
      sql += ' AND w.kk_id = ?';
      params.push(kk_id);
    }
    if (jenis_kelamin) {
      sql += ' AND w.jenis_kelamin = ?';
      params.push(jenis_kelamin);
    }
    if (status_keluarga) {
      sql += ' AND w.status_keluarga = ?';
      params.push(status_keluarga);
    }

    sql += ' ORDER BY kk.no_rumah + 0 ASC, w.status_keluarga ASC, w.nama ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, kk_id, jenis_kelamin, status_keluarga } = {}) {
    let sql = `
      SELECT COUNT(*) AS n
        FROM warga w
        JOIN kartu_keluarga kk ON kk.id = w.kk_id
       WHERE w.is_active = 1 AND kk.is_active = 1`;
    const params = [];

    if (q) {
      sql += ' AND (w.nama LIKE ? OR w.nik LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (kk_id) {
      sql += ' AND w.kk_id = ?';
      params.push(kk_id);
    }
    if (jenis_kelamin) {
      sql += ' AND w.jenis_kelamin = ?';
      params.push(jenis_kelamin);
    }
    if (status_keluarga) {
      sql += ' AND w.status_keluarga = ?';
      params.push(status_keluarga);
    }

    return this.db.get(sql, params).n;
  }

  findByKK(kkId) {
    return this.db.all(
      `SELECT * FROM warga WHERE kk_id = ? AND is_active = 1
        ORDER BY CASE status_keluarga
                   WHEN 'kepala_keluarga' THEN 1
                   WHEN 'istri' THEN 2
                   WHEN 'anak' THEN 3
                   ELSE 4 END, nama ASC`,
      [kkId]
    );
  }

  nikExists(nik, exceptId = null) {
    return this.valueExists('nik', nik, exceptId);
  }

  /** Statistik demografi */
  stats() {
    const total = this.db.get('SELECT COUNT(*) AS n FROM warga WHERE is_active = 1').n;
    const lakiLaki = this.db.get(
      "SELECT COUNT(*) AS n FROM warga WHERE is_active = 1 AND jenis_kelamin = 'L'"
    ).n;
    const perempuan = total - lakiLaki;

    const byAge = this.db.get(`
      SELECT
        SUM(CASE WHEN age < 5  THEN 1 ELSE 0 END) AS balita,
        SUM(CASE WHEN age BETWEEN 5 AND 12 THEN 1 ELSE 0 END) AS anak,
        SUM(CASE WHEN age BETWEEN 13 AND 17 THEN 1 ELSE 0 END) AS remaja,
        SUM(CASE WHEN age BETWEEN 18 AND 59 THEN 1 ELSE 0 END) AS dewasa,
        SUM(CASE WHEN age >= 60 THEN 1 ELSE 0 END) AS lansia
      FROM (
        SELECT CAST((julianday('now') - julianday(tanggal_lahir)) / 365.25 AS INTEGER) AS age
          FROM warga
         WHERE is_active = 1 AND tanggal_lahir IS NOT NULL AND tanggal_lahir != ''
      )
    `);

    const byStatusKeluarga = this.db.all(`
      SELECT status_keluarga, COUNT(*) AS jumlah
        FROM warga WHERE is_active = 1
       GROUP BY status_keluarga ORDER BY jumlah DESC
    `);

    const byPekerjaan = this.db.all(`
      SELECT COALESCE(NULLIF(pekerjaan,''), 'Tidak diketahui') AS pekerjaan, COUNT(*) AS jumlah
        FROM warga WHERE is_active = 1
       GROUP BY pekerjaan ORDER BY jumlah DESC LIMIT 6
    `);

    return {
      total,
      lakiLaki,
      perempuan,
      ...Object.fromEntries(
        Object.entries(byAge || {}).map(([k, v]) => [k, v || 0])
      ),
      byStatusKeluarga,
      byPekerjaan,
    };
  }

  /** Data warga untuk dropdown surat */
  optionsAll() {
    return this.db.all(
      `SELECT id, nama, nik FROM warga WHERE is_active = 1 ORDER BY nama ASC`
    );
  }
}

module.exports = new WargaRepository();
