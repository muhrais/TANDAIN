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

**4. Seed data awal** (akun login, 4 posko berkoordinat, 15 korban contoh)
```bash
npm run seed
```
Untuk mengosongkan data korban, tag, lokasi, dan riwayat status sebelum sesi uji (user & posko tetap):
```bash
npm run seed -- --reset
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

> Backend harus sudah jalan (lihat Setup Backend). Semua halaman membaca data backend asli; tidak ada lagi data mock di frontend.

### Halaman & akses per role

| Halaman | Path | Koordinator | Petugas Pos Medis | Tenaga Medis Lapangan | Isi |
|---|---|---|---|---|---|
| Dashboard | `/` | ✅ | – | – | Overview, tab Alert, tab Aktivitas, tombol **Ekspor CSV** |
| Maps | `/maps` | ✅ | – | – | Peta layar penuh + daftar tag, filter kategori |
| Scan NFC | `/scan` | ✅ | ✅ | ✅ | Scan / input manual `tag_id`, registrasi korban, ubah status, triase, dan data |
| Evakuasi | `/evakuasi` | ✅ | ✅ | ✅ | Antrian prioritas, ubah status satu langkah, pilih posko tujuan |
| Data Pasien | `/pasien` | ✅ | ✅ | ✅ | Semua korban (cari, filter triase/status/posko, urut, paginasi, ekspor CSV hasil filter), detail korban (ubah identitas, triase, kondisi klinis, status; riwayat dengan nama pengubah; jejak lokasi), tab **Korban Jiwa** |
| Perangkat | `/perangkat` | ✅ | – | – | Pairing NFC, identifikasi gelang, telemetri perangkat |
| Pengaturan | `/pengaturan` | ✅ | – | – | Tab Insiden (nama, lokasi, waktu mulai, relawan, nakes), Ambang Alert, Posko (nama, koordinat, kapasitas), Pengguna (tambah, ganti role, reset sandi) |

Role selain koordinator yang membuka halaman khusus koordinator diarahkan ke `/forbidden`. Setelah login, koordinator masuk ke `/`, petugas pos medis dan tenaga medis lapangan ke `/scan`.

Catatan perilaku:
- Dashboard, Maps, dan Evakuasi **polling tiap 5 detik** (ubah lewat `VITE_POLL_INTERVAL_MS`). Polling berhenti saat tab browser disembunyikan.
- Marker abu-abu bergaris putus = tag belum diregistrasi; marker pudar = tidak ada update lokasi > 60 detik. Klik marker korban untuk membukanya di halaman Evakuasi.
- Tombol status hanya menawarkan langkah berikutnya (Registered → Triaged → Waiting Pickup → In Transit → Arrived), sesuai validasi backend.
- **Ekspor CSV** saat ini disusun di frontend dari `GET /api/victims` (satu baris per korban + ringkasan per kategori dan status).
- Peta membaca `GET /api/locations/latest`: satu titik terakhir per tag, termasuk tag yang belum diregistrasi.
- Tab Alert memunculkan alert **tombol darurat** selama 10 menit setelah tombol perangkat ditekan.
- Ambang alert lain (merah menunggu, GPS diam, baterai, kapasitas) dibaca dari **Pengaturan > Ambang Alert**; default 10 mnt / 5 mnt / 20% / 80%.
- Baris atas dashboard (nama insiden, lokasi, relawan, nakes) dibaca dari **Pengaturan > Insiden**, bukan lagi dari variabel env.
- **Korban jiwa** dicatat langsung (tidak lewat gelang) oleh koordinator atau tenaga medis lapangan, dari kartu Distribusi Triase di dashboard, tombol di halaman Scan, atau tab Korban Jiwa di Data Pasien. Tenaga medis lapangan bisa mengubah catatannya sendiri selama 30 menit; hapus hanya oleh koordinator, wajib alasan, dan tersimpan sebagai soft delete.

### Panel metrik pengujian (`?debug=1`)

Buka halaman mana pun dengan `?debug=1` (contoh `http://localhost:5173/scan?debug=1`) untuk memunculkan panel metrik di pojok layar. Panel mencatat:

