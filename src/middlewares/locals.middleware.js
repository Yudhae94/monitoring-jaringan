'use strict';

/**
 * Menyediakan data global untuk semua view:
 * user yang login, identitas RT, flash message, helper, dan URL aktif.
 */
const appConfig = require('../config/app');
const format = require('../utils/format');

module.exports = function viewLocals(req, res, next) {
  res.locals.app = appConfig;
  res.locals.rt = appConfig.rt;
  res.locals.fmt = format;
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.query = req.query || {};

  // Flash message
  res.locals.flash = {
    success: res.flash ? res.flash('success') : null,
    error: res.flash ? res.flash('error') : null,
    info: res.flash ? res.flash('info') : null,
  };
  res.locals.hasFlash = Boolean(
    res.locals.flash.success || res.locals.flash.error || res.locals.flash.info
  );

  // Judul halaman default
  res.locals.title = appConfig.fullName;
  res.locals.activeMenu = '';

  // Jumlah pendaftaran yang menunggu persetujuan (badge di sidebar admin).
  // Query ringan (indexed) & hanya untuk role admin.
  res.locals.pendingCount = 0;
  if (req.session.user && req.session.user.role === 'admin') {
    try {
      res.locals.pendingCount = require('../models').pendaftaranRepo.countByStatus().menunggu || 0;
    } catch (err) {
      res.locals.pendingCount = 0;
    }
  }

  next();
};
