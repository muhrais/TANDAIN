const Tag = require("../models/Tag");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const GPS_STATUSES = ["no_data", "searching", "fixed", "unknown"];
// Heartbeat firmware dikirim setiap 5 detik. Perangkat dianggap offline jika
// backend tidak menerima heartbeat selama 30 detik (sekitar 6 heartbeat).
const ONLINE_WINDOW_MS = 30 * 1000;

// Dipanggil firmware walaupun GPS belum fix, sehingga koneksi perangkat tetap terlihat.
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
        status_tag: "active",
        last_seen: new Date(),
        gps_status,
        satellites: Number.isFinite(satellites) ? satellites : 0,
        ip_address,
      },
      $setOnInsert: { tag_id },
    },
    { upsert: true, new: true }
  );

  return sendSuccess(res, 200, {
    tag_id: tag.tag_id,
    received_at: tag.last_seen,
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
    status_tag: "active",
    last_seen: pressedAt,
    last_button_pressed_at: pressedAt,
    satellites: Number.isFinite(satellites) ? satellites : 0,
    ip_address,
  };

  if (hasLocation) {
    fields.gps_status = "fixed";
    fields.latest_location = { lat, lng, timestamp: pressedAt };
  }

  const tag = await Tag.findOneAndUpdate(
    { tag_id },
    {
      $set: fields,
      $inc: { button_press_count: 1 },
      $setOnInsert: { tag_id },
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
  const tags = await Tag.find().sort({ tag_id: 1 }).lean();
  const now = Date.now();

  const devices = tags.map((tag) => ({
    tag_id: tag.tag_id,
    status_tag: tag.status_tag,
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
