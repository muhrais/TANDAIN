import { useEffect, useSyncExternalStore } from "react";

// Status koneksi ke backend untuk indikator di sidebar (D4).
// apiClient melapor hasil setiap request: "online" kalau server menjawab
// (apa pun status HTTP-nya), "offline" kalau gagal jaringan atau timeout.
// Halaman yang tidak polling tetap terpantau lewat ping /api/health.

const HEALTH_INTERVAL_MS = 15000;

let state = { status: "unknown", at: 0 };
const listeners = new Set();

export function reportConnection(online) {
  const status = online ? "online" : "offline";
  const changed = status !== state.status;
  state = { status, at: Date.now() };
  if (changed) listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStatus() {
  return state.status;
}

// `ping` dioper dari pemanggil supaya modul ini tidak bergantung ke apiClient
// (apiClient yang mengimpor reportConnection).
export function useConnectionStatus(ping) {
  useEffect(() => {
    function check() {
      // Lewati ping kalau request lain baru saja melapor; cukup satu sumber.
      if (document.visibilityState === "hidden") return;
      if (Date.now() - state.at < HEALTH_INTERVAL_MS) return;
      ping().catch(() => {});
    }
    check();
    const id = setInterval(check, HEALTH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ping]);

  return useSyncExternalStore(subscribe, getStatus);
}
