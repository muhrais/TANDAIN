# TANDAIN

**TANDAIN (Triage Darurat Individu)** - Smart Triage Tag untuk manajemen korban pada Mass-Casualty Incident (MCI).

| Bagian | Lokasi | Stack | Port |
|---|---|---|---|
| Backend API | root (`server.js`, `src/`) | Node.js, Express, MongoDB | 3000 |
| Frontend Dashboard | `frontend/` | React, Vite, Tailwind, Leaflet | 5173 |

## Prasyarat

- **Node.js 20.19+** (atau 22.12+), dibutuhkan Vite
- **MongoDB** (lokal, Docker, atau Atlas)

## Setup Backend

Jalankan dari root repo.

**1. Buat file `.env`**
```bash
cp .env.example .env
```
Nilai default sudah cukup untuk MongoDB lokal. Ubah `MONGODB_URI` jika memakai Atlas, dan ganti `JWT_SECRET` untuk produksi.

**2. Install dependencies**
```bash
npm install
```

**3. Jalankan MongoDB** (pilih salah satu)
- Service lokal: pastikan `mongod` sudah berjalan.
- Docker:
  ```bash
  docker run -d --name tandain-mongo -p 27017:27017 mongo:latest
  ```
- Atlas: isi `MONGODB_URI` di `.env` dengan connection string Atlas.

**4. Seed data awal** (akun pengguna + 4 posko)
```bash
npm run seed
```

**5. Jalankan server**
```bash
npm run dev
```
Cek: `http://localhost:3000/api/health` harus mengembalikan `"status": "ok"`.

## Setup Frontend

Jalankan dari folder `frontend/`.

```bash
cd frontend
npm install
npm run dev
```
Buka `http://localhost:5173`.

> Saat ini dashboard masih memakai **data mock** (`frontend/src/mocks/`) dan belum terhubung ke backend, jadi frontend bisa dijalankan tanpa backend.

## Menjalankan Keduanya

Buka dua terminal:

| Terminal | Perintah |
|---|---|
| 1 (backend, dari root) | `npm run dev` |
| 2 (frontend) | `cd frontend && npm run dev` |

## Akun Bawaan (hasil seed)

| Role | Username | Password |
|---|---|---|
| Koordinator | `koordinator1` | `koordinator123` |
| Petugas Pos Medis | `petugas1` | `petugas123` |

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
