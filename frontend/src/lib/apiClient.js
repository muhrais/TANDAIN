// String kosong ("") sengaja valid: artinya pakai path relatif lewat proxy
// Vite (lihat vite.config.js), makanya pengecekan pakai ?? bukan ||.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const TOKEN_KEY = "tandain_token";
const USER_KEY = "tandain_user";

// Dilempar untuk semua response gagal (network maupun error terstruktur dari backend).
// Bentuk error backend: { success: false, error: { code, message, details? } } (lihat errorHandler.js).
export class ApiClientError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Batas waktu tiap request. Mencegah polling menggantung selamanya kalau
// hotspot/Wi-Fi putus di tengah request (bukan gagal konek dari awal).
const REQUEST_TIMEOUT_MS = 10000;

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiClientError(0, "TIMEOUT", "Permintaan ke server memakan waktu terlalu lama.");
    }
    throw new ApiClientError(0, "NETWORK_ERROR", "Tidak bisa terhubung ke server.");
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("auth:expired"));
    }
    if (res.status === 403 && json?.error?.code === "FORBIDDEN_ROLE") {
      window.dispatchEvent(new Event("role:forbidden"));
    }
    throw new ApiClientError(
      res.status,
      json?.error?.code ?? "UNKNOWN_ERROR",
      json?.error?.message ?? "Terjadi kesalahan tak terduga.",
      json?.error?.details
    );
  }

  return json?.data;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export { TOKEN_KEY, USER_KEY };
