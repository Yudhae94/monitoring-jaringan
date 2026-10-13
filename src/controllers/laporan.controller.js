'use strict';

const { laporanService, kasService, kartuKeluargaService } = require('../services');
const { tahunOptions } = require('../utils/format');

class LaporanController {
  /** GET /laporan */
  index(req, res) {
    const now = new Date();
    const bulan = req.query.bulan || now.getMonth() + 1;
    const tahun = req.query.tahun || now.getFullYear();

    res.render('laporan/index', {
      title: 'Laporan',
      activeMenu: 'laporan',
      ringkasan: laporanService.ringkasan({ bulan, tahun }),
      filters: { bulan, tahun },
      tahunOptions: tahunOptions(5),
      tahun,
    });
  }

  /** GET /laporan/bulanan */
  bulanan(req, res) {
    const now = new Date();
    const bulan = Number(req.query.bulan) || now.getMonth() + 1;
    const tahun = Number(req.query.tahun) || now.getFullYear();

    const laporan = laporanService.bulanan(bulan, tahun);

    res.render('laporan/bulanan', {
      title: laporan.judul,
      activeMenu: 'laporan',
      laporan,
      filters: { bulan, tahun },
      tahunOptions: tahunOptions(5),
    });
  }

  /** GET /laporan/tahunan */
  tahunan(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const laporan = laporanService.tahunan(tahun);

    res.render('laporan/tahunan', {
      title: laporan.judul,
      activeMenu: 'laporan',
      laporan,
      filters: { tahun },
      tahunOptions: tahunOptions(5),
    });
  }

  /** GET /laporan/tunggakan */
  tunggakan(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const laporan = laporanService.tunggakan(tahun);

    res.render('laporan/tunggakan', {
      title: laporan.judul,
      activeMenu: 'laporan',
      laporan,
      filters: { tahun },
      tahunOptions: tahunOptions(5),
    });
  }

  /** GET /laporan/kartu-iuran */
  kartuIuran(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const kkId = req.query.kk_id;

    let kartu = null;
    if (kkId) kartu = laporanService.kartuIuran(kkId, tahun);

    res.render('laporan/kartu-iuran', {
      title: 'Kartu Iuran Warga',
      activeMenu: 'laporan',
      kartu,
      kkOptions: kartuKeluargaService.options(),
      filters: { tahun, kk_id: kkId || '' },
      tahunOptions: tahunOptions(5),
    });
  }

  /** GET /laporan/bulanan/cetak */
  cetakBulanan(req, res) {
    const now = new Date();
    const bulan = Number(req.query.bulan) || now.getMonth() + 1;
    const tahun = Number(req.query.tahun) || now.getFullYear();

    res.render('laporan/cetak-bulanan', {
      layout: false,
      laporan: laporanService.bulanan(bulan, tahun),
      tanggalCetak: new Date(),
    });
  }

  /** GET /laporan/tahunan/cetak */
  cetakTahunan(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();

    res.render('laporan/cetak-tahunan', {
      layout: false,
      laporan: laporanService.tahunan(tahun),
      tanggalCetak: new Date(),
    });
  }

  /** GET /laporan/tunggakan/cetak */
  cetakTunggakan(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();

    res.render('laporan/cetak-tunggakan', {
      layout: false,
      laporan: laporanService.tunggakan(tahun),
      tanggalCetak: new Date(),
    });
  }

  // ======================= API JSON untuk grafik =======================

  /** GET /api/chart/kas?tahun=2026 */
  chartKas(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    res.json({ success: true, data: kasService.rekapBulanan(tahun) });
  }

  /** GET /api/chart/iuran?tahun=2026 */
  chartIuran(req, res) {
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    res.json({ success: true, data: laporanService.tahunan(tahun).rekapIuran });
  }
}

module.exports = new LaporanController();
