'use strict';

const express = require('express');
const { wargaController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated);

router.get('/', authorize('admin', 'bendahara'), wargaController.index);
router.get('/create', authorize('admin'), wargaController.create);
router.post('/', authorize('admin'), wargaController.store);
router.get('/:id/edit', authorize('admin'), wargaController.edit);
router.put('/:id', authorize('admin'), wargaController.update);
router.delete('/:id', authorize('admin'), wargaController.destroy);
router.get('/:id', authorize('admin', 'bendahara'), wargaController.show);

module.exports = router;
