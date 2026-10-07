# Firmware tiga GPS TANDAIN

Konfigurasi jaringan berada langsung di bagian atas masing-masing file `.ino`, sehingga
sketch dapat langsung dibuka di Arduino IDE tanpa file tambahan. Sesuaikan:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `BACKEND_BASE_URL`

Contoh:

```cpp
const char* WIFI_SSID = "apasi";
const char* WIFI_PASSWORD = "GANTI_DENGAN_PASSWORD_HOTSPOT";
const char* BACKEND_BASE_URL = "http://192.168.137.1:3000";
```

Jangan commit password hotspot asli ke repository publik.

Folder dan identitas perangkat:

| Sketch | Device ID |
|---|---|
| `GPS-001/GPS-001.ino` | `GPS-001` |
| `GPS-002/GPS-002.ino` | `GPS-002` |
| `GPS-003/GPS-003.ino` | `GPS-003` |

## Jaringan yang disarankan

Gunakan **Mobile Hotspot Windows** pada laptop yang menjalankan backend. Contoh konfigurasi lokal:

- Network name: tentukan sendiri
- Password: tentukan sendiri
- Band: 2.4 GHz

Pada konfigurasi standar Mobile Hotspot Windows, laptop dapat dijangkau oleh ESP32 pada
`192.168.137.1`. Dashboard tetap dibuka di laptop melalui `http://localhost:5173`.

Jika Windows memberikan alamat yang berbeda, jalankan `ipconfig`, lalu ubah
`BACKEND_BASE_URL` pada ketiga sketch.

## Upload

Upload sketch satu per satu ke board yang sesuai. Di Serial Monitor (115200 baud), koneksi
berhasil jika terlihat:

```text
Wi-Fi : CONNECTED
BACKEND: POST /api/devices/heartbeat -> 200
```
