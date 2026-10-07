/**
 * Simulator tag virtual TANDAIN (uji S-08s, P-03, P-04, R-01s).
 *
 * Meniru firmware ESP32 (firmware/GPS-00x): heartbeat ke
 * POST /api/devices/heartbeat dan lokasi ke POST /api/locations, dengan
 * format payload yang sama. Setiap tag berjalan acak (random walk) di
 * sekitar titik pusat.
 *
 * Contoh:
 *   npm run sim -- --count 10 --interval 10 --duration 600
 *   npm run sim -- --count 50 --interval 10 --duration 600          (uji beban P-04)
 *   npm run sim -- --count 5 --offline 60-180 --batch-on-reconnect  (uji offline R-01s)
 *
 * Opsi:
 *   --count N             jumlah tag (default 10)
 *   --interval S          interval kirim lokasi, detik (default 10, sama dengan firmware)
 *   --heartbeat S         interval heartbeat, detik; 0 = mati (default 5)
 *   --duration S          lama simulasi, detik (default 600)
 *   --base URL            alamat backend (default http://localhost:3000)
 *   --prefix P            awalan tag_id (default SIM -> SIM-001, SIM-002, ...)
 *   --center LAT,LNG      titik pusat (default -6.3612,106.8249, Pos Triase Utama)
 *   --drop-rate R         peluang paket sengaja tidak dikirim, 0..1 (default 0)
 *   --offline A-B         detik ke-A s.d. B semua tag "offline": lokasi disimpan di buffer
 *   --batch-on-reconnect  kirim isi buffer lewat POST /api/locations/batch saat online lagi
 *   --out PATH            file CSV log (default scripts/out/sim_<waktu>.csv)
 *
 * Log CSV per kiriman: tag_id, seq, kind, sent_at, status_code, latency_ms, items.
 * kind: location | heartbeat | batch | buffered | dropped
 */
const { parseArgs, stats, writeCsv, defaultOutPath } = require("./lib/util");

const args = parseArgs();
const COUNT = Number(args.count ?? 10);
const INTERVAL_MS = Number(args.interval ?? 10) * 1000;
const HEARTBEAT_MS = Number(args.heartbeat ?? 5) * 1000;
const DURATION_MS = Number(args.duration ?? 600) * 1000;
const BASE = String(args.base ?? "http://localhost:3000").replace(/\/$/, "");
const PREFIX = String(args.prefix ?? "SIM");
const [CENTER_LAT, CENTER_LNG] = String(args.center ?? "-6.3612,106.8249").split(",").map(Number);
const DROP_RATE = Number(args["drop-rate"] ?? 0);
const OFFLINE = args.offline ? String(args.offline).split("-").map((s) => Number(s) * 1000) : null;
const BATCH_ON_RECONNECT = Boolean(args["batch-on-reconnect"]);
const OUT = args.out ? String(args.out) : defaultOutPath("sim");

// ±5 m per langkah (1° lintang ≈ 111 km).
const STEP_DEG = 5 / 111000;
const startedAt = Date.now();
const rows = [];

function isOffline() {
  if (!OFFLINE) return false;
  const elapsed = Date.now() - startedAt;
  return elapsed >= OFFLINE[0] && elapsed < OFFLINE[1];
}

async function post(path, body) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, latency: Math.round(performance.now() - t0), json };
  } catch {
    return { status: 0, latency: Math.round(performance.now() - t0), json: null };
  }
}

function log(tag, kind, status, latency, items = "") {
  rows.push([tag.tag_id, tag.seq, kind, new Date().toISOString(), status, latency, items]);
}

function createTag(index) {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 0.0008; // sebar awal ±90 m
  return {
    tag_id: `${PREFIX}-${String(index + 1).padStart(3, "0")}`,
    lat: CENTER_LAT + radius * Math.sin(angle),
    lng: CENTER_LNG + radius * Math.cos(angle),
    battery: 100 - Math.floor(Math.random() * 30),
    seq: 0,
    buffer: [],
  };
}

