import { apiClient } from "../lib/apiClient";

// { total, edit_window_min, items: [...] } - entri yang tidak dihapus.
export async function listKorbanJiwa() {
  return apiClient.get("/api/korban-jiwa");
}

export async function createKorbanJiwa(payload) {
  return apiClient.post("/api/korban-jiwa", payload);
}

export async function updateKorbanJiwa(id, payload) {
  return apiClient.put(`/api/korban-jiwa/${encodeURIComponent(id)}`, payload);
}

// Soft delete; alasan wajib (tercatat untuk audit).
export async function deleteKorbanJiwa(id, alasan) {
  return apiClient.delete(`/api/korban-jiwa/${encodeURIComponent(id)}`, { alasan });
}
