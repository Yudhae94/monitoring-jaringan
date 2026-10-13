'use strict';

const express = require('express');
const { userController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

// Hanya admin
router.use(isAuthenticated, authorize('admin'));

router.get('/', userController.index);
router.get('/create', userController.create);
router.post('/', userController.store);
router.get('/:id/edit', userController.edit);
router.put('/:id', userController.update);
router.patch('/:id/toggle', userController.toggle);
router.delete('/:id', userController.destroy);

module.exports = router;
