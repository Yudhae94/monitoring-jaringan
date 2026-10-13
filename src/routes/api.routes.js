'use strict';

const express = require('express');
const { laporanController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated, authorize('admin', 'bendahara'));

// Data untuk grafik (JSON) — dipakai oleh public/js/dashboard.js
router.get('/chart/kas', laporanController.chartKas);
router.get('/chart/iuran', laporanController.chartIuran);

module.exports = router;
