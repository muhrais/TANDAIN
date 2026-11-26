/**
 * Alat rekap uji GPS (S-01 TTFF, S-02 galat, S-09, R-02).
 *
 * Alur di lapangan:
 *   1. npm run gps-report -- --start "S-02 titik A" --id-uji S-02 --acuan -6.3612,106.8249 --tags GPS-001,GPS-002
 *      -> mencetak session_id, sesi mulai dihitung sejak saat ini
 *   2. biarkan gelang mengirim data (mis. 10 menit)
 *   3. npm run gps-report -- --stop TS-xxxxxxxx
 *      -> sesi dihentikan, ringkasan per perangkat dicetak dan disimpan ke CSV,
 *         plus CSV per titik (scatter plot vs titik acuan) dan per tekanan tombol
 *
 * Opsi lain:
 *   --report TS-xxxxxxxx   cetak ringkasan sesi (boleh saat sesi masih berjalan)
 *   --list                 daftar sesi terakhir
 *   --interval S           interval kirim lokasi firmware, detik (default 5 = firmware cloud dan
 *                          GPS-002/003 lapangan; GPS-001 lapangan pakai 10)
 *   --catatan "..."        kondisi uji (lokasi, casing, daya)
 *   --base URL             alamat backend (default http://localhost:3000)
 *   --user U --pass P      akun koordinator (default koordinator1 / koordinator123)
 *   --out PATH             file CSV ringkasan (default scripts/out/gps_<session_id>.csv)
 *   --no-points            jangan tulis CSV per titik dan per tombol
 *
 * File keluaran --stop / --report (folder scripts/out/):
 *   gps_<id>.csv          ringkasan per gelang (galat, kontinuitas, TTFF, uplink, tombol, RSSI)
 *   gps_points_<id>.csv   satu baris per titik lokasi: jam, uplink, lat/lng, galat,
 *                         satelit/HDOP/RSSI dari heartbeat terakhir sebelum titik itu
 *   gps_button_<id>.csv   satu baris per tekanan tombol: jam tekan, jam terima, uplink
 *
 * uplink_ms = jam server terima - jam ESP kirim (NTP). Kosong bila firmware belum
 * mengirim sent_at atau jam ESP belum sinkron.
 */
const path = require("path");
const { parseArgs, writeCsv } = require("./lib/util");

const args = parseArgs();
const BASE = String(args.base ?? "http://localhost:3000").replace(/\/$/, "");
const USER = String(args.user ?? "koordinator1");
const PASS = String(args.pass ?? "koordinator123");
const DEFAULT_INTERVAL_DTK = 5;

