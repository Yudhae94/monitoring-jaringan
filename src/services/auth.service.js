'use strict';

const bcrypt = require('bcryptjs');
const { userRepo, aktivitasLogRepo } = require('../models');
const { unauthorized, forbidden, badRequest } = require('../utils/errors');

/**
 * Service autentikasi: login, logout, ganti password.
 * Controller tidak menyentuh bcrypt / repository secara langsung.
 */
class AuthService {
  constructor() {
    this.repo = userRepo;
    this.logRepo = aktivitasLogRepo;
  }

  /**
   * Verifikasi kredensial.
   * @returns {{id:number,nama:string,email:string,role:string,warga_id:number|null}}
   */
  login(email, password, ip = null) {
    const user = this.repo.findByEmail(String(email || '').toLowerCase().trim());

    // Pesan sengaja disamakan agar tidak membocorkan email mana yang terdaftar
    if (!user) throw unauthorized('Email atau password salah.');
    if (!user.is_active) throw forbidden('Akun Anda dinonaktifkan. Hubungi admin RT.');

    const cocok = bcrypt.compareSync(String(password || ''), user.password);
    if (!cocok) throw unauthorized('Email atau password salah.');

    this.repo.touchLastLogin(user.id);
    this.logRepo.log({
      userId: user.id,
      aksi: 'LOGIN',
      modul: 'auth',
      deskripsi: `${user.nama} (${user.role}) berhasil login`,
      ip,
    });

    return this.toSession(user);
  }

  logout(user, ip = null) {
    if (!user) return;
    this.logRepo.log({
      userId: user.id,
      aksi: 'LOGOUT',
      modul: 'auth',
      deskripsi: `${user.nama} logout`,
      ip,
    });
  }

  /** Bentuk data user yang disimpan di session (tanpa password) */
  toSession(user) {
    return {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      no_hp: user.no_hp,
      warga_id: user.warga_id,
    };
  }

  /** Ambil ulang data terbaru dari DB (untuk refresh session) */
  refresh(userId) {
    const user = this.repo.findByIdWithWarga(userId);
    if (!user || !user.is_active) return null;
    return this.toSession(user);
  }

  changePassword(userId, { password_lama, password_baru, konfirmasi_password }, ip = null) {
    const user = this.repo.findById(userId);
    if (!user) throw unauthorized();

    if (!bcrypt.compareSync(String(password_lama || ''), user.password)) {
      throw badRequest('Password lama tidak sesuai.');
    }
    if (String(password_baru || '').length < 6) {
      throw badRequest('Password baru minimal 6 karakter.');
    }
    if (password_baru !== konfirmasi_password) {
      throw badRequest('Konfirmasi password tidak cocok.');
    }
    if (password_lama === password_baru) {
      throw badRequest('Password baru tidak boleh sama dengan password lama.');
    }

    this.repo.updatePassword(userId, bcrypt.hashSync(password_baru, 10));
    this.logRepo.log({
      userId,
      aksi: 'UBAH_PASSWORD',
      modul: 'auth',
      deskripsi: `${user.nama} mengubah password`,
      ip,
    });

    return true;
  }

  /** Dipakai admin saat membuat/mengubah user */
  hashPassword(plain) {
    return bcrypt.hashSync(String(plain), 10);
  }
}

module.exports = new AuthService();
