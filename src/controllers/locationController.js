const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const Location = require("../models/Location");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

// Validasi payload lokasi: tag_id, lat, lng, timestamp.
function validateLocationPayload(body) {
  const { tag_id, lat, lng, timestamp } = body;
  const errors = [];

  if (!tag_id || typeof tag_id !== "string") {
    errors.push({ field: "tag_id", message: "tag_id wajib diisi (string)." });
  }
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    errors.push({ field: "lat", message: "lat harus berupa angka antara -90 dan 90." });
  }
  if (typeof lng !== "number" || lng < -180 || lng > 180) {
    errors.push({ field: "lng", message: "lng harus berupa angka antara -180 dan 180." });
  }
  if (!timestamp || isNaN(new Date(timestamp).getTime())) {
    errors.push({ field: "timestamp", message: "timestamp wajib diisi dengan format ISO 8601 yang valid." });
  }

  return errors;
}

// Simpan lokasi baru dan update posisi korban aktif yang memakai tag ini.
async function ingestSingleLocation(payload) {
  const { tag_id, lat, lng, timestamp, battery_pct } = payload;

  // Pastikan tag ada di database sebelum menyimpan lokasi.
  await Tag.findOneAndUpdate(
    { tag_id },
    { $setOnInsert: { tag_id, status_tag: "active" } },
    { upsert: true, new: true }
  );

  const location = await Location.create({
    tag_id,
    latitude: lat,
    longitude: lng,
    timestamp: new Date(timestamp),
    battery_pct: typeof battery_pct === "number" ? battery_pct : null,
    sync_status: "synced",
  });

  // Update lokasi terakhir korban yang masih aktif.
  await Victim.findOneAndUpdate(
    { tag_id, status_korban: { $ne: "arrived" } },
    {
      $set: {
        lokasi_terakhir: { lat, lng },
        waktu_update_terakhir: new Date(timestamp),
      },
    },
    { sort: { created_at: -1 } }
  );

  return location;
}

// POST /api/locations
const receiveLocation = asyncHandler(async (req, res) => {
  const errors = validateLocationPayload(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Payload lokasi tidak valid.", errors);
  }

  const location = await ingestSingleLocation(req.body);
  return sendSuccess(res, 201, { location_id: location.location_id });
});

// POST /api/locations/batch
const receiveLocationBatch = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Body harus memuat field 'items' berupa array dan tidak boleh kosong."
    );
  }

  const results = [];
  const failed = [];

  for (const [index, item] of items.entries()) {
    const errors = validateLocationPayload(item);
    if (errors.length > 0) {
      failed.push({ index, errors });
      continue;
    }
    const location = await ingestSingleLocation(item);
    results.push({ index, location_id: location.location_id });
  }

  return sendSuccess(res, 201, {
    synced_count: results.length,
    failed_count: failed.length,
    synced: results,
    failed,
  });
});

module.exports = { receiveLocation, receiveLocationBatch };
