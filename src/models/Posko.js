const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");

/**
 * Koleksi `posko` — PRD Software bagian 5.6
 * Data titik penanganan korban (Pos Triase Utama, Pos Merah, Kuning, Hijau).
 */
const poskoSchema = new mongoose.Schema(
  {
    posko_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nama_posko: {
      type: String,
      required: true,
    },
    jenis: {
      type: String,
      enum: ["utama", "merah", "kuning", "hijau"],
      required: true,
    },
    lokasi: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    kapasitas_maksimum: {
      type: Number,
      required: true,
    },
    // jumlah_korban_saat_ini dihitung otomatis (lihat FR-DB & controller),
    // disimpan sebagai field cache agar query dashboard cepat (FR-DB-03).
    jumlah_korban_saat_ini: {
      type: Number,
      default: 0,
    },
  },
  schemaOptions()
);

module.exports = mongoose.model("Posko", poskoSchema);
