const TestSession = require("../models/TestSession");
const Location = require("../models/Location");
const DeviceTelemetry = require("../models/DeviceTelemetry");
const ButtonEvent = require("../models/ButtonEvent");
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
const maxOf = (values) => (values.length ? Math.max(...values) : null);
const numbers = (docs, field) => docs.map((d) => d[field]).filter((v) => typeof v === "number");

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
  const { nama, id_uji = null, tag_ids = [], titik_acuan = null, interval_lokasi_dtk = 5, catatan = "" } =
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
 * - telemetri: HDOP, satelit, dan RSSI rata-rata, baterai awal/akhir, uptime maks,
 *   jumlah reboot (uptime turun), heartbeat diterima
 * - uplink: latensi ESP -> server (received_at - sent_at) untuk lokasi dan
 *   tombol darurat; hanya titik yang membawa sent_at valid
 */
function summarizeTag(tagId, locations, telemetry, buttons, session, startedAt, endedAt) {
  const durationS = (endedAt - startedAt) / 1000;
  const expected = Math.max(1, Math.floor(durationS / session.interval_lokasi_dtk));

  const times = locations.map((l) => new Date(l.received_at).getTime());
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 1000);

  const acuan = session.titik_acuan;
  const hasAcuan = acuan && acuan.lat !== null && acuan.lng !== null;
  const errors = hasAcuan ? locations.map((l) => haversineM(acuan, { lat: l.latitude, lng: l.longitude })) : [];

  const ttff = telemetry.find((t) => typeof t.ttff_ms === "number");
  const hdops = numbers(telemetry, "hdop");
  const sats = numbers(telemetry, "satellites");
  const rssis = numbers(telemetry, "rssi");
  const batteries = numbers(telemetry, "battery_pct");
  const uptimes = numbers(telemetry, "uptime_ms");
  const reboots = uptimes.slice(1).filter((u, i) => u < uptimes[i]).length;
  const uplinks = numbers(locations, "uplink_ms");
  const buttonUplinks = numbers(buttons, "uplink_ms");

  return {
    tag_id: tagId,
    lokasi_diterima: locations.length,
    lokasi_diharapkan: expected,
    kontinuitas_pct: round(Math.min(100, (locations.length / expected) * 100)),
    jeda_maks_dtk: gaps.length ? round(Math.max(...gaps)) : null,
    galat_rata_m: round(mean(errors)),
    galat_p50_m: round(percentile(errors, 50)),
    galat_p95_m: round(percentile(errors, 95)),
    galat_maks_m: round(maxOf(errors)),
    uplink_n: uplinks.length,
    uplink_rata_ms: round(mean(uplinks), 0),
    uplink_p50_ms: percentile(uplinks, 50),
    uplink_p95_ms: percentile(uplinks, 95),
    uplink_maks_ms: maxOf(uplinks),
    tombol_n: buttons.length,
    tombol_uplink_n: buttonUplinks.length,
    tombol_uplink_rata_ms: round(mean(buttonUplinks), 0),
    tombol_uplink_p95_ms: percentile(buttonUplinks, 95),
    tombol_uplink_maks_ms: maxOf(buttonUplinks),
    ttff_dtk: ttff ? round(ttff.ttff_ms / 1000) : null,
    hdop_rata: round(mean(hdops), 2),
    satelit_rata: round(mean(sats)),
    rssi_rata: round(mean(rssis)),
    heartbeat_diterima: telemetry.length,
    baterai_awal_pct: batteries.length ? batteries[0] : null,
    baterai_akhir_pct: batteries.length ? batteries[batteries.length - 1] : null,
    uptime_maks_dtk: uptimes.length ? round(Math.max(...uptimes) / 1000) : null,
    reboot: reboots,
  };
}

function sessionWindow(session) {
  const startedAt = new Date(session.started_at);
  const endedAt = session.stopped_at ? new Date(session.stopped_at) : new Date();
  const tagFilter = session.tag_ids.length ? { tag_id: { $in: session.tag_ids } } : {};
  return { startedAt, endedAt, range: { $gte: startedAt, $lte: endedAt }, tagFilter };
}

function sessionTagIds(session, docs) {
  return session.tag_ids.length ? session.tag_ids : [...new Set(docs.map((d) => d.tag_id))].sort();
}

