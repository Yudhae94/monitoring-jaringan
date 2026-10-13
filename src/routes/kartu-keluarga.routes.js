'use strict';

const express = require('express');
const { kartuKeluargaController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated);

// Admin: akses penuh. Bendahara: lihat saja.
router.get('/', authorize('admin', 'bendahara'), kartuKeluargaController.index);
router.get('/create', authorize('admin'), kartuKeluargaController.create);
router.post('/', authorize('admin'), kartuKeluargaController.store);
router.get('/:id/edit', authorize('admin'), kartuKeluargaController.edit);
router.put('/:id', authorize('admin'), kartuKeluargaController.update);
router.delete('/:id', authorize('admin'), kartuKeluargaController.destroy);
router.get('/:id', authorize('admin', 'bendahara'), kartuKeluargaController.show);

module.exports = router;