| ID uji | Yang diukur |
|---|---|
| P-01 | Waktu scan (manual / NFC) sampai data tampil |
| S-11 | Berhasil / gagal baca Web NFC |
| P-03 | Jeda lokasi diterima server sampai marker tampil di peta |
| P-poll | Durasi tiap siklus polling dashboard |
| P-05 | Pencarian/filter Data Pasien sampai tabel tampil |

Data tersimpan di `localStorage` browser itu dan bisa diunduh sebagai CSV dari panel. Tekan "Reset" sebelum tiap sesi uji.

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

## Deploy Lapangan (laptop + hotspot + Cloudflare Tunnel)

Satu laptop menjalankan semuanya. Gelang mengirim data ke laptop lewat hotspot (HTTP lokal, tanpa internet), sedangkan HP petugas membuka dashboard lewat alamat HTTPS dari Cloudflare Tunnel (syarat Web NFC di Chrome Android).

```
Gelang ESP32 ──HTTP──► 192.168.137.1:3000 ┐
                                           ├─ laptop: Express (API + dashboard hasil build) + MongoDB
HP petugas ──HTTPS──► *.trycloudflare.com ─┘   (cloudflared meneruskan ke localhost:3000)
```

1. Nyalakan **Mobile Hotspot Windows** (band 2.4 GHz). Laptop tetap tersambung ke internet lewat Wi-Fi/LAN lain supaya tunnel jalan.
2. `docker start tandain-mongo`
3. Dari root repo: `npm run deploy` — build frontend lalu menjalankan backend di port 3000. Backend ikut melayani dashboard, jadi tidak perlu `npm run dev` di `frontend/`.
4. Terminal kedua: `npm run tunnel` (sekali pasang: `winget install --id Cloudflare.cloudflared`). Salin alamat `https://<acak>.trycloudflare.com` yang muncul, buka di Chrome HP.
5. Firmware gelang: `BACKEND_BASE_URL = "http://192.168.137.1:3000"` dan SSID/password hotspot laptop (lihat `firmware/README.md`). Cek di halaman Perangkat bahwa gelang online.

Catatan:
- Alamat quick tunnel berganti setiap `npm run tunnel` dijalankan. Untuk alamat tetap, pakai named tunnel dengan domain sendiri di akun Cloudflare.
- Kalau internet putus, data gelang tetap masuk (jalurnya lokal). Dashboard masih bisa dibuka di `http://192.168.137.1:3000`, tapi tanpa HTTPS sehingga scan NFC di HP tidak tersedia; pakai input manual `tag_id`.
- Setelah mengubah kode frontend, jalankan ulang `npm run deploy` supaya hasil build diperbarui.
- `SERVE_FRONTEND=false` mematikan penyajian dashboard dari backend (backend API saja).

## Deploy Cloud (Render + MongoDB Atlas)

Untuk dashboard yang online tanpa laptop sebagai host. Dua pilihan, keduanya memakai MongoDB Atlas:

- **Vercel** (gratis, tanpa kartu): dashboard di CDN, API sebagai Serverless Function (`api/index.js`, `vercel.json`). Langkah di [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md).
- **Render** (server biasa, perlu verifikasi kartu): satu web service API + dashboard (`render.yaml`).

Untuk Render: Langkah lengkap, pengaturan domain `tandain.tech`, dan perubahan firmware (HTTPS + header `X-Device-Key`) ada di [`docs/DEPLOY_CLOUD.md`](docs/DEPLOY_CLOUD.md). Konfigurasi service ada di `render.yaml`.

Pengamanan yang aktif lewat environment (berlaku juga di mode lapangan bila diisi):

| Variabel | Fungsi |
|---|---|
| `DEVICE_API_KEY` | Endpoint firmware (`/api/devices/heartbeat`, `/api/devices/button`, `/api/locations*`) wajib header `X-Device-Key`. Kosong = terbuka seperti sebelumnya |
| `CORS_ORIGINS` | Daftar origin browser yang boleh memanggil API, pisahkan koma. Kosong = semua |
| `NODE_ENV=production` | Server menolak start bila `JWT_SECRET` < 32 karakter; seed butuh `--allow-production` |

