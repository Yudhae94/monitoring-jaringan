'use strict';

const express = require('express');
const { pendaftaranController } = require('../controllers');
const { isGuest, isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { createRateLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

// Batasi pendaftaran: 5 kali per jam per IP (mencegah penyalahgunaan form publik)
const daftarLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Terlalu banyak percobaan pendaftaran dari perangkat ini. Silakan coba lagi nanti.',
});

// ---------- Publik: pendaftaran warga baru ----------
router.get('/daftar', isGuest, pendaftaranController.showForm);
router.get('/daftar/terkirim', isGuest, pendaftaranController.showSuccess);
router.post('/daftar', isGuest, daftarLimiter, pendaftaranController.submit);

// ---------- Admin: antrean persetujuan (khusus admin) ----------
router.get('/pendaftaran', isAuthenticated, authorize('admin'), pendaftaranController.index);
router.get('/pendaftaran/:id', isAuthenticated, authorize('admin'), pendaftaranController.detail);
router.post('/pendaftaran/:id/approve', isAuthenticated, authorize('admin'), pendaftaranController.approve);
router.post('/pendaftaran/:id/reject', isAuthenticated, authorize('admin'), pendaftaranController.reject);
router.post('/pendaftaran/:id/delete', isAuthenticated, authorize('admin'), pendaftaranController.destroy);

module.exports = router;
