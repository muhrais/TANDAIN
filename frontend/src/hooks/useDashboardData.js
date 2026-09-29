import { usePolling } from "./usePolling";
import {
  getTriageDistribution,
  getEvacuationStatus,
  getRegistrationStatus,
  getPriorityQueue,
  getRecentActivity,
  getIncidentInfo,
  getMapMarkers,
  getSummary,
} from "../services/dashboardService";
import { getAlerts } from "../services/alertService";

async function fetchDashboardData() {
  // getSummary() di sini dedupe otomatis dengan panggilan lain ke summary
  // (getTriageDistribution dkk) lewat summaryPromise bersama di dashboardService.
  const [incidentInfo, triage, evacuation, registration, priorityQueue, recentActivity, map, summary] =
    await Promise.all([
      getIncidentInfo(),
      getTriageDistribution(),
      getEvacuationStatus(),
      getRegistrationStatus(),
      getPriorityQueue(),
      getRecentActivity(),
      getMapMarkers(),
      getSummary(),
    ]);

  const alerts = await getAlerts({
    summary,
    posko: map.posko,
    locations: { markers: map.markers },
    now: map.serverTime,
  });

  return { incidentInfo, triage, evacuation, registration, priorityQueue, recentActivity, map, alerts };
}

export function useDashboardData() {
  return usePolling(fetchDashboardData);
}
