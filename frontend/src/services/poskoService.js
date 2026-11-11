import { apiClient } from "../lib/apiClient";

export async function listPosko() {
  return apiClient.get("/api/posko");
}

// Koordinator: { nama_posko?, kapasitas_maksimum?, lokasi?: { lat, lng } }
export async function updatePosko(poskoId, payload) {
  return apiClient.put(`/api/posko/${encodeURIComponent(poskoId)}`, payload);
}
