const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Riwayat perubahan status korban.
const statusHistorySchema = new mongoose.Schema(
  {
    history_id: {
      type: String,
      default: () => `HIST-${uuidv4()}`,
      unique: true,
    },
    victim_id: {
      type: String,
      ref: "Victim",
      required: true,
    },
    status_lama: {
      type: String,
      default: null,
    },
    status_baru: {
      type: String,
      required: true,
    },
    waktu_perubahan: {
      type: Date,
      default: Date.now,
    },
    diubah_oleh: {
      type: String,
      ref: "User",
      default: null, // null = perubahan otomatis oleh sistem (bukan input manual petugas)
    },
  },
  { versionKey: false }
);

statusHistorySchema.index({ victim_id: 1, waktu_perubahan: 1 });

module.exports = mongoose.model("StatusHistory", statusHistorySchema);
