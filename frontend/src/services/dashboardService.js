import { apiClient } from "../lib/apiClient";
import { mockIncidentInfo } from "../mocks/dashboard";
import { mockVictims, mockPoskoUtama } from "../mocks/victims";
import { STATUS_LABEL, formatTime, formatElapsed } from "../lib/activity";

// Beberapa fetch di halaman dashboard sama-sama butuh /api/dashboard/summary
// dalam satu batch render — dedupe jadi satu request lewat promise bersama.
let summaryPromise = null;

function getSummary() {
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

export async function getIncidentInfo() {
  return mockIncidentInfo;
}

export async function getMapMarkers() {
  return { victims: mockVictims, posko: mockPoskoUtama };
}
