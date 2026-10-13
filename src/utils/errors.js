'use strict';

/**
 * Error yang membawa status HTTP, ditangkap oleh errorHandler.
 * Contoh: throw new HttpError(404, 'Data tidak ditemukan')
 */
class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg = 'Permintaan tidak valid', details) => new HttpError(400, msg, details);
const unauthorized = (msg = 'Anda harus login terlebih dahulu') => new HttpError(401, msg);
const forbidden = (msg = 'Anda tidak memiliki akses ke halaman ini') => new HttpError(403, msg);
const notFound = (msg = 'Data tidak ditemukan') => new HttpError(404, msg);
const conflict = (msg = 'Data sudah ada', details) => new HttpError(409, msg, details);
const validationError = (details) => new HttpError(422, 'Data yang dikirim tidak valid', details);

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
};
