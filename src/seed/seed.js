/**
 * Script seeding sederhana untuk kebutuhan development/testing lokal.
 * Menjalankan: npm run seed
 *
 * Membuat:
 * - 2 akun user (koordinator & petugas_pos_medis) dengan password default.
 * - 4 data posko dasar (utama, merah, kuning, hijau).
 * - 5 tag + korban contoh (macam-macam kategori triase & status) beserta
 *   riwayat statusnya, supaya GET /api/dashboard/summary dan GET /api/posko
 *   langsung punya data untuk didemokan tanpa perlu tag NFC fisik
 *   (mitigasi risiko "hardware belum siap" pada planning Pekan 5).
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

async function seed() {
  await connectDB();

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
  const poskoToSeed = [
    { posko_id: "POSKO-UTAMA", nama_posko: "Pos Triase Utama", jenis: "utama", kapasitas_maksimum: 100 },
    { posko_id: "POSKO-MERAH", nama_posko: "Pos Merah", jenis: "merah", kapasitas_maksimum: 20 },
    { posko_id: "POSKO-KUNING", nama_posko: "Pos Kuning", jenis: "kuning", kapasitas_maksimum: 30 },
    { posko_id: "POSKO-HIJAU", nama_posko: "Pos Hijau", jenis: "hijau", kapasitas_maksimum: 50 },
  ];

  for (const p of poskoToSeed) {
    const exists = await Posko.findOne({ posko_id: p.posko_id });
    if (exists) {
      console.log(`[SEED] Posko '${p.posko_id}' sudah ada, dilewati.`);
      continue;
    }
    await Posko.create(p);
    console.log(`[SEED] Posko '${p.posko_id}' berhasil dibuat.`);
  }

  // --- Seed Tag + Korban contoh (untuk demo dashboard/posko tanpa hardware) ---
  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60 * 1000);

  const sampleVictims = [
    { tag_id: "TND-DEMO-01", nama: "Andi Saputra", kategori_triase: "merah", status_korban: "registered", posko_asal: "POSKO-UTAMA", waktu_update_terakhir: minutesAgo(40) },
    { tag_id: "TND-DEMO-02", nama: "Budi Hartono", kategori_triase: "merah", status_korban: "triaged", posko_asal: "POSKO-UTAMA", posko_tujuan: "POSKO-MERAH", waktu_update_terakhir: minutesAgo(25) },
    { tag_id: "TND-DEMO-03", nama: "Citra Ayu", kategori_triase: "kuning", status_korban: "waiting_transfer", posko_asal: "POSKO-UTAMA", posko_tujuan: "POSKO-KUNING", waktu_update_terakhir: minutesAgo(15) },
    { tag_id: "TND-DEMO-04", nama: "Dedi Kurniawan", kategori_triase: "hijau", status_korban: "in_transit", posko_asal: "POSKO-UTAMA", posko_tujuan: "POSKO-HIJAU", waktu_update_terakhir: minutesAgo(5) },
    { tag_id: "TND-DEMO-05", nama: "Euis Nuraeni", kategori_triase: "kuning", status_korban: "arrived", posko_asal: "POSKO-UTAMA", posko_tujuan: "POSKO-KUNING", waktu_update_terakhir: minutesAgo(2) },
  ];

  for (const sv of sampleVictims) {
    const existingTag = await Tag.findOne({ tag_id: sv.tag_id });
    if (!existingTag) {
      await Tag.create({ tag_id: sv.tag_id, status_tag: "active" });
    }

    const existingVictim = await Victim.findOne({ tag_id: sv.tag_id });
    if (existingVictim) {
      console.log(`[SEED] Korban dengan tag '${sv.tag_id}' sudah ada, dilewati.`);
      continue;
    }

    // Bangun "perjalanan" status dari registered sampai status_korban target,
    // supaya status_history & recent_activity juga terisi realistis.
    const STATUS_ORDER = ["registered", "triaged", "waiting_transfer", "in_transit", "arrived"];
    const targetIndex = STATUS_ORDER.indexOf(sv.status_korban);

    const victim = await Victim.create({
      tag_id: sv.tag_id,
      nama: sv.nama,
      kategori_triase: sv.kategori_triase,
      status_korban: sv.status_korban,
      posko_asal: sv.posko_asal || null,
      posko_tujuan: sv.posko_tujuan || null,
      waktu_update_terakhir: sv.waktu_update_terakhir,
    });

    for (let i = 0; i <= targetIndex; i += 1) {
      await StatusHistory.create({
        victim_id: victim.victim_id,
        status_lama: i === 0 ? null : STATUS_ORDER[i - 1],
        status_baru: STATUS_ORDER[i],
        waktu_perubahan: sv.waktu_update_terakhir, // disederhanakan: pakai timestamp yang sama untuk data contoh
      });
    }

    console.log(`[SEED] Korban contoh '${sv.nama}' (tag ${sv.tag_id}, status ${sv.status_korban}) berhasil dibuat.`);
  }

  console.log("[SEED] Selesai.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Gagal menjalankan seed:", err);
  process.exit(1);
});
