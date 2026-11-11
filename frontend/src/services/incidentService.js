import { apiClient } from "../lib/apiClient";

export async function getIncident() {
  return apiClient.get("/api/incident");
}

// Koordinator. Field opsional: nama_insiden, lokasi, waktu_mulai,
// jumlah_relawan, jumlah_nakes, ambang: { ... }.
export async function updateIncident(payload) {
  return apiClient.put("/api/incident", payload);
}
