'use strict';

const { iuranService, kartuKeluargaService } = require('../services');
const { tahunOptions } = require('../utils/format');

class IuranController {
  // ======================= JENIS IURAN =======================

  /** GET /iuran/jenis */
  jenisIndex(req, res) {
    res.render('iuran/jenis', {
      title: 'Jenis Iuran',
      activeMenu: 'iuran',
      jenisList: iuranService.listJenis(),
    });
  }

  /** POST /iuran/jenis */
  jenisStore(req, res) {
    iuranService.createJenis(req.body, req.session.user, req.ip);
    req.flash('success', 'Jenis iuran berhasil ditambahkan.');
    res.redirect('/iuran/jenis');
  }

  /** PUT /iuran/jenis/:id */
  jenisUpdate(req, res) {
    iuranService.updateJenis(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Jenis iuran berhasil diperbarui.');
    res.redirect('/iuran/jenis');
  }

  /** DELETE /iuran/jenis/:id */
  jenisDestroy(req, res) {
    const hasil = iuranService.deleteJenis(req.params.id, req.session.user, req.ip);
    req.flash(
      'success',
      hasil.softDeleted
        ? 'Jenis iuran dinonaktifkan karena masih memiliki riwayat tagihan.'
        : 'Jenis iuran berhasil dihapus.'
    );
    res.redirect('/iuran/jenis');
  }

  // ======================= TAGIHAN =======================

  /** GET /iuran/tagihan */
  tagihanIndex(req, res) {
    const { data, pagination } = iuranService.listTagihan(req.query);
    const bulan = req.query.periode_bulan || '';
    const tahun = req.query.periode_tahun || new Date().getFullYear();

    res.render('iuran/tagihan', {
      title: 'Tagihan Iuran',
      activeMenu: 'iuran',
      data,
      pagination,
      filters: {
        q: req.query.q || '',
        kk_id: req.query.kk_id || '',
        jenis_iuran_id: req.query.jenis_iuran_id || '',
        periode_bulan: bulan,
        periode_tahun: req.query.periode_tahun || '',
        status: req.query.status || '',
      },
      jenisOptions: iuranService.jenisRepo.optionsAll(),
      kkOptions: kartuKeluargaService.options(),
      tahunOptions: tahunOptions(5),
      summary: iuranService.summary(bulan, req.query.periode_tahun || null),
      consts: iuranService.consts(),
    });
  }

  /** GET /iuran/tagihan/:id */
  tagihanShow(req, res) {
    const tagihan = iuranService.findTagihan(req.params.id);

    res.render('iuran/tagihan-detail', {
      title: `Tagihan — ${tagihan.kepala_keluarga}`,
      activeMenu: 'iuran',
      tagihan,
      consts: iuranService.consts(),
    });
  }

  /** GET /iuran/generate */
  generateForm(req, res) {
    res.render('iuran/generate', {
      title: 'Generate Tagihan Massal',
      activeMenu: 'iuran',
      jenisOptions: iuranService.jenisRepo.optionsAll(),
      tahunOptions: tahunOptions(5),
      defaultTahun: new Date().getFullYear(),
      defaultBulan: new Date().getMonth() + 1,
    });
  }

  /** POST /iuran/generate */
  generateStore(req, res) {
    const hasil = iuranService.generateTagihan(req.body, req.session.user, req.ip);

    req.flash(
      'success',
      `Generate tagihan "${hasil.jenis.nama}" berhasil: ${hasil.dibuat} tagihan dibuat, ${hasil.dilewati} dilewati (sudah ada).`
    );
    res.redirect(`/iuran/tagihan?jenis_iuran_id=${hasil.jenis.id}&periode_bulan=${hasil.bulan}&periode_tahun=${hasil.tahun}`);
  }

  /** DELETE /iuran/tagihan/:id */
  tagihanDestroy(req, res) {
    iuranService.deleteTagihan(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Tagihan berhasil dihapus.');
    res.redirect('/iuran/tagihan');
  }

  // ======================= PEMBAYARAN =======================

  /** GET /iuran/pembayaran */
  pembayaranIndex(req, res) {
    const { data, pagination } = iuranService.listPembayaran(req.query);

    res.render('iuran/pembayaran', {
      title: 'Pembayaran Iuran',
      activeMenu: 'iuran',
      data,
      pagination,
      filters: {
        q: req.query.q || '',
        kk_id: req.query.kk_id || '',
        method: req.query.method || '',
        tanggal_dari: req.query.tanggal_dari || '',
        tanggal_sampai: req.query.tanggal_sampai || '',
      },
      kkOptions: kartuKeluargaService.options(),
    });
  }

  /** POST /iuran/pembayaran */
  pembayaranStore(req, res) {
    const hasil = iuranService.bayar(req.body, req.session.user, req.ip);

    req.flash(
      'success',
      `Pembayaran sebesar ${require('../utils/format').rupiah(hasil.pembayaran.nominal)} berhasil dicatat. Status tagihan: ${hasil.status.replace('_', ' ')}.`
    );
    res.redirect(`/iuran/tagihan/${req.body.tagihan_id}`);
  }

  /** DELETE /iuran/pembayaran/:id */
  pembayaranDestroy(req, res) {
    iuranService.batalkanPembayaran(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Pembayaran dibatalkan dan saldo kas disesuaikan.');
    res.redirect('/iuran/pembayaran');
  }
}

module.exports = new IuranController();
