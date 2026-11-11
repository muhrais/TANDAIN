import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import IncidentSettings from "../components/pengaturan/IncidentSettings";
import AmbangSettings from "../components/pengaturan/AmbangSettings";
import PoskoSettings from "../components/pengaturan/PoskoSettings";
import UserSettings from "../components/pengaturan/UserSettings";
import { getIncident } from "../services/incidentService";
import { listPosko } from "../services/poskoService";
import { listUsers } from "../services/userService";
import { ApiClientError } from "../lib/apiClient";

const TABS = [
  { key: "insiden", label: "Insiden" },
  { key: "ambang", label: "Ambang Alert" },
  { key: "posko", label: "Posko" },
  { key: "pengguna", label: "Pengguna" },
];

// Pengaturan (koordinator): identitas insiden, ambang alert, posko, pengguna.
// Semua tab membaca dan menulis ke backend; tidak ada tab placeholder.
export default function PengaturanPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "insiden";
  const [incident, setIncident] = useState(null);
  const [posko, setPosko] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [i, p, u] = await Promise.all([getIncident(), listPosko(), listUsers()]);
      setIncident(i);
      setPosko(p);
      setUsers(u);
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getIncident(), listPosko(), listUsers()])
      .then(([i, p, u]) => {
        if (!active) return;
        setIncident(i);
        setPosko(p);
        setUsers(u);
      })
      .catch((err) => active && setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server."));
    return () => {
      active = false;
    };
  }, []);

  const ready = incident && posko && users;

  return (
    <div className="min-w-0 flex-1 space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-xl font-bold text-ink md:text-2xl">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted">Data insiden, ambang alert, posko, dan akun pengguna.</p>
      </div>

      <div role="tablist" aria-label="Bagian pengaturan" className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setParams(t.key === "insiden" ? {} : { tab: t.key })}
            className={`shrink-0 rounded-md px-4 py-2.5 text-sm leading-5 transition-colors md:px-5 md:text-[15px] ${
              tab === t.key ? "bg-white font-bold text-ink shadow-sm" : "font-semibold text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-triase-merah-soft px-4 py-3 text-sm text-triase-merah">
          {error}
        </p>
      )}
      {!ready && !error && <p className="text-sm text-muted">Memuat pengaturan...</p>}

      {ready && tab === "insiden" && <IncidentSettings incident={incident} onSaved={setIncident} />}
      {ready && tab === "ambang" && <AmbangSettings incident={incident} onSaved={setIncident} />}
      {ready && tab === "posko" && <PoskoSettings posko={posko} onSaved={load} />}
      {ready && tab === "pengguna" && <UserSettings users={users} onSaved={load} />}
    </div>
  );
}
