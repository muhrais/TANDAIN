# TANDAIN Backend API

Backend API server untuk **TANDAIN (Triage Darurat Individu) - Smart Triage Tag**.

---

## 🚀 Panduan Initial Setup & Menjalankan Backend

### 1. Prasyarat (Prerequisites)
- **Node.js** (v16+)
- **MongoDB** (Lokal, Docker, atau MongoDB Atlas)

---

### 2. Konfigurasi Environment Variable (`.env`)
File `.env` sudah dibuat secara otomatis di root folder `TANDAIN`. Pastikan nilainya sesuai dengan lingkungan Anda:

```env
# Port server API
PORT=3000

# Connection String MongoDB
# MongoDB Lokal: mongodb://127.0.0.1:27017/tandain_db
# MongoDB Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/tandain_db
MONGODB_URI=mongodb://127.0.0.1:27017/tandain_db

# Mode Lingkungan
NODE_ENV=development

# JWT Configuration
JWT_SECRET=tandain_super_secret_jwt_key_2026_change_in_production
JWT_EXPIRES_IN=8h
```

---

### 3. Instalasi Dependencies
Jalankan perintah berikut di terminal pada folder `TANDAIN`:
```bash
npm install
```

---

### 4. Menjalankan MongoDB

#### Opsi A: MongoDB Service Lokal
Pastikan service MongoDB (`mongod`) sudah berjalan di komputer Anda.

#### Opsi B: Menggunakan Docker
Jika Anda menggunakan Docker, Anda dapat menjalankan container MongoDB dengan perintah:
```bash
docker run -d --name tandain-mongo -p 27017:27017 mongo:latest
```

#### Opsi C: MongoDB Atlas (Cloud)
Ubah `MONGODB_URI` pada file `.env` dengan Connection String dari MongoDB Atlas Anda.

---

### 5. Seeding Data Awal (Opsional)
Untuk mengisi database dengan akun pengguna dan data posko bawaan:
```bash
npm run seed
```

**Akun bawaan hasil seed:**
- **Koordinator**: username: `koordinator1`, password: `koordinator123`
- **Petugas Pos Medis**: username: `petugas1`, password: `petugas123`

---

### 6. Menjalankan Server Backend

#### Mode Development (Auto-reload dengan nodemon):
```bash
npm run dev
```

#### Mode Production:
```bash
npm start
```

Server akan berjalan di: `http://localhost:3000`  
Endpoint Health Check: `GET http://localhost:3000/api/health`