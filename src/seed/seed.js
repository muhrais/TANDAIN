/**
 * Script seeding sederhana untuk kebutuhan development/testing lokal.
 * Menjalankan: npm run seed             (tambah data yang belum ada)
 *             npm run seed -- --reset  (hapus korban/tag/lokasi/riwayat dulu)
 *
 * Membuat:
 * - 3 akun user (koordinator & petugas_pos_medis) dengan password default.
 * - 4 posko dasar (utama, merah, kuning, hijau) beserta koordinatnya.
 * - 15 tag + korban contoh (macam-macam kategori triase & status) beserta
 *   lokasi dan riwayat statusnya, supaya dashboard, peta, dan antrian
 *   langsung punya data untuk didemokan tanpa perlu tag fisik.
 *
 * PERINGATAN: Jangan gunakan password default ini di lingkungan produksi.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Posko = require("../models/Posko");
const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const StatusHistory = require("../models/StatusHistory");
const Location = require("../models/Location");

const RESET = process.argv.includes("--reset");

async function seed() {
  await connectDB();

  // --reset: kosongkan data operasional (korban, tag, lokasi, riwayat) supaya
  // tiap sesi uji mulai dari kondisi yang sama. User & posko tidak dihapus.
  if (RESET) {
    const results = await Promise.all([
      Victim.deleteMany({}),
      Tag.deleteMany({}),
      Location.deleteMany({}),
      StatusHistory.deleteMany({}),
    ]);
    const [victims, tags, locations, history] = results.map((r) => r.deletedCount);
    console.log(`[SEED] --reset: hapus ${victims} korban, ${tags} tag, ${locations} lokasi, ${history} riwayat status.`);
  }

  // --- Seed Users ---
  const usersToSeed = [
    { nama: "Koordinator Posko", username: "koordinator1", password: "koordinator123", role: "koordinator" },
    { nama: "Petugas Pos Medis 1", username: "petugas1", password: "petugas123", role: "petugas_pos_medis" },
    { nama: "Rais", username: "rais123", password: "123", role: "koordinator" },
  ];

  for (const u of usersToSeed) {
    const exists = await User.findOne({ username: u.username });
    if (exists) {
      console.log(`[SEED] User '${u.username}' sudah ada, dilewati.`);
      continue;
    }
    const password_hash = await bcrypt.hash(u.password, 10);
    await User.create({
      nama: u.nama,
      username: u.username,
      role: u.role,
      password_hash,
    });
    console.log(`[SEED] User '${u.username}' (role: ${u.role}) berhasil dibuat. Password: ${u.password}`);
  }

  // --- Seed Posko ---
  // Koordinat sekitar Kampus UI Depok (pusat peta default frontend).
  const poskoToSeed = [
    { posko_id: "POSKO-UTAMA", nama_posko: "Pos Triase Utama", jenis: "utama", kapasitas_maksimum: 100, lokasi: { lat: -6.3612, lng: 106.8249 } },
    { posko_id: "POSKO-MERAH", nama_posko: "Pos Merah", jenis: "merah", kapasitas_maksimum: 20, lokasi: { lat: -6.3598, lng: 106.8262 } },
    { posko_id: "POSKO-KUNING", nama_posko: "Pos Kuning", jenis: "kuning", kapasitas_maksimum: 30, lokasi: { lat: -6.3625, lng: 106.8268 } },
    { posko_id: "POSKO-HIJAU", nama_posko: "Pos Hijau", jenis: "hijau", kapasitas_maksimum: 50, lokasi: { lat: -6.363, lng: 106.8232 } },
  ];

  // Upsert (bukan skip) supaya DB lama yang posko-nya belum punya koordinat
  // ikut ter-update.
  for (const p of poskoToSeed) {
    await Posko.findOneAndUpdate({ posko_id: p.posko_id }, { $set: p }, { upsert: true });
    console.log(`[SEED] Posko '${p.posko_id}' disimpan (${p.lokasi.lat}, ${p.lokasi.lng}).`);
  }
  const poskoById = new Map(poskoToSeed.map((p) => [p.posko_id, p]));

  // --- Seed Tag + Korban contoh (untuk demo dashboard/posko tanpa hardware) ---
  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60 * 1000);
  const STATUS_ORDER = ["registered", "triaged", "waiting_transfer", "in_transit", "arrived"];
  const STEP_MINUTES = 4; // jarak antar-perubahan status di riwayat contoh

  // `menit` = berapa menit lalu status terakhir berubah.
  const sampleVictims = [
    { tag_id: "TND-DEMO-01", nama: "Andi Saputra", usia: 34, jenis_kelamin: "L", kategori_triase: "merah", status_korban: "registered", menit: 40 },
    { tag_id: "TND-DEMO-02", nama: "Budi Hartono", usia: 52, jenis_kelamin: "L", kategori_triase: "merah", status_korban: "triaged", menit: 25 },
    { tag_id: "TND-DEMO-03", nama: "Citra Ayu", usia: 27, jenis_kelamin: "P", kategori_triase: "kuning", status_korban: "waiting_transfer", menit: 15, posko_tujuan: "POSKO-KUNING" },
    { tag_id: "TND-DEMO-04", nama: "Dedi Kurniawan", usia: 19, jenis_kelamin: "L", kategori_triase: "hijau", status_korban: "in_transit", menit: 5, posko_tujuan: "POSKO-HIJAU" },
    { tag_id: "TND-DEMO-05", nama: "Euis Nuraeni", usia: 61, jenis_kelamin: "P", kategori_triase: "kuning", status_korban: "arrived", menit: 2, posko_tujuan: "POSKO-KUNING" },
    { tag_id: "TND-DEMO-06", nama: "Fajar Nugroho", usia: 45, jenis_kelamin: "L", kategori_triase: "merah", status_korban: "waiting_transfer", menit: 12, posko_tujuan: "POSKO-MERAH" },
    { tag_id: "TND-DEMO-07", nama: "Gita Lestari", usia: 8, jenis_kelamin: "P", kategori_triase: "merah", status_korban: "in_transit", menit: 4, posko_tujuan: "POSKO-MERAH" },
    { tag_id: "TND-DEMO-08", nama: "Hendra Wijaya", usia: 38, jenis_kelamin: "L", kategori_triase: "kuning", status_korban: "registered", menit: 8 },
    { tag_id: "TND-DEMO-09", nama: "Indah Permata", usia: 23, jenis_kelamin: "P", kategori_triase: "kuning", status_korban: "triaged", menit: 18 },
    { tag_id: "TND-DEMO-10", nama: "Joko Susilo", usia: 70, jenis_kelamin: "L", kategori_triase: "hijau", status_korban: "registered", menit: 30 },
    { tag_id: "TND-DEMO-11", nama: "Kartika Sari", usia: 31, jenis_kelamin: "P", kategori_triase: "hijau", status_korban: "triaged", menit: 22 },
    { tag_id: "TND-DEMO-12", nama: "Lukman Hakim", usia: 29, jenis_kelamin: "L", kategori_triase: "hijau", status_korban: "waiting_transfer", menit: 9, posko_tujuan: "POSKO-HIJAU" },
    { tag_id: "TND-DEMO-13", nama: "Maya Anggraini", usia: 41, jenis_kelamin: "P", kategori_triase: "merah", status_korban: "arrived", menit: 35, posko_tujuan: "POSKO-MERAH" },
    { tag_id: "TND-DEMO-14", nama: "", jenis_kelamin: "tidak_diketahui", kategori_triase: "kuning", status_korban: "in_transit", menit: 6, posko_tujuan: "POSKO-KUNING" },
    { tag_id: "TND-DEMO-15", nama: "Oki Ramadhan", usia: 16, jenis_kelamin: "L", kategori_triase: "hijau", status_korban: "arrived", menit: 50, posko_tujuan: "POSKO-HIJAU" },
  ];

  // Posisi contoh: masih di pos utama (registered..waiting_transfer), di
  // tengah jalan (in_transit), atau di posko tujuan (arrived). Offset kecil
  // per korban (~10-20 m) supaya marker tidak bertumpuk.
  function sampleLocation(sv, index) {
    const utama = poskoById.get("POSKO-UTAMA").lokasi;
    const tujuan = sv.posko_tujuan ? poskoById.get(sv.posko_tujuan).lokasi : utama;
    let base = utama;
    if (sv.status_korban === "in_transit") {
      base = { lat: (utama.lat + tujuan.lat) / 2, lng: (utama.lng + tujuan.lng) / 2 };
    } else if (sv.status_korban === "arrived") {
      base = tujuan;
    }
    const angle = (index * 2 * Math.PI) / 7;
    const radius = 0.0001 + (index % 3) * 0.00005;
    return {
      lat: Number((base.lat + radius * Math.sin(angle)).toFixed(6)),
      lng: Number((base.lng + radius * Math.cos(angle)).toFixed(6)),
    };
  }

  for (const [index, sv] of sampleVictims.entries()) {
    const existingVictim = await Victim.findOne({ tag_id: sv.tag_id });
    if (existingVictim) {
      console.log(`[SEED] Korban dengan tag '${sv.tag_id}' sudah ada, dilewati (pakai --reset untuk mengulang).`);
      continue;
    }

    const isActive = sv.status_korban !== "arrived";
    const lokasi = sampleLocation(sv, index);
    const waktuStatus = minutesAgo(sv.menit);
    // Ping lokasi terakhir 1-3 menit lalu (korban yang sudah tiba tidak lagi dilacak).
    const lokasiAt = minutesAgo(1 + (index % 3));

    // Tag seed tidak diberi last_seen: bukan perangkat GPS sungguhan, jadi
    // tidak ikut daftar GET /api/devices.
    await Tag.findOneAndUpdate(
      { tag_id: sv.tag_id },
      {
        $set: isActive
          ? { latest_location: { lat: lokasi.lat, lng: lokasi.lng, timestamp: lokasiAt, received_at: lokasiAt }, gps_status: "fixed" }
          : {},
        $setOnInsert: { tag_id: sv.tag_id, status_tag: "active" },
      },
      { upsert: true }
    );

    if (isActive) {
      await Location.create({
        tag_id: sv.tag_id,
        latitude: lokasi.lat,
        longitude: lokasi.lng,
        timestamp: lokasiAt,
        received_at: lokasiAt,
      });
    }

    const targetIndex = STATUS_ORDER.indexOf(sv.status_korban);
    const victim = await Victim.create({
      tag_id: sv.tag_id,
      nama: sv.nama,
      usia: sv.usia,
      jenis_kelamin: sv.jenis_kelamin,
      kategori_triase: sv.kategori_triase,
      status_korban: sv.status_korban,
      posko_asal: "POSKO-UTAMA",
      posko_tujuan: sv.posko_tujuan || null,
      lokasi_terakhir: lokasi,
      lokasi_update_terakhir: isActive ? lokasiAt : null,
      waktu_update_terakhir: waktuStatus,
      created_at: minutesAgo(sv.menit + targetIndex * STEP_MINUTES),
    });

    // Riwayat status berurutan: tiap langkah STEP_MINUTES lebih awal dari
    // langkah berikutnya, langkah terakhir = waktu_update_terakhir.
    for (let i = 0; i <= targetIndex; i += 1) {
      await StatusHistory.create({
        victim_id: victim.victim_id,
        status_lama: i === 0 ? null : STATUS_ORDER[i - 1],
        status_baru: STATUS_ORDER[i],
        waktu_perubahan: minutesAgo(sv.menit + (targetIndex - i) * STEP_MINUTES),
      });
    }

    console.log(`[SEED] Korban contoh '${sv.nama || sv.tag_id}' (${sv.kategori_triase}, ${sv.status_korban}) berhasil dibuat.`);
  }

  console.log("[SEED] Selesai.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Gagal menjalankan seed:", err);
  process.exit(1);
});
