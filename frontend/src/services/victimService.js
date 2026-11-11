import { apiClient } from "../lib/apiClient";

export async function createVictim(payload) {
  return apiClient.post("/api/victims", payload);
}

function toQuery(filter) {
  const params = new URLSearchParams(
    Object.entries(filter).filter(([, value]) => value != null && value !== "")
  );
  const query = params.toString();
  return query ? `?${query}` : "";
}

// Filter opsional yang didukung backend: kategori_triase, status_korban
// ("aktif" = belum tiba), posko, q. Tanpa `page`: array semua korban.
export async function listVictims(filter = {}) {
  return apiClient.get(`/api/victims${toQuery(filter)}`);
}

// Versi berhalaman untuk Data Pasien: { items, total, page, limit }.
export async function searchVictims({ page = 1, limit = 25, sort = "-waktu_update_terakhir", ...filter } = {}) {
  return apiClient.get(`/api/victims${toQuery({ ...filter, page, limit, sort })}`);
}

// Detail + status_history (status, triase, data) dengan nama pengubah.
export async function getVictimDetail(victimId) {
  return apiClient.get(`/api/victims/${encodeURIComponent(victimId)}`);
}

export async function getVictimLocations(victimId, limit = 200) {
  return apiClient.get(`/api/victims/${encodeURIComponent(victimId)}/locations?limit=${limit}`);
}

export async function updateVictim(victimId, payload) {
  return apiClient.put(`/api/victims/${encodeURIComponent(victimId)}`, payload);
}
