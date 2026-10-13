'use strict';

const {
  wargaRepo, kartuKeluargaRepo, pembayaranRepo, tagihanRepo,
  kasRepo, pengajuanSuratRepo, pengumumanRepo, userRepo, aktivitasLogRepo,
} = require('../models');

/**
 * Service dashboard: menyusun seluruh statistik yang ditampilkan
 * di halaman utama, disesuaikan dengan role pengguna.
 */
class DashboardService {
  constructor() {
    this.wargaRepo = wargaRepo;
    this.kkRepo = kartuKeluargaRepo;
    this.tagihanRepo = tagihanRepo;
    this.pembayaranRepo = pembayaranRepo;
    this.kasRepo = kasRepo;
    this.suratRepo = pengajuanSuratRepo;
    this.pengumumanRepo = pengumumanRepo;
    this.userRepo = userRepo;
    this.logRepo = aktivitasLogRepo;
  }

  /**
   * Dashboard admin & bendahara: ringkasan menyeluruh.
   */
  forPengurus() {
    const now = new Date();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();

    const totalKK = this.kkRepo.countFiltered({});
    const jumlahWarga = this.wargaRepo.stats().total;

    const tagihanBulanIni = this.tagihanRepo.summary({ periode_bulan: bulan, periode_tahun: tahun });
    const tagihanTahunIni = this.tagihanRepo.summary({ periode_tahun: tahun });

    const kasBulanIni = this.kasRepo.summary({ bulan, tahun });
    const kasTahunIni = this.kasRepo.summary({ tahun });

    const surat = (() => {
      const rows = this.suratRepo.countByStatus();
      const map = Object.fromEntries(rows.map((r) => [r.status, r.jumlah]));
      return {
        total: rows.reduce((s, r) => s + r.jumlah, 0),
        menunggu: map.menunggu || 0,
        diproses: map.diproses || 0,
        disetujui: map.disetujui || 0,
        ditolak: map.ditolak || 0,
        selesai: map.selesai || 0,
      };
    })();

    const pembayaranHariIni = this.pembayaranRepo.totalHariIni();

    const stats = {
      totalKK,
      jumlahWarga,
      tagihanBulanIni: {
        ...tagihanBulanIni,
        persentase: tagihanBulanIni.total_nominal > 0
          ? Math.round((tagihanBulanIni.total_terbayar / tagihanBulanIni.total_nominal) * 100)
          : 0,
      },
      tagihanTahunIni,
      kasBulanIni,
      kasTahunIni,
      surat,
      pembayaranHariIni,
    };

    return {
      stats,
      rekapKas: this.kasRepo.rekapBulanan(tahun),
      rekapIuran: this.tagihanRepo.rekapBulanan(tahun),
      pengeluaranKategori: this.kasRepo.byKategori('keluar', { tahun }),
      tunggakan: this.tagihanRepo.tunggakanPerKK(tahun).slice(0, 5),
      pembayaranTerbaru: this.pembayaranRepo.latest(5),
      kasTerbaru: this.kasRepo.latest(5),
      suratTerbaru: this.suratRepo.latest(5),
      pengumuman: this.pengumumanRepo.findPublished(4),
      aktivitas: this.logRepo.latest(6),
      demografi: this.wargaRepo.stats(),
      periode: { bulan, tahun },
    };
  }

  /**
   * Dashboard warga: hanya informasi miliknya sendiri.
   */
  forWarga(user) {
    const now = new Date();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();

    const warga = this.wargaRepo.db.get(
      `SELECT w.*, kk.no_kk, kk.kepala_keluarga, kk.alamat, kk.no_rumah, kk.status_rumah
         FROM users u
         JOIN warga w           ON w.id  = u.warga_id
         JOIN kartu_keluarga kk ON kk.id = w.kk_id
        WHERE u.id = ?`,
      [user.id]
    );

    if (!warga) {
      return {
        warga: null,
        tagihan: [],
        pembayaran: [],
        stats: null,
        pengumuman: this.pengumumanRepo.findPublished(5),
        suratSaya: this.suratRepo.latest(5, user.id),
        periode: { bulan, tahun },
      };
    }

    const tagihan = this.tagihanRepo.findByKK(warga.kk_id);
    const belum = tagihan.filter((t) => t.status !== 'lunas');
    const bulanIni = tagihan.filter((t) => t.periode_bulan === bulan && t.periode_tahun === tahun);

    const stats = {
      total_tagihan: tagihan.length,
      lunas: tagihan.length - belum.length,
      belum: belum.length,
      total_tunggakan: belum.reduce((sum, t) => sum + (t.nominal - t.terbayar), 0),
      status_bulan_ini: bulanIni.length === 0
        ? 'tidak_ada'
        : (bulanIni.every((t) => t.status === 'lunas') ? 'lunas' : 'belum_lunas'),
      persentase: tagihan.length
        ? Math.round(((tagihan.length - belum.length) / tagihan.length) * 100)
        : 0,
    };

    return {
      warga,
      tagihan: tagihan.slice(0, 6),
      tagihanBelum: belum.slice(0, 6),
      pembayaran: this.pembayaranRepo.findAllFiltered({ kk_id: warga.kk_id, limit: 5 }),
      stats,
      pengumuman: this.pengumumanRepo.findPublished(5),
      suratSaya: this.suratRepo.latest(5, user.id),
      periode: { bulan, tahun },
    };
  }

  /** Ringkasan singkat untuk halaman laporan */
  forLaporan({ bulan, tahun }) {
    return {
      iuran: this.tagihanRepo.summary({
        periode_bulan: bulan || null,
        periode_tahun: tahun || null,
      }),
      kas: this.kasRepo.summary({ bulan: bulan || null, tahun: tahun || null }),
      pengeluaranKategori: this.kasRepo.byKategori('keluar', { bulan: bulan || null, tahun }),
      pemasukanKategori: this.kasRepo.byKategori('masuk', { bulan: bulan || null, tahun }),
      rekapKas: this.kasRepo.rekapBulanan(tahun),
      rekapIuran: this.tagihanRepo.rekapBulanan(tahun),
      tunggakan: this.tagihanRepo.tunggakanPerKK(tahun),
      periode: { bulan, tahun },
    };
  }
}

module.exports = new DashboardService();
