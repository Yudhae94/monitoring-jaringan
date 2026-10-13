'use strict';

const { userRepo, aktivitasLogRepo } = require('../models');
const authService = require('./auth.service');
const Validator = require('../utils/validator');
const { badRequest, conflict, notFound, forbidden, validationError } = require('../utils/errors');

const ROLES = ['admin', 'bendahara', 'warga'];

class UserService {
  constructor() {
    this.repo = userRepo;
    this.logRepo = aktivitasLogRepo;
  }

  list(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      role: query.role || null,
      q: query.q || null,
      is_active: query.is_active,
    };

    const data = this.repo.findAll({ ...filters, limit, offset: (page - 1) * limit });
    const total = this.repo.countAll(filters);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        from: total === 0 ? 0 : (page - 1) * limit + 1,
        to: Math.min(page * limit, total),
      },
    };
  }

  find(id) {
    const user = this.repo.findByIdWithWarga(id);
    if (!user) throw notFound('User tidak ditemukan.');
    return user;
  }

  validate(payload, { isUpdate = false, currentId = null } = {}) {
    const v = new Validator(payload);

    v.required('nama', 'Nama').maxLength('nama', 100, 'Nama');
    v.required('email', 'Email').email('email').maxLength('email', 120, 'Email');
    v.required('role', 'Role').in('role', ROLES, 'Role');
    v.phone('no_hp', 'Nomor HP');

    if (!isUpdate) {
      v.required('password', 'Password').minLength('password', 6, 'Password');
      if (payload.password !== payload.konfirmasi_password) {
        v.addError('konfirmasi_password', 'Konfirmasi password tidak cocok.');
      }
    } else if (payload.password) {
      v.minLength('password', 6, 'Password');
      if (payload.password !== payload.konfirmasi_password) {
        v.addError('konfirmasi_password', 'Konfirmasi password tidak cocok.');
      }
    }

    if (v.fails()) throw validationError(v.getErrors());

    const email = String(payload.email).toLowerCase().trim();
    if (this.repo.emailExists(email, currentId)) {
      throw conflict('Email sudah digunakan oleh user lain.', { email: 'Email sudah terdaftar.' });
    }

    return { ...payload, email };
  }

  create(payload, actor, ip) {
    const data = this.validate(payload);

    const user = this.repo.create({
      nama: String(data.nama).trim(),
      email: data.email,
      password: authService.hashPassword(data.password),
      role: data.role,
      no_hp: data.no_hp || null,
      warga_id: data.warga_id || null,
      is_active: data.is_active === undefined ? 1 : data.is_active,
    });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'TAMBAH_USER',
      modul: 'user',
      deskripsi: `Menambah user "${user.nama}" (${user.role})`,
      ip,
    });

    return user;
  }

  update(id, payload, actor, ip) {
    const existing = this.repo.findById(id);
    if (!existing) throw notFound('User tidak ditemukan.');

    const data = this.validate(payload, { isUpdate: true, currentId: id });

    // Cegah admin menurunkan role dirinya sendiri (mencegah terkunci dari sistem)
    if (actor.id === id && data.role !== existing.role) {
      throw forbidden('Anda tidak dapat mengubah role akun Anda sendiri.');
    }

    const updated = this.repo.update(id, {
      nama: String(data.nama).trim(),
      email: data.email,
      role: data.role,
      no_hp: data.no_hp || null,
      warga_id: data.warga_id || null,
      is_active: data.is_active === undefined ? existing.is_active : data.is_active,
    });

    if (data.password) {
      this.repo.updatePassword(id, authService.hashPassword(data.password));
    }

    this.logRepo.log({
      userId: actor.id,
      aksi: 'UBAH_USER',
      modul: 'user',
      deskripsi: `Mengubah user "${updated.nama}" (id ${id})`,
      ip,
    });

    return updated;
  }

  delete(id, actor, ip) {
    const user = this.repo.findById(id);
    if (!user) throw notFound('User tidak ditemukan.');
    if (actor.id === id) throw forbidden('Anda tidak dapat menghapus akun Anda sendiri.');
    if (user.role === 'admin') {
      const jumlahAdmin = this.repo.countAll({ role: 'admin' });
      if (jumlahAdmin <= 1) throw badRequest('Tidak dapat menghapus admin terakhir.');
    }

    this.repo.delete(id);
    this.logRepo.log({
      userId: actor.id,
      aksi: 'HAPUS_USER',
      modul: 'user',
      deskripsi: `Menghapus user "${user.nama}" (id ${id})`,
      ip,
    });

    return true;
  }

  toggleActive(id, actor, ip) {
    const user = this.repo.findById(id);
    if (!user) throw notFound('User tidak ditemukan.');
    if (actor.id === id) throw forbidden('Anda tidak dapat menonaktifkan akun Anda sendiri.');

    this.repo.toggleActive(id);
    const updated = this.repo.findById(id);

    this.logRepo.log({
      userId: actor.id,
      aksi: updated.is_active ? 'AKTIFKAN_USER' : 'NONAKTIFKAN_USER',
      modul: 'user',
      deskripsi: `User "${updated.nama}" di${updated.is_active ? 'aktifkan' : 'nonaktifkan'}`,
      ip,
    });

    return updated;
  }

  updateProfile(userId, payload, ip) {
    const user = this.repo.findById(userId);
    if (!user) throw notFound('User tidak ditemukan.');

    const v = new Validator(payload);
    v.required('nama', 'Nama').maxLength('nama', 100, 'Nama');
    v.phone('no_hp', 'Nomor HP');
    v.required('email', 'Email').email('email');
    if (v.fails()) throw validationError(v.getErrors());

    const email = String(payload.email).toLowerCase().trim();
    if (this.repo.emailExists(email, userId)) {
      throw conflict('Email sudah digunakan user lain.', { email: 'Email sudah terdaftar.' });
    }

    const updated = this.repo.update(userId, {
      nama: String(payload.nama).trim(),
      email,
      no_hp: payload.no_hp || null,
    });

    this.logRepo.log({
      userId,
      aksi: 'UBAH_PROFIL',
      modul: 'profil',
      deskripsi: 'Memperbarui profil sendiri',
      ip,
    });

    return updated;
  }

  stats() {
    const byRole = this.repo.countByRole();
    const map = Object.fromEntries(byRole.map((r) => [r.role, r.jumlah]));
    return {
      total: byRole.reduce((sum, r) => sum + r.jumlah, 0),
      admin: map.admin || 0,
      bendahara: map.bendahara || 0,
      warga: map.warga || 0,
      aktif: this.repo.countAll({ is_active: 1 }),
      nonaktif: this.repo.countAll({ is_active: 0 }),
    };
  }
}

module.exports = new UserService();
