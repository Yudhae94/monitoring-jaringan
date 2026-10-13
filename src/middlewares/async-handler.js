'use strict';

/**
 * Wrapper untuk controller async.
 * Menangkap error dari promise agar otomatis diteruskan ke errorHandler
 * tanpa perlu try/catch di setiap fungsi controller.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
