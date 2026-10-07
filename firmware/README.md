# Firmware tiga GPS TANDAIN

Ketiga sketch menggunakan konfigurasi jaringan lokal pada file `secrets.h` masing-masing.
Salin `secrets.h.example` menjadi `secrets.h`, lalu sesuaikan:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `BACKEND_BASE_URL`

File `secrets.h` diabaikan Git agar kredensial hotspot tidak masuk repository.

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
