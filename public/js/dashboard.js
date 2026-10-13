/* =========================================================
   SIM-RT — Grafik Dashboard
   Menggambar bar chart arus kas dari data atribut canvas.
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
      console.warn('[dashboard] gagal membaca data grafik:', attr, err);
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

  function chartKas() {
    var canvas = document.getElementById('chartKas');
    if (!canvas || typeof Chart === 'undefined') return null;

    var labels = bacaData(canvas, 'data-labels');
    var masuk = bacaData(canvas, 'data-masuk');
    var keluar = bacaData(canvas, 'data-keluar');

    if (!labels.length) return null;

    var tickColor = cssVar('--text-muted', '#64748b');
    var gridColor = cssVar('--border', 'rgba(148,163,184,.18)');
    var tooltipBg = isDark() ? '#0b1120' : '#0f172a';
    var tooltipBorder = isDark() ? '#33436b' : 'rgba(15,23,42,.2)';
    var tooltipTitle = isDark() ? '#e8edf7' : '#ffffff';
    var tooltipBody = isDark() ? '#cbd5e1' : '#e2e8f0';

    return new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: masuk,
            backgroundColor: 'rgba(34, 197, 94, .80)',
            borderColor: '#22c55e',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 26
          },
          {
            label: 'Pengeluaran',
            data: keluar,
            backgroundColor: 'rgba(248, 113, 113, .80)',
            borderColor: '#f87171',
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 26
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 11,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            titleFont: { size: 12.5, weight: '600' },
            bodyFont: { size: 12.5 },
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + formatRupiah(ctx.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: tickColor }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: {
              font: { size: 11 },
              color: tickColor,
              callback: function (value) {
                if (value >= 1000000) return (value / 1000000) + ' jt';
                if (value >= 1000) return (value / 1000) + ' rb';
                return value;
              }
            }
          }
        }
      }
    });
  }

  var chart = null;

  function render() {
    if (chart) { chart.destroy(); chart = null; }
    chart = chartKas();
  }

  function init() {
    render();
    // Gambar ulang saat tema berubah agar warna grid/tooltip ikut menyesuaikan.
    window.addEventListener('simrt:themechange', function () {
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