Login dibatasi 10 percobaan gagal per IP + username per 15 menit (respons 429).

## Memantau Gelang

Selain dashboard, status gelang bisa dipantau dari tiga tempat:

| Tempat | Untuk |
|---|---|
| `npm run monitor` | Tabel status semua gelang dari database yang ditunjuk `MONGODB_URI` (Atlas), refresh tiap 3 dtk. Hanya membaca |
| Serial Monitor Arduino (115200) | Sisi gelang: `POST /api/devices/heartbeat -> 200` (sukses), `401` (kunci perangkat salah), `-1` (internet/TLS) |
| Vercel → project `tandain` → Logs | Sisi server: setiap request ke API beserta kode status |

Kolom LED di `npm run monitor` membandingkan perintah server (`none` bila gelang belum dipakai korban, atau warna triase) dengan warna yang dilaporkan gelang lewat `led_state`. Firmware GPS-003 belum melaporkan `led_state`, dan saat gelang bebas firmware menyalakan warna default (kuning).

## Akun Bawaan (hasil seed)

| Role | Username | Password |
|---|---|---|
| Koordinator | `koordinator1` | `koordinator123` |
| Petugas Pos Medis | `petugas1` | `petugas123` |
| Tenaga Medis Lapangan | `medis1` | `medis123` |

Login via `POST /api/auth/login` (`{ "username", "password" }`), lalu kirim token sebagai header `Authorization: Bearer <token>`.

## Akses API per Role

| Endpoint | Koordinator | Petugas Pos Medis / Tenaga Medis Lapangan | Tanpa token |
|---|---|---|---|
| `GET /api/dashboard/summary` | ✅ | 403 | 401 |
| `GET /api/locations/latest` | ✅ | 403 | 401 |
| `GET /api/devices` | ✅ | 403 | 401 |
| `GET/POST/PUT /api/victims` | ✅ | ✅ | 401 |
| `POST /api/tags/:tag_id/scan` | ✅ | ✅ | 401 |
| `GET /api/posko` | ✅ | ✅ | 401 |
| `PUT /api/posko/:posko_id` | ✅ | 403 | 401 |
| `GET /api/victims/:id/locations` | ✅ | ✅ | 401 |
| `GET /api/korban-jiwa` | ✅ | ✅ | 401 |
| `POST/PUT /api/korban-jiwa` | ✅ | tenaga medis lapangan saja (PUT: entri sendiri ≤ 30 mnt) | 401 |
| `DELETE /api/korban-jiwa/:id` (body `{ alasan }`) | ✅ | 403 | 401 |
| `GET /api/incident` | ✅ | ✅ | 401 |
| `PUT /api/incident` | ✅ | 403 | 401 |
| `GET/POST/PUT /api/users` | ✅ | 403 | 401 |
| `POST /api/locations`, `/api/locations/batch` | perangkat | perangkat | ✅ |
| `POST /api/devices/heartbeat`, `/api/devices/button` | perangkat | perangkat | ✅ |

Endpoint perangkat sengaja tanpa token karena dipanggil firmware ESP32 (lihat `firmware/README.md`).

`GET /api/victims` menerima `q` (cari `tag_id`/nama), `kategori_triase`, `status_korban` (`aktif` = belum tiba), dan `posko` (asal atau tujuan). Tanpa `page` respons berupa array; dengan `page` (+ `limit` maks 100, `sort` mis. `-waktu_update_terakhir`, `kategori_triase`, `nama`) respons berupa `{ items, total, page, limit }`.

## Simulator Tag & Benchmark API

Untuk uji software tanpa menunggu hardware. Backend harus sudah jalan. Hasil CSV tersimpan di `scripts/out/` (tidak ikut git).

**Simulator tag** meniru firmware: heartbeat tiap 5 dtk dan lokasi tiap `--interval` dtk, dengan payload yang sama.
```bash
npm run sim -- --count 10 --interval 10 --duration 600
```

| Uji | Perintah |
|---|---|
| Keandalan kirim (S-08s) | `npm run sim -- --count 10 --duration 600` |
| Beban 50 tag (P-04) | `npm run sim -- --count 50 --interval 10 --duration 600` + dashboard terbuka |
| Offline buffer (R-01s) | `npm run sim -- --count 5 --offline 60-180 --batch-on-reconnect` |
| Paket hilang | tambah `--drop-rate 0.05` |

