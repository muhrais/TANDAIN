const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const GPS_STATUSES = ["no_data", "searching", "fixed", "unknown"];
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

  return { assignment, identify, led };
}

// Dipanggil firmware walaupun GPS belum fix, sehingga koneksi perangkat tetap terlihat.
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

  const tag = await Tag.findOneAndUpdate(
    { tag_id },
    {
      $set: {
        last_seen: new Date(),
        gps_status,
        satellites: Number.isFinite(satellites) ? satellites : 0,
        ip_address,
      },
      // status_tag hanya diisi saat tag baru, supaya tanda "damaged" /
      // "inactive" dari koordinator tidak tertimpa heartbeat.
      $setOnInsert: { tag_id, status_tag: "active" },
    },
    { upsert: true, new: true }
  );

  return sendSuccess(res, 200, {
    tag_id: tag.tag_id,
    received_at: tag.last_seen,
    ...(await buildDeviceCommand(tag, tag.last_seen)),
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

// Daftar perangkat untuk dashboard. Online dihitung dari heartbeat 30 detik terakhir.
const listDevices = asyncHandler(async (_req, res) => {
  // Hanya tag yang pernah berkomunikasi (heartbeat/lokasi/tombol). Tag yang
  // cuma dibuat lewat scan NFC atau seed bukan perangkat GPS aktif.
  const tags = await Tag.find({ last_seen: { $ne: null } }).sort({ tag_id: 1 }).lean();
  const now = Date.now();

  const devices = tags.map((tag) => ({
    tag_id: tag.tag_id,
    status_tag: tag.status_tag,
    nfc_uid: tag.nfc_uid ?? null,
    paired: Boolean(tag.nfc_uid),
    online: Boolean(
      tag.last_seen && now - new Date(tag.last_seen).getTime() <= ONLINE_WINDOW_MS
    ),
    last_seen: tag.last_seen,
    gps_status: tag.gps_status || "unknown",
    satellites: tag.satellites || 0,
    ip_address: tag.ip_address,
    button_press_count: tag.button_press_count || 0,
    last_button_pressed_at: tag.last_button_pressed_at,
    latest_location: tag.latest_location || {
      lat: null,
      lng: null,
      timestamp: null,
    },
  }));

  return sendSuccess(res, 200, devices);
});

module.exports = { receiveHeartbeat, receiveButtonPress, listDevices };
