const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

/* POST /api/auth/login
 * Body: { username, password } */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "username dan password wajib diisi."
    );
  }

  const user = await User.findOne({ username: username.toLowerCase() }).select(
    "+password_hash"
  );

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Username atau password salah.");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "UNAUTHORIZED", "Username atau password salah.");
  }

  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  return sendSuccess(res, 200, {
    token,
    user: {
      user_id: user.user_id,
      nama: user.nama,
      role: user.role,
      username: user.username,
    },
  });
});

module.exports = { login };
