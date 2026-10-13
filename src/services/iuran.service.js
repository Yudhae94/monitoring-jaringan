'use strict';

const db = require('../database/connection');
const {
  tagihanRepo, jenisIuranRepo, pembayaranRepo, kartuKeluargaRepo, kasRepo, aktivitasLogRepo,
} = require('../models');
const Validator = require('../utils/validator');
const { badRequest, notFound, conflict, validationError } = require('../utils/errors');

const PERIODE = ['bulanan', 'tahunan', 'insidental'];
const STATUS = ['belum_bayar', 'sebagian', 'lunas'];

/**
 * Service iuran: master jenis iuran, generate tagihan massal, dan pembayaran.
 * Semua operasi keuangan dijalankan dalam satu transaksi DB.
 */
class IuranService {
  constructor() {
    this.tagihanRepo = tagihanRepo;
    this.jenisRepo = jenisIuranRepo;
    this.pembayaranRepo = pembayaranRepo;
    this.kkRepo = kartuKeluargaRepo;
    this.kasRepo = kasRepo;
    this.logRepo = aktivitasLogRepo;
  }

  // =======================================================
  // JENIS IURAN (master)
  // =======================================================

  listJenis() {
    return this.jenisRepo.findAllWithStats();
  }

  findJenis(id) {
    const jenis = this.jenisRepo.findById(id);
    if (!jenis) throw notFound('Jenis iuran tidak ditemukan.');
    return jenis;
  }

  validateJenis(payload) {
    const v = new Validator(payload);
    v.required('nama', 'Nama iuran').maxLength('nama', 80, 'Nama iuran');
    v.required('periode', 'Periode').in('periode', PERIODE, 'Periode');
    v.required('nominal', 'Nominal').numeric('nominal', 'Nominal').minNumber('nominal', 0, 'Nominal');

    if (v.fails()) throw validationError(v.getErrors());
    return payload;
  }

  createJenis(payload, actor, ip) {
    const data = this.validateJenis(payload);
    const jenis = this.jenisRepo.create({
      nama: String(data.nama).trim(),
      periode: data.periode,
      nominal: Number(data.nominal),
      keterangan: data.keterangan || null,
      is_active: 1,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'TAMBAH_JENIS_IURAN', modul: 'iuran',
      deskripsi: `Menambah jenis iuran "${jenis.nama}"`, ip,
    });

    return jenis;
  }

  updateJenis(id, payload, actor, ip) {
    this.findJenis(id);
    const data = this.validateJenis(payload);

    const jenis = this.jenisRepo.update(id, {
      nama: String(data.nama).trim(),
      periode: data.periode,
      nominal: Number(data.nominal),
      keterangan: data.keterangan || null,
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'UBAH_JENIS_IURAN', modul: 'iuran',
      deskripsi: `Mengubah jenis iuran "${jenis.nama}"`, ip,
    });

    return jenis;
  }

