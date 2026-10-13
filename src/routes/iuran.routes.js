'use strict';

const express = require('express');
const { iuranController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated);

// ---------------- Jenis iuran (master) ----------------
router.get('/jenis', authorize('admin', 'bendahara'), iuranController.jenisIndex);
router.post('/jenis', authorize('admin'), iuranController.jenisStore);
router.put('/jenis/:id', authorize('admin'), iuranController.jenisUpdate);
router.delete('/jenis/:id', authorize('admin'), iuranController.jenisDestroy);

// ---------------- Generate tagihan massal ----------------
router.get('/generate', authorize('admin', 'bendahara'), iuranController.generateForm);
router.post('/generate', authorize('admin', 'bendahara'), iuranController.generateStore);

// ---------------- Pembayaran ----------------
router.get('/pembayaran', authorize('admin', 'bendahara'), iuranController.pembayaranIndex);
router.post('/pembayaran', authorize('admin', 'bendahara'), iuranController.pembayaranStore);
router.delete('/pembayaran/:id', authorize('admin', 'bendahara'), iuranController.pembayaranDestroy);

// ---------------- Tagihan ----------------
router.get('/tagihan', authorize('admin', 'bendahara'), iuranController.tagihanIndex);
router.get('/tagihan/:id', authorize('admin', 'bendahara'), iuranController.tagihanShow);
router.delete('/tagihan/:id', authorize('admin', 'bendahara'), iuranController.tagihanDestroy);

// Redirect index ke tagihan
router.get('/', authorize('admin', 'bendahara'), (req, res) => res.redirect('/iuran/tagihan'));

module.exports = router;
