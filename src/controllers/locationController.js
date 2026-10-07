const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const Location = require("../models/Location");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

/**
 * Validasi satu payload lokasi sesuai contoh pada PRD bagian 6.1:
 * { tag_id, lat, lng, timestamp, battery_pct }
 */
function validateLocationPayload(body) {
  const { tag_id, lat, lng, timestamp, battery_pct } = body;
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
  if (timestamp !== undefined && isNaN(new Date(timestamp).getTime())) {
    errors.push({ field: "timestamp", message: "timestamp harus memakai format ISO 8601 yang valid." });
  }
  if (battery_pct != null && (typeof battery_pct !== "number" || battery_pct < 0 || battery_pct > 100)) {
    errors.push({ field: "battery_pct", message: "battery_pct harus berupa angka antara 0 dan 100." });
  }

  return errors;
}

/**
 * Menyimpan satu entri lokasi ke koleksi `locations`, memastikan tag
 * terdaftar (auto-register tag baru sebagai "active" jika belum ada —
 * praktis untuk tahap prototipe saat tag fisik langsung mengirim data
 * tanpa proses pendaftaran manual terlebih dahulu), lalu memperbarui
 * lokasi_terakhir korban aktif yang terhubung dengan tag tersebut (jika ada).
 */
async function ingestSingleLocation(payload) {
  const { tag_id, lat, lng, timestamp, battery_pct } = payload;
  const receivedAt = new Date();
  const measuredAt = timestamp ? new Date(timestamp) : receivedAt;
  const battery = typeof battery_pct === "number" ? battery_pct : null;

  // Pastikan tag terdaftar di koleksi `tags` (FR-DB-01: data saling terhubung).
  // status_tag hanya diisi saat tag baru dibuat, supaya tanda "damaged" /
  // "inactive" dari koordinator tidak tertimpa oleh ping berikutnya.
  await Tag.findOneAndUpdate(
    { tag_id },
    {
      $set: {
        last_seen: receivedAt,
        gps_status: "fixed",
        latest_location: { lat, lng, timestamp: measuredAt, received_at: receivedAt },
        ...(battery !== null ? { battery_pct: battery } : {}),
      },
      $setOnInsert: { tag_id, status_tag: "active" },
    },
    { upsert: true, new: true }
  );

  const location = await Location.create({
    tag_id,
    latitude: lat,
    longitude: lng,
    timestamp: measuredAt,
    received_at: receivedAt,
    battery_pct: battery,
    sync_status: "synced",
  });

  // Perbarui lokasi korban aktif (belum "arrived") yang memakai tag ini.
  // waktu_update_terakhir SENGAJA tidak disentuh (bug B1): field itu milik
  // aksi petugas, dan antrian prioritas mengurutkan berdasarkan field itu.
  await Victim.findOneAndUpdate(
    { tag_id, status_korban: { $ne: "arrived" } },
    {
      $set: {
        lokasi_terakhir: { lat, lng },
        lokasi_update_terakhir: receivedAt,
      },
    },
    { sort: { created_at: -1 } }
  );

  return location;
}

/**
 * POST /api/locations (Auth: Tidak)
 * Tag mengirim satu titik lokasi terbaru. FR-BE-01, FR-FW-05.
 */
const receiveLocation = asyncHandler(async (req, res) => {
  const errors = validateLocationPayload(req.body);
  if (errors.length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Payload lokasi tidak valid.", errors);
  }

  const location = await ingestSingleLocation(req.body);
  return sendSuccess(res, 201, { location_id: location.location_id });
});

/**
 * POST /api/locations/batch (Auth: Tidak)
 * Tag mengirim kumpulan data offline buffer sekaligus setelah koneksi pulih.
 * FR-BE-01, FR-FW-07.
 * Body: { items: [ { tag_id, lat, lng, timestamp, battery_pct }, ... ] }
 */
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

