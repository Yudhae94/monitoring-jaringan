'use strict';

const bcrypt = require('bcryptjs');
const {
  pendaftaranRepo, userRepo, wargaRepo, kartuKeluargaRepo, aktivitasLogRepo,
} = require('../models');
const { badRequest, conflict, notFound, validationError } = require('../utils/errors');

/**
 * Service pendaftaran warga baru.
 *
 * Alur:
 *   1. Warga daftar mandiri di /daftar -> data masuk antrean (status 'menunggu')
 *   2. Admin buka /pendaftaran, lalu SETUJUI (akun dibuat & aktif)
 *      atau TOLAK (dengan catatan alasan)
 *
 * Catatan keamanan:
 *   - Role selalu dipaksa 'warga'; pendaftar tidak bisa memilih role lain.
 *   - Password di-hash dan TIDAK PERNAH dikembalikan ke client.
 *   - Pendaftaran ganda (email/NIK) ditolak agar antrean tidak kembar.
 */
class PendaftaranService {
  constructor() {
    this.repo = pendaftaranRepo;
    this.userRepo = userRepo;
    this.kkRepo = kartuKeluargaRepo;
    this.logRepo = aktivitasLogRepo;
  }

  /** Daftar KK untuk dropdown "Kartu Keluarga" di form pendaftaran. */
  kkOptions() {
    return this.kkRepo.findAllWithCounts({ limit: 500 }).map((kk) => ({
      value: kk.id,
      label: `${kk.no_kk} - ${kk.kepala_keluarga} (No. ${kk.no_rumah || '-'})`,
    }));
  }

  /** Pilihan enum untuk form pendaftaran. */
  options() {
    return {
      jenisKelamin: [
        { value: 'L', label: 'Laki-laki' },
        { value: 'P', label: 'Perempuan' },
      ],
    };
  }

  /**
   * Validasi & simpan pendaftaran baru.
   * @throws HttpError 422 (validasi) / 409 (duplikat)
   */
  register(input, ip = null) {
    const errors = {};

    const nama = String(input.nama || '').trim();
    const email = String(input.email || '').trim().toLowerCase();
    const nik = String(input.nik || '').replace(/\s/g, '');
    const noHp = String(input.no_hp || '').trim();
    const password = String(input.password || '');
    const konfirmasi = String(input.konfirmasi_password || '');

    if (nama.length < 3) errors.nama = 'Nama lengkap minimal 3 karakter.';
    else if (nama.length > 100) errors.nama = 'Nama maksimal 100 karakter.';

    if (!email) errors.email = 'Email wajib diisi.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Format email tidak valid.';

    if (!nik) errors.nik = 'NIK wajib diisi.';
    else if (!/^\d{16}$/.test(nik)) errors.nik = 'NIK harus 16 digit angka.';

    if (input.jenis_kelamin !== 'L' && input.jenis_kelamin !== 'P') {
      errors.jenis_kelamin = 'Pilih jenis kelamin.';
    }

    if (!String(input.alamat || '').trim()) errors.alamat = 'Alamat wajib diisi.';

    if (noHp && !/^[0-9+\-\s()]{9,15}$/.test(noHp)) {
      errors.no_hp = 'Nomor HP tidak valid (9-15 digit).';
    }

    if (password.length < 6) errors.password = 'Password minimal 6 karakter.';
    if (!konfirmasi) errors.konfirmasi_password = 'Konfirmasi password wajib diisi.';
    else if (password !== konfirmasi) errors.konfirmasi_password = 'Konfirmasi password tidak cocok.';

    // Cek duplikasi -> pesan spesifik per field
    if (!errors.email && this.repo.emailExists(email)) {
      errors.email = 'Email ini sudah pernah terdaftar. Silakan hubungi admin.';
    }
    if (!errors.email && this.userRepo.emailExists(email)) {
      errors.email = 'Email ini sudah dipakai. Silakan login.';
    }
    if (!errors.nik && this.repo.nikExists(nik)) {
      errors.nik = 'NIK ini sudah terdaftar. Silakan hubungi admin untuk verifikasi.';
    }

    if (Object.keys(errors).length) throw validationError(errors);

    // kk_id hanya diterima bila KK-nya benar-benar ada & aktif
    let kkId = null;
    if (input.kk_id) {
      const kk = this.kkRepo.findById(Number(input.kk_id));
      if (!kk || !kk.is_active) throw badRequest('Kartu keluarga yang dipilih tidak valid.');
      kkId = kk.id;
    }

    const data = this.repo.create({
      nama,
      email,
      no_hp: noHp || null,
      nik,
      tempat_lahir: String(input.tempat_lahir || '').trim() || null,
      tanggal_lahir: String(input.tanggal_lahir || '').trim() || null,
      jenis_kelamin: input.jenis_kelamin,
      alamat: String(input.alamat).trim(),
      no_rumah: String(input.no_rumah || '').trim() || null,
      kk_id: kkId,
      password_hash: bcrypt.hashSync(password, 10),
    });

    this.logRepo.log({
      userId: null,
      aksi: 'DAFTAR',
      modul: 'pendaftaran',
      deskripsi: `${nama} (${nik}) mendaftar menjadi warga baru`,
      ip,
    });

    return data;
  }

