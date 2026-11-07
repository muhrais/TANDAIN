const mongoose = require("mongoose");
const schemaOptions = require("../utils/schemaOptions");

// Data uji, bukan data operasional: dihapus otomatis setelah 14 hari.
const TTL_SECONDS = 14 * 24 * 60 * 60;

/**
 * Koleksi `device_telemetry`: satu dokumen per heartbeat. Dipakai alat uji
 * (sesi uji GPS, `npm run gps-report`) untuk TTFF, HDOP, baterai, uptime,
 * dan sinkron LED. Tag hanya menyimpan nilai terakhir; riwayatnya di sini.
 */
const deviceTelemetrySchema = new mongoose.Schema(
  {
    tag_id: { type: String, required: true },
    received_at: { type: Date, default: Date.now },
    gps_status: { type: String, default: null },
    satellites: { type: Number, default: null },
    fw_version: { type: String, default: null },
    hdop: { type: Number, default: null },
    fix_age_ms: { type: Number, default: null },
    ttff_ms: { type: Number, default: null },
    uptime_ms: { type: Number, default: null },
    rssi: { type: Number, default: null },
    battery_pct: { type: Number, default: null },
    buffered_count: { type: Number, default: null },
    led_state: { type: String, default: null },
    // Perintah LED yang dikirim server di respons heartbeat ini.
    led_command: { type: String, default: null },
  },
  schemaOptions()
);

deviceTelemetrySchema.index({ tag_id: 1, received_at: 1 });
deviceTelemetrySchema.index({ received_at: 1 }, { expireAfterSeconds: TTL_SECONDS });

module.exports = mongoose.model("DeviceTelemetry", deviceTelemetrySchema, "device_telemetry");
