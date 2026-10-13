'use strict';

const { kasRepo, kategoriKasRepo, aktivitasLogRepo } = require('../models');
const Validator = require('../utils/validator');
const { badRequest, notFound, conflict, validationError } = require('../utils/errors');

const TIPE = ['masuk', 'keluar'];

/**
 * Service kas RT: transaksi manual, kategori, saldo, dan rekap.
 */
class KasService {
  constructor() {
    this.repo = kasRepo;
    this.kategoriRepo = kategoriKasRepo;
    this.logRepo = aktivitasLogRepo;
  }

  // ---------------- Transaksi ----------------

  list(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      tipe: query.tipe || null,
      kategori_id: query.kategori_id || null,
      bulan: query.bulan || null,
      tahun: query.tahun || null,
      tanggal_dari: query.tanggal_dari || null,
      tanggal_sampai: query.tanggal_sampai || null,
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

  find(id) {
    const trx = this.repo.findDetail(id);
    if (!trx) throw notFound('Transaksi tidak ditemukan.');
    return trx;
  }

  validate(payload) {
    const v = new Validator(payload);
    v.required('tanggal', 'Tanggal').date('tanggal', 'Tanggal');
    v.required('tipe', 'Tipe').in('tipe', TIPE, 'Tipe');
    v.required('nominal', 'Nominal').numeric('nominal', 'Nominal').minNumber('nominal', 1, 'Nominal');
    v.required('keterangan', 'Keterangan').maxLength('keterangan', 255, 'Keterangan');
    v.numeric('kategori_id', 'Kategori');
    if (v.fails()) throw validationError(v.getErrors());

    if (payload.kategori_id) {
      const kategori = this.kategoriRepo.findById(Number(payload.kategori_id));
      if (!kategori) throw validationError({ kategori_id: 'Kategori tidak ditemukan.' });
      if (kategori.tipe !== payload.tipe) {
        throw validationError({
          kategori_id: `Kategori "${kategori.nama}" adalah tipe ${kategori.tipe}, tidak cocok dengan tipe transaksi ${payload.tipe}.`,
        });
      }
    }

    return payload;
  }

  create(payload, actor, ip) {
    const data = this.validate(payload);

    const trx = this.repo.create({
      tanggal: data.tanggal,
      tipe: data.tipe,
      kategori_id: data.kategori_id ? Number(data.kategori_id) : null,
      nominal: Number(data.nominal),
      keterangan: String(data.keterangan).trim(),
      sumber: 'manual',
      bukti: payload.bukti || null,
      dicatat_oleh: actor.id,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'TAMBAH_KAS', modul: 'kas',
      deskripsi: `Kas ${trx.tipe} ${trx.nominal} - ${trx.keterangan}`, ip,
    });

    return this.repo.findDetail(trx.id);
  }

  update(id, payload, actor, ip) {
    const existing = this.repo.findById(id);
    if (!existing) throw notFound('Transaksi tidak ditemukan.');
    if (existing.sumber === 'iuran') {
      throw badRequest('Transaksi ini berasal dari pembayaran iuran. Ubah melalui menu Iuran, bukan Kas.');
    }

    const data = this.validate(payload);

    this.repo.update(id, {
      tanggal: data.tanggal,
      tipe: data.tipe,
      kategori_id: data.kategori_id ? Number(data.kategori_id) : null,
      nominal: Number(data.nominal),
      keterangan: String(data.keterangan).trim(),
      bukti: payload.bukti || null,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'UBAH_KAS', modul: 'kas',
      deskripsi: `Ubah transaksi kas #${id} - ${data.keterangan}`, ip,
    });

    return this.repo.findDetail(id);
  }

  delete(id, actor, ip) {
    const trx = this.repo.findById(id);
    if (!trx) throw notFound('Transaksi tidak ditemukan.');
    if (trx.sumber === 'iuran') {
      throw badRequest('Transaksi ini berasal dari pembayaran iuran. Hapus lewat menu Pembayaran Iuran.');
    }

    this.repo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_KAS', modul: 'kas',
      deskripsi: `Hapus transaksi kas #${id} - ${trx.keterangan}`, ip,
    });

    return true;
  }

  // ---------------- Kategori ----------------

  listKategori() {
    return this.kategoriRepo.findAllOrdered();
  }

  validateKategori(payload, currentId = null) {
    const v = new Validator(payload);
    v.required('nama', 'Nama kategori').maxLength('nama', 60, 'Nama kategori');
    v.required('tipe', 'Tipe').in('tipe', TIPE, 'Tipe');
    if (v.fails()) throw validationError(v.getErrors());

    const nama = String(payload.nama).trim();
    if (this.kategoriRepo.namaExists(nama, currentId)) {
      throw conflict('Nama kategori sudah ada.', { nama: 'Nama kategori sudah digunakan.' });
    }
    return { ...payload, nama };
  }

  createKategori(payload, actor, ip) {
    const data = this.validateKategori(payload);
    const kategori = this.kategoriRepo.create({
      nama: data.nama,
      tipe: data.tipe,
      warna: payload.warna || '#64748b',
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'TAMBAH_KATEGORI', modul: 'kas',
      deskripsi: `Menambah kategori "${kategori.nama}" (${kategori.tipe})`, ip,
    });

    return kategori;
  }

  updateKategori(id, payload, actor, ip) {
    const existing = this.kategoriRepo.findById(id);
    if (!existing) throw notFound('Kategori tidak ditemukan.');

    const data = this.validateKategori(payload, id);
    const kategori = this.kategoriRepo.update(id, {
      nama: data.nama,
      tipe: data.tipe,
      warna: payload.warna || existing.warna,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'UBAH_KATEGORI', modul: 'kas',
      deskripsi: `Mengubah kategori "${kategori.nama}"`, ip,
    });

    return kategori;
  }

  deleteKategori(id, actor, ip) {
    const kategori = this.kategoriRepo.findById(id);
    if (!kategori) throw notFound('Kategori tidak ditemukan.');

    const terpakai = this.kategoriRepo.terpakai(id);
    if (terpakai > 0) {
      throw badRequest(`Kategori masih dipakai oleh ${terpakai} transaksi dan tidak dapat dihapus.`);
    }

    this.kategoriRepo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_KATEGORI', modul: 'kas',
      deskripsi: `Menghapus kategori "${kategori.nama}"`, ip,
    });

    return true;
  }

  // ---------------- Statistik ----------------

  summary({ bulan, tahun } = {}) {
    return this.repo.summary({ bulan, tahun });
  }

  rekapBulanan(tahun) {
    return this.repo.rekapBulanan(tahun);
  }

  byKategori(tipe, filter = {}) {
    return this.repo.byKategori(tipe, filter);
  }

  latest(limit = 5) {
    return this.repo.latest(limit);
  }
}

module.exports = new KasService();
