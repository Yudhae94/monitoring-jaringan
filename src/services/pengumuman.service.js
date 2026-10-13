'use strict';

const { pengumumanRepo, aktivitasLogRepo } = require('../models');
const Validator = require('../utils/validator');
const { notFound, validationError } = require('../utils/errors');

const PRIORITAS = ['normal', 'penting', 'urgent'];

const PRIORITAS_LABEL = {
  normal: 'Normal',
  penting: 'Penting',
  urgent: 'Urgent',
};

class PengumumanService {
  constructor() {
    this.repo = pengumumanRepo;
    this.logRepo = aktivitasLogRepo;
  }

  list(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      prioritas: query.prioritas || null,
      is_publish: query.is_publish,
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
    const p = this.repo.findDetail(id);
    if (!p) throw notFound('Pengumuman tidak ditemukan.');
    return p;
  }

  validate(payload) {
    const v = new Validator(payload);
    v.required('judul', 'Judul').maxLength('judul', 150, 'Judul');
    v.required('isi', 'Isi pengumuman');
    v.required('tanggal_mulai', 'Tanggal mulai').date('tanggal_mulai', 'Tanggal mulai');
    v.in('prioritas', PRIORITAS, 'Prioritas');
    v.date('tanggal_selesai', 'Tanggal selesai');
    if (v.fails()) throw validationError(v.getErrors());

    if (payload.tanggal_selesai && payload.tanggal_selesai < payload.tanggal_mulai) {
      throw validationError({
        tanggal_selesai: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
      });
    }

    return payload;
  }

  create(payload, actor, ip) {
    const data = this.validate(payload);

    const p = this.repo.create({
      judul: String(data.judul).trim(),
      isi: String(data.isi).trim(),
      prioritas: data.prioritas || 'normal',
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai || null,
      is_publish: data.is_publish === undefined ? 1 : Number(data.is_publish),
      dibuat_oleh: actor.id,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'TAMBAH_PENGUMUMAN', modul: 'pengumuman',
      deskripsi: `Menambah pengumuman "${p.judul}"`, ip,
    });

    return this.repo.findDetail(p.id);
  }

  update(id, payload, actor, ip) {
    const existing = this.repo.findById(id);
    if (!existing) throw notFound('Pengumuman tidak ditemukan.');

    const data = this.validate(payload);

    this.repo.update(id, {
      judul: String(data.judul).trim(),
      isi: String(data.isi).trim(),
      prioritas: data.prioritas || existing.prioritas,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai || null,
      is_publish: data.is_publish === undefined ? existing.is_publish : Number(data.is_publish),
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'UBAH_PENGUMUMAN', modul: 'pengumuman',
      deskripsi: `Mengubah pengumuman "${data.judul}"`, ip,
    });

    return this.repo.findDetail(id);
  }

  delete(id, actor, ip) {
    const p = this.repo.findById(id);
    if (!p) throw notFound('Pengumuman tidak ditemukan.');

    this.repo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_PENGUMUMAN', modul: 'pengumuman',
      deskripsi: `Menghapus pengumuman "${p.judul}"`, ip,
    });

    return true;
  }

  togglePublish(id, actor, ip) {
    const p = this.repo.findById(id);
    if (!p) throw notFound('Pengumuman tidak ditemukan.');

    this.repo.update(id, { is_publish: p.is_publish ? 0 : 1 });

    this.logRepo.log({
      userId: actor.id, aksi: p.is_publish ? 'UNPUBLISH_PENGUMUMAN' : 'PUBLISH_PENGUMUMAN',
      modul: 'pengumuman',
      deskripsi: `Pengumuman "${p.judul}" di${p.is_publish ? 'turunkan' : 'publikasikan'}`, ip,
    });

    return this.repo.findById(id);
  }

  publishedFor(role, userId, limit = 5) {
    return this.repo.findPublished(limit);
  }

  consts() {
    return { PRIORITAS, PRIORITAS_LABEL };
  }
}

module.exports = new PengumumanService();
