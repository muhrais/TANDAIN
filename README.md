# TANDAIN

**TANDAIN (Triage Darurat Individu)** - Smart Triage Tag untuk manajemen korban pada Mass-Casualty Incident (MCI).

| Bagian | Lokasi | Stack | Port |
|---|---|---|---|
| Backend API | root (`server.js`, `src/`) | Node.js, Express, MongoDB | 3000 |
| Frontend Dashboard | `frontend/` | React, Vite, Tailwind, Leaflet | 5173 |

## Prasyarat

- **Node.js 20.19+** (atau 22.12+), dibutuhkan Vite
- **MongoDB** — pilih salah satu:
  - **Docker** (paling gampang, ga perlu install MongoDB manual) — lihat step 3 di bawah
  - MongoDB lokal (`mongod` sudah terinstall & jalan)
  - MongoDB Atlas (cloud, tinggal isi connection string)

## Quick Start

Clone repo, lalu jalankan dari root:

```bash
cp .env.example .env
npm install
docker run -d --name tandain-mongo -p 27017:27017 -v tandain-mongo-data:/data/db mongo:7
npm run seed
npm run dev
```

Di terminal lain, dari folder `frontend/`:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Buka `http://localhost:5173`, login pakai salah satu [akun bawaan](#akun-bawaan-hasil-seed) di bawah.

Ga pakai Docker? Lewati baris `docker run`, cukup pastikan `mongod` sudah jalan (lokal) atau isi `MONGODB_URI` di `.env` dengan connection string Atlas sebelum `npm run seed`.

## Setup Backend (detail)

Jalankan dari root repo.

**1. Buat file `.env`**
```bash
cp .env.example .env
```
Nilai default sudah cukup untuk MongoDB lokal/Docker. Ubah `MONGODB_URI` kalau pakai Atlas, dan ganti `JWT_SECRET` untuk produksi.

**2. Install dependencies**
```bash
npm install
```

**3. Jalankan MongoDB** (pilih salah satu)
- **Docker** — sekali `run` di awal, abis itu tinggal `docker start tandain-mongo` tiap mau lanjut kerja:
  ```bash
  docker run -d --name tandain-mongo -p 27017:27017 -v tandain-mongo-data:/data/db mongo:7
  ```
- **Lokal**: pastikan service `mongod` sudah berjalan.
- **Atlas**: isi `MONGODB_URI` di `.env` dengan connection string Atlas.

**4. Seed data awal** (akun login + 4 posko)
```bash
npm run seed
```

**5. Jalankan server**
```bash
npm run dev
```
Cek: `http://localhost:3000/api/health` harus mengembalikan `"status": "ok"`.

## Setup Frontend (detail)

Jalankan dari folder `frontend/`.

**1. Buat file `.env.local`**
```bash
cd frontend
cp .env.example .env.local
```
Default-nya kosong (`VITE_API_BASE_URL=`) — request `/api/*` otomatis di-proxy Vite ke backend port 3000, ga perlu setting apa-apa lagi. Detail ada di komentar dalam file `.env.example`.

**2. Install dependencies & jalankan**
```bash
npm install
npm run dev
```
Buka `http://localhost:5173`.

> Backend harus sudah jalan (lihat Setup Backend) supaya login, Scan NFC, dan registrasi korban berfungsi. Dashboard Overview/Aktivitas/Alert masih pakai **data mock** (`frontend/src/mocks/`), belum tersambung ke backend.

### Testing Scan NFC di HP (opsional)

Halaman Scan NFC punya tombol "Scan pakai NFC" yang otomatis muncul di **Chrome Android** (Web NFC API). Untuk coba di HP fisik:

1. Pastikan backend & frontend dev server sama-sama jalan di laptop (step di atas)
2. Install [ngrok](https://ngrok.com/download), lalu `ngrok config add-authtoken <token-akun-lu>`
3. Jalankan `ngrok http 5173`
4. Buka URL `https://xxxx.ngrok-free.app` yang muncul, di Chrome HP
5. Login, buka Scan NFC, tempelkan tag ke belakang HP

Vite dev server (`frontend/vite.config.js`) sudah dikonfigurasi `allowedHosts: true` dan proxy `/api`, jadi ga perlu setup tambahan di sisi kode — tinggal jalanin tunnel-nya.

## Menjalankan Keduanya

Buka dua terminal:

| Terminal | Perintah |
|---|---|
| 1 (backend, dari root) | `npm run dev` |
| 2 (frontend) | `cd frontend && npm run dev` |

MongoDB (kalau pakai Docker) harus sudah `docker start tandain-mongo` sebelum terminal 1 dijalankan.

## Akun Bawaan (hasil seed)

| Role | Username | Password |
|---|---|---|
| Koordinator | `koordinator1` | `koordinator123` |
| Petugas Pos Medis | `petugas1` | `petugas123` |
| Koordinator (testing) | `rais123` | `123` |

Login via `POST /api/auth/login` (`{ "username", "password" }`), lalu kirim token sebagai header `Authorization: Bearer <token>`.

## Script

| Lokasi | Script | Fungsi |
|---|---|---|
| root | `npm run dev` | Backend dengan auto-reload (nodemon) |
| root | `npm start` | Backend mode produksi |
| root | `npm run seed` | Isi user & posko awal |
| `frontend/` | `npm run dev` | Dev server Vite |
| `frontend/` | `npm run build` | Build produksi ke `frontend/dist` |
| `frontend/` | `npm run lint` | Lint dengan oxlint |
