const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { v4: uuidv4 } = require("uuid");

/**
 * Koleksi `victims` — PRD Software bagian 5.3
 * Menyimpan data & status korban, terhubung dengan tag_id.
 */
const victimSchema = new mongoose.Schema(
  {
    victim_id: {
      type: String,
      default: () => `V-${uuidv4()}`,
      unique: true,
    },
    tag_id: {
      type: String,
      ref: "Tag",
      required: true,
    },
    nama: {
      type: String,
      default: "",
      trim: true,
    },
    usia: {
      type: Number,
      min: 0,
    },
    jenis_kelamin: {
      type: String,
      enum: ["L", "P", "tidak_diketahui"],
      default: "tidak_diketahui",
    },
    kategori_triase: {
      type: String,
      enum: ["merah", "kuning", "hijau"],
      required: true,
    },
    kondisi_klinis: {
      type: String,
      default: "",
    },
    status_korban: {
      type: String,
      enum: [
        "registered",
        "triaged",
        "waiting_transfer",
        "in_transit",
        "arrived",
      ],
      default: "registered",
    },
    posko_asal: {
      type: String,
      ref: "Posko",
      default: null,
    },
    posko_tujuan: {
      type: String,
      ref: "Posko",
      default: null,
    },
    lokasi_terakhir: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    waktu_update_terakhir: {
      type: Date,
      default: Date.now,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  schemaOptions()
);

// Index untuk mempercepat query dashboard/real-time (FR-DB-03)
victimSchema.index({ tag_id: 1 });
victimSchema.index({ kategori_triase: 1 });
victimSchema.index({ status_korban: 1 });

module.exports = mongoose.model("Victim", victimSchema);
