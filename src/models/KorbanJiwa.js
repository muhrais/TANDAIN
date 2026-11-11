const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");
const { v4: uuidv4 } = require("uuid");

/**
 * Koleksi `korban_jiwa`
 * Catatan korban meninggal yang diinput langsung oleh koordinator atau
 * tenaga medis lapangan (keputusan K1, PLANNING_WEEK10_SOFTWARE.md).
 * Tidak terhubung ke gelang atau data korban hidup; satu entri boleh
 * mewakili lebih dari satu jenazah yang ditemukan di titik yang sama.
 *
 * Hapus = soft delete (dihapus: true + alasan) supaya angka di dashboard
 * tetap bisa diaudit.
 */
const korbanJiwaSchema = new mongoose.Schema(
  {
    kj_id: {
      type: String,
      default: () => `KJ-${uuidv4()}`,
      unique: true,
    },
    jumlah: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },
    nama: {
      type: String,
      default: "",
      trim: true,
    },
    jenis_kelamin: {
      type: String,
      enum: ["L", "P", "tidak_diketahui"],
      default: "tidak_diketahui",
    },
    perkiraan_usia: {
      type: Number,
      default: null,
      min: 0,
    },
    lokasi: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    posko_id: {
      type: String,
      ref: "Posko",
      default: null,
    },
    waktu_ditemukan: {
      type: Date,
      default: Date.now,
    },
    catatan: {
      type: String,
      default: "",
    },
    dicatat_oleh: {
      type: String,
      ref: "User",
      default: null,
    },
    diubah_oleh: {
      type: String,
      ref: "User",
      default: null,
    },
    dihapus: {
      type: Boolean,
      default: false,
    },
    alasan_hapus: {
      type: String,
      default: null,
    },
    dihapus_oleh: {
      type: String,
      ref: "User",
      default: null,
    },
    dihapus_at: {
      type: Date,
      default: null,
    },
  },
  schemaOptions({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
);

korbanJiwaSchema.index({ dihapus: 1, waktu_ditemukan: -1 });

module.exports = mongoose.model("KorbanJiwa", korbanJiwaSchema, "korban_jiwa");
