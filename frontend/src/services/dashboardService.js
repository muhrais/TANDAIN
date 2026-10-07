import { apiClient } from "../lib/apiClient";
import { STATUS_LABEL, formatTime, formatElapsed } from "../lib/activity";
import { getLatestLocations } from "./locationService";
import { listPosko } from "./poskoService";

// Beberapa fetch di halaman dashboard sama-sama butuh /api/dashboard/summary
// dalam satu batch render — dedupe jadi satu request lewat promise bersama.
let summaryPromise = null;

// Diekspor juga (bukan cuma dipakai internal) supaya deriveAlerts (T-FE-4)
// bisa akses priority_queue mentah tanpa bikin field baru khusus alert.
export function getSummary() {
  if (!summaryPromise) {
    summaryPromise = apiClient.get("/api/dashboard/summary");
    summaryPromise.finally(() => {
      summaryPromise = null;
    });
  }
  return summaryPromise;
}

export async function getTriageDistribution() {
  const summary = await getSummary();
  return {
    total_tags: summary.tags_summary.total,
    merah: summary.triase_distribution.merah,
    kuning: summary.triase_distribution.kuning,
    hijau: summary.triase_distribution.hijau,
    // Belum ada konsep korban jiwa di backend saat ini.
    korban_jiwa: 0,
  };
}

export async function getEvacuationStatus() {
  const summary = await getSummary();
  return {
    waiting_pickup: summary.status_breakdown.waiting_transfer,
    in_transit: summary.status_breakdown.in_transit,
    arrived: summary.status_breakdown.arrived,
  };
}

export async function getRegistrationStatus() {
  const summary = await getSummary();
  return {
    not_registered: summary.tags_summary.not_registered,
    registered: summary.tags_summary.registered,
  };
}

export async function getPriorityQueue() {
  const summary = await getSummary();
  return summary.priority_queue.map((item) => ({
    tag_id: item.tag_id,
    kategori_triase: item.kategori_triase,
    status_label: STATUS_LABEL[item.status_korban] ?? item.status_korban,
    elapsed: formatElapsed(item.waktu_update_terakhir),
  }));
}

export async function getRecentActivity(limit = 4) {
  const summary = await getSummary();
  return summary.recent_activity.slice(0, limit).map((item) => ({
    time: formatTime(item.waktu_perubahan),
    message: item.description,
  }));
}

// Belum ada GET /api/incident (T-BE-7, stretch). Nama & lokasi insiden
// dikonfigurasi lewat env (lihat frontend/.env.example) supaya tidak perlu
// hardcode; total korban dari data asli. Jumlah relawan/nakes (FR-DASH-05,
// Should) belum ada sumber datanya sama sekali - sengaja tidak ditampilkan
// daripada munculkan angka palsu.
export async function getIncidentInfo() {
  const summary = await getSummary();
  return {
    nama_bencana: import.meta.env.VITE_INCIDENT_NAME || "Insiden belum dikonfigurasi",
    lokasi: import.meta.env.VITE_INCIDENT_LOCATION || "-",
    total_korban: summary.totals.all_victims,
  };
}

// Status armada ESP32 dari heartbeat (GET /api/devices, deviceController).
export async function getDeviceStatuses() {
  return apiClient.get("/api/devices");
}

export async function getMapMarkers() {
  const [locations, posko] = await Promise.all([
    getLatestLocations(),
    listPosko(),
  ]);
  return { ...locations, posko };
}
