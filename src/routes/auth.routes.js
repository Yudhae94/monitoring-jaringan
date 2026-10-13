'use strict';

const express = require('express');
const { authController } = require('../controllers');
const { isGuest, isAuthenticated } = require('../middlewares/auth.middleware');
const { createRateLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

// Batasi percobaan login: 10 kali per 15 menit per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.',
});

// ---------- Autentikasi ----------
router.get('/login', isGuest, authController.showLogin);
router.post('/login', isGuest, loginLimiter, authController.login);
router.post('/logout', isAuthenticated, authController.logout);

// ---------- Profil (butuh login) ----------
router.get('/profil', isAuthenticated, authController.showProfile);
router.put('/profil', isAuthenticated, authController.updateProfile);
router.get('/profil/password', isAuthenticated, authController.showChangePassword);
router.put('/profil/password', isAuthenticated, authController.changePassword);

module.exports = router;
