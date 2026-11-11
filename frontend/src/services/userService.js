import { apiClient } from "../lib/apiClient";

export async function listUsers() {
  return apiClient.get("/api/users");
}

export async function createUser(payload) {
  return apiClient.post("/api/users", payload);
}

// { nama?, role?, password? }
export async function updateUser(userId, payload) {
  return apiClient.put(`/api/users/${encodeURIComponent(userId)}`, payload);
}
