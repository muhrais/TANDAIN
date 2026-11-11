const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const DeviceTelemetry = require("../models/DeviceTelemetry");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { wifiCommandForHeartbeat } = require("./deviceWifiController");

const GPS_STATUSES = ["no_data", "searching", "fixed", "unknown"];
const LED_STATES = ["none", "identify", "merah", "kuning", "hijau"];

// Field telemetri opsional heartbeat v2 -> validator. Nilai yang tipenya
// salah disimpan null, bukan ditolak 400, supaya satu field rusak dari
// firmware tidak membuat perangkat tampak offline.
const isNum = (min, max) => (v) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const TELEMETRY_FIELDS = {
  fw_version: (v) => typeof v === "string" && v.length > 0 && v.length <= 32,
  hdop: isNum(0, 100),
  fix_age_ms: isNum(0, Number.MAX_SAFE_INTEGER),
  ttff_ms: isNum(0, Number.MAX_SAFE_INTEGER),
  uptime_ms: isNum(0, Number.MAX_SAFE_INTEGER),
  rssi: isNum(-150, 0),
  battery_pct: isNum(0, 100),
  buffered_count: isNum(0, 100000),
  led_state: (v) => LED_STATES.includes(v),
};

/**
 * Ambil field telemetri yang DIKIRIM saja. Field yang tidak ada di body
 * tidak disentuh (firmware lama tidak menghapus nilai yang sudah ada);
 * field yang ada tapi tidak valid disimpan null.
 */
function parseTelemetry(body) {
  const telemetry = {};
  for (const [field, isValid] of Object.entries(TELEMETRY_FIELDS)) {
    if (body[field] === undefined) continue;
    telemetry[field] = isValid(body[field]) ? body[field] : null;
  }
  return telemetry;
}
// Heartbeat firmware dikirim setiap 5 detik. Perangkat dianggap offline jika
// backend tidak menerima heartbeat selama 30 detik (sekitar 6 heartbeat).
const ONLINE_WINDOW_MS = 30 * 1000;

/**
 * Perintah untuk perangkat, dikirim balik di respons heartbeat (pairing
 * NFC <-> GPS, tahap 2). Firmware tidak perlu tahu data korban; cukup:
 * - assignment: korban aktif yang memakai gelang ini (null = gelang bebas)
 * - identify:   koordinator sedang mencari gelang ini (LED berkedip)
 * - led:        mode LED final, sudah diprioritaskan di server:
 *               identify > warna triase > none. Tombol darurat tetap
 *               ditangani firmware sendiri (prioritas tertinggi, lokal).
 */
async function buildDeviceCommand(tag, now = new Date()) {
  const victim = await Victim.findOne({ tag_id: tag.tag_id, status_korban: { $ne: "arrived" } })
    .sort({ created_at: -1 })
    .lean();

  const assignment = victim ? { victim_id: victim.victim_id, kategori_triase: victim.kategori_triase } : null;
  const identify = Boolean(tag.identify_until && new Date(tag.identify_until) > now);

  let led = "none";
  if (identify) led = "identify";
  else if (assignment) led = assignment.kategori_triase;

  return { assignment, identify, led, triaseUpdatedAt: victim ? victim.triase_updated_at ?? null : null };
}

const TRIASE_LEDS = ["merah", "kuning", "hijau"];

/**
 * Pelacakan sinkron LED untuk uji PAIR-02 (triase diubah -> LED gelang ikut).
 * - led_command berubah: catat kapan perintah itu "berlaku". Untuk warna
 *   triase, acuannya waktu triase ditetapkan (registrasi / ubah triase),
 *   bukan waktu heartbeat, supaya latensi mencakup jeda sampai heartbeat
 *   berikutnya. Acuan lama (sebelum perintah sebelumnya) diabaikan, mis.
 *   saat mode identify selesai dan gelang kembali ke warna triase lama.
 * - led_state dari firmware sama dengan perintah: catat led_synced_at sekali.
 * Mengembalikan $set untuk Tag, atau null bila tidak ada perubahan.
 */
