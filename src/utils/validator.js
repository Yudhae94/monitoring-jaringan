'use strict';

/**
 * Validator ringan tanpa dependensi eksternal.
 * Setiap method mengembalikan array pesan error (kosong = valid).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NIK_RE = /^\d{16}$/;
const NO_KK_RE = /^\d{16}$/;
const PHONE_RE = /^[0-9+\-\s]{8,20}$/;

class Validator {
  constructor(payload = {}) {
    this.data = payload;
    this.errors = {};
  }

  /** Ambil nilai & trim bila string */
  value(field) {
    const v = this.data[field];
    return typeof v === 'string' ? v.trim() : v;
  }

  addError(field, message) {
    if (!this.errors[field]) this.errors[field] = message;
    return this;
  }

  required(field, label) {
    const v = this.value(field);
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) {
      this.addError(field, `${label || field} wajib diisi.`);
    }
    return this;
  }

  email(field, label = 'Email') {
    const v = this.value(field);
    if (v && !EMAIL_RE.test(v)) this.addError(field, `${label} tidak valid.`);
    return this;
  }

  minLength(field, min, label) {
    const v = this.value(field);
    if (v && String(v).length < min) {
      this.addError(field, `${label || field} minimal ${min} karakter.`);
    }
    return this;
  }

  maxLength(field, max, label) {
    const v = this.value(field);
    if (v && String(v).length > max) {
      this.addError(field, `${label || field} maksimal ${max} karakter.`);
    }
    return this;
  }

  numeric(field, label) {
    const v = this.value(field);
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(v);
      if (Number.isNaN(n)) this.addError(field, `${label || field} harus berupa angka.`);
    }
    return this;
  }

  minNumber(field, min, label) {
    const v = this.value(field);
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(v);
      if (Number.isNaN(n) || n < min) {
        this.addError(field, `${label || field} minimal ${min}.`);
      }
    }
    return this;
  }

  nik(field, label = 'NIK') {
    const v = this.value(field);
    if (v && !NIK_RE.test(String(v))) this.addError(field, `${label} harus 16 digit angka.`);
    return this;
  }

  noKk(field, label = 'Nomor KK') {
    const v = this.value(field);
    if (v && !NO_KK_RE.test(String(v))) this.addError(field, `${label} harus 16 digit angka.`);
    return this;
  }

  phone(field, label = 'Nomor HP') {
    const v = this.value(field);
    if (v && !PHONE_RE.test(String(v))) this.addError(field, `${label} tidak valid.`);
    return this;
  }

  in(field, allowed, label) {
    const v = this.value(field);
    if (v !== undefined && v !== null && v !== '' && !allowed.includes(v)) {
      this.addError(field, `${label || field} harus salah satu dari: ${allowed.join(', ')}.`);
    }
    return this;
  }

  date(field, label) {
    const v = this.value(field);
    if (v && Number.isNaN(new Date(v).getTime())) {
      this.addError(field, `${label || field} bukan tanggal yang valid.`);
    }
    return this;
  }

  sameAs(field, otherField, label) {
    if (this.value(field) !== this.value(otherField)) {
      this.addError(field, `${label || field} tidak sama.`);
    }
    return this;
  }

  fails() {
    return Object.keys(this.errors).length > 0;
  }

  getErrors() {
    return this.errors;
  }

  /** Daftar pesan error pertama per field */
  messages() {
    return Object.values(this.errors);
  }
}

module.exports = Validator;
module.exports.regex = { EMAIL_RE, NIK_RE, NO_KK_RE, PHONE_RE };
