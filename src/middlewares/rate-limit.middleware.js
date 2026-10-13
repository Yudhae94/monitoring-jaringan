'use strict';

/**
 * Rate limiter sederhana (in-memory) untuk endpoint sensitif
 * seperti login. Tidak butuh dependensi eksternal.
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) {
  const hits = new Map();

  // Bersihkan entri lama secara berkala
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  cleanup.unref(); // jangan menahan proses agar bisa exit

  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { count: 0, start: now };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const sisaDetik = Math.ceil((entry.start + windowMs - now) / 1000);
      const pesan = message || `Terlalu banyak percobaan. Coba lagi dalam ${sisaDetik} detik.`;

      if (req.xhr || (req.get('accept') || '').includes('application/json')) {
        return res.status(429).json({ success: false, message: pesan });
      }

      req.flash('error', pesan);
      return res.redirect('back');
    }

    return next();
  };
}

module.exports = { createRateLimiter };
