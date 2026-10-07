// String kosong ("") sengaja valid: artinya pakai path relatif lewat proxy
// Vite (lihat vite.config.js), makanya pengecekan pakai ?? bukan ||.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TOKEN_KEY = "tandain_token";
const USER_KEY = "tandain_user";
const REQUEST_TIMEOUT_MS = 8000;

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

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    throw new ApiClientError(
      0,
      timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      timedOut ? "Server terlalu lama merespons." : "Tidak bisa terhubung ke server."
    );
  } finally {
    window.clearTimeout(timeout);
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
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
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export { TOKEN_KEY, USER_KEY };
