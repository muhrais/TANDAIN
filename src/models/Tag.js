const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");

/**
 * Koleksi `tags` — PRD Software bagian 5.2
 * Menyimpan data fisik tag NFC/RFID yang telah diproduksi/diaktifkan.
 */
const tagSchema = new mongoose.Schema(
  {
    tag_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status_tag: {
      type: String,
      enum: ["active", "inactive", "damaged"],
      default: "active",
    },
    last_seen: {
      type: Date,
      default: null,
    },
    gps_status: {
      type: String,
      enum: ["no_data", "searching", "fixed", "unknown"],
      default: "unknown",
    },
    satellites: {
      type: Number,
      default: 0,
    },
    ip_address: {
      type: String,
      default: null,
    },
    button_press_count: {
      type: Number,
      default: 0,
    },
    last_button_pressed_at: {
      type: Date,
      default: null,
    },
    latest_location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      timestamp: { type: Date, default: null },
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  schemaOptions()
);

tagSchema.index({ last_seen: -1 });

module.exports = mongoose.model("Tag", tagSchema);
