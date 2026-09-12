/**
 * Kelas error khusus aplikasi TANDAIN, dipetakan langsung ke konvensi
 * error handling pada PRD Software bagian 6.3 (kode HTTP + kode error
 * aplikasi + pesan).
 *
 * Contoh pemakaian:
 *   throw new ApiError(404, "VICTIM_NOT_FOUND", "Data korban tidak ditemukan.");
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
