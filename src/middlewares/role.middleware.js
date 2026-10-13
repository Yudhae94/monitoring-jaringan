'use strict';

const { forbidden } = require('../utils/errors');

/**
 * Role-Based Access Control.
 * Pemakaian: router.get('/user', authorize('admin'), controller)
 *            router.get('/iuran', authorize('admin', 'bendahara'), controller)
 */
function authorize(...roles) {
  return (req, res, next) => {
    const user = req.session && req.session.user;

    if (!user) {
      req.flash('error', 'Silakan login terlebih dahulu.');
      return res.redirect('/login');
    }

    if (!roles.includes(user.role)) {
      if (req.xhr || (req.get('accept') || '').includes('application/json')) {
        return next(forbidden('Role Anda tidak memiliki akses ke resource ini.'));
      }
      return res.status(403).render('errors/403', {
        title: 'Akses Ditolak',
        layout: 'layouts/auth',
        pesan: `Halaman ini hanya dapat diakses oleh: ${roles.join(', ')}.`,
      });
    }

    return next();
  };
}

/** Helper di view: apakah user punya salah satu role */
function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}

module.exports = { authorize, hasRole };