async function sendLocation(tag) {
  tag.seq += 1;
  tag.lat += (Math.random() - 0.5) * 2 * STEP_DEG;
  tag.lng += (Math.random() - 0.5) * 2 * STEP_DEG;
  if (tag.seq % 30 === 0) tag.battery = Math.max(0, tag.battery - 1);

  const payload = {
    tag_id: tag.tag_id,
    lat: Number(tag.lat.toFixed(6)),
    lng: Number(tag.lng.toFixed(6)),
    timestamp: new Date().toISOString(),
    battery_pct: tag.battery,
  };

  if (isOffline()) {
    tag.buffer.push(payload);
    log(tag, "buffered", 0, 0);
    return;
  }

  if (tag.buffer.length > 0) {
    const items = tag.buffer.splice(0);
    if (BATCH_ON_RECONNECT) {
      const r = await post("/api/locations/batch", { items });
      log(tag, "batch", r.status, r.latency, r.json?.data?.synced_count ?? 0);
    }
  }

  if (DROP_RATE > 0 && Math.random() < DROP_RATE) {
    log(tag, "dropped", 0, 0);
    return;
  }

  const r = await post("/api/locations", payload);
  log(tag, "location", r.status, r.latency);
}

async function sendHeartbeat(tag) {
  if (isOffline()) return;
  const r = await post("/api/devices/heartbeat", {
    tag_id: tag.tag_id,
    gps_status: "fixed",
    satellites: 6 + Math.floor(Math.random() * 5),
    ip_address: null,
  });
  log(tag, "heartbeat", r.status, r.latency);
}

function summarize() {
  const ok = (r) => r[4] >= 200 && r[4] < 300;
  const byKind = (kind) => rows.filter((r) => r[2] === kind);

  const locations = byKind("location");
  const heartbeats = byKind("heartbeat");
  const buffered = byKind("buffered").length;
  const batchSynced = byKind("batch").reduce((sum, r) => sum + Number(r[6] || 0), 0);
  const dropped = byKind("dropped").length;
  const locOk = locations.filter(ok);
  const lat = stats(locOk.map((r) => r[5]));
  const attempted = locations.length + dropped;
  const lossPct = attempted ? (((attempted - locOk.length) / attempted) * 100).toFixed(2) : "0.00";

  console.log("\n=== Ringkasan simulasi ===");
  console.log(`Tag: ${COUNT} · interval ${INTERVAL_MS / 1000} dtk · durasi ${((Date.now() - startedAt) / 1000).toFixed(0)} dtk`);
  console.log(`Lokasi: ${locOk.length}/${attempted} tersimpan (loss ${lossPct}%), gagal HTTP ${locations.length - locOk.length}, sengaja di-drop ${dropped}`);
  console.log(`Latensi POST /api/locations (ms): avg ${lat.avg} · p50 ${lat.p50} · p95 ${lat.p95} · max ${lat.max}`);
  if (HEARTBEAT_MS > 0) {
    console.log(`Heartbeat: ${heartbeats.filter(ok).length}/${heartbeats.length} sukses`);
  }
  if (OFFLINE) {
    console.log(`Offline buffer: ${buffered} titik disimpan, ${batchSynced} tersinkron lewat batch` +
      (BATCH_ON_RECONNECT ? "" : " (batch tidak aktif, buffer dibuang)"));
  }
  const file = writeCsv(OUT, ["tag_id", "seq", "kind", "sent_at", "status_code", "latency_ms", "items"], rows);
  console.log(`Log CSV: ${file}`);
}

async function main() {
  console.log(`Simulasi ${COUNT} tag ${PREFIX}-xxx -> ${BASE} selama ${DURATION_MS / 1000} dtk (Ctrl+C untuk berhenti lebih awal)`);
  const tags = Array.from({ length: COUNT }, (_, i) => createTag(i));
  const timers = [];

  // Jadwal tiap tag digeser merata supaya tidak semua tag mengirim di detik yang sama.
  tags.forEach((tag, i) => {
    const offset = Math.floor((i * INTERVAL_MS) / COUNT);
    timers.push(setTimeout(() => {
      sendLocation(tag);
      timers.push(setInterval(() => sendLocation(tag), INTERVAL_MS));
      if (HEARTBEAT_MS > 0) {
        sendHeartbeat(tag);
        timers.push(setInterval(() => sendHeartbeat(tag), HEARTBEAT_MS));
      }
    }, offset));
  });

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach((t) => clearTimeout(t));
    // Beri waktu request yang masih berjalan untuk selesai.
    setTimeout(() => {
      summarize();
      process.exit(0);
    }, 1000);
  };
  setTimeout(finish, DURATION_MS);
  process.on("SIGINT", finish);
}

main();
