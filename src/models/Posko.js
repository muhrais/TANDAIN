const mongoose = require("mongoose");

// Koleksi posko penanganan korban.
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
  { versionKey: false }
);

module.exports = mongoose.model("Posko", poskoSchema);
