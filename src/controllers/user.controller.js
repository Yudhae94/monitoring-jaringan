'use strict';

const { userService } = require('../services');

class UserController {
  /** GET /users */
  index(req, res) {
    const { data, pagination } = userService.list(req.query);

    res.render('users/index', {
      title: 'Manajemen User',
      activeMenu: 'users',
      users: data,
      pagination,
      filters: {
        q: req.query.q || '',
        role: req.query.role || '',
        is_active: req.query.is_active || '',
      },
      stats: userService.stats(),
    });
  }

  /** GET /users/create */
  create(req, res) {
    res.render('users/form', {
      title: 'Tambah User',
      activeMenu: 'users',
      userData: null,
      wargaOptions: require('../models').userRepo.availableWargaOptions(),
    });
  }

  /** POST /users */
  store(req, res) {
    userService.create(req.body, req.session.user, req.ip);
    req.flash('success', 'User baru berhasil ditambahkan.');
    res.redirect('/users');
  }

  /** GET /users/:id/edit */
  edit(req, res) {
    const userData = userService.find(req.params.id);

    res.render('users/form', {
      title: `Edit User — ${userData.nama}`,
      activeMenu: 'users',
      userData,
      wargaOptions: require('../models').userRepo.availableWargaOptions(),
    });
  }

  /** PUT /users/:id */
  update(req, res) {
    userService.update(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Data user berhasil diperbarui.');
    res.redirect('/users');
  }

  /** DELETE /users/:id */
  destroy(req, res) {
    userService.delete(req.params.id, req.session.user, req.ip);
    req.flash('success', 'User berhasil dihapus.');
    res.redirect('/users');
  }

  /** PATCH /users/:id/toggle */
  toggle(req, res) {
    const user = userService.toggleActive(req.params.id, req.session.user, req.ip);
    req.flash('success', `User "${user.nama}" telah ${user.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`);
    res.redirect('/users');
  }
}

module.exports = new UserController();
