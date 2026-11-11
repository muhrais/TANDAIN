# Cloud: MongoDB Atlas, domain, dan firmware

Bagian bersama untuk deploy cloud. Langkah deploy aplikasinya (Vercel) ada di
[`DEPLOY_VERCEL.md`](DEPLOY_VERCEL.md). Gelang dan HP petugas masing-masing butuh
internet (Wi-Fi atau hotspot HP dengan kuota).

```
Gelang ESP32 ──HTTPS + X-Device-Key──┐
                                     ├──► Vercel (dashboard CDN + API function) ──► MongoDB Atlas
HP / laptop petugas ──HTTPS──────────┘        https://tandain-35.vercel.app (nanti https://tandain.tech)
```

| Bagian | Layanan | Biaya |
|---|---|---|
| Dashboard + API | Vercel Hobby (`vercel.json`, `api/index.js`) | Gratis |
| Database | MongoDB Atlas M0, region Singapore (AWS ap-southeast-1) | Gratis (512 MB) |
| Domain | `tandain.tech` di Cloudflare (opsional) | Gratis via GitHub Student Pack |

## 1. MongoDB Atlas

1. Daftar di <https://www.mongodb.com/cloud/atlas>, buat cluster **M0 (Free)**, provider AWS, region **Singapore**.
2. **Database Access** → tambah user (mis. `tandain-app`) dengan password acak, role *Read and write to any database*.
3. **Network Access** → *Allow access from anywhere* (`0.0.0.0/0`). Function Vercel tidak punya IP keluar yang tetap.
4. **Connect → Drivers** → salin connection string, tambahkan nama DB sebelum `?`:
   `mongodb+srv://tandain-app:<password>@<cluster>.mongodb.net/tandain?retryWrites=true&w=majority`

### Laptop dengan DNS yang menolak query SRV

Bila `npm run dev` gagal dengan `querySrv ECONNREFUSED`, pakai bentuk tanpa `+srv` di `.env`
lokal. Host dan `replicaSet` didapat dari record SRV/TXT cluster (`nslookup -type=SRV _mongodb._tcp.<cluster>`
dan `nslookup -type=TXT <cluster>`):

```
mongodb://<user>:<password>@<host-00>:27017,<host-01>:27017,<host-02>:27017/tandain?tls=true&authSource=admin&replicaSet=<replicaSet>&retryWrites=true&w=majority
```

### Pindahkan data dari laptop (opsional)

Isi DB lokal (`tandain_db`) ke Atlas lewat container Mongo yang sudah ada:

```bash
docker exec -e ATLAS_URI="<connection string Atlas>" tandain-mongo sh -c 'mongodump --db tandain_db --archive | mongorestore --uri "${ATLAS_URI%/tandain*}" --archive --nsInclude "tandain_db.*" --nsFrom "tandain_db.*" --nsTo "tandain.*"'
```

- `${ATLAS_URI%/tandain*}` membuang nama database dari URI. Bila URI masih memuat `/tandain`,
  mongorestore menganggapnya `--db` dan hasilnya `0 document(s) restored`.
- Jalankan di **Git Bash**. PowerShell 5.1 membuang tanda kutip ganda di argumen `docker`;
  di PowerShell isi dulu `$env:ATLAS_URI = "..."`, lalu pakai `docker exec -e ATLAS_URI ...`
  dengan perintah `sh -c` yang sama tanpa tanda kutip ganda.
- Berhasil bila akhir output menampilkan `NNN document(s) restored successfully`.

## 2. Isi data awal (bila DB Atlas kosong)

Dari laptop, arahkan seed ke Atlas sekali saja:

```bash
NODE_ENV=production MONGODB_URI="<connection string Atlas>" npm run seed -- --allow-production
```

Lalu login sebagai `koordinator1` dan **segera ganti password semua akun bawaan**
di Pengaturan → Pengguna. Seed menolak jalan di produksi tanpa `--allow-production`.

## 3. Domain `tandain.tech` (setelah Student Pack disetujui)

1. Tambahkan `tandain.tech` ke Cloudflare (plan Free), ganti nameserver di registrar ke nameserver Cloudflare.
2. Vercel → project `tandain` → **Settings → Domains** → tambah `tandain.tech`; buat record DNS sesuai
   instruksi Vercel di Cloudflare, set **DNS only (awan abu-abu)**.
3. Tambahkan `https://tandain.tech` ke env `CORS_ORIGINS`, deploy ulang, dan ganti `BACKEND_BASE_URL` di firmware.
4. Subdomain lain bisa dipakai untuk tunnel laptop (mode lapangan) dengan alamat tetap, mis. `lapangan.tandain.tech`.

## 4. Firmware gelang

Perubahan dari mode lapangan (laptop + hotspot):

| | Mode lapangan (laptop) | Cloud |
|---|---|---|
| Wi-Fi | hotspot laptop | Wi-Fi/hotspot HP yang ada internetnya |
| `BACKEND_BASE_URL` | `http://192.168.137.1:3000` | `https://tandain-35.vercel.app` (nanti `https://tandain.tech`) |
| Header | – | `X-Device-Key: <DEVICE_API_KEY dari env Vercel>` |
| Klien HTTP | `HTTPClient` biasa | `WiFiClientSecure` + `HTTPClient` |

Contoh potongan (ESP32 Arduino core):

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* BACKEND_BASE_URL = "https://tandain-35.vercel.app";
const char* DEVICE_API_KEY = "...";

WiFiClientSecure tls;

void setupTls() {
  // Enkripsi tanpa verifikasi sertifikat server. Untuk produksi,
  // ganti dengan tls.setCACert(<root CA>) sesuai penerbit sertifikat domain.
  tls.setInsecure();
}

int postJson(const char* path, const String& body) {
  HTTPClient http;
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
- Saat function Vercel cold start, request bisa lebih lambat 1–3 detik; firmware cukup mencoba lagi di siklus berikutnya (offline buffer W4 membantu agar titik lokasi tidak hilang).
- Simulator ikut mendukung kunci perangkat: `npm run sim -- --base https://tandain-35.vercel.app --device-key <kunci>`.
