import {
  mockTriageDistribution,
  mockEvacuationStatus,
  mockRegistrationStatus,
  mockPriorityQueue,
  mockRecentActivity,
  mockIncidentInfo,
} from "../mocks/dashboard";
import { mockVictims, mockPoskoUtama } from "../mocks/victims";

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

export async function getRecentActivity() {
  return mockRecentActivity;
}

export async function getIncidentInfo() {
  return mockIncidentInfo;
}

export async function getMapMarkers() {
  return { victims: mockVictims, posko: mockPoskoUtama };
}
