const TestSession = require("../models/TestSession");
const Location = require("../models/Location");
const DeviceTelemetry = require("../models/DeviceTelemetry");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const isLat = (v) => typeof v === "number" && v >= -90 && v <= 90;
const isLng = (v) => typeof v === "number" && v >= -180 && v <= 180;

// Jarak dua titik di permukaan bumi (meter).
function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1))];
}

const round = (v, d = 1) => (v === null || v === undefined ? null : Number(v.toFixed(d)));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

async function findSession(id) {
  const session = await TestSession.findOne({ session_id: id });
  if (!session) throw new ApiError(404, "TEST_SESSION_NOT_FOUND", "Sesi uji tidak ditemukan.");
  return session;
}

/**
 * POST /api/test-sessions (koordinator)
 * Body: { nama, id_uji?, tag_ids?, titik_acuan?: {lat,lng}, interval_lokasi_dtk?, catatan? }
 * tag_ids kosong = semua perangkat yang mengirim data selama sesi.
 */
const createTestSession = asyncHandler(async (req, res) => {
  const { nama, id_uji = null, tag_ids = [], titik_acuan = null, interval_lokasi_dtk = 10, catatan = "" } =
    req.body;

  if (!nama || typeof nama !== "string") {
    throw new ApiError(422, "VALIDATION_ERROR", "nama sesi wajib diisi.");
  }
  if (!Array.isArray(tag_ids) || tag_ids.some((t) => typeof t !== "string")) {
    throw new ApiError(422, "VALIDATION_ERROR", "tag_ids harus array string.");
  }
  if (titik_acuan && !(isLat(titik_acuan.lat) && isLng(titik_acuan.lng))) {
    throw new ApiError(422, "VALIDATION_ERROR", "titik_acuan harus berisi lat dan lng yang valid.");
  }
  if (typeof interval_lokasi_dtk !== "number" || interval_lokasi_dtk <= 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "interval_lokasi_dtk harus angka positif.");
  }

  const session = await TestSession.create({
    nama: nama.trim(),
    id_uji,
    tag_ids,
    titik_acuan: titik_acuan || { lat: null, lng: null },
    interval_lokasi_dtk,
    catatan,
    dibuat_oleh: req.user ? req.user.user_id : null,
  });
  return sendSuccess(res, 201, session);
});

// POST /api/test-sessions/:id/stop
const stopTestSession = asyncHandler(async (req, res) => {
  const session = await findSession(req.params.id);
  if (session.stopped_at) {
    throw new ApiError(409, "TEST_SESSION_STOPPED", "Sesi uji sudah dihentikan.");
  }
  session.stopped_at = new Date();
  await session.save();
  return sendSuccess(res, 200, session);
});

// GET /api/test-sessions
const listTestSessions = asyncHandler(async (_req, res) => {
  const sessions = await TestSession.find({}).sort({ started_at: -1 }).limit(50);
  return sendSuccess(res, 200, sessions);
});

/**
 * Ringkasan satu perangkat dalam rentang sesi:
 * - kontinuitas: titik lokasi diterima vs diharapkan (durasi / interval), jeda terpanjang
 * - galat: jarak tiap titik ke titik_acuan (rata-rata, p50, p95, maks) bila acuan diisi
 * - TTFF: ttff_ms pertama yang dilaporkan firmware selama sesi
 * - telemetri: HDOP dan satelit rata-rata, baterai awal/akhir, uptime maks,
 *   jumlah reboot (uptime turun), heartbeat diterima
 */
function summarizeTag(tagId, locations, telemetry, session, startedAt, endedAt) {
  const durationS = (endedAt - startedAt) / 1000;
  const expected = Math.max(1, Math.floor(durationS / session.interval_lokasi_dtk));

  const times = locations.map((l) => new Date(l.received_at).getTime());
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 1000);

  const acuan = session.titik_acuan;
  const hasAcuan = acuan && acuan.lat !== null && acuan.lng !== null;
  const errors = hasAcuan ? locations.map((l) => haversineM(acuan, { lat: l.latitude, lng: l.longitude })) : [];

  const ttff = telemetry.find((t) => typeof t.ttff_ms === "number");
  const pick = (field) => telemetry.map((t) => t[field]).filter((v) => typeof v === "number");
  const hdops = pick("hdop");
  const sats = pick("satellites");
  const batteries = pick("battery_pct");
  const uptimes = pick("uptime_ms");
  const reboots = uptimes.slice(1).filter((u, i) => u < uptimes[i]).length;

  return {
    tag_id: tagId,
    lokasi_diterima: locations.length,
    lokasi_diharapkan: expected,
    kontinuitas_pct: round(Math.min(100, (locations.length / expected) * 100)),
    jeda_maks_dtk: gaps.length ? round(Math.max(...gaps)) : null,
    galat_rata_m: round(mean(errors)),
    galat_p50_m: round(percentile(errors, 50)),
    galat_p95_m: round(percentile(errors, 95)),
    galat_maks_m: errors.length ? round(Math.max(...errors)) : null,
    ttff_dtk: ttff ? round(ttff.ttff_ms / 1000) : null,
    hdop_rata: round(mean(hdops), 2),
    satelit_rata: round(mean(sats)),
    heartbeat_diterima: telemetry.length,
    baterai_awal_pct: batteries.length ? batteries[0] : null,
    baterai_akhir_pct: batteries.length ? batteries[batteries.length - 1] : null,
    uptime_maks_dtk: uptimes.length ? round(Math.max(...uptimes) / 1000) : null,
    reboot: reboots,
  };
}

// GET /api/test-sessions/:id/summary
const getTestSessionSummary = asyncHandler(async (req, res) => {
  const session = await findSession(req.params.id);
  const startedAt = new Date(session.started_at);
  const endedAt = session.stopped_at ? new Date(session.stopped_at) : new Date();
  const range = { $gte: startedAt, $lte: endedAt };
  const tagFilter = session.tag_ids.length ? { tag_id: { $in: session.tag_ids } } : {};

  const [locations, telemetry] = await Promise.all([
    Location.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
    DeviceTelemetry.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
  ]);

  const tagIds = session.tag_ids.length
    ? session.tag_ids
    : [...new Set([...locations, ...telemetry].map((d) => d.tag_id))].sort();

  const perangkat = tagIds.map((tagId) =>
    summarizeTag(
      tagId,
      locations.filter((l) => l.tag_id === tagId),
      telemetry.filter((t) => t.tag_id === tagId),
      session,
      startedAt,
      endedAt
    )
  );

  return sendSuccess(res, 200, {
    session: session.toJSON(),
    durasi_dtk: round((endedAt - startedAt) / 1000),
    berjalan: !session.stopped_at,
    perangkat,
  });
});

module.exports = {
  createTestSession,
  stopTestSession,
  listTestSessions,
  getTestSessionSummary,
};
