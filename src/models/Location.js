const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Koleksi lokasi tag.
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
  { versionKey: false }
);

locationSchema.index({ tag_id: 1, timestamp: -1 });

module.exports = mongoose.model("Location", locationSchema);