Payload heartbeat simulator mengikuti kontrak v2 di [`docs/DEVICE_API.md`](docs/DEVICE_API.md) (telemetri + `led_state`). Tambah `--fw-legacy` untuk meniru firmware v1 yang belum mengirim telemetri.

Opsi lain: `--prefix` (default `SIM`), `--center LAT,LNG`, `--heartbeat 0` (matikan heartbeat), `--base http://IP:3000`. Daftar lengkap ada di komentar `scripts/simulate-tags.js`.

**Benchmark API (P-02)** memanggil tiap endpoint utama N kali berurutan sebagai koordinator, lalu menampilkan avg/min/p50/p95/max per endpoint (target rata-rata ≤ 500 ms):
```bash
npm run bench -- --n 50
```

Jalankan `npm run seed -- --reset` sebelum tiap sesi uji supaya data simulator dan data lama tidak tercampur.

## Sesi Uji GPS & Telemetri

Setiap heartbeat disimpan ke koleksi `device_telemetry` (dihapus otomatis setelah 14 hari). Sesi uji menandai rentang waktu uji lapangan, lalu backend merangkum data lokasi dan telemetri di rentang itu per gelang.

```bash
# mulai sesi, titik acuan diisi untuk menghitung galat GPS (S-02)
npm run gps-report -- --start "S-02 titik A" --id-uji S-02 --acuan -6.3612,106.8249 --tags GPS-001,GPS-002,GPS-003 --catatan "luar ruangan, USB"

# hentikan sesi, ringkasan tercetak dan tersimpan di scripts/out/gps_<session_id>.csv
npm run gps-report -- --stop TS-xxxxxxxx

npm run gps-report -- --report TS-xxxxxxxx   # ringkasan saat sesi masih berjalan
npm run gps-report -- --list                 # daftar sesi
```

Ringkasan per gelang: titik lokasi diterima vs diharapkan (kontinuitas, jeda terpanjang), galat rata-rata/p50/p95/maks ke titik acuan, TTFF, HDOP dan satelit rata-rata, baterai awal/akhir, uptime, dan jumlah reboot.

API (koordinator): `POST /api/test-sessions`, `POST /api/test-sessions/:id/stop`, `GET /api/test-sessions`, `GET /api/test-sessions/:id/summary`.

Sinkron LED untuk uji PAIR-02 tercatat di setiap gelang: `led_command` (perintah server), `led_state` (laporan firmware), dan `led_sync_ms` (jeda dari triase ditetapkan sampai firmware melaporkan warna yang sama). Halaman **Perangkat** menampilkan telemetri dan status LED ini di bawah tiap gelang.

## Script

| Lokasi | Script | Fungsi |
|---|---|---|
| root | `npm run dev` | Backend dengan auto-reload (nodemon) |
| root | `npm start` | Backend mode produksi |
| root | `npm run seed` | Isi user, posko, insiden, dan korban contoh (`-- --reset` untuk mengosongkan dulu, `-- --victims 200` untuk menambah korban acak) |
| root | `npm run sim` | Simulator tag virtual |
| root | `npm run bench` | Benchmark latensi API |
| root | `npm run gps-report` | Sesi uji GPS dan rekap CSV |
| root | `npm run monitor` | Pantau gelang langsung dari database (`.env`): online, heartbeat/menit, GPS, triase, LED, tombol. `-- --tag GPS-003`, `-- --interval 5`, `-- --once` |
| root | `npm run build` | Build frontend ke `frontend/dist` (dilayani backend) |
| root | `npm run deploy` | Build frontend lalu jalankan backend (mode deploy lapangan) |
| root | `npm run tunnel` | Cloudflare quick tunnel HTTPS ke `localhost:3000` |
| `frontend/` | `npm run dev` | Dev server Vite |
| `frontend/` | `npm run build` | Build produksi ke `frontend/dist` |
| `frontend/` | `npm run lint` | Lint dengan oxlint |
