const Tag = require("../models/Tag");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const GPS_STATUSES = ["no_data", "searching", "fixed", "unknown"];
// Heartbeat firmware dikirim setiap 5 detik. Beri toleransi 90 detik agar
// gangguan hotspot singkat tidak langsung membuat perangkat tampak offline.
const ONLINE_WINDOW_MS = 90 * 1000;

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

// Daftar perangkat untuk dashboard. Online dihitung dari heartbeat 90 detik terakhir.
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
    latest_location: tag.latest_location || {
      lat: null,
      lng: null,
      timestamp: null,
    },
  }));

  return sendSuccess(res, 200, devices);
});

module.exports = { receiveHeartbeat, listDevices };
