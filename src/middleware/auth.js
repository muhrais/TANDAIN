const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

// Validasi JWT dan isi req.user.
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

// Cek role user agar endpoint hanya bisa diakses role tertentu.
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
