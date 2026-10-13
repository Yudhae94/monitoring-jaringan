'use strict';

const appConfig = require('../config/app');

/**
 * Kumpulan helper format untuk ditampilkan di view.
 */

/** 50000 -> "Rp 50.000" */
function rupiah(value, withPrefix = true) {
  const num = Number(value) || 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(num));
  return `${num < 0 ? '-' : ''}${withPrefix ? 'Rp ' : ''}${formatted}`;
}

/** "2026-09-30" -> "30 Sep 2026" */
function tanggalID(value, opts = {}) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: opts.long ? 'long' : 'short',
    year: 'numeric',
  }).format(d);
}

/** "2026-09-30 14:05:00" -> "30 Sep 2026, 14:05" */
function tanggalWaktu(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return (
    new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d) +
    ', ' +
    new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(d)
      .replace('.', ':')
  );
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** 9 -> "September" */
function namaBulan(bulan, short = false) {
  const idx = Number(bulan) - 1;
  if (idx < 0 || idx > 11) return '-';
  return short ? NAMA_BULAN[idx].slice(0, 3) : NAMA_BULAN[idx];
}

/** 9, 2026 -> "September 2026" */
function periodeLabel(bulan, tahun) {
  return `${namaBulan(bulan)} ${tahun}`;
}

/** Ubah tanggal jadi "YYYY-MM-DD" (untuk input type=date) */
function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Daftar tahun: 5 tahun ke belakang s/d tahun ini */
function tahunOptions(count = 5) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [];
  for (let i = currentYear - (count - 1); i <= currentYear; i += 1) years.push(i);
  return years.reverse();
}

/** "Rp 50.000" untuk nominal iuran default */
function iuranDefault() {
  return rupiah(appConfig.iuran.defaultNominal);
}

module.exports = {
  rupiah,
  tanggalID,
  tanggalWaktu,
  namaBulan,
  periodeLabel,
  toDateInput,
  tahunOptions,
  iuranDefault,
  NAMA_BULAN,
};
