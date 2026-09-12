const ApiError = require("../utils/ApiError");

// Tangani semua error yang muncul dari route agar response konsisten.
function errorHandler(err, req, res, next) {
  // Error aplikasi custom.
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

  // Validasi Mongoose.
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

  // Duplicate key MongoDB.
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

  // Error tidak terduga: log server, response aman ke client.
  console.error("[INTERNAL_ERROR]", new Date().toISOString(), req.method, req.originalUrl, err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Terjadi kegagalan tak terduga di server.",
    },
  });
}

// 404 fallback untuk endpoint yang tidak ada.
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
