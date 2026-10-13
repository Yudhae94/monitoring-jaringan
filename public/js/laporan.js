/* =========================================================
   SIM-RT — Grafik Halaman Laporan
   Bar chart arus kas + grouped bar realisasi iuran.
   ========================================================= */
(function () {
  'use strict';

  function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
  }

  function bacaData(canvas, attr) {
    var raw = canvas.getAttribute(attr);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[laporan] gagal membaca data grafik:', attr, err);
      return [];
    }
  }

  // Baca variabel warna dari CSS agar grafik ikut tema terang/gelap.
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function warnaUmum() {
    return {
      tick: cssVar('--text-muted', '#64748b'),
      grid: cssVar('--border', 'rgba(148,163,184,.18)'),
      tooltipBg: isDark() ? '#0b1120' : '#0f172a',
      tooltipBorder: isDark() ? '#33436b' : 'rgba(15,23,42,.2)',
      tooltipTitle: isDark() ? '#e8edf7' : '#ffffff',
      tooltipBody: isDark() ? '#cbd5e1' : '#e2e8f0'
    };
  }

  function sumbuY(defaultMax) {
    var w = warnaUmum();
    return {
      beginAtZero: true,
      grid: { color: w.grid },
      ticks: {
        font: { size: 11 },
        color: w.tick,
        callback: function (value) {
          if (value >= 1000000) return (value / 1000000) + ' jt';
          if (value >= 1000) return (value / 1000) + ' rb';
          return value;
        }
      }
    };
  }

  function sumbuX() {
    var w = warnaUmum();
    return { grid: { display: false }, ticks: { font: { size: 11 }, color: w.tick } };
  }

  function tooltipRupiah() {
    var w = warnaUmum();
    return {
      backgroundColor: w.tooltipBg,
      borderColor: w.tooltipBorder,
      borderWidth: 1,
      titleColor: w.tooltipTitle,
      bodyColor: w.tooltipBody,
      padding: 11,
      titleFont: { size: 12.5, weight: '600' },
      bodyFont: { size: 12.5 },
      callbacks: {
        label: function (ctx) {
          return ctx.dataset.label + ': ' + formatRupiah(ctx.parsed.y);
        }
      }
    };
  }

  var charts = [];

  function initChartKasRekap() {
    var canvas = document.getElementById('chartKasRekap');
    if (!canvas || typeof Chart === 'undefined') return;

    var labels = bacaData(canvas, 'data-labels');
    var masuk = bacaData(canvas, 'data-masuk');
    var keluar = bacaData(canvas, 'data-keluar');
    if (!labels.length) return;

    charts.push(new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: masuk,
            backgroundColor: 'rgba(22, 163, 74, .78)',
            borderColor: '#16a34a',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 20
          },
          {
            label: 'Pengeluaran',
            data: keluar,
            backgroundColor: 'rgba(220, 38, 38, .72)',
            borderColor: '#dc2626',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 20
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: tooltipRupiah() },
        scales: { x: sumbuX(), y: sumbuY() }
      }
    }));
  }

  function initChartIuranRekap() {
    var canvas = document.getElementById('chartIuranRekap');
    if (!canvas || typeof Chart === 'undefined') return;

    var labels = bacaData(canvas, 'data-labels');
    var target = bacaData(canvas, 'data-target');
    var realisasi = bacaData(canvas, 'data-realisasi');
    if (!labels.length) return;

    charts.push(new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Target',
            data: target,
            backgroundColor: 'rgba(37, 99, 235, .35)',
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 20
          },
          {
            label: 'Realisasi',
            data: realisasi,
            backgroundColor: 'rgba(22, 163, 74, .85)',
            borderColor: '#16a34a',
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 20
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: tooltipRupiah() },
        scales: { x: sumbuX(), y: sumbuY() }
      }
    }));
  }

  function init() {
    initChartKasRekap();
    initChartIuranRekap();
    // Gambar ulang saat tema berubah agar warna grid/tooltip ikut menyesuaikan.
    window.addEventListener('simrt:themechange', function () {
      charts.forEach(function (c) { c.destroy(); });
      charts = [];
      initChartKasRekap();
      initChartIuranRekap();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
