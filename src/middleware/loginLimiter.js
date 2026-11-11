const ApiError = require("../utils/ApiError");

/**
 * Batasi tebakan password di POST /api/auth/login (server publik).
 * Hitung login GAGAL per kombinasi IP + username dalam jendela waktu; login
 * sukses mereset hitungan. Disimpan di memori proses: cukup untuk satu
 * instance (Render free / laptop), hilang saat restart.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map(); // key -> { count, firstAt }

function keyOf(req) {
  const username = typeof req.body?.username === "string" ? req.body.username.toLowerCase() : "";
  return `${req.ip}|${username}`;
}

function prune(now) {
  for (const [key, entry] of failures) {
    if (now - entry.firstAt > WINDOW_MS) failures.delete(key);
  }
}

function loginLimiter(req, res, next) {
  const now = Date.now();
  if (failures.size > 1000) prune(now);
  const entry = failures.get(keyOf(req));
  if (entry && now - entry.firstAt <= WINDOW_MS && entry.count >= MAX_FAILURES) {
    const retryMin = Math.ceil((entry.firstAt + WINDOW_MS - now) / 60000);
    res.set("Retry-After", String(retryMin * 60));
    return next(
      new ApiError(429, "TOO_MANY_ATTEMPTS", `Terlalu banyak percobaan login. Coba lagi dalam ${retryMin} menit.`)
    );
  }

  // Catat hasil setelah controller selesai (status 401 = gagal).
  res.on("finish", () => {
    const key = keyOf(req);
    if (res.statusCode === 401) {
      const current = failures.get(key);
      if (!current || Date.now() - current.firstAt > WINDOW_MS) {
        failures.set(key, { count: 1, firstAt: Date.now() });
      } else {
        current.count += 1;
      }
    } else if (res.statusCode === 200) {
      failures.delete(key);
    }
  });
  return next();
}

module.exports = { loginLimiter, MAX_FAILURES };
