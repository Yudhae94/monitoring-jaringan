'use strict';

require('dotenv').config();

const path = require('path');
const rootPath = path.resolve(__dirname, '..', '..');

/**
 * Konfigurasi aplikasi terpusat.
 * Semua nilai yang bisa berubah diambil dari .env (lihat .env.example).
 */
const appConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  name: 'SIM-RT',
  fullName: 'Sistem Informasi Manajemen RT',

  paths: {
    root: rootPath,
    src: path.join(rootPath, 'src'),
    data: path.join(rootPath, 'data'),
    uploads: path.join(rootPath, 'data', 'uploads'),
    views: path.join(rootPath, 'src', 'views'),
    public: path.join(rootPath, 'public'),
    database: path.join(rootPath, 'data', 'simrt.db'),
  },

  rt: {
    // Nama kompleks / condominium yang menggantikan sebutan "RT xx / RW yy"
    nama: process.env.RT_NAMA || 'PRIME PANORAMA VILLAGE',
    number: process.env.RT_NUMBER || '05',
    rw: process.env.RW_NUMBER || '02',
    kelurahan: process.env.RT_KELURAHAN || 'Karawang Wetan',
    kecamatan: process.env.RT_KECAMATAN || 'Karawang Timur',
    kota: process.env.RT_KOTA || 'Karawang',
    provinsi: process.env.RT_PROVINSI || 'Jawa Barat',
    kodePos: process.env.RT_KODE_POS || '16415',
    alamat: process.env.RT_ALAMAT || 'Jl. Melati Raya No. 12',
    ketua: process.env.RT_KETUA || 'H. Ahmad Suryana',
    sekretaris: process.env.RT_SEKRETARIS || 'Budi Santoso',
    bendahara: process.env.RT_BENDAHARA || 'Siti Aminah',
  },

  iuran: {
    defaultNominal: parseInt(process.env.IURAN_DEFAULT, 10) || 50000,
  },

  upload: {
    maxSize: 2 * 1024 * 1024, // 2 MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  pagination: {
    perPage: 10,
  },
};

/** Nama brand yang tampil di UI: "PRIME PANORAMA VILLAGE" */
appConfig.rt.label = appConfig.rt.nama;

/** Sebutan unit lama (RT 05 / RW 02) — dipakai pada nomor surat & data KK */
appConfig.rt.unitLabel = `RT ${appConfig.rt.number} / RW ${appConfig.rt.rw}`;

/** Alamat lengkap satu baris untuk kop surat */
appConfig.rt.fullAddress = [
  appConfig.rt.nama,
  `Kel. ${appConfig.rt.kelurahan}`,
  `Kec. ${appConfig.rt.kecamatan}`,
  appConfig.rt.kota,
  appConfig.rt.provinsi,
  appConfig.rt.kodePos,
].join(', ');

module.exports = appConfig;
