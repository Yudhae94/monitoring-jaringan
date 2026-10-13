/* =========================================================
   SIM-RT — Script global
   Berisi: sidebar toggle, flash auto-dismiss, modal generik,
   modal konfirmasi hapus, form di modal, proteksi submit ganda.
   ========================================================= */
(function () {
  'use strict';

  // =====================================================
  // 1. SIDEBAR (mobile toggle)
  // =====================================================
  function initSidebar() {
    var toggle = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');

    if (!toggle || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
    }

    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });

    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    // Tutup saat resize ke desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeSidebar();
    });

    // Tutup dengan tombol Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  // =====================================================
  // 2. FLASH MESSAGE
  // =====================================================
  function initFlash() {
    var flashes = document.querySelectorAll('.flash');

    Array.prototype.forEach.call(flashes, function (flash) {
      // Tombol close
      var closeBtn = flash.querySelector('.flash-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          flash.style.transition = 'opacity .2s, transform .2s';
          flash.style.opacity = '0';
          flash.style.transform = 'translateY(-6px)';
          setTimeout(function () { flash.remove(); }, 200);
        });
      }

      // Auto hilang setelah 6 detik (kecuali pesan error)
      if (!flash.classList.contains('flash-error')) {
        setTimeout(function () {
          if (!flash.parentNode) return;
          flash.style.transition = 'opacity .35s, transform .35s';
          flash.style.opacity = '0';
          flash.style.transform = 'translateY(-8px)';
          setTimeout(function () { flash.remove(); }, 350);
        }, 6000);
      }
    });
  }

  // =====================================================
  // 3. MODAL GENERIK
  // =====================================================
  var modalAPI = {
    open: function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.hidden = false;
      document.body.style.overflow = 'hidden';

      // Fokus ke input pertama
      var firstInput = el.querySelector('input:not([type=hidden]), select, textarea');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 60);
    },
    close: function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      document.body.style.overflow = '';
    }
  };

  window.SimRTModal = modalAPI;

  function initModals() {
    // Buka modal via data-modal-open
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-modal-open]');
      if (opener) {
        e.preventDefault();
        modalAPI.open(opener.getAttribute('data-modal-open'));
        return;
      }

      // Tutup via data-modal-close
      var closer = e.target.closest('[data-modal-close]');
      if (closer) {
        e.preventDefault();
        var box = closer.closest('.modal-overlay');
        if (box) modalAPI.close(box.id);
      }
    });

    // Klik backdrop menutup modal
    document.addEventListener('click', function (e) {
      if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        modalAPI.close(e.target.id);
      }
    });

    // Escape menutup modal
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.modal-overlay:not([hidden])');
      if (open) modalAPI.close(open.id);
    });
  }

  // =====================================================
  // 4. MODAL KONFIRMASI HAPUS
  // =====================================================
  function initConfirmDelete() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-confirm-form]');
      if (!btn) return;

      e.preventDefault();

      var overlay = document.getElementById('deleteModal');
      if (!overlay) return;

      var action = btn.getAttribute('data-confirm-form');
      var title = btn.getAttribute('data-confirm-title') || 'Konfirmasi Hapus';
      var message = btn.getAttribute('data-confirm-message') || 'Data yang dihapus tidak dapat dikembalikan. Lanjutkan?';

      // Isi konten modal
      var titleEl = overlay.querySelector('.modal-header h3');
      var bodyEl = overlay.querySelector('.modal-body p');
      var formEl = overlay.querySelector('form');
      var methodInput = overlay.querySelector('input[name="_method"]');

      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.textContent = message;

      if (formEl) {
        // Bangun ulang action & method sesuai tombol yang diklik
        formEl.setAttribute('action', action);

        if (action.indexOf('?_method=') > -1) {
          var parts = action.split('?_method=');
          formEl.setAttribute('action', parts[0]);
          if (methodInput) methodInput.value = parts[1];
        } else if (methodInput) {
          methodInput.value = btn.hasAttribute('data-confirm-put') ? 'PUT' : 'DELETE';
        }
      }

      modalAPI.open('deleteModal');
    });
  }

  // =====================================================
  // 5. FORM DI DALAM MODAL (tambah / edit)
  // =====================================================
  function initModalForms() {
    // ----- Jenis iuran -----
    var jenisForm = document.getElementById('jenisForm');
    if (jenisForm) {
      document.addEventListener('click', function (e) {
        var editBtn = e.target.closest('[data-edit-jenis]');
        if (editBtn) {
          var data = JSON.parse(editBtn.getAttribute('data-edit-jenis'));

          jenisForm.setAttribute('action', '/iuran/jenis/' + data.id);
          document.getElementById('jenisMethod').value = 'PUT';
          document.getElementById('jenisModalTitle').textContent = 'Edit Jenis Iuran';
          document.getElementById('jenis_nama').value = data.nama;
          document.getElementById('jenis_periode').value = data.periode;
          document.getElementById('jenis_nominal').value = data.nominal;
          document.getElementById('jenis_keterangan').value = data.keterangan || '';

          modalAPI.open('jenisModal');
          return;
        }

        // Reset saat tombol "+ Tambah" diklik
        var addBtn = e.target.closest('[data-modal-open="jenisModal"]');
        if (addBtn) {
          jenisForm.reset();
          jenisForm.setAttribute('action', '/iuran/jenis');
          document.getElementById('jenisMethod').value = 'POST';
          document.getElementById('jenisModalTitle').textContent = 'Tambah Jenis Iuran';
        }
      });
    }

    // ----- Kategori kas -----
    var kategoriForm = document.getElementById('kategoriForm');
    if (kategoriForm) {
      document.addEventListener('click', function (e) {
        var editBtn = e.target.closest('[data-edit-kategori]');
        if (editBtn) {
          var data = JSON.parse(editBtn.getAttribute('data-edit-kategori'));

          kategoriForm.setAttribute('action', '/kas/kategori/' + data.id);
          document.getElementById('kategoriMethod').value = 'PUT';
          document.getElementById('kategoriModalTitle').textContent = 'Edit Kategori';
          document.getElementById('kategori_nama').value = data.nama;
          document.getElementById('kategori_tipe').value = data.tipe;
          document.getElementById('kategori_warna').value = data.warna || '#64748b';

          modalAPI.open('kategoriModal');
          return;
        }

        var addBtn = e.target.closest('[data-modal-open="kategoriModal"]');
        if (addBtn) {
          kategoriForm.reset();
          kategoriForm.setAttribute('action', '/kas/kategori');
          document.getElementById('kategoriMethod').value = 'POST';
          document.getElementById('kategoriModalTitle').textContent = 'Tambah Kategori';
        }
      });
    }

    // ----- Jenis surat -----
    var jenisSuratForm = document.getElementById('jenisSuratForm');
    if (jenisSuratForm) {
      document.addEventListener('click', function (e) {
        var editBtn = e.target.closest('[data-edit-jenis-surat]');
        if (editBtn) {
          var data = JSON.parse(editBtn.getAttribute('data-edit-jenis-surat'));

          jenisSuratForm.setAttribute('action', '/surat/jenis/' + data.id);
          document.getElementById('jenisSuratMethod').value = 'PUT';
          document.getElementById('jenisSuratModalTitle').textContent = 'Edit Jenis Surat';
          document.getElementById('surat_kode').value = data.kode;
          document.getElementById('surat_nama').value = data.nama;
          document.getElementById('surat_template').value = data.template || '';

          var activeGroup = document.getElementById('suratActiveGroup');
          if (activeGroup) {
            activeGroup.hidden = false;
            document.getElementById('surat_active').value = String(data.is_active);
          }

          modalAPI.open('jenisSuratModal');
          return;
        }

        var addBtn = e.target.closest('[data-modal-open="jenisSuratModal"]');
        if (addBtn) {
          jenisSuratForm.reset();
          jenisSuratForm.setAttribute('action', '/surat/jenis');
          document.getElementById('jenisSuratMethod').value = 'POST';
          document.getElementById('jenisSuratModalTitle').textContent = 'Tambah Jenis Surat';

          var ag = document.getElementById('suratActiveGroup');
          if (ag) ag.hidden = true;
        }
      });
    }
  }

  // =====================================================
  // 6. TOGGLE PASSWORD (halaman login)
  // =====================================================
  function initPasswordToggle() {
    var btn = document.getElementById('togglePassword');
    var input = document.getElementById('password');
    if (!btn || !input) return;

    btn.addEventListener('click', function () {
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁️';
      btn.title = isPassword ? 'Sembunyikan password' : 'Tampilkan password';
    });
  }

  // =====================================================
  // 6b. PERINGATAN CAPS LOCK (halaman login)
  // =====================================================
  function initCapsLockHint() {
    var input = document.getElementById('password');
    var hint = document.getElementById('capsHint');
    if (!input || !hint) return;

    var update = function (e) {
      var on = e.getModifierState && e.getModifierState('CapsLock');
      hint.hidden = !on;
    };

    input.addEventListener('keyup', update);
    input.addEventListener('keydown', update);
    input.addEventListener('blur', function () { hint.hidden = true; });
    input.addEventListener('focus', update);
  }

  // =====================================================
  // 7. DEMO CHIP (isi otomatis form login)
  // =====================================================
  function initDemoChips() {
    var chips = document.querySelectorAll('.demo-chip');
    if (!chips.length) return;

    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        var email = chip.getAttribute('data-email');
        var password = chip.getAttribute('data-password');

        var emailInput = document.getElementById('email');
        var passInput = document.getElementById('password');

        if (emailInput) emailInput.value = email;
        if (passInput) {
          passInput.value = password;
          // Tampilkan password sebentar agar pengguna bisa memverifikasi
          if (passInput.type === 'password') {
            passInput.type = 'text';
            var btn = document.getElementById('togglePassword');
            if (btn) {
              btn.textContent = '🙈';
              btn.title = 'Sembunyikan password';
            }
          }
        }

        if (emailInput) emailInput.focus();
      });
    });
  }

  // =====================================================
  // 8. PROTEKSI SUBMIT GANDA (form biasa, bukan modal)
  // =====================================================
  function initSubmitGuard() {
    var forms = document.querySelectorAll('form.form-layout, form.auth-form');

    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener('submit', function () {
        var btn = form.querySelector('button[type="submit"]');
        if (!btn || btn.disabled) return;

        // Biarkan modal & form pencarian tetap responsif
        setTimeout(function () {
          btn.disabled = true;
          var original = btn.textContent;
          btn.textContent = '⏳ Memproses...';
          btn.dataset.originalText = original;
        }, 0);
      });
    });
  }

  // =====================================================
  // 9. AUTO-SUBMIT FILTER (select berubah langsung kirim)
  // =====================================================
  function initAutoFilter() {
    var bar = document.querySelector('.filter-bar');
    if (!bar) return;

    var selects = bar.querySelectorAll('select');
    Array.prototype.forEach.call(selects, function (sel) {
      sel.addEventListener('change', function () {
        if (bar.requestSubmit) bar.requestSubmit();
        else bar.submit();
      });
    });
  }

  // =====================================================
  // 10. MODAL TOLAK PENDAFTARAN
  //     Tombol data-reject-form membuka modal + isi action form.
  // =====================================================
  function initRejectModal() {
    var triggers = document.querySelectorAll('[data-reject-form]');
    if (!triggers.length) return;

    var form = document.getElementById('rejectForm');
    var nameEl = document.getElementById('rejectName');
    var reasonEl = document.getElementById('alasan');

    Array.prototype.forEach.call(triggers, function (btn) {
      btn.addEventListener('click', function () {
        if (form) form.setAttribute('action', btn.getAttribute('data-reject-form'));
        if (nameEl) nameEl.textContent = btn.getAttribute('data-reject-name') || '';
        if (reasonEl) reasonEl.value = '';

        if (modalAPI && modalAPI.open) modalAPI.open('rejectModal');
        if (reasonEl) setTimeout(function () { reasonEl.focus(); }, 60);
      });
    });
  }

  // =====================================================
  // 11. VALIDASI FORM PENDAFTARAN (NIK 16 digit)
  // =====================================================
  function initNikValidation() {
    var nik = document.getElementById('nik');
    if (!nik) return;

    nik.addEventListener('input', function () {
      nik.value = nik.value.replace(/\D/g, '').slice(0, 16);
    });

    var form = nik.closest('form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      var reason = '';

      if (nik.value.length !== 16) {
        reason = 'NIK harus terdiri dari 16 digit angka.';
      } else {
        // Konfirmasi password wajib cocok sebelum dikirim
        var pass = document.getElementById('password');
        var konfirm = document.getElementById('konfirmasi_password');
        if (pass && konfirm && pass.value !== konfirm.value) {
          reason = 'Konfirmasi password tidak cocok.';
        }
      }

      if (reason) {
        e.preventDefault();
        e.stopImmediatePropagation(); // cegah submit guard berjalan
        window.alert(reason);
      }
    });
  }

  // =====================================================
  // 12. KOTAK PENDAFTARAN DI HALAMAN LOGIN
  // =====================================================
  function initDaftarBox() {
    var box = document.getElementById('daftarBox');
    if (!box) return;

    var btn = document.getElementById('daftarToggle');
    var panel = document.getElementById('daftarPanel');
    if (!btn || !panel) return;

    btn.addEventListener('click', function () {
      var terbuka = panel.hasAttribute('hidden');
      if (terbuka) {
        panel.removeAttribute('hidden');
        box.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        panel.setAttribute('hidden', '');
        box.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // =====================================================
  // 13. TEMA TERANG / GELAP (dark mode toggle)
  // =====================================================
  function initTheme() {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    var icon = btn.querySelector('.theme-toggle-icon');

    function currentTheme() {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function syncIcon() {
      if (icon) icon.textContent = currentTheme() === 'dark' ? '☀️' : '🌙';
      var label = currentTheme() === 'dark'
        ? 'Aktifkan mode terang'
        : 'Aktifkan mode gelap';
      btn.setAttribute('title', label);
      btn.setAttribute('aria-label', label);
    }

    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('simrt-theme', next); } catch (e) {}
      syncIcon();
      // Beri tahu grafik/komponen lain agar menyesuaikan warnanya.
      window.dispatchEvent(new CustomEvent('simrt:themechange', { detail: { theme: next } }));
    });

    syncIcon();

    // Jika pengguna belum memilih manual, ikuti perubahan preferensi sistem.
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        var saved = null;
        try { saved = localStorage.getItem('simrt-theme'); } catch (err) {}
        if (saved) return; // pilihan manual menang
        var theme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        syncIcon();
        window.dispatchEvent(new CustomEvent('simrt:themechange', { detail: { theme: theme } }));
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  // =====================================================
  // INIT
  // =====================================================
  function init() {
    initSidebar();
    initFlash();
    initModals();
    initConfirmDelete();
    initModalForms();
    initPasswordToggle();
    initCapsLockHint();
    initDemoChips();
    initSubmitGuard();
    initAutoFilter();
    initRejectModal();
    initNikValidation();
    initDaftarBox();
    initTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
