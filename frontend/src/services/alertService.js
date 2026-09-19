import { mockAlerts, MOCK_NOW } from "../mocks/alerts";

const minutesSince = (iso) =>
  Math.max(0, Math.round((new Date(MOCK_NOW) - new Date(iso)) / 60000));

// Backend belum punya endpoint alert. Nanti diganti fetch; usia_menit dihitung
// terhadap waktu sekarang, dan resolveAlert menjadi PUT/PATCH ke server.
export async function getAlerts() {
  return mockAlerts.map((alert) => ({ ...alert, usia_menit: minutesSince(alert.waktu) }));
}

export async function resolveAlert(alertId) {
  return { alert_id: alertId, status: "ditangani", waktu_ditangani: MOCK_NOW };
}
