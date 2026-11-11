const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

/**
 * Kunci endpoint yang dipanggil firmware (heartbeat, tombol, lokasi).
 *
 * Aktif hanya bila DEVICE_API_KEY diisi di environment, supaya firmware lama
 * dan simulator tetap jalan di mode lapangan/dev. Di server publik (opsi B)
 * DEVICE_API_KEY wajib diisi; firmware mengirim header `X-Device-Key`.
 */
function requireDeviceKey(req, res, next) {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected) return next();

  const given = req.get("X-Device-Key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();

  return next(new ApiError(401, "DEVICE_KEY_INVALID", "Header X-Device-Key tidak ada atau salah."));
}

module.exports = { requireDeviceKey };
