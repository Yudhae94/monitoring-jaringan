'use strict';

const appConfig = require('../config/app');
const { HttpError } = require('../utils/errors');

/**
 * Penangkap error terpusat — selalu dipasang paling akhir.
 *
 * - Request API/AJAX  -> response JSON
 * - Request halaman   -> render halaman error
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error(`\n[ERROR ${status}] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err.message);
  }

  const wantsJson =
    req.xhr ||
    (req.get('accept') || '').includes('application/json') ||
    req.originalUrl.startsWith('/api/');

  if (wantsJson) {
    return res.status(status).json({
      success: false,
      message: isServerError && appConfig.env === 'production'
        ? 'Terjadi kesalahan pada server.'
        : err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  const view = status === 404 ? 'errors/404' : (status === 403 ? 'errors/403' : 'errors/500');

  return res.status(status).render(view, {
    title: `${status} - ${err.message}`,
    layout: 'layouts/auth',
    // localsMiddleware mungkin belum sempat jalan (mis. error sebelum
    // middleware tersebut), jadi pastikan app/rt selalu tersedia.
    app: res.locals.app || appConfig,
    rt: res.locals.rt || appConfig.rt,
    fmt: res.locals.fmt,
    currentUser: res.locals.currentUser || null,
    currentPath: req.path,
    pesan: isServerError && appConfig.env === 'production'
      ? 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.'
      : err.message,
    error: appConfig.env === 'development' ? err : null,
  });
}

/**
 * Penangkap route yang tidak ada -> diteruskan ke errorHandler sebagai 404.
 */
function notFoundHandler(req, res, next) {
  // Biarkan route /api/* dijawab JSON
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
    });
  }

  return next(new HttpError(404, `Halaman "${req.originalUrl}" tidak ditemukan.`));
}

module.exports = { errorHandler, notFoundHandler };
