const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { randomUUID } = require("crypto");

/**
 * Koleksi `locations` — PRD Software bagian 5.4
 * Log setiap titik lokasi yang dikirim tag, untuk audit pergerakan & analisis.
 */
const locationSchema = new mongoose.Schema(
  {
    location_id: {
      type: String,
      default: () => `LOC-${randomUUID()}`,
      unique: true,
    },
    tag_id: {
      type: String,
      ref: "Tag",
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    // Waktu server menerima data. `timestamp` adalah jam perangkat (bisa
    // kosong/meleset kalau ESP32 belum sinkron), jadi latensi tag -> dashboard
    // (uji P-03) diukur dari field ini.
    received_at: {
      type: Date,
      default: Date.now,
    },
    battery_pct: {
      type: Number,
      default: null,
    },
    sync_status: {
      type: String,
      enum: ["pending", "sent", "synced"],
      default: "synced",
    },
  },
  schemaOptions()
);

locationSchema.index({ tag_id: 1, timestamp: -1 });
locationSchema.index({ tag_id: 1, received_at: -1 });

module.exports = mongoose.model("Location", locationSchema);