  /** Daftar + statistik untuk halaman admin. */
  list(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = 20;
    const filter = { status: query.status || '', q: query.q || '' };

    const total = this.repo.countAll(filter);
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return {
      data: this.repo.findAll({ ...filter, limit: perPage, offset: (page - 1) * perPage }),
      stats: this.repo.countByStatus(),
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        from: total === 0 ? 0 : (page - 1) * perPage + 1,
        to: Math.min(page * perPage, total),
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    };
  }

  detail(id) {
    const row = this.repo.findById(id);
    if (!row) throw notFound('Data pendaftaran tidak ditemukan.');
    return row;
  }

  /**
   * Setujui pendaftaran -> buat akun user (role warga).
   * Bila pendaftar menautkan KK, data warga ikut dibuat & disambungkan.
   * Semua langkah dibungkus transaksi agar tidak ada akun yatim.
   */
  approve(id, admin, ip = null) {
    const row = this.repo.findByIdPending(id);
    if (!row) throw badRequest('Pendaftaran ini sudah diproses atau tidak ditemukan.');

    if (this.userRepo.emailExists(row.email)) {
      throw conflict('Gagal menyetujui: email tersebut sudah dipakai akun lain. Tolak pendaftaran ini dengan catatan.');
    }

    let userId;
    this.userRepo.db.transaction(() => {
      const user = this.userRepo.create({
        nama: row.nama,
        email: row.email,
        password: row.password_hash, // hash dari saat pendaftaran
        role: 'warga',
        no_hp: row.no_hp,
        is_active: 1,
      });
      userId = user.id;

      if (row.kk_id) {
        const warga = wargaRepo.create({
          kk_id: row.kk_id,
          nik: row.nik,
          nama: row.nama,
          jenis_kelamin: row.jenis_kelamin,
          tempat_lahir: row.tempat_lahir,
          tanggal_lahir: row.tanggal_lahir,
          no_hp: row.no_hp,
          status_keluarga: 'anggota',
          kewarganegaraan: 'WNI',
          is_active: 1,
        });
        this.userRepo.update(userId, { warga_id: warga.id });
      }

      this.repo.approve(id, { userId, adminId: admin.id });
    });

    this.logRepo.log({
      userId: admin.id,
      aksi: 'SETUJUI_PENDAFTARAN',
      modul: 'pendaftaran',
      deskripsi: `${admin.nama} menyetujui pendaftaran ${row.nama} (${row.nik})`,
      ip,
    });

    return this.repo.findById(id);
  }

  /** Tolak pendaftaran dengan catatan alasan. */
  reject(id, admin, alasan, ip = null) {
    const row = this.repo.findByIdPending(id);
    if (!row) throw badRequest('Pendaftaran ini sudah diproses atau tidak ditemukan.');

    const catatan = String(alasan || '').trim();
    if (!catatan) {
      throw badRequest('Alasan penolakan wajib diisi agar pendaftar dapat memahami alasannya.');
    }

    this.repo.reject(id, { alasan: catatan, adminId: admin.id });

    this.logRepo.log({
      userId: admin.id,
      aksi: 'TOLAK_PENDAFTARAN',
      modul: 'pendaftaran',
      deskripsi: `${admin.nama} menolak pendaftaran ${row.nama} (${row.nik})`,
      ip,
    });

    return this.repo.findById(id);
  }

  /** Hapus riwayat pendaftaran (data sudah diproses). */
  remove(id, admin, ip = null) {
    const row = this.repo.findById(id);
    if (!row) throw notFound('Data pendaftaran tidak ditemukan.');
    if (row.status === 'menunggu') {
      throw badRequest('Pendaftaran yang masih menunggu tidak dapat dihapus. Tolak saja.');
    }

    this.repo.delete(id);
    this.logRepo.log({
      userId: admin.id,
      aksi: 'HAPUS_PENDAFTARAN',
      modul: 'pendaftaran',
      deskripsi: `${admin.nama} menghapus riwayat pendaftaran ${row.nama}`,
      ip,
    });
  }
}

module.exports = new PendaftaranService();
