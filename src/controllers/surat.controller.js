'use strict';

const { suratService } = require('../services');

class SuratController {
  /** GET /surat */
  index(req, res) {
    const { data, pagination } = suratService.list(req.query, req.session.user);

    res.render('surat/index', {
      title: 'Surat Menyurat',
      activeMenu: 'surat',
      data,
      pagination,
      filters: {
        q: req.query.q || '',
        status: req.query.status || '',
        jenis_surat_id: req.query.jenis_surat_id || '',
      },
      jenisOptions: suratService.optionsJenis(),
      consts: suratService.consts(),
      stats: suratService.countByStatus(),
    });
  }

  /** GET /surat/:id */
  show(req, res) {
    const surat = suratService.find(req.params.id, req.session.user);

    res.render('surat/detail', {
      title: `Surat ${surat.no_surat}`,
      activeMenu: 'surat',
      surat,
      consts: suratService.consts(),
    });
  }

  /** GET /surat/ajukan */
  create(req, res) {
    const user = req.session.user;
    const { wargaService } = require('../services');

    res.render('surat/form', {
      title: 'Ajukan Surat',
      activeMenu: 'surat',
      jenisOptions: suratService.optionsJenis(),
      wargaOptions: wargaService.options(),
      wargaSaya: wargaService.findByUserId(user.id),
      user,
    });
  }

  /** POST /surat/ajukan */
  store(req, res) {
    const surat = suratService.ajukan(req.body, req.session.user, req.ip);
    req.flash('success', `Pengajuan surat berhasil dikirim dengan nomor ${surat.no_surat}.`);
    res.redirect(`/surat/${surat.id}`);
  }

  /** PUT /surat/:id/status */
  updateStatus(req, res) {
    suratService.ubahStatus(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Status pengajuan surat berhasil diperbarui.');
    res.redirect(`/surat/${req.params.id}`);
  }

  /** DELETE /surat/:id */
  destroy(req, res) {
    suratService.delete(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Pengajuan surat berhasil dihapus.');
    res.redirect('/surat');
  }

  /** GET /surat/:id/cetak */
  print(req, res) {
    const surat = suratService.find(req.params.id, req.session.user);

    // Surat hanya bisa dicetak setelah disetujui/selesai
    if (!['disetujui', 'selesai'].includes(surat.status)) {
      req.flash('error', 'Surat hanya dapat dicetak setelah statusnya disetujui atau selesai.');
      return res.redirect(`/surat/${surat.id}`);
    }

    res.render('surat/cetak', {
      layout: false,
      surat,
      rt: require('../config/app').rt,
      tanggalCetak: new Date(),
    });
  }

  // ======================= JENIS SURAT =======================

  /** GET /surat/jenis */
  jenisIndex(req, res) {
    res.render('surat/jenis', {
      title: 'Jenis Surat',
      activeMenu: 'surat',
      jenisList: suratService.listJenis(),
    });
  }

  /** POST /surat/jenis */
  jenisStore(req, res) {
    suratService.createJenis(req.body, req.session.user, req.ip);
    req.flash('success', 'Jenis surat berhasil ditambahkan.');
    res.redirect('/surat/jenis');
  }

  /** PUT /surat/jenis/:id */
  jenisUpdate(req, res) {
    suratService.updateJenis(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Jenis surat berhasil diperbarui.');
    res.redirect('/surat/jenis');
  }

  /** DELETE /surat/jenis/:id */
  jenisDestroy(req, res) {
    const hasil = suratService.deleteJenis(req.params.id, req.session.user, req.ip);
    req.flash(
      'success',
      hasil.softDeleted
        ? 'Jenis surat dinonaktifkan karena masih memiliki riwayat pengajuan.'
        : 'Jenis surat berhasil dihapus.'
    );
    res.redirect('/surat/jenis');
  }
}

module.exports = new SuratController();
