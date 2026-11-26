const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");

// Data uji, sama seperti device_telemetry: dihapus otomatis setelah 14 hari.
const TTL_SECONDS = 14 * 24 * 60 * 60;

/**
 * Koleksi `button_events`: satu dokumen per tekanan tombol darurat. Tag hanya
 * menyimpan tekanan terakhir dan jumlahnya; riwayat di sini dipakai sesi uji
 * untuk latensi tekan -> server (uplink_ms = received_at - sent_at).
 */
const buttonEventSchema = new mongoose.Schema(
  {
    tag_id: { type: String, required: true },
    // Jam perangkat (NTP) saat tombol terdeteksi ditekan; null di firmware lama.
    sent_at: { type: Date, default: null },
    received_at: { type: Date, default: Date.now },
    uplink_ms: { type: Number, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    satellites: { type: Number, default: null },
  },
  schemaOptions()
);

buttonEventSchema.index({ tag_id: 1, received_at: 1 });
buttonEventSchema.index({ received_at: 1 }, { expireAfterSeconds: TTL_SECONDS });

module.exports = mongoose.model("ButtonEvent", buttonEventSchema, "button_events");
