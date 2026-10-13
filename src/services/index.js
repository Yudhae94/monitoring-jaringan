'use strict';

/**
 * Barrel export seluruh service.
 * Controller hanya mengimpor dari sini.
 */
module.exports = {
  authService: require('./auth.service'),
  userService: require('./user.service'),
  kartuKeluargaService: require('./kartu-keluarga.service'),
  wargaService: require('./warga.service'),
  iuranService: require('./iuran.service'),
  kasService: require('./kas.service'),
  suratService: require('./surat.service'),
  pengumumanService: require('./pengumuman.service'),
  dashboardService: require('./dashboard.service'),
  laporanService: require('./laporan.service'),
  pendaftaranService: require('./pendaftaran.service'),
};
