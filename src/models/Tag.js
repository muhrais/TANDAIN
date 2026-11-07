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
    // UID NFC gelang yang dipasangkan ke perangkat ini (pairing saat persiapan
    // alat). Identitas kanonik tetap `tag_id` (= device_id ESP32 = stiker).
    // Tanpa default: index unique+sparse hanya melewati dokumen yang TIDAK
    // punya field ini, bukan yang bernilai null.
    nfc_uid: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // Selama waktu ini belum lewat, heartbeat menyuruh LED berkedip supaya
    // koordinator bisa memastikan gelang fisik yang dipilih (tahap 2).
    identify_until: {
      type: Date,
      default: null,
    },
    status_tag: {
      type: String,
      enum: ["active", "inactive", "damaged"],
      default: "active",
    },
    last_seen: {
      type: Date,
      default: null,
    },
    gps_status: {
      type: String,
      enum: ["no_data", "searching", "fixed", "unknown"],
      default: "unknown",
    },
    satellites: {
      type: Number,
      default: 0,
    },
    ip_address: {
      type: String,
      default: null,
    },
    button_press_count: {
      type: Number,
      default: 0,
    },
    last_button_pressed_at: {
      type: Date,
      default: null,
    },
    latest_location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      timestamp: { type: Date, default: null }, // jam perangkat
      received_at: { type: Date, default: null }, // jam server
    },
    battery_pct: {
      type: Number,
      default: null,
    },
    // Telemetri heartbeat v2 (docs/DEVICE_API.md). Semua opsional: firmware
    // lama tidak mengirimnya dan nilainya tetap null.
    fw_version: { type: String, default: null },
    hdop: { type: Number, default: null },
    fix_age_ms: { type: Number, default: null },
    ttff_ms: { type: Number, default: null },
    uptime_ms: { type: Number, default: null },
    rssi: { type: Number, default: null },
    buffered_count: { type: Number, default: null },
    // Mode LED yang sedang ditampilkan perangkat (laporan balik firmware).
    led_state: {
      type: String,
      enum: ["none", "identify", "merah", "kuning", "hijau", null],
      default: null,
    },
    // Sinkron LED (uji PAIR-02): perintah terakhir dari server, sejak kapan
    // berlaku, dan kapan firmware pertama kali melaporkan led_state yang sama.
    led_command: { type: String, default: null },
    led_command_since: { type: Date, default: null },
    led_synced_at: { type: Date, default: null },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  schemaOptions()
);

tagSchema.index({ last_seen: -1 });
tagSchema.index({ nfc_uid: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Tag", tagSchema);
