// Seed data awal untuk local development.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Posko = require("../models/Posko");

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

  console.log("[SEED] Selesai.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Gagal menjalankan seed:", err);
  process.exit(1);
});
