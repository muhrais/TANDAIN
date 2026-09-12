/**
 * Membungkus route handler async agar error yang terjadi otomatis
 * diteruskan ke error handler Express (next(err)), tanpa perlu
 * menulis try/catch berulang-ulang di setiap controller.
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
