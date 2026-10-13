'use strict';

const { kasRepo, tagihanRepo, pembayaranRepo, kartuKeluargaRepo } = require('../models');
const { namaBulan } = require('../utils/format');
const appConfig = require('../config/app');

/**
 * Service laporan: menyusun data siap-cetak untuk laporan
 * keuangan bulanan/tahunan dan rekap tunggakan.
 */
class LaporanService {
  constructor() {
    this.kasRepo = kasRepo;
    this.tagihanRepo = tagihanRepo;
    this.pembayaranRepo = pembayaranRepo;
    this.kkRepo = kartuKeluargaRepo;
  }

  /**
   * Laporan bulanan: pemasukan, pengeluaran, saldo, dan tunggakan.
   */
  bulanan(bulan, tahun) {
    const b = Number(bulan);
    const t = Number(tahun);

    const kas = this.kasRepo.summary({ bulan: b, tahun: t });
    const kasSebelumnya = this.kasSebelumnya(b, t);
    const iuran = this.tagihanRepo.summary({ periode_bulan: b, periode_tahun: t });

    return {
      tipe: 'bulanan',
      periode: { bulan: b, tahun: t },
      judul: `Laporan Keuangan Bulan ${namaBulan(b)} ${t}`,
      kas,
      saldoAwal: kasSebelumnya,
      saldoAkhir: kasSebelumnya + kas.saldo,
      iuran,
      rincian: this.kasRepo.findAllFiltered({ bulan: b, tahun: t, limit: 1000, offset: 0 }),
      pemasukanKategori: this.kasRepo.byKategori('masuk', { bulan: b, tahun: t }),
      pengeluaranKategori: this.kasRepo.byKategori('keluar', { bulan: b, tahun: t }),
      pembayaran: this.pembayaranRepo.findAllFiltered({
        tanggal_dari: `${t}-${String(b).padStart(2, '0')}-01`,
        tanggal_sampai: `${t}-${String(b).padStart(2, '0')}-31`,
        limit: 1000,
        offset: 0,
      }),
      rt: appConfig.rt,
    };
  }

  /** Saldo akhir bulan sebelum periode terpilih */
  kasSebelumnya(bulan, tahun) {
    const akhirBulanLalu = new Date(tahun, bulan - 1, 1); // tanggal 1 bulan ini, minus 1 hari efektif
    akhirBulanLalu.setDate(0);
    const batas = akhirBulanLalu.toISOString().slice(0, 10);

    const row = this.kasRepo.db.get(
      `SELECT COALESCE(SUM(CASE WHEN tipe='masuk' THEN nominal ELSE -nominal END), 0) AS saldo
         FROM transaksi_kas WHERE tanggal <= ?`,
      [batas]
    );
    return row.saldo;
  }

  /**
   * Laporan tahunan: rekap 12 bulan + total.
   */
  tahunan(tahun) {
    const t = Number(tahun);
    const rekapKas = this.kasRepo.rekapBulanan(t);
    const rekapIuran = this.tagihanRepo.rekapBulanan(t);
    const total = this.kasRepo.summary({ tahun: t });
    const iuranTotal = this.tagihanRepo.summary({ periode_tahun: t });

    return {
      tipe: 'tahunan',
      periode: { tahun: t },
      judul: `Laporan Keuangan Tahun ${t}`,
      rekapKas,
      rekapIuran,
      total,
      iuranTotal,
      pemasukanKategori: this.kasRepo.byKategori('masuk', { tahun: t }),
      pengeluaranKategori: this.kasRepo.byKategori('keluar', { tahun: t }),
      tunggakan: this.tagihanRepo.tunggakanPerKK(t),
      rt: appConfig.rt,
    };
  }

  /**
   * Laporan tunggakan iuran.
   */
  tunggakan(tahun) {
    const t = Number(tahun);
    const data = this.tagihanRepo.tunggakanPerKK(t);
    const total = data.reduce((sum, r) => sum + (r.total_tunggakan || 0), 0);

    return {
      tipe: 'tunggakan',
      periode: { tahun: t },
      judul: `Laporan Tunggakan Iuran Tahun ${t}`,
      data,
      total,
      jumlahKK: data.length,
      rt: appConfig.rt,
    };
  }

  /**
   * Rekap iuran per KK (untuk cetak kartu iuran).
   */
  kartuIuran(kkId, tahun) {
    const t = Number(tahun);
    const kk = this.kkRepo.findWithCounts(kkId);
    if (!kk) return null;

    const tagihan = this.tagihanRepo.findByKK(kkId, t);

    // Susun matriks bulan x jenis iuran
    const jenisMap = new Map();
    const matriks = Array.from({ length: 12 }, () => ({}));

    for (const tg of tagihan) {
      if (!jenisMap.has(tg.jenis_iuran_id)) {
        jenisMap.set(tg.jenis_iuran_id, tg.jenis_nama);
      }
      matriks[tg.periode_bulan - 1][tg.jenis_iuran_id] = {
        nominal: tg.nominal,
        terbayar: tg.terbayar,
        status: tg.status,
      };
    }

    const totalNominal = tagihan.reduce((s, x) => s + x.nominal, 0);
    const totalTerbayar = tagihan.reduce((s, x) => s + x.terbayar, 0);

    return {
      tipe: 'kartu_iuran',
      kk,
      tahun: t,
      jenis: Array.from(jenisMap.entries()).map(([id, nama]) => ({ id, nama })),
      matriks,
      totalNominal,
      totalTerbayar,
      tunggakan: totalNominal - totalTerbayar,
      rt: appConfig.rt,
    };
  }

  /** Data untuk halaman laporan (tanpa cetak) */
  ringkasan({ bulan, tahun }) {
    return {
      iuran: this.tagihanRepo.summary({
        periode_bulan: bulan || null,
        periode_tahun: tahun || null,
      }),
      kas: this.kasRepo.summary({ bulan: bulan || null, tahun: tahun || null }),
      rekapKas: this.kasRepo.rekapBulanan(tahun),
      rekapIuran: this.tagihanRepo.rekapBulanan(tahun),
      pengeluaranKategori: this.kasRepo.byKategori('keluar', { bulan: bulan || null, tahun }),
      pemasukanKategori: this.kasRepo.byKategori('masuk', { bulan: bulan || null, tahun }),
      tunggakan: this.tagihanRepo.tunggakanPerKK(tahun),
    };
  }
}

module.exports = new LaporanService();
