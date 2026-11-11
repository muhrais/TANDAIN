const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const ROLE_VALUES = ["koordinator", "petugas_pos_medis", "tenaga_medis_lapangan"];
const MIN_PASSWORD = 6;

function publicUser(user) {
  return {
    user_id: user.user_id,
    nama: user.nama,
    username: user.username,
    role: user.role,
  };
}

function validateNama(nama, errors) {
  if (typeof nama !== "string" || !nama.trim() || nama.trim().length > 80) {
    errors.push({ field: "nama", message: "nama wajib diisi, maksimal 80 karakter." });
    return null;
  }
  return nama.trim();
}

function validateRole(role, errors) {
  if (!ROLE_VALUES.includes(role)) {
    errors.push({ field: "role", message: `role harus salah satu dari ${ROLE_VALUES.join(", ")}.` });
    return null;
  }
  return role;
}

function validatePassword(password, errors) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    errors.push({ field: "password", message: `password minimal ${MIN_PASSWORD} karakter.` });
    return null;
  }
  return password;
}

function throwIfErrors(errors) {
  if (errors.length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Data pengguna tidak valid.", errors);
  }
}

/** GET /api/users - koordinator. */
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ role: 1, nama: 1 });
  return sendSuccess(res, 200, users.map(publicUser));
});

/** POST /api/users - koordinator. Body: { nama, username, password, role } */
const createUser = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = [];
  const nama = validateNama(body.nama, errors);
  const role = validateRole(body.role, errors);
  const password = validatePassword(body.password, errors);
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    errors.push({ field: "username", message: "username 3-32 karakter: huruf kecil, angka, titik, garis bawah, atau strip." });
  }
  throwIfErrors(errors);

  if (await User.exists({ username })) {
    throw new ApiError(409, "DUPLICATE_USERNAME", `Username '${username}' sudah dipakai.`);
  }

  const user = await User.create({
    nama,
    username,
    role,
    password_hash: await bcrypt.hash(password, 10),
  });
  return sendSuccess(res, 201, publicUser(user));
});

/**
 * PUT /api/users/:id - koordinator. Body opsional: { nama, role, password }.
 * Penjaga: tidak bisa mengubah role akun sendiri, dan koordinator terakhir
 * tidak bisa diturunkan (supaya Pengaturan tidak terkunci).
 */
const updateUser = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const user = await User.findOne({ user_id: req.params.id });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan.");
  }

  const errors = [];
  const update = {};
  if (body.nama !== undefined) update.nama = validateNama(body.nama, errors);
  if (body.role !== undefined) update.role = validateRole(body.role, errors);
  if (body.password !== undefined) {
    const password = validatePassword(body.password, errors);
    if (password) update.password_hash = await bcrypt.hash(password, 10);
  }
  throwIfErrors(errors);

  if (update.role && update.role !== user.role) {
    if (user.user_id === req.user.user_id) {
      throw new ApiError(409, "CANNOT_CHANGE_OWN_ROLE", "Role akun sendiri tidak bisa diubah.");
    }
    if (user.role === "koordinator") {
      const koordinatorCount = await User.countDocuments({ role: "koordinator" });
      if (koordinatorCount <= 1) {
        throw new ApiError(409, "LAST_KOORDINATOR", "Harus ada minimal satu koordinator.");
      }
    }
  }

  user.set(update);
  await user.save();
  return sendSuccess(res, 200, publicUser(user));
});

module.exports = { listUsers, createUser, updateUser };
