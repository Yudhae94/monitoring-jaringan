'use strict';

/**
 * Helper response terstandar.
 */

/** Response JSON sukses */
function ok(res, data = null, message = 'Berhasil', meta = null) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta) body.meta = meta;
  return res.json(body);
}

/** Response JSON gagal */
function fail(res, message = 'Terjadi kesalahan', status = 400, details = null) {
  const body = { success: false, message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

/** Redirect + flash message */
function redirectWithFlash(res, url, type, message) {
  res.flash(type, message);
  return res.redirect(url);
}

module.exports = { ok, fail, redirectWithFlash };
