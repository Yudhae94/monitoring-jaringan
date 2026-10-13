'use strict';

const { unauthorized } = require('../utils/errors');

/**
 * Memastikan pengguna sudah login.
 */
function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.user) {
    // Untuk request AJAX kirim JSON, halaman biasa redirect ke login
    if (req.xhr || (req.get('accept') || '').includes('application/json')) {
      return next(unauthorized());
    }
    req.flash('error', 'Silakan login terlebih dahulu.');
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
  return next();
}

/**
 * Memastikan pengguna BELUM login (untuk halaman login/registrasi).
 */
function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = { isAuthenticated, isGuest };