async function call(method, p, token, body) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${method} ${p} -> ${res.status} ${json?.error?.message ?? json?.message ?? ""}`);
  }
  return json.data;
}

const COLUMNS = [
  "tag_id",
  "lokasi_diterima",
  "lokasi_diharapkan",
  "kontinuitas_pct",
  "jeda_maks_dtk",
  "galat_rata_m",
  "galat_p50_m",
  "galat_p95_m",
  "galat_maks_m",
  "uplink_n",
  "uplink_rata_ms",
  "uplink_p50_ms",
  "uplink_p95_ms",
  "uplink_maks_ms",
  "tombol_n",
  "tombol_uplink_n",
  "tombol_uplink_rata_ms",
  "tombol_uplink_p95_ms",
  "tombol_uplink_maks_ms",
  "ttff_dtk",
  "hdop_rata",
  "satelit_rata",
  "rssi_rata",
  "heartbeat_diterima",
  "baterai_awal_pct",
  "baterai_akhir_pct",
  "uptime_maks_dtk",
  "reboot",
];

function printReport(summary) {
  const s = summary.session;
  console.log(`\n=== ${s.session_id} · ${s.nama}${s.id_uji ? ` (${s.id_uji})` : ""} ===`);
  console.log(`Durasi ${summary.durasi_dtk} dtk${summary.berjalan ? " (masih berjalan)" : ""}`);
  if (s.titik_acuan?.lat !== null && s.titik_acuan?.lat !== undefined) {
    console.log(`Titik acuan ${s.titik_acuan.lat}, ${s.titik_acuan.lng}`);
  }
  if (summary.perangkat.length === 0) {
    console.log("Belum ada data perangkat di rentang sesi ini.");
    return;
  }
  console.table(
    summary.perangkat.map((p) => ({
      tag: p.tag_id,
      lokasi: `${p.lokasi_diterima}/${p.lokasi_diharapkan}`,
      "kontinuitas%": p.kontinuitas_pct,
      "jeda maks (s)": p.jeda_maks_dtk,
      "galat rata (m)": p.galat_rata_m,
      "galat p95 (m)": p.galat_p95_m,
      "uplink rata/p95 (ms)": p.uplink_n ? `${p.uplink_rata_ms}/${p.uplink_p95_ms}` : "-",
      tombol: p.tombol_n,
      "tombol uplink rata (ms)": p.tombol_uplink_n ? p.tombol_uplink_rata_ms : "-",
      "TTFF (s)": p.ttff_dtk,
      HDOP: p.hdop_rata,
      RSSI: p.rssi_rata,
      baterai: p.baterai_awal_pct === null ? "-" : `${p.baterai_awal_pct}->${p.baterai_akhir_pct}`,
      reboot: p.reboot,
    }))
  );
}

function saveCsv(summary) {
  const s = summary.session;
  const out = args.out ? String(args.out) : path.join(__dirname, "out", `gps_${s.session_id}.csv`);
  const header = ["session_id", "nama", "id_uji", "durasi_dtk", ...COLUMNS, "catatan"];
  const rows = summary.perangkat.map((p) => [
    s.session_id,
    s.nama,
    s.id_uji ?? "",
    summary.durasi_dtk,
    ...COLUMNS.map((c) => p[c] ?? ""),
    s.catatan ?? "",
  ]);
  console.log(`CSV: ${writeCsv(out, header, rows)}`);
}

const POINT_COLUMNS = [
  "tag_id",
  "received_at",
  "sent_at",
  "uplink_ms",
  "lat",
  "lng",
  "galat_m",
  "satellites",
  "hdop",
  "rssi",
  "heartbeat_at",
];
const BUTTON_COLUMNS = ["tag_id", "sent_at", "received_at", "uplink_ms", "lat", "lng", "satellites"];

function savePointsCsv(data) {
  const s = data.session;
  const outDir = path.join(__dirname, "out");
  const acuan = s.titik_acuan ?? {};
  // Titik acuan ikut di tiap baris supaya CSV bisa langsung dipakai scatter plot.
  const pointRows = data.points.map((p) => [
    s.session_id,
    ...POINT_COLUMNS.map((c) => p[c] ?? ""),
    acuan.lat ?? "",
    acuan.lng ?? "",
  ]);
  const pointsFile = writeCsv(
    path.join(outDir, `gps_points_${s.session_id}.csv`),
    ["session_id", ...POINT_COLUMNS, "acuan_lat", "acuan_lng"],
    pointRows
  );
  const buttonFile = writeCsv(
    path.join(outDir, `gps_button_${s.session_id}.csv`),
    ["session_id", ...BUTTON_COLUMNS],
    data.tombol.map((b) => [s.session_id, ...BUTTON_COLUMNS.map((c) => b[c] ?? "")])
  );
  const withUplink = data.points.filter((p) => p.uplink_ms !== null).length;
  console.log(`CSV titik: ${pointsFile} (${data.points.length} titik, ${withUplink} dengan uplink)`);
  console.log(`CSV tombol: ${buttonFile} (${data.tombol.length} tekanan)`);
}

async function main() {
  const login = await call("POST", "/api/auth/login", null, { username: USER, password: PASS });
  const token = login.token;

  if (args.start) {
    const acuan = args.acuan ? String(args.acuan).split(",").map(Number) : null;
    if (args.interval === undefined) {
      console.log(
        `Peringatan: --interval tidak diisi, dipakai ${DEFAULT_INTERVAL_DTK} dtk. ` +
          "Isi --interval 10 bila memakai sketch GPS-001 lapangan."
      );
    }
    const session = await call("POST", "/api/test-sessions", token, {
      nama: String(args.start),
      id_uji: args["id-uji"] ? String(args["id-uji"]) : null,
      tag_ids: args.tags ? String(args.tags).split(",").map((t) => t.trim()) : [],
      titik_acuan: acuan ? { lat: acuan[0], lng: acuan[1] } : null,
      interval_lokasi_dtk: Number(args.interval ?? DEFAULT_INTERVAL_DTK),
      catatan: args.catatan ? String(args.catatan) : "",
    });
    console.log(`Sesi dimulai: ${session.session_id} (${session.nama})`);
    console.log(`Hentikan dengan: npm run gps-report -- --stop ${session.session_id}`);
    return;
  }

  if (args.list) {
    const sessions = await call("GET", "/api/test-sessions", token);
    console.table(
      sessions.map((s) => ({
        session_id: s.session_id,
        nama: s.nama,
        id_uji: s.id_uji,
        mulai: new Date(s.started_at).toLocaleString("id-ID"),
        selesai: s.stopped_at ? new Date(s.stopped_at).toLocaleString("id-ID") : "berjalan",
      }))
    );
    return;
  }

  const id = args.stop ?? args.report;
  if (!id || id === true) {
    console.log("Pakai --start NAMA, --stop ID, --report ID, atau --list. Lihat komentar di atas file.");
    process.exitCode = 1;
    return;
  }
  if (args.stop) await call("POST", `/api/test-sessions/${id}/stop`, token);
  const summary = await call("GET", `/api/test-sessions/${id}/summary`, token);
  printReport(summary);
  saveCsv(summary);
  if (!args["no-points"]) {
    savePointsCsv(await call("GET", `/api/test-sessions/${id}/points`, token));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
