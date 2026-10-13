'use strict';

const { pendaftaranService } = require('../services');
const asyncHandler = require('../middlewares/async-handler');

/**
 * Controller pendaftaran warga baru.
 *
 * Publik : /daftar          (warga baru mendaftar mandiri)
 * Admin  : /pendaftaran     (antrean, approve, reject)
 */
class PendaftaranController {
  // ===================== PUBLIK =====================

  /** GET /daftar — form pendaftaran warga baru */
  showForm(req, res) {
    return res.render('pendaftaran/form', {
      title: 'Pendaftaran Warga Baru',
      layout: 'layouts/main',
      activeMenu: 'daftar',
      kkOptions: pendaftaranService.kkOptions(),
      options: pendaftaranService.options(),
      old: {},
      errors: {},
    });
  }

  /** GET /daftar/terkirim — halaman konfirmasi (tanpa data sensitif) */
  showSuccess(req, res) {
    return res.render('pendaftaran/success', {
      title: 'Pendaftaran Terkirim',
      layout: 'layouts/auth',
    });
  }

  /** POST /daftar — simpan pendaftaran, lalu arahkan ke halaman sukses */
  submit = asyncHandler(async (req, res) => {
    try {
      await pendaftaranService.register(req.body, req.ip);
      // Jangan simpan NIK/email mentah di flash.
      req.flash('success', 'Pendaftaran berhasil dikirim. Data Anda sedang menunggu persetujuan admin.');
      return res.redirect('/daftar/terkirim');
    } catch (err) {
      // Validasi field: kirim balik ke form dengan pesan per-field
      if (err.status === 422 && err.details) {
        return res.status(422).render('pendaftaran/form', {
          title: 'Pendaftaran Warga Baru',
          layout: 'layouts/main',
          activeMenu: 'daftar',
          kkOptions: pendaftaranService.kkOptions(),
          options: pendaftaranService.options(),
          old: req.body,
          errors: err.details,
        });
      }
      throw err; // error lain -> tangani di errorHandler
    }
  });

  // ===================== ADMIN =====================

  /** GET /pendaftaran — daftar antrean */
  index = asyncHandler(async (req, res) => {
    const { data, stats, pagination } = pendaftaranService.list(req.query);

    return res.render('pendaftaran/index', {
      title: 'Pendaftaran Warga Baru',
      activeMenu: 'pendaftaran',
      data,
      stats,
      pagination,
      filters: {
        status: req.query.status || '',
        q: req.query.q || '',
      },
    });
  });

  /** GET /pendaftaran/:id — detail satu pendaftaran */
  detail = asyncHandler(async (req, res) => {
    const row = pendaftaranService.detail(req.params.id);
    return res.render('pendaftaran/detail', {
      title: 'Detail Pendaftaran',
      activeMenu: 'pendaftaran',
      row,
    });
  });

  /** POST /pendaftaran/:id/approve */
  approve = asyncHandler(async (req, res) => {
    pendaftaranService.approve(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Pendaftaran disetujui. Akun warga sudah dibuat dan aktif.');
    return res.redirect('/pendaftaran');
  });

  /** POST /pendaftaran/:id/reject */
  reject = asyncHandler(async (req, res) => {
    pendaftaranService.reject(req.params.id, req.session.user, req.body.alasan, req.ip);
    req.flash('success', 'Pendaftaran ditolak. Alasan telah dicatat.');
    return res.redirect('/pendaftaran');
  });

  /** POST /pendaftaran/:id/delete — hapus riwayat (hanya yang sudah diproses) */
  destroy = asyncHandler(async (req, res) => {
    pendaftaranService.remove(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Riwayat pendaftaran dihapus.');
    return res.redirect('/pendaftaran');
  });
}

module.exports = new PendaftaranController();
