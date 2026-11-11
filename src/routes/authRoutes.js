const express = require("express");
const { login } = require("../controllers/authController");
const { loginLimiter } = require("../middleware/loginLimiter");

const router = express.Router();

// POST /api/auth/login (Auth: Tidak)
router.post("/login", loginLimiter, login);

module.exports = router;
