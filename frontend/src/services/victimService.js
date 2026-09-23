import { apiClient } from "../lib/apiClient";

export async function createVictim(payload) {
  return apiClient.post("/api/victims", payload);
}
