'use strict';

const { kartuKeluargaService, wargaService } = require('../services');

class KartuKeluargaController {
  /** GET /kartu-keluarga */
  index(req, res) {
    const { data, pagination } = kartuKeluargaService.list(req.query);

    res.render('kartu-keluarga/index', {
      title: 'Kartu Keluarga',
      activeMenu: 'kartu-keluarga',
      data,
      pagination,
      filters: {
        q: req.query.q || '',
        status_rumah: req.query.status_rumah || '',
      },
    });
  }

  /** GET /kartu-keluarga/:id */
  show(req, res) {
    const { kk, anggota } = kartuKeluargaService.detail(req.params.id);

    res.render('kartu-keluarga/detail', {
      title: `KK ${kk.kepala_keluarga}`,
      activeMenu: 'kartu-keluarga',
      kk,
      anggota,
      labels: wargaService.labels(),
    });
  }

  /** GET /kartu-keluarga/create */
  create(req, res) {
    res.render('kartu-keluarga/form', {
      title: 'Tambah Kartu Keluarga',
      activeMenu: 'kartu-keluarga',
      kk: null,
    });
  }

  /** POST /kartu-keluarga */
  store(req, res) {
    const kk = kartuKeluargaService.create(req.body, req.session.user, req.ip);
    req.flash('success', `Kartu Keluarga ${kk.no_kk} berhasil ditambahkan.`);
    res.redirect(`/kartu-keluarga/${kk.id}`);
  }

  /** GET /kartu-keluarga/:id/edit */
  edit(req, res) {
    const kk = kartuKeluargaService.repo.findById(req.params.id);
    if (!kk) {
      req.flash('error', 'Kartu Keluarga tidak ditemukan.');
      return res.redirect('/kartu-keluarga');
    }

    res.render('kartu-keluarga/form', {
      title: `Edit KK — ${kk.kepala_keluarga}`,
      activeMenu: 'kartu-keluarga',
      kk,
    });
  }

  /** PUT /kartu-keluarga/:id */
  update(req, res) {
    kartuKeluargaService.update(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Kartu Keluarga berhasil diperbarui.');
    res.redirect(`/kartu-keluarga/${req.params.id}`);
  }

  /** DELETE /kartu-keluarga/:id */
  destroy(req, res) {
    kartuKeluargaService.delete(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Kartu Keluarga berhasil dihapus.');
    res.redirect('/kartu-keluarga');
  }
}

module.exports = new KartuKeluargaController();
