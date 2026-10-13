'use strict';

const express = require('express');
const { kasController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated, authorize('admin', 'bendahara'));

// Kategori (didaftarkan sebelum /:id agar tidak tertangkap sebagai id)
router.get('/kategori', kasController.kategoriIndex);
router.post('/kategori', kasController.kategoriStore);
router.put('/kategori/:id', authorize('admin'), kasController.kategoriUpdate);
router.delete('/kategori/:id', authorize('admin'), kasController.kategoriDestroy);

// Transaksi kas
router.get('/', kasController.index);
router.get('/create', kasController.create);
router.post('/', kasController.store);
router.get('/:id/edit', kasController.edit);
router.put('/:id', kasController.update);
router.delete('/:id', authorize('admin'), kasController.destroy);

module.exports = router;
