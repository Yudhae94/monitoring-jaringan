'use strict';

const appConfig = require('./app');

/**
 * Konfigurasi session & flash message.
 */
module.exports = {
  name: 'simrt.sid',
  secret: process.env.SESSION_SECRET || 'sim-rt-dev-secret-jangan-dipakai-di-produksi',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: appConfig.env === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8 jam
  },
};
