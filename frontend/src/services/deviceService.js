import { apiClient } from "../lib/apiClient";

// Armada gelang (ESP32 + GPS + NFC) yang pernah mengirim heartbeat,
// lengkap dengan status pairing dan korban aktif (GET /api/devices).
export async function listDevices() {
  return apiClient.get("/api/devices");
}

// Pairing UID NFC gelang ke perangkat (koordinator, sekali saat persiapan).
// force: pindahkan UID yang sudah terpasang ke gelang lain.
export async function pairDevice(tagId, nfcUid, { force = false } = {}) {
  return apiClient.post(`/api/tags/${encodeURIComponent(tagId)}/pair`, { nfc_uid: nfcUid, force });
}

export async function unpairDevice(tagId) {
  return apiClient.delete(`/api/tags/${encodeURIComponent(tagId)}/pair`);
}

// LED gelang berkedip ±15 dtk (sampai lewat respons heartbeat berikutnya).
export async function identifyDevice(tagId) {
  return apiClient.post(`/api/tags/${encodeURIComponent(tagId)}/identify`);
}
