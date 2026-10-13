'use strict';

const {
  pengajuanSuratRepo, jenisSuratRepo, wargaRepo, aktivitasLogRepo,
} = require('../models');
const Validator = require('../utils/validator');
const { badRequest, notFound, conflict, validationError, forbidden } = require('../utils/errors');

const STATUS = ['menunggu', 'diproses', 'disetujui', 'ditolak', 'selesai'];

const STATUS_LABEL = {
  menunggu: 'Menunggu',
  diproses: 'Diproses',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  selesai: 'Selesai',
};

/**
 * Service surat menyurat: pengajuan warga & pemrosesan oleh pengurus.
 */
class SuratService {
  constructor() {
    this.repo = pengajuanSuratRepo;
    this.jenisRepo = jenisSuratRepo;
    this.wargaRepo = wargaRepo;
    this.logRepo = aktivitasLogRepo;
  }

  // ---------------- Jenis surat ----------------

  listJenis() {
    return this.jenisRepo.findAllWithStats();
  }

  optionsJenis() {
    return this.jenisRepo.optionsAll();
  }

  findJenis(id) {
    const jenis = this.jenisRepo.findById(id);
    if (!jenis) throw notFound('Jenis surat tidak ditemukan.');
    return jenis;
  }

  createJenis(payload, actor, ip) {
    const v = new Validator(payload);
    v.required('kode', 'Kode').maxLength('kode', 12, 'Kode');
    v.required('nama', 'Nama surat').maxLength('nama', 100, 'Nama surat');
    if (v.fails()) throw validationError(v.getErrors());

    const kode = String(payload.kode).toUpperCase().trim();
    if (this.jenisRepo.kodeExists(kode)) {
      throw conflict('Kode surat sudah digunakan.', { kode: 'Kode sudah terdaftar.' });
    }

    const jenis = this.jenisRepo.create({
      kode,
      nama: String(payload.nama).trim(),
      template: payload.template || null,
      is_active: 1,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'TAMBAH_JENIS_SURAT', modul: 'surat',
      deskripsi: `Menambah jenis surat "${jenis.nama}" (${jenis.kode})`, ip,
    });

    return jenis;
  }

  updateJenis(id, payload, actor, ip) {
    this.findJenis(id);

    const v = new Validator(payload);
    v.required('kode', 'Kode').maxLength('kode', 12, 'Kode');
    v.required('nama', 'Nama surat').maxLength('nama', 100, 'Nama surat');
    if (v.fails()) throw validationError(v.getErrors());

    const kode = String(payload.kode).toUpperCase().trim();
    if (this.jenisRepo.kodeExists(kode, id)) {
      throw conflict('Kode surat sudah digunakan.', { kode: 'Kode sudah terdaftar.' });
    }

    const jenis = this.jenisRepo.update(id, {
      kode,
      nama: String(payload.nama).trim(),
      template: payload.template || null,
      is_active: payload.is_active === undefined ? 1 : Number(payload.is_active),
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'UBAH_JENIS_SURAT', modul: 'surat',
      deskripsi: `Mengubah jenis surat "${jenis.nama}"`, ip,
    });

    return jenis;
  }

