'use strict';

const express = require('express');
const { dashboardController } = require('../controllers');
const { isAuthenticated } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', isAuthenticated, dashboardController.index);
router.get('/dashboard', isAuthenticated, dashboardController.index);

module.exports = router;
