'use strict';

const BaseRepository = require('./base.repository');

/**
 * Repository untuk tabel `users`.
 * Hanya file ini yang menulis query berhubungan dengan user.
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  findByEmail(email) {
    return this.db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  findActiveByEmail(email) {
    return this.db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  }

  findByIdWithWarga(id) {
    return this.db.get(
      `SELECT u.*, w.nama AS warga_nama, w.nik AS warga_nik, kk.no_kk, kk.alamat AS kk_alamat
         FROM users u
         LEFT JOIN warga w ON w.id = u.warga_id
         LEFT JOIN kartu_keluarga kk ON kk.id = w.kk_id
        WHERE u.id = ?`,
      [id]
    );
  }

  findAll({ role, q, is_active, limit = 100, offset = 0 } = {}) {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (is_active !== undefined && is_active !== null && is_active !== '') {
      sql += ' AND is_active = ?';
      params.push(Number(is_active));
    }
    if (q) {
      sql += ' AND (nama LIKE ? OR email LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ' ORDER BY role ASC, nama ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.db.all(sql, params);
  }

  countAll({ role, q, is_active } = {}) {
    let sql = 'SELECT COUNT(*) AS n FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (is_active !== undefined && is_active !== null && is_active !== '') {
      sql += ' AND is_active = ?';
      params.push(Number(is_active));
    }
    if (q) {
      sql += ' AND (nama LIKE ? OR email LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    return this.db.get(sql, params).n;
  }

  emailExists(email, exceptId = null) {
    const row = exceptId
      ? this.db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, exceptId])
      : this.db.get('SELECT id FROM users WHERE email = ?', [email]);
    return !!row;
  }

  create(data) {
    const id = this.db.insert(
      `INSERT INTO users (nama, email, password, role, no_hp, warga_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nama,
        data.email,
        data.password,
        data.role,
        data.no_hp || null,
        data.warga_id || null,
        data.is_active === undefined ? 1 : Number(data.is_active),
      ]
    );
    return this.findById(id);
  }

  update(id, data) {
    const fields = [];
    const params = [];

    for (const key of ['nama', 'email', 'role', 'no_hp', 'warga_id', 'is_active']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key] === '' ? null : data[key]);
      }
    }

    if (!fields.length) return this.findById(id);

    fields.push("updated_at = datetime('now','localtime')");
    params.push(id);

    this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  updatePassword(id, hashedPassword) {
    return this.db.run(
      "UPDATE users SET password = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      [hashedPassword, id]
    );
  }

  touchLastLogin(id) {
    return this.db.run(
      "UPDATE users SET last_login = datetime('now','localtime') WHERE id = ?",
      [id]
    );
  }

  toggleActive(id) {
    return this.db.run(
      "UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = datetime('now','localtime') WHERE id = ?",
      [id]
    );
  }

  countByRole() {
    return this.db.all('SELECT role, COUNT(*) AS jumlah FROM users GROUP BY role');
  }

  /** User yang belum ditautkan ke data warga (untuk form pilihan) */
  availableWargaOptions() {
    return this.db.all(
      `SELECT w.id, w.nama, w.nik
         FROM warga w
         LEFT JOIN users u ON u.warga_id = w.id
        WHERE u.id IS NULL AND w.is_active = 1
        ORDER BY w.nama`
    );
  }
}

module.exports = new UserRepository();
