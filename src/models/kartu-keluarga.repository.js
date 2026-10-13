'use strict';

const BaseRepository = require('./base.repository');

class KartuKeluargaRepository extends BaseRepository {
  constructor() {
    super('kartu_keluarga', [
      'no_kk', 'kepala_keluarga', 'alamat', 'blok', 'no_rumah',
      'rt', 'rw', 'kode_pos', 'status_rumah', 'is_active',
    ]);
  }

  findWithCounts(id) {
    return this.db.get(
      `SELECT kk.*,
              (SELECT COUNT(*) FROM warga w WHERE w.kk_id = kk.id AND w.is_active = 1) AS jumlah_anggota
         FROM kartu_keluarga kk
        WHERE kk.id = ?`,
      [id]
    );
  }

  findAllWithCounts({ q, status_rumah, limit = 10, offset = 0 } = {}) {
    let sql = `
      SELECT kk.*,
             (SELECT COUNT(*) FROM warga w WHERE w.kk_id = kk.id AND w.is_active = 1) AS jumlah_anggota,
             (SELECT COUNT(*) FROM tagihan t WHERE t.kk_id = kk.id AND t.status != 'lunas') AS jumlah_tunggakan
        FROM kartu_keluarga kk
       WHERE kk.is_active = 1`;
    const params = [];

    if (q) {
      sql += ' AND (kk.no_kk LIKE ? OR kk.kepala_keluarga LIKE ? OR kk.alamat LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status_rumah) {
      sql += ' AND kk.status_rumah = ?';
      params.push(status_rumah);
    }

    sql += ' ORDER BY kk.no_rumah + 0 ASC, kk.kepala_keluarga ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, status_rumah } = {}) {
    let sql = 'SELECT COUNT(*) AS n FROM kartu_keluarga kk WHERE kk.is_active = 1';
    const params = [];

    if (q) {
      sql += ' AND (kk.no_kk LIKE ? OR kk.kepala_keluarga LIKE ? OR kk.alamat LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status_rumah) {
      sql += ' AND kk.status_rumah = ?';
      params.push(status_rumah);
    }

    return this.db.get(sql, params).n;
  }

  /** Semua KK aktif — untuk dropdown pilihan */
  optionsAll() {
    return this.db.all(
      `SELECT id, no_kk, kepala_keluarga, no_rumah
         FROM kartu_keluarga
        WHERE is_active = 1
        ORDER BY kepala_keluarga ASC`
    );
  }

  noKkExists(noKk, exceptId = null) {
    return this.valueExists('no_kk', noKk, exceptId);
  }
}

module.exports = new KartuKeluargaRepository();
