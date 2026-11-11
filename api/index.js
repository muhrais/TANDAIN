/**
 * Entry Vercel Serverless Function untuk seluruh API TANDAIN.
 *
 * vercel.json meneruskan semua request /api/* ke file ini, lalu app Express
 * yang sama dengan `npm start` menangani routing-nya. Dashboard (frontend/dist)
 * dilayani langsung oleh CDN Vercel, bukan lewat function ini.
 *
 * Perbedaan dari server biasa (server.js):
 * - Tidak ada app.listen(); Vercel memanggil handler per request.
 * - Koneksi MongoDB dibuat sekali per instance function lalu dipakai ulang
 *   antar-request (instance yang masih hangat tidak konek ulang).
 * - Konfigurasi salah tidak mematikan proses, tapi dibalas 500 CONFIG_ERROR.
 */
// Dashboard dilayani CDN Vercel; function hanya menangani /api.
process.env.SERVE_FRONTEND = "false";

const mongoose = require("mongoose");
const app = require("../src/app");
const { validateEnv } = require("../src/config/env");

const { errors: envErrors, warnings: envWarnings } = validateEnv();
for (const w of envWarnings) console.warn(`[ENV] Peringatan: ${w}`);
for (const e of envErrors) console.error(`[ENV] ${e}`);

mongoose.set("strictQuery", true);
let connecting = null;

function connectOnce() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        // Function berumur pendek dan bisa berjalan paralel: pool kecil
        // supaya tidak menghabiskan batas koneksi Atlas M0.
        maxPoolSize: 5,
      })
      .then((conn) => {
        console.log(`[DB] Terhubung ke MongoDB -> db: ${conn.connection.name}`);
      })
      .catch((err) => {
        connecting = null; // coba lagi di request berikutnya
        throw err;
      });
  }
  return connecting;
}

function sendError(res, status, code, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ success: false, error: { code, message } }));
}

module.exports = async function handler(req, res) {
  if (envErrors.length > 0) {
    return sendError(res, 500, "CONFIG_ERROR", "Konfigurasi server belum lengkap. Cek log function di Vercel.");
  }
  try {
    await connectOnce();
  } catch (err) {
    console.error("[DB] Gagal terhubung ke MongoDB:", err.message);
    return sendError(res, 503, "DB_UNAVAILABLE", "Database belum bisa dihubungi. Coba lagi sebentar.");
  }
  return app(req, res);
};
