'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const userRoutes = require('./user.routes');
const kartuKeluargaRoutes = require('./kartu-keluarga.routes');
const wargaRoutes = require('./warga.routes');
const iuranRoutes = require('./iuran.routes');
const kasRoutes = require('./kas.routes');
const suratRoutes = require('./surat.routes');
const pengumumanRoutes = require('./pengumuman.routes');
const laporanRoutes = require('./laporan.routes');
const pendaftaranRoutes = require('./pendaftaran.routes');
const apiRoutes = require('./api.routes');

/**
 * Menggabungkan seluruh route modular aplikasi.
 * Setiap modul punya file sendiri agar mudah dimaintain.
 */
function registerRoutes(app) {
  app.use('/', authRoutes); // /login, /logout, /profil
  app.use('/', pendaftaranRoutes); // /daftar (publik), /pendaftaran (admin)
  app.use('/', dashboardRoutes); // /, /dashboard
  app.use('/users', userRoutes);
  app.use('/kartu-keluarga', kartuKeluargaRoutes);
  app.use('/warga', wargaRoutes);
  app.use('/iuran', iuranRoutes);
  app.use('/kas', kasRoutes);
  app.use('/surat', suratRoutes);
  app.use('/pengumuman', pengumumanRoutes);
  app.use('/laporan', laporanRoutes);
  app.use('/api', apiRoutes);

  return app;
}

module.exports = { registerRoutes };
