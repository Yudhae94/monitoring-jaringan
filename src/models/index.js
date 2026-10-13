'use strict';

/**
 * Barrel export seluruh repository.
 * Pemakaian: const { userRepo, wargaRepo } = require('../models');
 */
module.exports = {
  userRepo: require('./user.repository'),
  kartuKeluargaRepo: require('./kartu-keluarga.repository'),
  wargaRepo: require('./warga.repository'),
  jenisIuranRepo: require('./jenis-iuran.repository'),
  tagihanRepo: require('./tagihan.repository'),
  pembayaranRepo: require('./pembayaran.repository'),
  kasRepo: require('./kas.repository'),
  kategoriKasRepo: require('./kategori-kas.repository'),
  jenisSuratRepo: require('./jenis-surat.repository'),
  pengajuanSuratRepo: require('./pengajuan-surat.repository'),
  pengumumanRepo: require('./pengumuman.repository'),
  pendaftaranRepo: require('./pendaftaran.repository'),
  aktivitasLogRepo: require('./aktivitas-log.repository'),
};
