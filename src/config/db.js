const mongoose = require("mongoose");

/**
 * Menghubungkan aplikasi ke MongoDB menggunakan Mongoose.
 * Koneksi diarahkan ke MONGODB_URI pada .env (default: MongoDB lokal).
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI belum diatur. Salin .env.example menjadi .env terlebih dahulu."
    );
  }

  mongoose.set("strictQuery", true);

  try {
    const conn = await mongoose.connect(uri, {
      // Opsi ini aman untuk Mongoose 8.x (driver modern sudah default-nya baik),
      // tapi tetap dicantumkan agar eksplisit untuk pembaca/anggota tim lain.
      serverSelectionTimeoutMS: 8000,
    });

    console.log(
      `[DB] Terhubung ke MongoDB -> host: ${conn.connection.host}, db: ${conn.connection.name}`
    );

    return conn;
  } catch (err) {
    console.error("[DB] Gagal terhubung ke MongoDB:", err.message);
    console.error(
      "[DB] Pastikan MongoDB lokal (mongod) sudah berjalan, atau cek kembali MONGODB_URI pada .env."
    );
    process.exit(1);
  }
}

module.exports = connectDB;
