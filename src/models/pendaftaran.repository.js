'use strict';

const BaseRepository = require('./base.repository');

/**
 * Repository untuk tabel `pendaftaran` (antrean warga baru).
 * Satu file = satu tabel, konsisten dengan repository lain.
 */
class PendaftaranRepository extends BaseRepository {
  constructor() {
    super('pendaftaran');
  }

  /**
   * Daftar pendaftaran dengan filter.
   * Default: urut dari yang terlama menunggu (antrean FIFO).
   */
  findAll({ status, q, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT p.*, kk.no_kk, kk.kepala_keluarga, u.nama AS admin_nama
        FROM pendaftaran p
        LEFT JOIN kartu_keluarga kk ON kk.id = p.kk_id
        LEFT JOIN users u ON u.id = p.diverifikasi_oleh
       WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (q) {
      sql += ' AND (p.nama LIKE ? OR p.email LIKE ? OR p.nik LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY
        CASE p.status WHEN 'menunggu' THEN 0 ELSE 1 END ASC,
        p.created_at ASC
      LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countAll({ status, q } = {}) {
    let sql = 'SELECT COUNT(*) AS n FROM pendaftaran p WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (q) {
      sql += ' AND (p.nama LIKE ? OR p.email LIKE ? OR p.nik LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    return this.db.get(sql, params).n;
  }

  findById(id) {
    return this.db.get(
      `SELECT p.*, kk.no_kk, kk.kepala_keluarga, u.nama AS admin_nama
         FROM pendaftaran p
         LEFT JOIN kartu_keluarga kk ON kk.id = p.kk_id
         LEFT JOIN users u ON u.id = p.diverifikasi_oleh
        WHERE p.id = ?`,
      [id]
    );
  }

  /** Hitung jumlah per status untuk kartu statistik di halaman admin. */
  countByStatus() {
    const rows = this.db.all('SELECT status, COUNT(*) AS n FROM pendaftaran GROUP BY status');
    const out = { menunggu: 0, disetujui: 0, ditolak: 0 };
    for (const r of rows) out[r.status] = r.n;
    return out;
  }

  /** Email sudah pernah didaftarkan & masih menunggu/berhasil? */
  emailExists(email) {
    return !!this.db.get(
      "SELECT id FROM pendaftaran WHERE email = ? AND status != 'ditolak'",
      [email]
    );
  }

  /** NIK sudah pernah dipakai di tabel warga atau pendaftaran aktif? */
  nikExists(nik) {
    const diWarga = this.db.get('SELECT id FROM warga WHERE nik = ?', [nik]);
    if (diWarga) return true;
    return !!this.db.get(
      "SELECT id FROM pendaftaran WHERE nik = ? AND status != 'ditolak'",
      [nik]
    );
  }

  create(data) {
    const id = this.db.insert(
      `INSERT INTO pendaftaran
         (nama, email, no_hp, nik, tempat_lahir, tanggal_lahir, jenis_kelamin,
          alamat, no_rumah, kk_id, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nama,
        data.email,
        data.no_hp || null,
        data.nik,
        data.tempat_lahir || null,
        data.tanggal_lahir || null,
        data.jenis_kelamin,
        data.alamat,
        data.no_rumah || null,
        data.kk_id || null,
        data.password_hash,
      ]
    );
    return this.findById(id);
  }

  /** Tandai disetujui + tautkan ke user yang baru dibuat. */
  approve(id, { userId, adminId }) {
    return this.db.run(
      `UPDATE pendaftaran
          SET status = 'disetujui',
              user_id = ?,
              diverifikasi_oleh = ?,
              tanggal_diverifikasi = datetime('now','localtime'),
              updated_at = datetime('now','localtime')
        WHERE id = ? AND status = 'menunggu'`,
      [userId, adminId, id]
    );
  }

  /** Tandai ditolak dengan catatan alasan. */
  reject(id, { alasan, adminId }) {
    return this.db.run(
      `UPDATE pendaftaran
          SET status = 'ditolak',
              alasan_menolak = ?,
              diverifikasi_oleh = ?,
              tanggal_diverifikasi = datetime('now','localtime'),
              updated_at = datetime('now','localtime')
        WHERE id = ? AND status = 'menunggu'`,
      [alasan || null, adminId, id]
    );
  }

  /** Hanya antrean yang masih menunggu. */
  findByIdPending(id) {
    return this.db.get('SELECT * FROM pendaftaran WHERE id = ? AND status = \'menunggu\'', [id]);
  }

  delete(id) {
    return this.db.run('DELETE FROM pendaftaran WHERE id = ?', [id]);
  }
}

module.exports = new PendaftaranRepository();