function ledSyncUpdate(tag, command, ledState, now) {
  if (command.led !== tag.led_command) {
    const prevSince = tag.led_command_since ? new Date(tag.led_command_since) : new Date(0);
    const triaseAt = command.triaseUpdatedAt ? new Date(command.triaseUpdatedAt) : null;
    const since =
      TRIASE_LEDS.includes(command.led) && triaseAt && triaseAt > prevSince && triaseAt <= now ? triaseAt : now;
    return { led_command: command.led, led_command_since: since, led_synced_at: null };
  }
  if (ledState && ledState === tag.led_command && !tag.led_synced_at) {
    return { led_synced_at: now };
  }
  return null;
}

function ledSyncMs(tag) {
  if (!tag.led_synced_at || !tag.led_command_since) return null;
  return new Date(tag.led_synced_at).getTime() - new Date(tag.led_command_since).getTime();
}

// Dipanggil firmware walaupun GPS belum fix, sehingga koneksi perangkat tetap terlihat.
// Heartbeat v2 boleh membawa telemetri opsional (lihat TELEMETRY_FIELDS dan
// docs/DEVICE_API.md); payload lama (tag_id, gps_status, satellites,
// ip_address) tetap diterima apa adanya.
// Respons membawa perintah LED (lihat buildDeviceCommand), jadi perubahan
// triase/pairing sampai ke perangkat paling lambat satu interval heartbeat.
const receiveHeartbeat = asyncHandler(async (req, res) => {
  const {
    tag_id,
    gps_status = "unknown",
    satellites = 0,
    ip_address = null,
  } = req.body;

  if (!tag_id || typeof tag_id !== "string") {
    throw new ApiError(400, "VALIDATION_ERROR", "tag_id wajib diisi (string).");
  }

  if (!GPS_STATUSES.includes(gps_status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "gps_status tidak valid.");
  }

  const telemetry = parseTelemetry(req.body);

  const tag = await Tag.findOneAndUpdate(
    { tag_id },
    {
      $set: {
        last_seen: new Date(),
        gps_status,
        satellites: Number.isFinite(satellites) ? satellites : 0,
        ip_address,
        wifi_configurable: req.body.wifi_configurable === true,
        ...telemetry,
      },
      // status_tag hanya diisi saat tag baru, supaya tanda "damaged" /
      // "inactive" dari koordinator tidak tertimpa heartbeat.
      $setOnInsert: { tag_id, status_tag: "active" },
    },
    { upsert: true, new: true }
  );

  const now = tag.last_seen;
  const { triaseUpdatedAt, ...command } = await buildDeviceCommand(tag, now);

  const sync = ledSyncUpdate(tag, { ...command, triaseUpdatedAt }, telemetry.led_state, now);
  if (sync) await Tag.updateOne({ tag_id }, { $set: sync });

  // Log telemetri untuk alat uji. Kegagalan menulis log tidak boleh
  // menggagalkan heartbeat. Di server biasa tidak ditunggu (respons lebih
  // cepat); di Vercel (serverless) ditunggu, karena proses bisa dibekukan
  // begitu respons terkirim sehingga tulisan yang belum selesai hilang.
  const telemetryWrite = DeviceTelemetry.create({
    tag_id,
    received_at: now,
    gps_status,
    satellites: tag.satellites,
    ...telemetry,
    led_command: command.led,
  }).catch((err) => console.warn(`[telemetry] gagal simpan ${tag_id}: ${err.message}`));
  if (process.env.VERCEL) await telemetryWrite;

  const wifiCommand = tag.wifi_configurable
    ? await wifiCommandForHeartbeat(tag_id, req.body.wifi_result).catch(() => ({}))
    : {};

  return sendSuccess(res, 200, {
    tag_id: tag.tag_id,
    received_at: now,
    ...wifiCommand,
    ...command,
  });
});

