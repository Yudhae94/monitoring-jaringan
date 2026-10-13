'use strict';

const express = require('express');
const { suratController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated);

// ---------------- Jenis surat (master) ----------------
router.get('/jenis', authorize('admin', 'bendahara'), suratController.jenisIndex);
router.post('/jenis', authorize('admin'), suratController.jenisStore);
router.put('/jenis/:id', authorize('admin'), suratController.jenisUpdate);
router.delete('/jenis/:id', authorize('admin'), suratController.jenisDestroy);

// ---------------- Pengajuan surat ----------------
// Semua role boleh mengajukan (warga, bendahara, admin)
router.get('/ajukan', suratController.create);
router.post('/ajukan', suratController.store);

// Daftar & detail: warga otomatis dibatasi ke miliknya sendiri di service layer
router.get('/', suratController.index);
router.get('/:id/cetak', suratController.print);
router.get('/:id', suratController.show);

// Perubahan status: hanya pengurus
router.put('/:id/status', authorize('admin', 'bendahara'), suratController.updateStatus);
router.delete('/:id', authorize('admin', 'bendahara'), suratController.destroy);

module.exports = router;
