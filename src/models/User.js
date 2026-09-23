const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { v4: uuidv4 } = require("uuid");

/**
 * Koleksi `users` — PRD Software bagian 5.7
 * Akun tenaga medis/operator yang mengakses sistem (login & role-based access).
 */
const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      default: () => `U-${uuidv4()}`,
      unique: true,
    },
    nama: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["koordinator", "petugas_pos_medis", "tenaga_medis_lapangan"],
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password_hash: {
      type: String,
      required: true,
      select: false, // tidak ikut ter-query kecuali diminta eksplisit (.select("+password_hash"))
    },
  },
  schemaOptions()
);

module.exports = mongoose.model("User", userSchema);
