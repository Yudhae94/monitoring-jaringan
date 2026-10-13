'use strict';

const { kasService } = require('../services');
const { tahunOptions } = require('../utils/format');

class KasController {
  /** GET /kas */
  index(req, res) {
    const { data, pagination } = kasService.list(req.query);
    const bulan = req.query.bulan || '';
    const tahun = req.query.tahun || new Date().getFullYear();

    res.render('kas/index', {
      title: 'Kas RT',
      activeMenu: 'kas',
      data,
      pagination,
      filters: {
        q: req.query.q || '',
        tipe: req.query.tipe || '',
        kategori_id: req.query.kategori_id || '',
        bulan,
        tahun: req.query.tahun || '',
      },
      kategoriOptions: kasService.listKategori(),
      tahunOptions: tahunOptions(5),
      summary: kasService.summary({ bulan, tahun }),
    });
  }

  /** GET /kas/create */
  create(req, res) {
    res.render('kas/form', {
      title: 'Tambah Transaksi Kas',
      activeMenu: 'kas',
      trx: null,
      kategoriOptions: kasService.listKategori(),
    });
  }

  /** POST /kas */
  store(req, res) {
    kasService.create(req.body, req.session.user, req.ip);
    req.flash('success', 'Transaksi kas berhasil dicatat.');
    res.redirect('/kas');
  }

  /** GET /kas/:id/edit */
  edit(req, res) {
    const trx = kasService.repo.findById(req.params.id);
    if (!trx) {
      req.flash('error', 'Transaksi tidak ditemukan.');
      return res.redirect('/kas');
    }

    res.render('kas/form', {
      title: 'Edit Transaksi Kas',
      activeMenu: 'kas',
      trx,
      kategoriOptions: kasService.listKategori(),
    });
  }

  /** PUT /kas/:id */
  update(req, res) {
    kasService.update(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Transaksi kas berhasil diperbarui.');
    res.redirect('/kas');
  }

  /** DELETE /kas/:id */
  destroy(req, res) {
    kasService.delete(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Transaksi kas berhasil dihapus.');
    res.redirect('/kas');
  }

  // ======================= KATEGORI =======================

  /** POST /kas/kategori */
  kategoriStore(req, res) {
    kasService.createKategori(req.body, req.session.user, req.ip);
    req.flash('success', 'Kategori berhasil ditambahkan.');
    res.redirect('/kas/kategori');
  }

  /** GET /kas/kategori */
  kategoriIndex(req, res) {
    res.render('kas/kategori', {
      title: 'Kategori Kas',
      activeMenu: 'kas',
      kategoriList: kasService.listKategori(),
    });
  }

  /** PUT /kas/kategori/:id */
  kategoriUpdate(req, res) {
    kasService.updateKategori(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Kategori berhasil diperbarui.');
    res.redirect('/kas/kategori');
  }

  /** DELETE /kas/kategori/:id */
  kategoriDestroy(req, res) {
    kasService.deleteKategori(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Kategori berhasil dihapus.');
    res.redirect('/kas/kategori');
  }
}

module.exports = new KasController();
