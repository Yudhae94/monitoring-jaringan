'use strict';

const { pengumumanService } = require('../services');

class PengumumanController {
  /** GET /pengumuman */
  index(req, res) {
    const { data, pagination } = pengumumanService.list(req.query);
    const canManage = ['admin', 'bendahara'].includes(req.session.user.role);

    res.render('pengumuman/index', {
      title: 'Pengumuman',
      activeMenu: 'pengumuman',
      data,
      pagination,
      canManage,
      filters: {
        q: req.query.q || '',
        prioritas: req.query.prioritas || '',
        is_publish: req.query.is_publish || '',
      },
      consts: pengumumanService.consts(),
    });
  }

  /** GET /pengumuman/:id */
  show(req, res) {
    const pengumuman = pengumumanService.find(req.params.id);
    const canManage = ['admin', 'bendahara'].includes(req.session.user.role);

    // Warga tidak boleh melihat pengumuman yang belum dipublikasikan
    if (req.session.user.role === 'warga' && !pengumuman.is_publish) {
      req.flash('error', 'Pengumuman tidak ditemukan.');
      return res.redirect('/pengumuman');
    }

    res.render('pengumuman/detail', {
      title: pengumuman.judul,
      activeMenu: 'pengumuman',
      pengumuman,
      canManage,
      consts: pengumumanService.consts(),
    });
  }

  /** GET /pengumuman/create */
  create(req, res) {
    res.render('pengumuman/form', {
      title: 'Tambah Pengumuman',
      activeMenu: 'pengumuman',
      pengumumanData: null,
      consts: pengumumanService.consts(),
    });
  }

  /** POST /pengumuman */
  store(req, res) {
    const p = pengumumanService.create(req.body, req.session.user, req.ip);
    req.flash('success', 'Pengumuman berhasil dibuat.');
    res.redirect(`/pengumuman/${p.id}`);
  }

  /** GET /pengumuman/:id/edit */
  edit(req, res) {
    const pengumumanData = pengumumanService.find(req.params.id);

    res.render('pengumuman/form', {
      title: `Edit — ${pengumumanData.judul}`,
      activeMenu: 'pengumuman',
      pengumumanData,
      consts: pengumumanService.consts(),
    });
  }

  /** PUT /pengumuman/:id */
  update(req, res) {
    pengumumanService.update(req.params.id, req.body, req.session.user, req.ip);
    req.flash('success', 'Pengumuman berhasil diperbarui.');
    res.redirect(`/pengumuman/${req.params.id}`);
  }

  /** DELETE /pengumuman/:id */
  destroy(req, res) {
    pengumumanService.delete(req.params.id, req.session.user, req.ip);
    req.flash('success', 'Pengumuman berhasil dihapus.');
    res.redirect('/pengumuman');
  }

  /** PATCH /pengumuman/:id/publish */
  togglePublish(req, res) {
    const p = pengumumanService.togglePublish(req.params.id, req.session.user, req.ip);
    req.flash('success', `Pengumuman ${p.is_publish ? 'dipublikasikan' : 'diturunkan dari publikasi'}.`);
    res.redirect(`/pengumuman/${p.id}`);
  }
}

module.exports = new PengumumanController();
