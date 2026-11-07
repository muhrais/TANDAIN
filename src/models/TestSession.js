const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { v4: uuidv4 } = require("uuid");

/**
 * Koleksi `test_sessions`: rentang waktu sesi uji lapangan (S-01 TTFF,
 * S-02 galat GPS, S-09 3 ESP bersamaan, R-02 soak). Ringkasan dihitung dari
 * `locations` dan `device_telemetry` di rentang [started_at, stopped_at].
 */
const testSessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, default: () => `TS-${uuidv4().slice(0, 8)}`, unique: true },
    nama: { type: String, required: true, trim: true },
    id_uji: { type: String, default: null, trim: true }, // mis. "S-02"
    tag_ids: { type: [String], default: [] },
    // Titik acuan (koordinat survei/Google Maps) untuk menghitung galat GPS.
    titik_acuan: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    // Interval kirim lokasi firmware, untuk menghitung kontinuitas.
    interval_lokasi_dtk: { type: Number, default: 10 },
    catatan: { type: String, default: "" },
    started_at: { type: Date, default: Date.now },
    stopped_at: { type: Date, default: null },
    dibuat_oleh: { type: String, default: null },
  },
  schemaOptions()
);

testSessionSchema.index({ started_at: -1 });

module.exports = mongoose.model("TestSession", testSessionSchema, "test_sessions");
