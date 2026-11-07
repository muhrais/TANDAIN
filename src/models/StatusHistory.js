const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { v4: uuidv4 } = require("uuid");

/**
 * Koleksi `status_history` — PRD Software bagian 5.5
 * Riwayat perubahan korban untuk menjaga traceability end-to-end.
 *
 * `jenis` membedakan isi entri:
 * - "status": perpindahan status_korban (status_lama -> status_baru)
 * - "triase": perubahan kategori_triase (nilai_lama/nilai_baru berupa string)
 * - "data":   perubahan identitas/kondisi klinis; nilai_lama/nilai_baru berupa
 *             objek { field: nilai } berisi field yang berubah saja
 * Entri lama tanpa `jenis` terbaca sebagai "status" lewat default.
 */
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
    jenis: {
      type: String,
      enum: ["status", "triase", "data"],
      default: "status",
    },
    status_lama: {
      type: String,
      default: null,
    },
    status_baru: {
      type: String,
      default: null,
      required: function requiredForStatus() {
        return this.jenis === "status";
      },
    },
    nilai_lama: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    nilai_baru: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
  schemaOptions()
);

statusHistorySchema.index({ victim_id: 1, waktu_perubahan: 1 });

module.exports = mongoose.model("StatusHistory", statusHistorySchema);
