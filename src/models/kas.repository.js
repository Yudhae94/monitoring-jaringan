'use strict';

const BaseRepository = require('./base.repository');

class KasRepository extends BaseRepository {
  constructor() {
    super('transaksi_kas', [
      'tanggal', 'tipe', 'kategori_id', 'nominal', 'keterangan',
      'sumber', 'ref_pembayaran_id', 'bukti', 'dicatat_oleh',
    ]);
  }

  findDetail(id) {
    return this.db.get(
      `SELECT k.*, c.nama AS kategori_nama, c.warna AS kategori_warna, u.nama AS petugas
         FROM transaksi_kas k
         LEFT JOIN kategori_kas c ON c.id = k.kategori_id
         LEFT JOIN users u        ON u.id = k.dicatat_oleh
        WHERE k.id = ?`,
      [id]
    );
  }

  findAllFiltered({ q, tipe, kategori_id, tanggal_dari, tanggal_sampai, bulan, tahun, limit = 10, offset = 0 } = {}) {
    let sql = `
      SELECT k.*, c.nama AS kategori_nama, c.warna AS kategori_warna, u.nama AS petugas
        FROM transaksi_kas k
        LEFT JOIN kategori_kas c ON c.id = k.kategori_id
        LEFT JOIN users u        ON u.id = k.dicatat_oleh
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (k.keterangan LIKE ? OR c.nama LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (tipe) { sql += ' AND k.tipe = ?'; params.push(tipe); }
    if (kategori_id) { sql += ' AND k.kategori_id = ?'; params.push(kategori_id); }
    if (tanggal_dari) { sql += ' AND k.tanggal >= ?'; params.push(tanggal_dari); }
    if (tanggal_sampai) { sql += ' AND k.tanggal <= ?'; params.push(tanggal_sampai); }
    if (bulan) { sql += " AND CAST(strftime('%m', k.tanggal) AS INTEGER) = ?"; params.push(Number(bulan)); }
    if (tahun) { sql += " AND CAST(strftime('%Y', k.tanggal) AS INTEGER) = ?"; params.push(Number(tahun)); }

    sql += ' ORDER BY k.tanggal DESC, k.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countFiltered({ q, tipe, kategori_id, tanggal_dari, tanggal_sampai, bulan, tahun } = {}) {
    let sql = `
      SELECT COUNT(*) AS n
        FROM transaksi_kas k
        LEFT JOIN kategori_kas c ON c.id = k.kategori_id
       WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ' AND (k.keterangan LIKE ? OR c.nama LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (tipe) { sql += ' AND k.tipe = ?'; params.push(tipe); }
    if (kategori_id) { sql += ' AND k.kategori_id = ?'; params.push(kategori_id); }
    if (tanggal_dari) { sql += ' AND k.tanggal >= ?'; params.push(tanggal_dari); }
    if (tanggal_sampai) { sql += ' AND k.tanggal <= ?'; params.push(tanggal_sampai); }
    if (bulan) { sql += " AND CAST(strftime('%m', k.tanggal) AS INTEGER) = ?"; params.push(Number(bulan)); }
    if (tahun) { sql += " AND CAST(strftime('%Y', k.tanggal) AS INTEGER) = ?"; params.push(Number(tahun)); }

    return this.db.get(sql, params).n;
  }

  /** Total masuk, keluar, dan saldo */
  summary({ bulan, tahun, tanggal_dari, tanggal_sampai } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (bulan) { where += " AND CAST(strftime('%m', tanggal) AS INTEGER) = ?"; params.push(Number(bulan)); }
    if (tahun) { where += " AND CAST(strftime('%Y', tanggal) AS INTEGER) = ?"; params.push(Number(tahun)); }
    if (tanggal_dari) { where += ' AND tanggal >= ?'; params.push(tanggal_dari); }
    if (tanggal_sampai) { where += ' AND tanggal <= ?'; params.push(tanggal_sampai); }

    const row = this.db.get(
      `SELECT
         COALESCE(SUM(CASE WHEN tipe = 'masuk'  THEN nominal ELSE 0 END), 0) AS total_masuk,
         COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN nominal ELSE 0 END), 0) AS total_keluar,
         COUNT(*) AS jumlah_transaksi
       FROM transaksi_kas ${where}`,
      params
    );

    row.saldo = row.total_masuk - row.total_keluar;
    return row;
  }

