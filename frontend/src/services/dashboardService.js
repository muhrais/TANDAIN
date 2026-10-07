import {
  mockTriageDistribution,
  mockEvacuationStatus,
  mockRegistrationStatus,
  mockPriorityQueue,
  mockIncidentInfo,
} from "../mocks/dashboard";
import { mockPoskoUtama } from "../mocks/victims";
import { apiClient } from "../lib/apiClient";
import { getActivities } from "./activityService";
import { describeActivity, formatTime } from "../lib/activity";

// Layer ini yang nanti diganti jadi fetch ke GET /api/dashboard/summary,
// GET /api/victims, dan WS /ws/updates (FR-BE-06, FR-BE-11). Signature fungsi
// di bawah ini sengaja dibuat sama seperti bentuk response backend supaya
// komponen tidak perlu berubah saat integrasi.

export async function getTriageDistribution() {
  return mockTriageDistribution;
}

export async function getEvacuationStatus() {
  return mockEvacuationStatus;
}

export async function getRegistrationStatus() {
  return mockRegistrationStatus;
}

export async function getPriorityQueue() {
  return mockPriorityQueue;
}

export async function getRecentActivity(limit = 4) {
  const activities = await getActivities();
  return activities.slice(0, limit).map((activity) => ({
    time: formatTime(activity.waktu_perubahan),
    message: `${activity.tag_id} ${describeActivity(activity)}`,
  }));
}

export async function getIncidentInfo() {
  return mockIncidentInfo;
}

export async function getMapMarkers() {
  const devices = await apiClient.get("/api/devices");
  const victims = devices
    .filter(
      (device) =>
        typeof device.latest_location?.lat === "number" &&
        typeof device.latest_location?.lng === "number"
    )
    .map((device) => ({
      tag_id: device.tag_id,
      nama: "",
      kategori_triase: device.online ? "hijau" : "merah",
      status_korban: device.online ? "online" : "offline",
      lokasi_terakhir: {
        lat: device.latest_location.lat,
        lng: device.latest_location.lng,
      },
    }));

  return { victims, posko: mockPoskoUtama };
}

export async function getDeviceStatuses() {
  return apiClient.get("/api/devices");
}
