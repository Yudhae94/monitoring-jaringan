'use strict';

const { wargaService, kartuKeluargaService } = require('../services');

class WargaController {
  /** GET /warga */
  index(req, res) {
    const { data, pagination } = wargaService.list(req.query);

    res.render('warga/index', {
      title: 'Data Warga',
      activeMenu: 'warga',
      data,
      pagination,
      filters: {
        q: req.query.q || '',
        kk_id: req.query.kk_id || '',
        jenis_kelamin: req.query.jenis_kelamin || '',
        status_keluarga: req.query.status_keluarga || '',
      },
      kkOptions: kartuKeluargaService.options(),
      labels: wargaService.labels(),
      stats: wargaService.stats(),
    });
  }

  /** GET /warga/:id */
  show(req, res) {
    const warga = wargaService.find(req.params.id);

    res.render('warga/detail', {
      title: `Warga — ${warga.nama}`,
      activeMenu: 'warga',
      warga,
      labels: wargaService.labels(),
    });
  }

  /** GET /warga/create */
  create(req, res) {
    res.render('warga/form', {
      title: 'Tambah Warga',
      activeMenu: 'warga',
      warga: null,
      kkOptions: kartuKeluargaService.options(),
      labels: wargaService.labels(),
      preselectedKK: req.query.kk_id || '',
    });
  }

  /** POST /warga */
  store(req, res) {
    const warga = wargaService.create(req.body, req.session.user, req.ip);
    req.flash('success', `Data warga ${warga.nama} berhasil ditambahkan.`);
    res.redirect(`/warga/${warga.id}`);
  }

  /** GET /warga/:id/edit */
  edit(req, res) {
    const warga = wargaService.repo.findById(req.params.id);
    if (!warga) {
      req.flash('error', 'Data warga tidak ditemukan.');
      return res.redirect('/warga');
    }

    res.render('warga/form', {
      title: `Edit Warga — ${warga.nama}`,
      activeMenu: 'warga',
      warga,
      kkOptions: kartuKeluargaService.options(),
      labels: wargaService.labels(),
      preselectedKK: '',
    });
  }

  /** PUT /warga/:id */
  update(req, res) {
    wargaService.update(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Data warga berhasil diperbarui.');
    res.redirect(`/warga/${req.params.id}`);
  }

  /** DELETE /warga/:id */
  destroy(req, res) {
    wargaService.delete(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Data warga berhasil dihapus.');
    res.redirect('/warga');
  }
}

module.exports = new WargaController();