// GET /api/test-sessions/:id/summary
const getTestSessionSummary = asyncHandler(async (req, res) => {
  const session = await findSession(req.params.id);
  const { startedAt, endedAt, range, tagFilter } = sessionWindow(session);

  const [locations, telemetry, buttons] = await Promise.all([
    Location.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
    DeviceTelemetry.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
    ButtonEvent.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
  ]);

  const tagIds = sessionTagIds(session, [...locations, ...telemetry, ...buttons]);

  const perangkat = tagIds.map((tagId) =>
    summarizeTag(
      tagId,
      locations.filter((l) => l.tag_id === tagId),
      telemetry.filter((t) => t.tag_id === tagId),
      buttons.filter((b) => b.tag_id === tagId),
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

// Heartbeat sebelum sesi mulai ikut dicari, supaya titik pertama tetap punya
// satelit/HDOP/RSSI dari heartbeat terakhir sebelum sesi.
const TELEMETRY_LOOKBACK_MS = 60 * 1000;

const ms = (d) => new Date(d).getTime();

/**
 * GET /api/test-sessions/:id/points (koordinator)
 * Semua titik lokasi dalam rentang sesi (untuk scatter plot sebaran titik vs
 * titik acuan) dan semua tekanan tombol. Tiap titik digabung dengan heartbeat
 * terakhir tag itu yang diterima sebelum atau bersamaan dengan titik tersebut.
 */
const getTestSessionPoints = asyncHandler(async (req, res) => {
  const session = await findSession(req.params.id);
  const { startedAt, endedAt, range, tagFilter } = sessionWindow(session);
  const telemetryRange = { $gte: new Date(startedAt.getTime() - TELEMETRY_LOOKBACK_MS), $lte: endedAt };

  const [locations, telemetry, buttons] = await Promise.all([
    Location.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
    DeviceTelemetry.find({ ...tagFilter, received_at: telemetryRange })
      .select("tag_id received_at satellites hdop rssi")
      .sort({ received_at: 1 })
      .lean(),
    ButtonEvent.find({ ...tagFilter, received_at: range }).sort({ received_at: 1 }).lean(),
  ]);

  const acuan = session.titik_acuan;
  const hasAcuan = acuan && acuan.lat !== null && acuan.lng !== null;

  const telemetryByTag = new Map();
  for (const t of telemetry) {
    if (!telemetryByTag.has(t.tag_id)) telemetryByTag.set(t.tag_id, []);
    telemetryByTag.get(t.tag_id).push(t);
  }

  // Lokasi dan telemetri sama-sama terurut received_at: cukup satu penunjuk per tag.
  const cursor = new Map();
  const points = locations.map((l) => {
    const list = telemetryByTag.get(l.tag_id) ?? [];
    let i = cursor.get(l.tag_id) ?? -1;
    while (i + 1 < list.length && ms(list[i + 1].received_at) <= ms(l.received_at)) i += 1;
    cursor.set(l.tag_id, i);
    const hb = i >= 0 ? list[i] : null;

    return {
      tag_id: l.tag_id,
      received_at: l.received_at,
      sent_at: l.sent_at ?? null,
      uplink_ms: l.uplink_ms ?? null,
      lat: l.latitude,
      lng: l.longitude,
      galat_m: hasAcuan ? round(haversineM(acuan, { lat: l.latitude, lng: l.longitude }), 2) : null,
      satellites: hb?.satellites ?? null,
      hdop: hb?.hdop ?? null,
      rssi: hb?.rssi ?? null,
      heartbeat_at: hb?.received_at ?? null,
    };
  });

  const tombol = buttons.map((b) => ({
    tag_id: b.tag_id,
    received_at: b.received_at,
    sent_at: b.sent_at ?? null,
    uplink_ms: b.uplink_ms ?? null,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    satellites: b.satellites ?? null,
  }));

  return sendSuccess(res, 200, {
    session: session.toJSON(),
    tag_ids: sessionTagIds(session, [...locations, ...buttons]),
    points,
    tombol,
  });
});

module.exports = {
  createTestSession,
  stopTestSession,
  listTestSessions,
  getTestSessionSummary,
  getTestSessionPoints,
};
