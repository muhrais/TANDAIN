import { apiClient } from "../lib/apiClient";
import { setServerTimeOffset } from "../lib/metrics";

// Satu titik terakhir per tag dari GET /api/locations/latest (koordinator),
// termasuk tag yang belum diregistrasi (`victim: null`). `server_time`
// dipakai untuk koreksi jam lokal di panel metrik (uji P-03) dan untuk
// menghitung "X dtk lalu" tanpa tergantung jam laptop/HP.
export async function getLatestLocations() {
  const { server_time, items } = await apiClient.get("/api/locations/latest");
  const serverTime = new Date(server_time);
  setServerTimeOffset(serverTime);

  return {
    serverTime,
    markers: items.filter((item) => item.lat != null && item.lng != null),
    noFix: items.filter((item) => item.lat == null || item.lng == null),
  };
}
