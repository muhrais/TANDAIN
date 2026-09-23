const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

/**
 * Middleware `authenticate`
 * Memvalidasi header "Authorization: Bearer <JWT>" sesuai PRD bagian 6
 * (endpoint dengan Auth = "Ya"). Jika valid, req.user diisi
 * { user_id, role } agar bisa dipakai controller & requireRole().
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new ApiError(
        401,
        "UNAUTHORIZED",
        "Header Authorization tidak ada atau format tidak valid."
      )
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { user_id: payload.user_id, role: payload.role };
    return next();
  } catch (err) {
    return next(
      new ApiError(401, "UNAUTHORIZED", "Token tidak valid atau sudah kedaluwarsa.")
    );
  }
}

/**
 * Middleware factory `requireRole`
 * Contoh: requireRole("koordinator") atau requireRole("koordinator", "petugas_pos_medis")
 * Sesuai FR-BE-08 (role-based access control).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(401, "UNAUTHORIZED", "Pengguna belum terautentikasi.")
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          "FORBIDDEN_ROLE",
          "Role Anda tidak memiliki izin untuk mengakses endpoint ini."
        )
      );
    }

    return next();
  };
}

module.exports = { authenticate, requireRole };