// Sama dengan ONLINE_WINDOW_MS di deviceController: heartbeat tiap 5 dtk,
// dianggap offline setelah 30 dtk tanpa kabar.
const ONLINE_WINDOW_MS = 30 * 1000;

function victimSummary(victim) {
  if (!victim) return null;
  return {
    victim_id: victim.victim_id,
    nama: victim.nama,
    kategori_triase: victim.kategori_triase,
    status_korban: victim.status_korban,
  };
}

/**
 * GET /api/locations/latest (Auth: Ya, koordinator)
 * Satu titik terakhir per tag, digabung dengan korban aktif bila ada.
 * Dipakai peta dashboard & alert GPS/baterai/darurat.
 *
 * Sumber utama: field `latest_location` di koleksi `tags` (diisi tiap
 * POST /api/locations), jadi tidak perlu aggregation di koleksi `locations`.
 * Tag yang belum diregistrasi tetap ikut (victim: null) - bug B2 Pekan 6.
 *
 * Query opsional: ?since_minutes=N -> abaikan tag yang tidak mengirim
 * lokasi lebih dari N menit.
 */
const getLatestLocations = asyncHandler(async (req, res) => {
  const now = new Date();
  const sinceMinutes = Number(req.query.since_minutes);
  const since = sinceMinutes > 0 ? new Date(now.getTime() - sinceMinutes * 60 * 1000) : null;

  const [tags, activeVictims] = await Promise.all([
    Tag.find({ "latest_location.lat": { $ne: null } }).lean(),
    Victim.find({ status_korban: { $ne: "arrived" } }).sort({ created_at: -1 }).lean(),
  ]);

  // Satu tag hanya boleh punya satu korban aktif (DUPLICATE_ACTIVE_VICTIM),
  // tapi kalau ada data lama yang dobel, ambil yang terbaru (sort di atas).
  const victimByTag = new Map();
  for (const v of activeVictims) {
    if (!victimByTag.has(v.tag_id)) victimByTag.set(v.tag_id, v);
  }

  const items = tags.map((tag) => {
    const loc = tag.latest_location;
    return {
      tag_id: tag.tag_id,
      lat: loc.lat,
      lng: loc.lng,
      gps_fix: tag.gps_status === "fixed",
      gps_status: tag.gps_status,
      battery_pct: tag.battery_pct ?? null,
      device_timestamp: loc.timestamp,
      // Data sebelum field received_at ada: pakai last_seen/timestamp.
      received_at: loc.received_at ?? tag.last_seen ?? loc.timestamp,
      online: Boolean(tag.last_seen && now - new Date(tag.last_seen) <= ONLINE_WINDOW_MS),
      last_seen: tag.last_seen,
      last_button_pressed_at: tag.last_button_pressed_at,
      victim: victimSummary(victimByTag.get(tag.tag_id)),
    };
  });

  // Korban yang punya lokasi_terakhir tapi tag-nya belum pernah mengirim
  // lewat POST /api/locations (data lama / input manual) tetap ditampilkan.
  const tagIds = new Set(items.map((i) => i.tag_id));
  for (const v of victimByTag.values()) {
    if (tagIds.has(v.tag_id) || v.lokasi_terakhir?.lat == null || v.lokasi_terakhir?.lng == null) continue;
    items.push({
      tag_id: v.tag_id,
      lat: v.lokasi_terakhir.lat,
      lng: v.lokasi_terakhir.lng,
      gps_fix: true,
      gps_status: "unknown",
      battery_pct: null,
      device_timestamp: null,
      received_at: v.lokasi_update_terakhir ?? v.waktu_update_terakhir,
      online: false,
      last_seen: null,
      last_button_pressed_at: null,
      victim: victimSummary(v),
    });
  }

  const filtered = since ? items.filter((i) => new Date(i.received_at) >= since) : items;

  return sendSuccess(res, 200, { server_time: now.toISOString(), items: filtered });
});

module.exports = { receiveLocation, receiveLocationBatch, getLatestLocations };
