const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { v4: uuidv4 } = require("uuid");

/**
 * Koleksi `locations` — PRD Software bagian 5.4
 * Log setiap titik lokasi yang dikirim tag, untuk audit pergerakan & analisis.
 */
const locationSchema = new mongoose.Schema(
  {
    location_id: {
      type: String,
      default: () => `LOC-${uuidv4()}`,
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

module.exports = mongoose.model("Location", locationSchema);
