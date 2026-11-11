#!/usr/bin/env node
/**
 * Pantau gelang secara langsung dari database (MONGODB_URI di .env, mis. Atlas).
 *
 *   npm run monitor                     # semua gelang, refresh tiap 3 dtk
 *   npm run monitor -- --tag GPS-003    # satu gelang
 *   npm run monitor -- --interval 5     # refresh tiap 5 dtk
 *   npm run monitor -- --once           # cetak sekali lalu keluar
 *
 * Kolom:
 *   ONLINE   heartbeat terakhir <= 30 dtk (sama dengan backend)
 *   HB/mnt   jumlah heartbeat 60 dtk terakhir (dari device_telemetry)
 *   GPS      status, satelit, umur titik lokasi terakhir
 *   TRIASE   kategori korban aktif di gelang (sumber warna LED)
 *   LED      perintah server -> warna yang dilaporkan gelang (bila firmware
 *            mengirim led_state); "sinkron" bila sama
 *   TOMBOL   jumlah tekan, waktu tekan terakhir
 *
 * Hanya membaca; tidak mengubah data.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const ONCE = args.includes("--once") || !process.stdout.isTTY;
const INTERVAL_S = Math.max(1, Number(opt("--interval", 3)) || 3);
const TAG = opt("--tag", null);
const ONLINE_WINDOW_MS = 30 * 1000;

const C = process.stdout.isTTY
  ? { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" }
  : { g: "", r: "", y: "", d: "", b: "", x: "" };

function ago(date, now) {
  if (!date) return "-";
  const s = Math.max(0, Math.round((now - new Date(date)) / 1000));
  if (s < 60) return `${s} dtk`;
  if (s < 3600) return `${Math.round(s / 60)} mnt`;
  if (s < 86400) return `${Math.round(s / 3600)} jam`;
  return `${Math.round(s / 86400)} hari`;
}

function pad(text, width) {
  const plain = String(text).replace(/\x1b\[[0-9;]*m/g, "");
  return String(text) + " ".repeat(Math.max(0, width - plain.length));
}

const TRIASE_COLOR = { merah: C.r, kuning: C.y, hijau: C.g };
const paint = (value) => (TRIASE_COLOR[value] ? `${TRIASE_COLOR[value]}${value}${C.x}` : value ?? "-");

async function snapshot(db) {
  const now = new Date();
  // Hanya gelang yang pernah mengirim heartbeat (sama dengan halaman Perangkat).
  const filter = TAG ? { tag_id: TAG } : { last_seen: { $ne: null } };
  const tags = await db.collection("tags").find(filter).sort({ tag_id: 1 }).toArray();
  const ids = tags.map((t) => t.tag_id);

  const [victims, beats] = await Promise.all([
    db
      .collection("victims")
      .find({ tag_id: { $in: ids }, status_korban: { $ne: "arrived" } })
      .sort({ created_at: -1 })
      .toArray(),
    db
      .collection("device_telemetry")
      .aggregate([
        { $match: { tag_id: { $in: ids }, received_at: { $gte: new Date(now - 60 * 1000) } } },
        { $group: { _id: "$tag_id", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const victimByTag = new Map();
  for (const v of victims) if (!victimByTag.has(v.tag_id)) victimByTag.set(v.tag_id, v);
  const beatsByTag = new Map(beats.map((b) => [b._id, b.n]));

  const rows = tags.map((t) => {
    const online = t.last_seen && now - new Date(t.last_seen) <= ONLINE_WINDOW_MS;
    const victim = victimByTag.get(t.tag_id);
    const loc = t.latest_location?.received_at;
    const ledReported = t.led_state ?? null;
    const ledCommand = t.led_command ?? "-";
    let led = paint(ledCommand);
    if (ledReported) {
      led += ledReported === ledCommand ? ` ${C.g}sinkron${C.x}` : ` -> ${paint(ledReported)} ${C.y}belum sinkron${C.x}`;
    } else {
      led += ` ${C.d}(gelang tidak lapor)${C.x}`;
    }
    return [
      `${C.b}${t.tag_id}${C.x}`,
      online ? `${C.g}ONLINE${C.x}` : `${C.r}offline${C.x}`,
      ago(t.last_seen, now),
      String(beatsByTag.get(t.tag_id) ?? 0),
      `${t.gps_status ?? "-"} ${t.satellites ?? 0} sat${loc ? `, lok ${ago(loc, now)}` : ""}`,
      victim ? `${paint(victim.kategori_triase)} ${C.d}${victim.nama || "(tanpa nama)"}${C.x}` : `${C.d}bebas${C.x}`,
      led,
      `${t.button_press_count ?? 0}x${t.last_button_pressed_at ? `, ${ago(t.last_button_pressed_at, now)}` : ""}`,
      t.ip_address ?? "-",
    ];
  });
  return { now, rows };
}

function render({ now, rows }, dbName) {
  const head = ["GELANG", "STATUS", "TERAKHIR", "HB/mnt", "GPS", "TRIASE", "LED", "TOMBOL", "IP"];
  const all = [head.map((h) => `${C.d}${h}${C.x}`), ...rows];
  const widths = head.map((_, i) => Math.max(...all.map((r) => String(r[i]).replace(/\x1b\[[0-9;]*m/g, "").length)) + 2);
  const lines = [
    `${C.b}TANDAIN monitor gelang${C.x} ${C.d}db ${dbName} · ${now.toLocaleTimeString("id-ID")} · refresh ${ONCE ? "sekali" : `${INTERVAL_S} dtk`}${C.x}`,
    "",
    ...all.map((r) => r.map((cell, i) => pad(cell, widths[i])).join("")),
  ];
  if (rows.length === 0) lines.push(TAG ? `Gelang ${TAG} tidak ditemukan.` : "Belum ada gelang yang pernah mengirim heartbeat.");
  if (!ONCE) lines.push("", `${C.d}Ctrl+C untuk keluar${C.x}`);
  return lines.join("\n");
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI belum diatur di .env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  const tick = async () => {
    try {
      const out = render(await snapshot(db), db.databaseName);
      if (!ONCE) process.stdout.write("\x1b[2J\x1b[H");
      console.log(out);
    } catch (err) {
      console.error(`[monitor] ${err.message}`);
    }
  };

  await tick();
  if (ONCE) return mongoose.disconnect();

  const timer = setInterval(tick, INTERVAL_S * 1000);
  process.on("SIGINT", async () => {
    clearInterval(timer);
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`[monitor] ${err.message}`);
  process.exit(1);
});
