import { apiClient, TOKEN_KEY, USER_KEY } from "../lib/apiClient";

export async function login(username, password) {
  const data = await apiClient.post("/api/auth/login", { username, password });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getRole() {
  return getCurrentUser()?.role ?? null;
}

// Decode payload JWT tanpa library (base64url -> JSON). Tidak memverifikasi
// signature — itu tetap tanggung jawab backend, ini cuma baca field `exp`.
function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now();
}
