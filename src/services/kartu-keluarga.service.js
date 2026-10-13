'use strict';

const { kartuKeluargaRepo, wargaRepo, aktivitasLogRepo } = require('../models');
const Validator = require('../utils/validator');
const { conflict, notFound, validationError, badRequest } = require('../utils/errors');
const appConfig = require('../config/app');

const STATUS_RUMAH = ['milik', 'sewa', 'kontrak', 'numpang'];

class KartuKeluargaService {
  constructor() {
    this.repo = kartuKeluargaRepo;
    this.wargaRepo = wargaRepo;
    this.logRepo = aktivitasLogRepo;
  }

  list(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      status_rumah: query.status_rumah || null,
    };

    const data = this.repo.findAllWithCounts({ ...filters, limit, offset: (page - 1) * limit });
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

  detail(id) {
    const kk = this.repo.findWithCounts(id);
    if (!kk) throw notFound('Kartu Keluarga tidak ditemukan.');
    const anggota = this.wargaRepo.findByKK(id);
    return { kk, anggota };
  }

  validate(payload, currentId = null) {
    const v = new Validator(payload);

    v.required('no_kk', 'Nomor KK').noKk('no_kk', 'Nomor KK');
    v.required('kepala_keluarga', 'Kepala Keluarga').maxLength('kepala_keluarga', 100, 'Kepala Keluarga');
    v.required('alamat', 'Alamat').maxLength('alamat', 200, 'Alamat');
    v.in('status_rumah', STATUS_RUMAH, 'Status rumah');

    if (v.fails()) throw validationError(v.getErrors());

    const noKk = String(payload.no_kk).trim();
    if (this.repo.noKkExists(noKk, currentId)) {
      throw conflict('Nomor KK sudah terdaftar.', { no_kk: 'Nomor KK sudah terdaftar.' });
    }

    return { ...payload, no_kk: noKk };
  }

  create(payload, actor, ip) {
    const data = this.validate(payload);

    const kk = this.repo.create({
      no_kk: data.no_kk,
      kepala_keluarga: String(data.kepala_keluarga).trim(),
      alamat: String(data.alamat).trim(),
      blok: data.blok || null,
      no_rumah: data.no_rumah || null,
      rt: data.rt || appConfig.rt.number,
      rw: data.rw || appConfig.rt.rw,
      kode_pos: data.kode_pos || appConfig.rt.kodePos,
      status_rumah: data.status_rumah || 'milik',
      is_active: 1,
    });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'TAMBAH_KK',
      modul: 'kartu_keluarga',
      deskripsi: `Menambah KK ${kk.no_kk} - ${kk.kepala_keluarga}`,
      ip,
    });

    return kk;
  }

  update(id, payload, actor, ip) {
    const existing = this.repo.findById(id);
    if (!existing) throw notFound('Kartu Keluarga tidak ditemukan.');

    const data = this.validate(payload, id);

    const kk = this.repo.update(id, {
      no_kk: data.no_kk,
      kepala_keluarga: String(data.kepala_keluarga).trim(),
      alamat: String(data.alamat).trim(),
      blok: data.blok || null,
      no_rumah: data.no_rumah || null,
      rt: data.rt || appConfig.rt.number,
      rw: data.rw || appConfig.rt.rw,
      kode_pos: data.kode_pos || appConfig.rt.kodePos,
      status_rumah: data.status_rumah || existing.status_rumah,
    });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'UBAH_KK',
      modul: 'kartu_keluarga',
      deskripsi: `Mengubah KK ${kk.no_kk} - ${kk.kepala_keluarga}`,
      ip,
    });

    return kk;
  }

  delete(id, actor, ip) {
    const kk = this.repo.findById(id);
    if (!kk) throw notFound('Kartu Keluarga tidak ditemukan.');

    const anggota = this.wargaRepo.findByKK(id);
    if (anggota.length > 0) {
      throw badRequest(
        `Tidak dapat menghapus KK yang masih memiliki ${anggota.length} anggota aktif. Hapus anggotanya terlebih dahulu.`
      );
    }

    // Soft delete supaya relasi tagihan/pembayaran tetap utuh
    this.repo.update(id, { is_active: 0 });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'HAPUS_KK',
      modul: 'kartu_keluarga',
      deskripsi: `Menghapus KK ${kk.no_kk} - ${kk.kepala_keluarga}`,
      ip,
    });

    return true;
  }

  options() {
    return this.repo.optionsAll();
  }
}

module.exports = new KartuKeluargaService();
