'use strict';

const { authService } = require('../services');

class AuthController {
  /** GET /login */
  showLogin(req, res) {
    res.render('auth/login', {
      title: 'Masuk',
      layout: 'layouts/auth',
      redirect: req.query.redirect || '',
      old: { email: '' },
    });
  }

  /** POST /login */
  login(req, res) {
    const { email, password, redirect } = req.body;

    if (!email || !password) {
      req.flash('error', 'Email dan password wajib diisi.');
      return res.redirect('/login');
    }

    const user = authService.login(email, password, req.ip);

    // Regenerasi session untuk mencegah session fixation
    return req.session.regenerate((err) => {
      if (err) {
        req.flash('error', 'Gagal memulai sesi. Coba lagi.');
        return res.redirect('/login');
      }

      req.session.user = user;

      // Arahkan ke halaman yang diminta sebelumnya, atau dashboard
      const tujuan = redirect && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : '/dashboard';

      return res.redirect(tujuan);
    });
  }

  /** POST /logout */
  logout(req, res) {
    authService.logout(req.session.user, req.ip);

    req.session.destroy(() => {
      res.clearCookie('simrt.sid');
      res.redirect('/login');
    });
  }

  /** GET /profil */
  showProfile(req, res) {
    const { userService } = require('../services');
    const user = userService.find(req.session.user.id);

    res.render('profil/index', {
      title: 'Profil Saya',
      activeMenu: 'profil',
      user,
    });
  }

  /** PUT /profil */
  updateProfile(req, res) {
    const { userService } = require('../services');
    const user = userService.updateProfile(req.session.user.id, req.body, req.ip);

    // Sinkronkan session dengan data terbaru
    req.session.user = authService.refresh(user.id);

    req.flash('success', 'Profil berhasil diperbarui.');
    res.redirect('/profil');
  }

  /** GET /profil/password */
  showChangePassword(req, res) {
    res.render('profil/password', {
      title: 'Ubah Password',
      activeMenu: 'profil',
    });
  }

  /** PUT /profil/password */
  changePassword(req, res) {
    authService.changePassword(req.session.user.id, req.body, req.ip);
    req.flash('success', 'Password berhasil diubah.');
    res.redirect('/profil');
  }
}

module.exports = new AuthController();
