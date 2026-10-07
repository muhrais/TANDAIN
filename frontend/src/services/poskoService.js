import { apiClient } from "../lib/apiClient";

export async function listPosko() {
  return apiClient.get("/api/posko");
}
