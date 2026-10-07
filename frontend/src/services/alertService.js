import { deriveAlerts } from "../lib/alert";

const RESOLVED_KEY = "tandain_resolved_alerts";

// deriveAlerts() menurunkan ulang daftar alert tiap dipanggil (tiap siklus
// polling, lihat useDashboardData). Status "ditangani" perlu disimpan
// terpisah di localStorage per alert_id supaya tidak tertimpa balik oleh
// hasil derive berikutnya begitu kondisi alert masih terpenuhi.
function loadResolved() {
  try {
    return JSON.parse(localStorage.getItem(RESOLVED_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveResolved(map) {
  try {
    localStorage.setItem(RESOLVED_KEY, JSON.stringify(map));
  } catch {
    // localStorage penuh/diblokir (mode privat) - status tetap benar di
    // state React untuk sesi ini, cuma tidak bertahan lintas reload.
  }
}

export async function getAlerts({ summary, posko, locations, now }) {
  const resolved = loadResolved();
  return deriveAlerts({ summary, posko, locations, now }).map((alert) => ({
    ...alert,
    ...(resolved[alert.alert_id] ?? {}),
  }));
}

export async function resolveAlert(alertId) {
  const update = { alert_id: alertId, status: "ditangani", waktu_ditangani: new Date().toISOString() };
  const resolved = loadResolved();
  resolved[alertId] = { status: update.status, waktu_ditangani: update.waktu_ditangani };
  saveResolved(resolved);
  return update;
}
