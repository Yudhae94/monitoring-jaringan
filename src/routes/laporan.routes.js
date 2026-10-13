'use strict';

const express = require('express');
const { laporanController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

const router = express.Router();

router.use(isAuthenticated, authorize('admin', 'bendahara'));

router.get('/', laporanController.index);
router.get('/bulanan', laporanController.bulanan);
router.get('/bulanan/cetak', laporanController.cetakBulanan);
router.get('/tahunan', laporanController.tahunan);
router.get('/tahunan/cetak', laporanController.cetakTahunan);
router.get('/tunggakan', laporanController.tunggakan);
router.get('/tunggakan/cetak', laporanController.cetakTunggakan);
router.get('/kartu-iuran', laporanController.kartuIuran);

module.exports = router;
