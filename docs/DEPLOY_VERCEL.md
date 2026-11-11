# Deploy Vercel (FE + BE serverless) + MongoDB Atlas

Gratis dan tanpa kartu. Dashboard dilayani CDN Vercel; seluruh API berjalan
sebagai satu Serverless Function (`api/index.js`) yang memakai app Express
yang sama dengan `npm start`. Database tetap di MongoDB Atlas.

```
Browser / HP ──HTTPS──► Vercel CDN (frontend/dist)
       │                      │
       └──── /api/* ──────────► Function api/index.js (Express) ──► MongoDB Atlas
Gelang ESP32 ──HTTPS + X-Device-Key──┘
```

## Yang disesuaikan untuk Vercel (branch `feat/deploy-vercel`)

| File | Fungsi |
|---|---|
| `api/index.js` | Entry function: konek MongoDB sekali per instance lalu dipakai ulang, konfigurasi salah dibalas 500 `CONFIG_ERROR` (bukan mematikan proses) |
| `vercel.json` | Install & build dashboard, output `frontend/dist`, `/api/*` ke function, rute lain ke `index.html` (SPA), region `sin1` (Singapura, dekat Atlas) |
| `.vercelignore` | `.env` lokal dan firmware tidak ikut diunggah |
| `deviceController` | Log telemetri heartbeat ditunggu bila `VERCEL` di-set (proses bisa dibekukan setelah respons) |

Perbedaan perilaku dibanding server biasa:
- Request pertama setelah lama sepi bisa ±1–3 detik lebih lambat (cold start + konek Atlas).
- Pembatas login (10 gagal / 15 menit) disimpan per instance function, jadi lebih longgar daripada di server tunggal.
- Paket Hobby punya kuota pemanggilan function per bulan. Tiga gelang heartbeat tiap 5 detik ≈ 52 ribu request/hari bila menyala terus; aman untuk uji dan demo, cek halaman Usage bila gelang dinyalakan berhari-hari.

## Langkah deploy (Vercel CLI, dari laptop)

Deploy lewat CLI tidak butuh akses GitHub App ke repo `muhrais/TANDAIN`.
Semua perintah dijalankan dari folder `Work/TANDAIN`, di branch `feat/deploy-vercel`.

1. **Akun:** daftar di <https://vercel.com/signup> (paket Hobby, login GitHub atau email).
2. **Login CLI:** `npx vercel login` (membuka browser).
3. **Buat project:** `npx vercel link --yes --project tandain`
4. **Environment variables** (Production). Nilai rahasia diketik/ditempel saat diminta, tidak ditulis di file:
   ```bash
   npx vercel env add MONGODB_URI production       # connection string Atlas
   npx vercel env add JWT_SECRET production        # acak ≥ 32 karakter
   npx vercel env add DEVICE_API_KEY production    # kunci firmware, simpan juga untuk tim hardware
   npx vercel env add NODE_ENV production          # isi: production
   npx vercel env add JWT_EXPIRES_IN production    # isi: 8h
   ```
   Buat nilai acak dengan: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
5. **Deploy:** `npx vercel --prod`. Catat alamatnya, mis. `https://tandain.vercel.app`.
6. **CORS:** `npx vercel env add CORS_ORIGINS production` berisi alamat tadi, lalu `npx vercel --prod` sekali lagi.
7. **Data awal** di Atlas (bila kosong): migrasi dari laptop atau seed, lihat `docs/DEPLOY_CLOUD.md` bagian 1 dan 3. Lalu ganti password akun bawaan di Pengaturan → Pengguna.
8. **Cek:** buka `<alamat>/api/health`, login, dan buka Data Pasien serta Pengaturan langsung lewat URL.

## Gelang

Sama dengan deploy cloud lainnya: `BACKEND_BASE_URL` diganti alamat Vercel,
header `X-Device-Key` berisi `DEVICE_API_KEY`, dan `WiFiClientSecure`.
Contoh kode di `docs/DEPLOY_CLOUD.md` bagian 5. Uji tanpa gelang:

```bash
npm run sim -- --base https://tandain.vercel.app --device-key <DEVICE_API_KEY> --count 3 --duration 60
```

## Domain `tandain.tech`

Setelah domain aktif di Cloudflare: Vercel → Project → Settings → Domains →
tambah `tandain.tech`, buat record DNS sesuai instruksi Vercel di Cloudflare
(**DNS only**, awan abu-abu), lalu tambahkan `https://tandain.tech` ke `CORS_ORIGINS`.
