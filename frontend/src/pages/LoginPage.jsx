import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { login, isAuthenticated } from "../services/authService";
import { ApiClientError } from "../lib/apiClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <img src="/logo-tandain.png" alt="TANDAIN" className="mx-auto mb-6 w-40" />
        <h1 className="text-center text-xl font-bold text-ink">Masuk ke TANDAIN</h1>
        <p className="mt-1 text-center text-sm text-muted">Sistem Triase Darurat Individu</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-ink">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
