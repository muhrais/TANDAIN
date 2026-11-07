# Device API TANDAIN (heartbeat v2)

Kontrak antara firmware gelang (ESP32-C3) dan backend. Semua endpoint perangkat **tanpa token**
dan memakai `Content-Type: application/json`. Base URL contoh: `http://192.168.137.1:3000`.

| Endpoint | Interval | Isi |
|---|---|---|
| `POST /api/devices/heartbeat` | 5 dtk | Status perangkat + telemetri; respons membawa perintah LED |
| `POST /api/locations` | 10 dtk (saat GPS fix) | Satu titik lokasi |
| `POST /api/locations/batch` | saat Wi-Fi tersambung lagi | Isi buffer offline |
| `POST /api/devices/button` | saat tombol ditekan | Event tombol darurat |

Perangkat dianggap **offline** bila backend tidak menerima heartbeat selama 30 detik.

## 1. Heartbeat

### Request

Field wajib sama dengan firmware v1, jadi sketch yang sudah ter-flash tetap diterima tanpa perubahan.
Field v2 semuanya **opsional**.

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `tag_id` | string | ya | `GPS-001` dst. Sama dengan stiker gelang |
| `gps_status` | string | tidak | `no_data`, `searching`, `fixed`, `unknown` (default `unknown`) |
| `satellites` | number | tidak | Jumlah satelit terpakai |
| `ip_address` | string | tidak | IP ESP di hotspot |
| `fw_version` | string | v2 | Versi sketch, maks 32 karakter, mis. `2.0.0` |
| `hdop` | number | v2 | 0–100, dari `gps.hdop.hdop()` |
| `fix_age_ms` | number | v2 | Umur fix terakhir, dari `gps.location.age()` |
| `ttff_ms` | number | v2 | Waktu dari boot sampai fix pertama. Kirim sekali didapat, tetap sama sampai reboot |
| `uptime_ms` | number | v2 | `millis()` |
| `rssi` | number | v2 | `WiFi.RSSI()`, -150 s.d. 0 |
| `battery_pct` | number | v2 | 0–100, dari ADC pembagi tegangan |
| `buffered_count` | number | v2 | Jumlah titik lokasi yang masih di buffer offline |
| `led_state` | string | v2 | LED yang **sedang menyala** di gelang: `none`, `identify`, `merah`, `kuning`, `hijau` |

Nilai v2 yang tipenya salah atau di luar rentang **tidak** ditolak. Backend menyimpannya sebagai `null`
dan heartbeat tetap 200, supaya satu sensor bermasalah tidak membuat gelang tampak offline.
Field yang tidak dikirim tidak menghapus nilai yang sudah tersimpan.

Contoh v2:

```json
{
  "tag_id": "GPS-001",
  "gps_status": "fixed",
  "satellites": 8,
  "ip_address": "192.168.137.45",
  "fw_version": "2.0.0",
  "hdop": 1.1,
  "fix_age_ms": 420,
  "ttff_ms": 38500,
  "uptime_ms": 912000,
  "rssi": -61,
  "battery_pct": 82,
  "buffered_count": 0,
  "led_state": "merah"
}
```

### Respons 200

```json
{
  "success": true,
  "data": {
    "tag_id": "GPS-001",
    "received_at": "2026-11-07T08:15:02.120Z",
    "assignment": { "victim_id": "…", "kategori_triase": "merah" },
    "identify": false,
    "led": "merah"
  }
}
```

| Field | Arti |
|---|---|
| `data.led` | Mode LED final, **sudah diprioritaskan server**. Firmware cukup menampilkan nilai ini |
| `data.identify` | `true` selama 15 dtk setelah koordinator menekan "Identifikasi" |
| `data.assignment` | Korban aktif yang memakai gelang ini; `null` = gelang bebas |

### Prioritas LED

Server menghitung `led` dengan urutan:

1. `identify`: berkedip (mis. putih/biru 2 Hz), supaya koordinator bisa menemukan gelang fisik
2. warna triase korban aktif: `merah`, `kuning`, `hijau`
3. `none`: gelang bebas atau korban sudah `arrived` → LED mati

Tombol darurat **tetap ditangani lokal oleh firmware** dan menang atas semua mode di atas selama
efeknya aktif. Setelah itu firmware kembali ke `led` terakhir dari server.

Setelah menerapkan `led`, kirim nilai yang sama di `led_state` pada heartbeat berikutnya. Backend
memakai `led_state` untuk menampilkan status LED di halaman Perangkat dan mengukur latensi sinkron
triase → LED (uji PAIR-02).

### Respons error

| Kode | Kapan |
|---|---|
| 400 `VALIDATION_ERROR` | `tag_id` kosong/bukan string, atau `gps_status` di luar daftar |
| 5xx | Server bermasalah. Firmware pertahankan LED terakhir dan coba lagi di heartbeat berikutnya |

Jika respons gagal atau tidak bisa di-parse, **jangan** mematikan LED. Pertahankan mode terakhir.

## 2. Lokasi

`POST /api/locations`

```json
{ "tag_id": "GPS-001", "lat": -6.361234, "lng": 106.824911, "timestamp": "2026-11-07T08:15:00Z", "battery_pct": 82 }
```

`POST /api/locations/batch` menerima `{ "items": [ …payload lokasi… ] }` dan membalas
`data.synced_count`.

## 3. Tombol darurat

`POST /api/devices/button`

```json
{ "tag_id": "GPS-001", "lat": -6.361234, "lng": 106.824911, "satellites": 8 }
```

`lat`/`lng` boleh dihilangkan bila GPS belum fix.

## 4. Uji tanpa hardware

```bash
npm run sim -- --count 3 --prefix GPS --duration 300        # payload v2
npm run sim -- --count 3 --prefix GPS --duration 300 --fw-legacy   # payload firmware v1
```

Simulator mengirim `led_state` = `led` dari respons heartbeat sebelumnya, sama seperti firmware v2.
