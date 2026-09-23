const ApiError = require("../utils/ApiError");

/**
 * Error handler global (harus didaftarkan PALING TERAKHIR di app.js).
 * Menerjemahkan semua error (ApiError kustom, error validasi Mongoose,
 * atau error tak terduga lain) ke format response seragam sesuai
 * PRD Software bagian 6.3.2:
 *   { success: false, error: { code, message, details? } }
 */
function errorHandler(err, req, res, next) {
  // 1) Error kustom aplikasi (ApiError) — sudah punya statusCode & code yang jelas.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // 2) Error validasi bawaan Mongoose (mis. field enum/required tidak sesuai skema)
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Satu atau lebih field pada body request tidak valid.",
        details,
      },
    });
  }

  // 3) Duplicate key error MongoDB (unique index bentrok, mis. tag_id/username ganda)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_KEY",
        message: `Data dengan nilai field ${Object.keys(
          err.keyValue || {}
        ).join(", ")} sudah terdaftar.`,
      },
    });
  }

  // 4) Fallback: error tak terduga -> dicatat di log server untuk debugging (6.3.4),
  //    namun pesan ke klien tetap generik agar tidak membocorkan detail internal.
  console.error("[INTERNAL_ERROR]", new Date().toISOString(), req.method, req.originalUrl, err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Terjadi kegagalan tak terduga di server.",
    },
  });
}

/**
 * Middleware untuk menangani route yang tidak ditemukan (404 generik,
 * bukan bagian dari daftar kode error aplikasi PRD tapi tetap perlu
 * agar API tidak diam-diam mengembalikan HTML default Express).
 */
function notFoundHandler(req, res, next) {
  next(
    new ApiError(
      404,
      "ROUTE_NOT_FOUND",
      `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`
    )
  );
}

module.exports = { errorHandler, notFoundHandler };
