import { apiClient } from "../lib/apiClient";

// T-BE-1 (`GET /api/locations/latest`, lihat PLANNING_WEEK6_SOFTWARE.md §3.1)
// belum tersedia di backend. Sementara derive dari GET /api/victims: hanya
// korban yang sudah diregistrasi yang bisa muncul (tag yang belum
// diregistrasi tidak akan tampil sampai T-BE-1 selesai -> bug B2 di plan).
// Begitu endpoint asli tersedia, cukup ganti isi fungsi ini; bentuk return
// (`{ serverTime, markers, noFix }`) sudah disamakan dengan kontrak endpoint
// baru supaya pemanggil (dashboardService, MapPanel) tidak perlu berubah.
export async function getLatestLocations() {
  const victims = await apiClient.get("/api/victims");

  const markers = victims
    .filter((v) => v.lokasi_terakhir?.lat != null && v.lokasi_terakhir?.lng != null)
    .map((v) => ({
      tag_id: v.tag_id,
      lat: v.lokasi_terakhir.lat,
      lng: v.lokasi_terakhir.lng,
      gps_fix: true,
      battery_pct: null,
      device_timestamp: v.waktu_update_terakhir,
      received_at: v.waktu_update_terakhir,
      victim: {
        victim_id: v.victim_id,
        nama: v.nama,
        kategori_triase: v.kategori_triase,
        status_korban: v.status_korban,
      },
    }));

  return {
    serverTime: new Date(),
    markers,
    noFix: [],
  };
}
