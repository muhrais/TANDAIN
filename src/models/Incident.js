const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");

/**
 * Koleksi `incidents` - satu dokumen aktif (incident_id "AKTIF").
 * Identitas insiden untuk Topbar dashboard (FR-DASH-05) dan ambang alert
 * yang dipakai frontend (lib/alert.js). Diatur koordinator lewat halaman
 * Pengaturan.
 */
const DEFAULT_AMBANG = {
  merah_menunggu_mnt: 10,
  gps_diam_mnt: 5,
  baterai_rendah_pct: 20,
  kapasitas_peringatan_pct: 80,
};

const incidentSchema = new mongoose.Schema(
  {
    incident_id: {
      type: String,
      default: "AKTIF",
      unique: true,
    },
    nama_insiden: {
      type: String,
      default: "",
      trim: true,
    },
    lokasi: {
      type: String,
      default: "",
      trim: true,
    },
    waktu_mulai: {
      type: Date,
      default: null,
    },
    jumlah_relawan: {
      type: Number,
      default: 0,
      min: 0,
    },
    jumlah_nakes: {
      type: Number,
      default: 0,
      min: 0,
    },
    ambang: {
      merah_menunggu_mnt: { type: Number, default: DEFAULT_AMBANG.merah_menunggu_mnt },
      gps_diam_mnt: { type: Number, default: DEFAULT_AMBANG.gps_diam_mnt },
      baterai_rendah_pct: { type: Number, default: DEFAULT_AMBANG.baterai_rendah_pct },
      kapasitas_peringatan_pct: { type: Number, default: DEFAULT_AMBANG.kapasitas_peringatan_pct },
    },
    updated_by: {
      type: String,
      ref: "User",
      default: null,
    },
  },
  schemaOptions({ timestamps: { createdAt: "created_at", updatedAt: "updated_at" } })
);

const Incident = mongoose.model("Incident", incidentSchema);

/** Ambil dokumen insiden aktif; dibuat dengan nilai default bila belum ada. */
async function getActiveIncident() {
  return Incident.findOneAndUpdate(
    { incident_id: "AKTIF" },
    { $setOnInsert: { incident_id: "AKTIF" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = Incident;
module.exports.getActiveIncident = getActiveIncident;
module.exports.DEFAULT_AMBANG = DEFAULT_AMBANG;
