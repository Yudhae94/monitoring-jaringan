'use strict';

const BaseRepository = require('./base.repository');

class JenisSuratRepository extends BaseRepository {
  constructor() {
    super('jenis_surat', ['kode', 'nama', 'template', 'is_active']);
  }

  findAllWithStats() {
    return this.db.all(`
      SELECT j.*,
             (SELECT COUNT(*) FROM pengajuan_surat s WHERE s.jenis_surat_id = j.id) AS jumlah_pengajuan
        FROM jenis_surat j
       ORDER BY j.is_active DESC, j.nama ASC
    `);
  }

  optionsAll() {
    return this.db.all('SELECT id, kode, nama FROM jenis_surat WHERE is_active = 1 ORDER BY nama');
  }

  kodeExists(kode, exceptId = null) {
    return this.valueExists('kode', kode, exceptId);
  }

  terpakai(id) {
    return this.db.get('SELECT COUNT(*) AS n FROM pengajuan_surat WHERE jenis_surat_id = ?', [id]).n;
  }
}

module.exports = new JenisSuratRepository();
