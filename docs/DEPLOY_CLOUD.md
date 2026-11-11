# Deploy Cloud (Opsi B): Render + MongoDB Atlas

Dashboard dan API online di internet, tanpa laptop sebagai host. Gelang dan HP
petugas masing-masing butuh internet (Wi-Fi atau hotspot HP dengan kuota).

```
Gelang ESP32 ──HTTPS + X-Device-Key──┐
                                     ├──► Render (Express: API + dashboard) ──► MongoDB Atlas
HP / laptop petugas ──HTTPS──────────┘        https://tandain.tech (atau *.onrender.com)
```

| Bagian | Layanan | Biaya |
|---|---|---|
| App (API + dashboard) | Render Web Service, plan Free, region Singapore | Gratis |
| Database | MongoDB Atlas M0, region Singapore (AWS ap-southeast-1) | Gratis (512 MB) |
| Domain | `tandain.tech` di Cloudflare (opsional, bisa pakai `*.onrender.com` dulu) | Gratis via GitHub Student Pack |

Batasan plan gratis Render: service tidur setelah ±15 menit tanpa request dan
butuh ±30–60 detik untuk bangun. Selama gelang aktif (heartbeat tiap 5 detik)
service tetap bangun. Sebelum demo, buka dashboard sekali beberapa menit lebih
awal supaya service sudah bangun.

## 1. MongoDB Atlas

1. Daftar di <https://www.mongodb.com/cloud/atlas>, buat cluster **M0 (Free)**, provider AWS, region **Singapore**.
2. **Database Access** → tambah user (mis. `tandain-app`) dengan password acak, role *Read and write to any database*.
3. **Network Access** → *Allow access from anywhere* (`0.0.0.0/0`). Render free tidak punya IP keluar yang tetap.
4. **Connect → Drivers** → salin connection string, tambahkan nama DB sebelum `?`:
   `mongodb+srv://tandain-app:<password>@<cluster>.mongodb.net/tandain?retryWrites=true&w=majority`

### Pindahkan data dari laptop (opsional)

Isi DB lokal (`tandain_db`) ke Atlas lewat container Mongo yang sudah ada:

```bash
docker exec -e ATLAS_URI="<connection string Atlas>" tandain-mongo sh -c 'mongodump --db tandain_db --archive | mongorestore --uri "$ATLAS_URI" --archive --nsFrom "tandain_db.*" --nsTo "tandain.*"'
```
Tanpa migrasi, isi DB kosong lewat seed (langkah 3).

## 2. Render

1. Daftar di <https://render.com> dengan akun GitHub yang punya akses ke `muhrais/TANDAIN`.
2. **New → Blueprint**, pilih repo ini. Render membaca `render.yaml`:
   build dashboard, start `npm start`, health check `/api/health`, `JWT_SECRET` dan `DEVICE_API_KEY` dibuat acak otomatis.
3. Isi env yang diminta:
   - `MONGODB_URI` = connection string Atlas di atas
   - `CORS_ORIGINS` = alamat dashboard, mis. `https://tandain.onrender.com` (tambahkan `https://tandain.tech` setelah domain aktif, pisahkan koma)
4. Tunggu deploy selesai, buka `https://<nama-service>.onrender.com/api/health`.

Server menolak start di produksi bila `JWT_SECRET` kosong/pendek, dan memberi
peringatan di log bila `DEVICE_API_KEY` atau `CORS_ORIGINS` kosong.

## 3. Isi data awal (bila DB Atlas kosong)

Dari laptop, arahkan seed ke Atlas sekali saja:

```bash
NODE_ENV=production MONGODB_URI="<connection string Atlas>" JWT_SECRET=x npm run seed -- --allow-production
```

Lalu login sebagai `koordinator1` dan **segera ganti password semua akun bawaan**
di Pengaturan → Pengguna. Seed menolak jalan di produksi tanpa `--allow-production`.

## 4. Domain `tandain.tech` (setelah Student Pack disetujui)

1. Tambahkan `tandain.tech` ke Cloudflare (plan Free), ganti nameserver di registrar ke nameserver Cloudflare.
2. Render → service → **Settings → Custom Domains** → tambah `tandain.tech`; ikuti instruksi record DNS (CNAME ke `<service>.onrender.com`) di Cloudflare.
   Set record itu **DNS only (awan abu-abu)** sampai Render selesai menerbitkan sertifikat.
3. Tambahkan `https://tandain.tech` ke `CORS_ORIGINS`.
4. Subdomain lain bisa dipakai untuk tunnel laptop (opsi A) dengan alamat tetap, mis. `lapangan.tandain.tech`.

## 5. Firmware gelang

Perubahan dari mode lapangan (opsi A):

| | Opsi A (laptop) | Opsi B (cloud) |
|---|---|---|
| Wi-Fi | hotspot laptop | Wi-Fi/hotspot HP yang ada internetnya |
| `BACKEND_BASE_URL` | `http://192.168.137.1:3000` | `https://tandain.tech` atau `https://<service>.onrender.com` |
| Header | – | `X-Device-Key: <DEVICE_API_KEY dari env Render>` |
| Klien HTTP | `HTTPClient` biasa | `WiFiClientSecure` + `HTTPClient` |

Contoh potongan (ESP32 Arduino core, belum diuji di gelang):

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* BACKEND_BASE_URL = "https://tandain.tech";
const char* DEVICE_API_KEY = "...";   // simpan di secrets.h, jangan di-commit

WiFiClientSecure tls;
HTTPClient http;

void setupTls() {
  // Prototipe: enkripsi tanpa verifikasi sertifikat server. Untuk produksi,
  // ganti dengan tls.setCACert(<root CA>) sesuai penerbit sertifikat domain.
  tls.setInsecure();
}

int postJson(const char* path, const String& body) {
  http.setReuse(true);                 // pakai ulang koneksi TLS antar heartbeat
  http.begin(tls, String(BACKEND_BASE_URL) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  int code = http.POST(body);
  http.end();
  return code;
}
```

Catatan:
- Handshake TLS pertama memakan ±1–2 detik dan RAM ±40 KB; `setReuse(true)` menghindari handshake di tiap heartbeat.
- Selama service Render bangun dari tidur, request bisa gagal/timeout: firmware cukup mencoba lagi di siklus berikutnya (offline buffer W4 membantu agar titik lokasi tidak hilang).
- Simulator ikut mendukung kunci perangkat: `npm run sim -- --base https://tandain.tech --device-key <kunci>`.