// Menyimpan penekanan tombol sebagai event persisten agar tetap terlihat di
// dashboard walaupun status LED darurat pada perangkat hanya aktif sebentar.
const receiveButtonPress = asyncHandler(async (req, res) => {
  const { tag_id, lat, lng, satellites = 0, ip_address = null } = req.body;

  if (!tag_id || typeof tag_id !== "string") {
    throw new ApiError(400, "VALIDATION_ERROR", "tag_id wajib diisi (string).");
  }

  const hasLocation = lat !== undefined || lng !== undefined;
  if (
    hasLocation &&
    (typeof lat !== "number" ||
      lat < -90 ||
      lat > 90 ||
      typeof lng !== "number" ||
      lng < -180 ||
      lng > 180)
  ) {
    throw new ApiError(400, "VALIDATION_ERROR", "Koordinat tombol tidak valid.");
  }

  const pressedAt = new Date();
  const fields = {
    last_seen: pressedAt,
    last_button_pressed_at: pressedAt,
    satellites: Number.isFinite(satellites) ? satellites : 0,
    ip_address,
  };

  if (hasLocation) {
    fields.gps_status = "fixed";
    fields.latest_location = { lat, lng, timestamp: pressedAt, received_at: pressedAt };
  }

  const tag = await Tag.findOneAndUpdate(
    { tag_id },
    {
      $set: fields,
      $inc: { button_press_count: 1 },
      $setOnInsert: { tag_id, status_tag: "active" },
    },
    { upsert: true, new: true }
  );

  return sendSuccess(res, 201, {
    tag_id: tag.tag_id,
    button_press_count: tag.button_press_count,
    pressed_at: tag.last_button_pressed_at,
  });
});

function victimSummary(victim) {
  if (!victim) return null;
  const { victim_id, nama, kategori_triase, status_korban } = victim;
  return { victim_id, nama, kategori_triase, status_korban };
}

// Daftar perangkat untuk dashboard. Online dihitung dari heartbeat 30 detik terakhir.
const listDevices = asyncHandler(async (_req, res) => {
  // Hanya tag yang pernah berkomunikasi (heartbeat/lokasi/tombol). Tag yang
  // cuma dibuat lewat scan NFC atau seed bukan perangkat GPS aktif.
  const [tags, activeVictims] = await Promise.all([
    Tag.find({ last_seen: { $ne: null } }).sort({ tag_id: 1 }).lean(),
    Victim.find({ status_korban: { $ne: "arrived" } }).sort({ created_at: -1 }).lean(),
  ]);
  const now = Date.now();

  // Korban aktif per gelang, untuk halaman Perangkat (gelang terpakai/bebas).
  const victimByTag = new Map();
  for (const v of activeVictims) {
    if (!victimByTag.has(v.tag_id)) victimByTag.set(v.tag_id, v);
  }

  const devices = tags.map((tag) => ({
    tag_id: tag.tag_id,
    status_tag: tag.status_tag,
    nfc_uid: tag.nfc_uid ?? null,
    paired: Boolean(tag.nfc_uid),
    identify_until: tag.identify_until ?? null,
    victim: victimSummary(victimByTag.get(tag.tag_id)),
    online: Boolean(
      tag.last_seen && now - new Date(tag.last_seen).getTime() <= ONLINE_WINDOW_MS
    ),
    last_seen: tag.last_seen,
    wifi_configurable: tag.wifi_configurable === true,
    gps_status: tag.gps_status || "unknown",
    satellites: tag.satellites || 0,
    ip_address: tag.ip_address,
    button_press_count: tag.button_press_count || 0,
    last_button_pressed_at: tag.last_button_pressed_at,
    fw_version: tag.fw_version ?? null,
    battery_pct: tag.battery_pct ?? null,
    hdop: tag.hdop ?? null,
    fix_age_ms: tag.fix_age_ms ?? null,
    ttff_ms: tag.ttff_ms ?? null,
    uptime_ms: tag.uptime_ms ?? null,
    rssi: tag.rssi ?? null,
    buffered_count: tag.buffered_count ?? null,
    led_state: tag.led_state ?? null,
    led_command: tag.led_command ?? null,
    led_command_since: tag.led_command_since ?? null,
    led_synced_at: tag.led_synced_at ?? null,
    led_sync_ms: ledSyncMs(tag),
    latest_location: tag.latest_location || {
      lat: null,
      lng: null,
      timestamp: null,
    },
  }));

  return sendSuccess(res, 200, devices);
});

module.exports = { receiveHeartbeat, receiveButtonPress, listDevices };
