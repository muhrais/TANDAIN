const mongoose = require("mongoose");

// Koleksi tag NFC/RFID.
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
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Tag", tagSchema);
