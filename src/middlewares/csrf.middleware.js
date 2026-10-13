'use strict';

const crypto = require('crypto');

/**
 * CSRF protection sederhana berbasis session (token-per-session).
 * Token disuntikkan ke semua form lewat helper `csrfField`.
 */
function csrfProtection(req, res, next) {
  // Buat token bila belum ada
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;

  // Hanya periksa method yang mengubah data
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.body && (req.body._csrf || req.body.csrf_token);
    const headerToken = req.get('x-csrf-token');
    const dikirim = token || headerToken;

    if (!dikirim || dikirim !== req.session.csrfToken) {
      const err = new Error('Token keamanan (CSRF) tidak valid. Silakan muat ulang halaman.');
      err.status = 403;
      return next(err);
    }
  }

  return next();
}

module.exports = { csrfProtection };