  /** Rekap per bulan dalam satu tahun (untuk grafik) */
  rekapBulanan(tahun) {
    const rows = this.db.all(
      `SELECT CAST(strftime('%m', tanggal) AS INTEGER) AS bulan,
              COALESCE(SUM(CASE WHEN tipe='masuk'  THEN nominal ELSE 0 END),0) AS masuk,
              COALESCE(SUM(CASE WHEN tipe='keluar' THEN nominal ELSE 0 END),0) AS keluar
         FROM transaksi_kas
        WHERE CAST(strftime('%Y', tanggal) AS INTEGER) = ?
        GROUP BY bulan`,
      [tahun]
    );

    const map = new Map(rows.map((r) => [r.bulan, r]));
    const out = [];
    for (let b = 1; b <= 12; b += 1) {
      const r = map.get(b) || { masuk: 0, keluar: 0 };
      out.push({ bulan: b, masuk: r.masuk, keluar: r.keluar, saldo: r.masuk - r.keluar });
    }
    return out;
  }

  /** Pengeluaran per kategori (untuk pie chart) */
  byKategori(tipe = 'keluar', { bulan, tahun } = {}) {
    let sql = `
      SELECT COALESCE(c.nama, 'Tanpa Kategori') AS nama,
             COALESCE(c.warna, '#94a3b8') AS warna,
             SUM(k.nominal) AS total
        FROM transaksi_kas k
        LEFT JOIN kategori_kas c ON c.id = k.kategori_id
       WHERE k.tipe = ?`;
    const params = [tipe];

    if (bulan) { sql += " AND CAST(strftime('%m', k.tanggal) AS INTEGER) = ?"; params.push(Number(bulan)); }
    if (tahun) { sql += " AND CAST(strftime('%Y', k.tanggal) AS INTEGER) = ?"; params.push(Number(tahun)); }

    sql += ' GROUP BY k.kategori_id ORDER BY total DESC';
    return this.db.all(sql, params);
  }

  latest(limit = 5) {
    return this.db.all(
      `SELECT k.*, c.nama AS kategori_nama, c.warna AS kategori_warna
         FROM transaksi_kas k
         LEFT JOIN kategori_kas c ON c.id = k.kategori_id
        ORDER BY k.tanggal DESC, k.id DESC LIMIT ?`,
      [limit]
    );
  }

  syncFromPembayaran(pembayaranId, { tanggal, nominal, keterangan, userId }) {
    const existing = this.db.get('SELECT id FROM transaksi_kas WHERE ref_pembayaran_id = ?', [pembayaranId]);
    if (existing) {
      return this.db.run(
        `UPDATE transaksi_kas SET tanggal = ?, nominal = ?, keterangan = ?,
                updated_at = datetime('now','localtime') WHERE id = ?`,
        [tanggal, nominal, keterangan, existing.id]
      );
    }
    return this.db.insert(
      `INSERT INTO transaksi_kas (tanggal, tipe, kategori_id, nominal, keterangan, sumber, ref_pembayaran_id, dicatat_oleh)
       VALUES (?, 'masuk', (SELECT id FROM kategori_kas WHERE nama = 'Iuran Warga' LIMIT 1), ?, ?, 'iuran', ?, ?)`,
      [tanggal, nominal, keterangan, pembayaranId, userId]
    );
  }

  removeByPembayaran(pembayaranId) {
    return this.db.run('DELETE FROM transaksi_kas WHERE ref_pembayaran_id = ?', [pembayaranId]);
  }
}

module.exports = new KasRepository();
