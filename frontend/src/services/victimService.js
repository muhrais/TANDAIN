import { apiClient } from "../lib/apiClient";

export async function createVictim(payload) {
  return apiClient.post("/api/victims", payload);
}

// Filter opsional yang didukung backend: kategori_triase, status_korban.
export async function listVictims(filter = {}) {
  const params = new URLSearchParams(
    Object.entries(filter).filter(([, value]) => value != null && value !== "")
  );
  const query = params.toString();
  return apiClient.get(`/api/victims${query ? `?${query}` : ""}`);
}

export async function updateVictim(victimId, payload) {
  return apiClient.put(`/api/victims/${encodeURIComponent(victimId)}`, payload);
}
