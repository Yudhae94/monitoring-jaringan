'use strict';

const { dashboardService } = require('../services');

class DashboardController {
  /** GET /dashboard — tampilan menyesuaikan role */
  index(req, res) {
    const user = req.session.user;

    if (user.role === 'warga') {
      const data = dashboardService.forWarga(user);
      return res.render('dashboard/warga', {
        title: 'Dashboard Saya',
        activeMenu: 'dashboard',
        ...data,
      });
    }

    const data = dashboardService.forPengurus();
    return res.render('dashboard/index', {
      title: 'Dashboard',
      activeMenu: 'dashboard',
      ...data,
    });
  }
}

module.exports = new DashboardController();
