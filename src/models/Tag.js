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
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  schemaOptions()
);

module.exports = mongoose.model("Tag", tagSchema);
