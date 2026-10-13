'use strict';

const BaseRepository = require('./base.repository');

class KategoriKasRepository extends BaseRepository {
  constructor() {
    super('kategori_kas', ['nama', 'tipe', 'warna']);
  }

  findAllOrdered() {
    return this.db.all('SELECT * FROM kategori_kas ORDER BY tipe ASC, nama ASC');
  }

  findByTipe(tipe) {
    return this.db.all('SELECT * FROM kategori_kas WHERE tipe = ? ORDER BY nama ASC', [tipe]);
  }

  terpakai(id) {
    return this.db.get('SELECT COUNT(*) AS n FROM transaksi_kas WHERE kategori_id = ?', [id]).n;
  }

  namaExists(nama, exceptId = null) {
    const row = exceptId
      ? this.db.get('SELECT id FROM kategori_kas WHERE nama = ? AND id != ?', [nama, exceptId])
      : this.db.get('SELECT id FROM kategori_kas WHERE nama = ?', [nama]);
    return !!row;
  }
}

module.exports = new KategoriKasRepository();
