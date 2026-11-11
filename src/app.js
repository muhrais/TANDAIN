const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { corsOrigins } = require("./config/env");

const app = express();

// Di belakang Cloudflare Tunnel: percayai satu hop proxy supaya req.ip/log
// memakai IP klien asli, bukan alamat tunnel.
app.set("trust proxy", 1);

// CORS_ORIGINS kosong = izinkan semua (dev/lapangan). Di cloud, isi dengan
// domain dashboard. Request dari origin yang sama tidak terpengaruh.
const allowedOrigins = corsOrigins();
app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api", routes);

// Mode deploy (satu origin): backend ikut melayani hasil `vite build`, jadi
// HP petugas, laptop, dan tunnel HTTPS cukup membuka satu alamat. Aktif bila
// frontend/dist ada; matikan dengan SERVE_FRONTEND=false. Saat dev, Vite
// (port 5173) tetap dipakai seperti biasa.
const DIST_DIR = path.join(__dirname, "..", "frontend", "dist");
const SERVE_FRONTEND = process.env.SERVE_FRONTEND !== "false" && fs.existsSync(path.join(DIST_DIR, "index.html"));

if (SERVE_FRONTEND) {
  // File ber-hash di /assets aman di-cache lama; index.html selalu dicek ulang
  // supaya build baru langsung terpakai (mencegah tab lama memuat route usang).
  app.use(
    express.static(DIST_DIR, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );
  // SPA fallback: semua GET non-API (mis. /pasien, /pengaturan) -> index.html.
  app.get(/^\/(?!api(\/|$)).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({
      success: true,
      data: {
        message: "TANDAIN Backend API berjalan.",
        docs: "Lihat README.md untuk daftar endpoint.",
      },
    });
  });
}

app.servesFrontend = SERVE_FRONTEND;

// 404 untuk route yang tidak dikenali, lalu error handler global (harus paling akhir).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