  deleteJenis(id, actor, ip) {
    const jenis = this.findJenis(id);

    if (this.jenisRepo.terpakai(id) > 0) {
      // Sudah punya tagihan -> nonaktifkan saja, jangan hapus
      this.jenisRepo.update(id, { is_active: 0 });
      this.logRepo.log({
        userId: actor.id, aksi: 'NONAKTIF_JENIS_IURAN', modul: 'iuran',
        deskripsi: `Menonaktifkan jenis iuran "${jenis.nama}" (masih punya riwayat tagihan)`, ip,
      });
      return { softDeleted: true };
    }

    this.jenisRepo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_JENIS_IURAN', modul: 'iuran',
      deskripsi: `Menghapus jenis iuran "${jenis.nama}"`, ip,
    });
    return { softDeleted: false };
  }

  // =======================================================
  // TAGIHAN
  // =======================================================

  listTagihan(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      kk_id: query.kk_id || null,
      jenis_iuran_id: query.jenis_iuran_id || null,
      periode_bulan: query.periode_bulan || null,
      periode_tahun: query.periode_tahun || null,
      status: query.status || null,
    };

    const data = this.tagihanRepo.findAllFiltered({ ...filters, limit, offset: (page - 1) * limit });
    const total = this.tagihanRepo.countFiltered(filters);

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

  findTagihan(id) {
    const tagihan = this.tagihanRepo.findDetail(id);
    if (!tagihan) throw notFound('Tagihan tidak ditemukan.');
    tagihan.riwayat = this.pembayaranRepo.findByTagihan(id);
    return tagihan;
  }

  /**
   * Membuat tagihan massal untuk semua KK aktif pada periode tertentu.
   * Idempotent: KK yang sudah punya tagihan di periode itu dilewati.
   */
  generateTagihan({ jenis_iuran_id, periode_bulan, periode_tahun, jatuh_tempo }, actor, ip) {
    const v = new Validator({ jenis_iuran_id, periode_bulan, periode_tahun });
    v.required('jenis_iuran_id', 'Jenis iuran').numeric('jenis_iuran_id', 'Jenis iuran');
    v.required('periode_bulan', 'Bulan').numeric('periode_bulan', 'Bulan');
    v.required('periode_tahun', 'Tahun').numeric('periode_tahun', 'Tahun');
    if (v.fails()) throw validationError(v.getErrors());

    const bulan = Number(periode_bulan);
    const tahun = Number(periode_tahun);

    if (bulan < 1 || bulan > 12) {
      throw validationError({ periode_bulan: 'Bulan harus antara 1 sampai 12.' });
    }

    const jenis = this.findJenis(Number(jenis_iuran_id));
    const kkList = this.kkRepo.optionsAll();

    if (!kkList.length) {
      throw badRequest('Belum ada Kartu Keluarga aktif. Tambahkan data KK terlebih dahulu.');
    }

    const jatuhTempoDefault = jatuh_tempo || `${tahun}-${String(bulan).padStart(2, '0')}-10`;
    let dibuat = 0;
    let dilewati = 0;

    db.transaction(() => {
      for (const kk of kkList) {
        const ada = this.tagihanRepo.findByKkAndPeriode(kk.id, jenis.id, bulan, tahun);
        if (ada) {
          dilewati += 1;
          continue;
        }

        this.tagihanRepo.create({
          kk_id: kk.id,
          jenis_iuran_id: jenis.id,
          periode_bulan: bulan,
          periode_tahun: tahun,
          nominal: jenis.nominal,
          terbayar: 0,
          status: 'belum_bayar',
          jatuh_tempo: jatuhTempoDefault,
        });
        dibuat += 1;
      }
    });

    this.logRepo.log({
      userId: actor.id,
      aksi: 'GENERATE_TAGIHAN',
      modul: 'iuran',
      deskripsi: `Generate tagihan "${jenis.nama}" periode ${bulan}/${tahun}: ${dibuat} dibuat, ${dilewati} dilewati`,
      ip,
    });

    return { dibuat, dilewati, total_kk: kkList.length, jenis, bulan, tahun };
  }

  deleteTagihan(id, actor, ip) {
    const tagihan = this.tagihanRepo.findDetail(id);
    if (!tagihan) throw notFound('Tagihan tidak ditemukan.');
    if (tagihan.terbayar > 0) {
      throw badRequest('Tagihan yang sudah memiliki pembayaran tidak dapat dihapus. Batalkan pembayarannya terlebih dahulu.');
    }

    this.tagihanRepo.delete(id);
    this.logRepo.log({
      userId: actor.id, aksi: 'HAPUS_TAGIHAN', modul: 'iuran',
      deskripsi: `Menghapus tagihan ${tagihan.jenis_nama} ${tagihan.periode_bulan}/${tagihan.periode_tahun} - ${tagihan.kepala_keluarga}`,
      ip,
    });
    return true;
  }

  // =======================================================
  // PEMBAYARAN
  // =======================================================

  listPembayaran(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = 10;
    const filters = {
      q: query.q || null,
      kk_id: query.kk_id || null,
      method: query.method || null,
      tanggal_dari: query.tanggal_dari || null,
      tanggal_sampai: query.tanggal_sampai || null,
    };

    const data = this.pembayaranRepo.findAllFiltered({ ...filters, limit, offset: (page - 1) * limit });
    const total = this.pembayaranRepo.countFiltered(filters);

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

  /**
   * Mencatat pembayaran iuran.
   * Otomatis: update `terbayar` + `status` tagihan,
   * dan mencatat pemasukan ke kas RT dalam transaksi yang sama.
   */
  bayar(payload, actor, ip) {
    const v = new Validator(payload);
    v.required('tagihan_id', 'Tagihan').numeric('tagihan_id', 'Tagihan');
    v.required('nominal', 'Nominal').numeric('nominal', 'Nominal').minNumber('nominal', 1, 'Nominal');
    v.required('tanggal', 'Tanggal').date('tanggal', 'Tanggal');
    v.in('method', ['cash', 'transfer'], 'Metode pembayaran');
    if (v.fails()) throw validationError(v.getErrors());

    const tagihan = this.tagihanRepo.findDetail(Number(payload.tagihan_id));
    if (!tagihan) throw notFound('Tagihan tidak ditemukan.');

    const nominal = Number(payload.nominal);
    const sisa = Number(tagihan.nominal) - Number(tagihan.terbayar);

    if (sisa <= 0) throw conflict('Tagihan ini sudah lunas.');
    if (nominal > sisa) {
      throw validationError({
        nominal: `Nominal melebihi sisa tagihan. Sisa yang harus dibayar: ${sisa}.`,
      });
    }

    const method = payload.method || 'cash';
    const tanggal = payload.tanggal;
    const keterangan = payload.keterangan || `Pembayaran ${tagihan.jenis_nama} periode ${tagihan.periode_bulan}/${tagihan.periode_tahun}`;

    let pembayaranId = null;
    let terbayarBaru = 0;
    let statusBaru = 'belum_bayar';

    db.transaction(() => {
      pembayaranId = this.pembayaranRepo.create({
        tagihan_id: tagihan.id,
        kk_id: tagihan.kk_id,
        tanggal,
        nominal,
        method,
        no_referensi: payload.no_referensi || null,
        dicatat_oleh: actor.id,
        keterangan,
      }).id;

      terbayarBaru = Number(tagihan.terbayar) + nominal;
      statusBaru = terbayarBaru >= Number(tagihan.nominal) ? 'lunas' : 'sebagian';

      this.tagihanRepo.updateTerbayar(tagihan.id, terbayarBaru, statusBaru);

      this.kasRepo.syncFromPembayaran(pembayaranId, {
        tanggal,
        nominal,
        keterangan: `Iuran ${tagihan.jenis_nama} - ${tagihan.kepala_keluarga} (${tagihan.periode_bulan}/${tagihan.periode_tahun})`,
        userId: actor.id,
      });
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'PEMBAYARAN', modul: 'iuran',
      deskripsi: `Pembayaran ${nominal} untuk tagihan #${tagihan.id} (${tagihan.kepala_keluarga}) - status: ${statusBaru}`,
      ip,
    });

    return {
      pembayaran: this.pembayaranRepo.findDetail(pembayaranId),
      terbayar: terbayarBaru,
      status: statusBaru,
    };
  }

  /** Batalkan pembayaran: kurangi terbayar, hapus kas terkait */
  batalkanPembayaran(id, actor, ip) {
    const pembayaran = this.pembayaranRepo.findDetail(id);
    if (!pembayaran) throw notFound('Data pembayaran tidak ditemukan.');

    const tagihan = this.tagihanRepo.findById(pembayaran.tagihan_id);
    if (!tagihan) throw notFound('Tagihan tidak ditemukan.');

    let terbayarBaru = 0;
    let statusBaru = 'belum_bayar';

    db.transaction(() => {
      terbayarBaru = Math.max(0, Number(tagihan.terbayar) - Number(pembayaran.nominal));
      statusBaru = terbayarBaru === 0
        ? 'belum_bayar'
        : (terbayarBaru >= Number(tagihan.nominal) ? 'lunas' : 'sebagian');

      this.kasRepo.removeByPembayaran(id);
      this.pembayaranRepo.delete(id);
      this.tagihanRepo.updateTerbayar(tagihan.id, terbayarBaru, statusBaru);
    });

    this.logRepo.log({
      userId: actor.id, aksi: 'BATAL_PEMBAYARAN', modul: 'iuran',
      deskripsi: `Membatalkan pembayaran #${id} (${pembayaran.nominal}) - ${pembayaran.kepala_keluarga}`,
      ip,
    });

    return { terbayar: terbayarBaru, status: statusBaru };
  }

  // =======================================================
  // STATISTIK & LAPORAN
  // =======================================================

  summary(bulan, tahun) {
    const s = this.tagihanRepo.summary({
      periode_bulan: bulan || null,
      periode_tahun: tahun || null,
    });

    const persentase = s.total_nominal > 0
      ? Math.round((s.total_terbayar / s.total_nominal) * 100)
      : 0;

    return { ...s, persentase };
  }

  rekapBulanan(tahun) {
    return this.tagihanRepo.rekapBulanan(tahun);
  }

  tunggakan(tahun) {
    return this.tagihanRepo.tunggakanPerKK(tahun);
  }

  /** Tagihan milik seorang warga (dipakai role warga) */
  tagihanSaya(userId) {
    const warga = require('./warga.service').findByUserId(userId);
    if (!warga) return { warga: null, tagihan: [], summary: null, pembayaran: [] };

    const tagihan = this.tagihanRepo.findByKK(warga.kk_id);
    const lunas = tagihan.filter((t) => t.status === 'lunas').length;
    const belum = tagihan.filter((t) => t.status !== 'lunas');

    return {
      warga,
      tagihan,
      pembayaran: this.pembayaranRepo.findAllFiltered({ kk_id: warga.kk_id, limit: 20 }),
      summary: {
        total_tagihan: tagihan.length,
        lunas,
        belum: belum.length,
        total_tunggakan: belum.reduce((sum, t) => sum + (t.nominal - t.terbayar), 0),
        persentase: tagihan.length ? Math.round((lunas / tagihan.length) * 100) : 0,
      },
    };
  }

  consts() {
    return { PERIODE, STATUS };
  }
}

module.exports = new IuranService();