  deleteJenis(id, actor, ip) {
    const jenis = this.findJenis(id);
    if (this.jenisRepo.terpakai(id) > 0) {
      this.jenisRepo.update(id, { is_active: 0 });
      this.logRepo.log({
        userId: actor.id, aksi: 'NONAKTIF_JENIS_SURAT', modul: 'surat',
        deskripsi: `Menonaktifkan jenis surat "${jenis.nama}"`, ip,
      });
      return { softDeleted: true };
    }

    this.jenisRepo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_JENIS_SURAT', modul: 'surat',
      deskripsi: `Menghapus jenis surat "${jenis.nama}"`, ip,
    });
    return { softDeleted: false };
  }

  // ---------------- Pengajuan ----------------

  list(query, user = null) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      status: query.status || null,
      jenis_surat_id: query.jenis_surat_id || null,
      // Role warga hanya melihat pengajuannya sendiri
      user_id: user && user.role === 'warga' ? user.id : (query.user_id || null),
    };

    const data = this.repo.findAllFiltered({ ...filters, limit, offset: (page - 1) * limit });
    const total = this.repo.countFiltered(filters);

    return {
      data,
      pagination: {
        total, page, limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasPrev: page > 1,
        hasNext: page * limit < total,
        from: total === 0 ? 0 : (page - 1) * limit + 1,
        to: Math.min(page * limit, total),
      },
    };
  }

  find(id, user = null) {
    const surat = this.repo.findDetail(id);
    if (!surat) throw notFound('Pengajuan surat tidak ditemukan.');

    // Warga hanya boleh membuka pengajuannya sendiri
    if (user && user.role === 'warga' && surat.user_id !== user.id) {
      throw forbidden('Anda tidak berhak melihat pengajuan ini.');
    }

    return surat;
  }

  /** Warga mengajukan surat */
  ajukan(payload, user, ip) {
    const v = new Validator(payload);
    v.required('jenis_surat_id', 'Jenis surat').numeric('jenis_surat_id', 'Jenis surat');
    v.required('nama_pemohon', 'Nama pemohon').maxLength('nama_pemohon', 100, 'Nama pemohon');
    v.required('keperluan', 'Keperluan').maxLength('keperluan', 255, 'Keperluan');
    v.phone('no_hp', 'Nomor HP');
    if (v.fails()) throw validationError(v.getErrors());

    const jenis = this.findJenis(Number(payload.jenis_surat_id));

    // Nomor surat otomatis
    const tahun = new Date().getFullYear();
    const noSurat = this.repo.generateNoSurat(tahun);

    const surat = this.repo.create({
      no_surat: noSurat,
      jenis_surat_id: jenis.id,
      user_id: user.id,
      warga_id: payload.warga_id ? Number(payload.warga_id) : user.warga_id || null,
      nama_pemohon: String(payload.nama_pemohon).trim(),
      nik_pemohon: payload.nik_pemohon || null,
      no_hp: payload.no_hp || user.no_hp || null,
      keperluan: String(payload.keperluan).trim(),
      keterangan: payload.keterangan || null,
      status: 'menunggu',
      tanggal_pengajuan: new Date().toISOString().slice(0, 10),
    });

    this.logRepo.log({
      userId: user.id, aksi: 'AJUKAN_SURAT', modul: 'surat',
      deskripsi: `Pengajuan ${jenis.nama} (${noSurat}) oleh ${surat.nama_pemohon}`, ip,
    });

    return this.repo.findDetail(surat.id);
  }

  /** Admin/bendahara memperbarui status pengajuan */
  ubahStatus(id, payload, actor, ip) {
    const surat = this.repo.findDetail(id);
    if (!surat) throw notFound('Pengajuan surat tidak ditemukan.');

    const v = new Validator(payload);
    v.required('status', 'Status').in('status', STATUS, 'Status');
    if (v.fails()) throw validationError(v.getErrors());

    const status = payload.status;

    if (status === 'ditolak' && !String(payload.catatan_admin || '').trim()) {
      throw validationError({ catatan_admin: 'Alasan penolakan wajib diisi.' });
    }

    this.repo.updateStatus(id, {
      status,
      catatan_admin: payload.catatan_admin || null,
      diproses_oleh: actor.id,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'UBAH_STATUS_SURAT', modul: 'surat',
      deskripsi: `Pengajuan ${surat.no_surat} -> ${STATUS_LABEL[status]}`, ip,
    });

    return this.repo.findDetail(id);
  }

  delete(id, actor, ip) {
    const surat = this.repo.findDetail(id);
    if (!surat) throw notFound('Pengajuan surat tidak ditemukan.');

    if (!['menunggu', 'ditolak'].includes(surat.status)) {
      throw badRequest('Hanya pengajuan berstatus "menunggu" atau "ditolak" yang dapat dihapus.');
    }

    this.repo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_SURAT', modul: 'surat',
      deskripsi: `Menghapus pengajuan ${surat.no_surat}`, ip,
    });
    return true;
  }

  countByStatus() {
    const rows = this.repo.countByStatus();
    const map = Object.fromEntries(rows.map((r) => [r.status, r.jumlah]));
    const total = rows.reduce((sum, r) => sum + r.jumlah, 0);
    return {
      total,
      menunggu: map.menunggu || 0,
      diproses: map.diproses || 0,
      disetujui: map.disetujui || 0,
      ditolak: map.ditolak || 0,
      selesai: map.selesai || 0,
    };
  }

  latest(limit = 5, userId = null) {
    return this.repo.latest(limit, userId);
  }

  consts() {
    return { STATUS, STATUS_LABEL };
  }
}

module.exports = new SuratService();
