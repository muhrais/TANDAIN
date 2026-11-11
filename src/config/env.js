/**
 * Validasi environment sebelum server start. Di produksi (NODE_ENV=production,
 * mis. Render) server menolak jalan dengan konfigurasi yang tidak aman,
 * daripada diam-diam memakai secret contoh.
 */
const PLACEHOLDER_SECRET = "ganti_dengan_secret_key_yang_panjang_dan_acak";

function checkEnv() {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.JWT_SECRET || "";

  if (!process.env.MONGODB_URI) errors.push("MONGODB_URI belum diatur.");
  if (!secret) errors.push("JWT_SECRET belum diatur.");

  if (isProd) {
    if (secret === PLACEHOLDER_SECRET || secret.length < 32) {
      errors.push("JWT_SECRET produksi harus acak dan minimal 32 karakter.");
    }
    if (!process.env.DEVICE_API_KEY) {
      warnings.push("DEVICE_API_KEY kosong: endpoint perangkat terbuka untuk siapa saja.");
    }
    if (!process.env.CORS_ORIGINS) {
      warnings.push("CORS_ORIGINS kosong: API menerima request dari origin mana pun.");
    }
  }

  for (const w of warnings) console.warn(`[ENV] Peringatan: ${w}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`[ENV] ${e}`);
    process.exit(1);
  }
}

/** Daftar origin CORS dari CORS_ORIGINS="https://a.com,https://b.com"; kosong = semua. */
function corsOrigins() {
  return (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

module.exports = { checkEnv, corsOrigins };
