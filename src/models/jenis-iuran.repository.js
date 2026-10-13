'use strict';

const BaseRepository = require('./base.repository');

class JenisIuranRepository extends BaseRepository {
  constructor() {
    super('jenis_iuran', ['nama', 'periode', 'nominal', 'keterangan', 'is_active']);
  }

  findAllActive() {
    return this.db.all('SELECT * FROM jenis_iuran WHERE is_active = 1 ORDER BY nama ASC');
  }

  findAllWithStats() {
    return this.db.all(`
      SELECT j.*,
             (SELECT COUNT(*) FROM tagihan t WHERE t.jenis_iuran_id = j.id) AS jumlah_tagihan,
             (SELECT COALESCE(SUM(t.terbayar),0) FROM tagihan t WHERE t.jenis_iuran_id = j.id) AS total_terbayar,
             (SELECT COALESCE(SUM(t.nominal - t.terbayar),0) FROM tagihan t
               WHERE t.jenis_iuran_id = j.id AND t.status != 'lunas') AS total_tunggakan
        FROM jenis_iuran j
       ORDER BY j.is_active DESC, j.nama ASC
    `);
  }

  optionsAll() {
    return this.db.all('SELECT id, nama, nominal, periode FROM jenis_iuran WHERE is_active = 1 ORDER BY nama');
  }

  terpakai(id) {
    return this.db.get('SELECT COUNT(*) AS n FROM tagihan WHERE jenis_iuran_id = ?', [id]).n;
  }
}

module.exports = new JenisIuranRepository();
