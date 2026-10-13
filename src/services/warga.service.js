'use strict';

const { wargaRepo, kartuKeluargaRepo, aktivitasLogRepo } = require('../models');
const Validator = require('../utils/validator');
const { conflict, notFound, validationError } = require('../utils/errors');

const JK = ['L', 'P'];
const STATUS_KAWIN = ['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'];
const STATUS_KELUARGA = ['kepala_keluarga', 'istri', 'anak', 'familiar_lain'];

const LABEL = {
  JK: { L: 'Laki-laki', P: 'Perempuan' },
  STATUS_KAWIN: {
    belum_kawin: 'Belum Kawin',
    kawin: 'Kawin',
    cerai_hidup: 'Cerai Hidup',
    cerai_mati: 'Cerai Mati',
  },
  STATUS_KELUARGA: {
    kepala_keluarga: 'Kepala Keluarga',
    istri: 'Istri',
    anak: 'Anak',
    familiar_lain: 'Famili Lain',
  },
  STATUS_RUMAH: {
    milik: 'Milik Sendiri',
    sewa: 'Sewa',
    kontrak: 'Kontrak',
    numpang: 'Numpang',
  },
};

class WargaService {
  constructor() {
    this.repo = wargaRepo;
    this.kkRepo = kartuKeluargaRepo;
    this.logRepo = aktivitasLogRepo;
  }

  list(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      kk_id: query.kk_id || null,
      jenis_kelamin: query.jenis_kelamin || null,
      status_keluarga: query.status_keluarga || null,
    };

    const data = this.repo.findAllFiltered({ ...filters, limit, offset: (page - 1) * limit });
    const total = this.repo.countFiltered(filters);

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
    const warga = this.repo.findWithKK(id);
    if (!warga) throw notFound('Data warga tidak ditemukan.');
    return warga;
  }

  validate(payload, currentId = null) {
    const v = new Validator(payload);

    v.required('kk_id', 'Kartu Keluarga').numeric('kk_id', 'Kartu Keluarga');
    v.required('nik', 'NIK').nik('nik', 'NIK');
    v.required('nama', 'Nama').maxLength('nama', 100, 'Nama');
    v.required('jenis_kelamin', 'Jenis kelamin').in('jenis_kelamin', JK, 'Jenis kelamin');
    v.in('status_perkawinan', STATUS_KAWIN, 'Status perkawinan');
    v.in('status_keluarga', STATUS_KELUARGA, 'Status keluarga');
    v.date('tanggal_lahir', 'Tanggal lahir');
    v.phone('no_hp', 'Nomor HP');

    if (v.fails()) throw validationError(v.getErrors());

    if (!this.kkRepo.exists(Number(payload.kk_id))) {
      throw validationError({ kk_id: 'Kartu Keluarga yang dipilih tidak ditemukan.' });
    }

    const nik = String(payload.nik).trim();
    if (this.repo.nikExists(nik, currentId)) {
      throw conflict('NIK sudah terdaftar.', { nik: 'NIK sudah terdaftar.' });
    }

    return { ...payload, nik };
  }

  buildData(data) {
    return {
      kk_id: Number(data.kk_id),
      nik: data.nik,
      nama: String(data.nama).trim(),
      jenis_kelamin: data.jenis_kelamin,
      tempat_lahir: data.tempat_lahir || null,
      tanggal_lahir: data.tanggal_lahir || null,
      agama: data.agama || null,
      status_perkawinan: data.status_perkawinan || null,
      pendidikan: data.pendidikan || null,
      pekerjaan: data.pekerjaan || null,
      kewarganegaraan: data.kewarganegaraan || 'WNI',
      status_keluarga: data.status_keluarga || 'anggota',
      no_hp: data.no_hp || null,
      is_active: 1,
    };
  }

  create(payload, actor, ip) {
    const data = this.validate(payload);
    const warga = this.repo.create(this.buildData(data));

    this.logRepo.log({
      userId: actor.id,
      aksi: 'TAMBAH_WARGA',
      modul: 'warga',
      deskripsi: `Menambah warga ${warga.nama} (NIK ${warga.nik})`,
      ip,
    });

    return warga;
  }

  update(id, payload, actor, ip) {
    const existing = this.repo.findById(id);
    if (!existing) throw notFound('Data warga tidak ditemukan.');

    const data = this.validate(payload, id);
    const warga = this.repo.update(id, { ...this.buildData(data), is_active: existing.is_active });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'UBAH_WARGA',
      modul: 'warga',
      deskripsi: `Mengubah data warga ${warga.nama}`,
      ip,
    });

    return warga;
  }

  delete(id, actor, ip) {
    const warga = this.repo.findById(id);
    if (!warga) throw notFound('Data warga tidak ditemukan.');

    // Soft delete — riwayat surat/iuran tetap terjaga
    this.repo.update(id, { is_active: 0 });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'HAPUS_WARGA',
      modul: 'warga',
      deskripsi: `Menghapus warga ${warga.nama}`,
      ip,
    });

    return true;
  }

  stats() {
    return this.repo.stats();
  }

  options() {
    return this.repo.optionsAll();
  }

  /** Data warga yang tertaut ke akun login tertentu */
  findByUserId(userId) {
    return this.repo.db.get(
      `SELECT w.*, kk.no_kk, kk.kepala_keluarga, kk.alamat, kk.no_rumah
         FROM users u
         JOIN warga w            ON w.id  = u.warga_id
         JOIN kartu_keluarga kk  ON kk.id = w.kk_id
        WHERE u.id = ?`,
      [userId]
    );
  }

  labels() {
    return LABEL;
  }
}

module.exports = new WargaService();
