'use strict';

const express = require('express');
const { pengumumanController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated);

// Semua role boleh membaca
router.get('/', pengumumanController.index);
router.get('/create', authorize('admin', 'bendahara'), pengumumanController.create);
router.post('/', authorize('admin', 'bendahara'), pengumumanController.store);
router.get('/:id/edit', authorize('admin', 'bendahara'), pengumumanController.edit);
router.put('/:id', authorize('admin', 'bendahara'), pengumumanController.update);
router.patch('/:id/publish', authorize('admin', 'bendahara'), pengumumanController.togglePublish);
router.delete('/:id', authorize('admin', 'bendahara'), pengumumanController.destroy);
router.get('/:id', pengumumanController.show);

module.exports = router;
