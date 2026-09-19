import { useEffect, useState } from "react";
import Topbar from "../components/layout/Topbar";
import TriageDistributionCard from "../components/dashboard/TriageDistributionCard";
import StatCard from "../components/dashboard/StatCard";
import RegistrationSummaryRow from "../components/dashboard/RegistrationSummaryRow";
import MapPanel from "../components/dashboard/MapPanel";
import PriorityQueueCard from "../components/dashboard/PriorityQueueCard";
import RecentActivityCard from "../components/dashboard/RecentActivityCard";
import {
  getTriageDistribution,
  getEvacuationStatus,
  getRegistrationStatus,
  getPriorityQueue,
  getRecentActivity,
  getIncidentInfo,
  getMapMarkers,
} from "../services/dashboardService";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getIncidentInfo(),
      getTriageDistribution(),
      getEvacuationStatus(),
      getRegistrationStatus(),
      getPriorityQueue(),
      getRecentActivity(),
      getMapMarkers(),
    ]).then(([incidentInfo, triage, evacuation, registration, priorityQueue, recentActivity, map]) => {
      if (cancelled) return;
      setData({ incidentInfo, triage, evacuation, registration, priorityQueue, recentActivity, map });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return <div className="p-8 text-sm text-muted">Memuat dashboard...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      <Topbar incidentInfo={data.incidentInfo} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Overview" && (
        <>
          <div className="flex flex-col gap-5 xl:flex-row">
            <div className="xl:w-[440px] xl:shrink-0">
              <TriageDistributionCard data={data.triage} />
            </div>

            <div className="flex flex-1 flex-col gap-5">
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label="Waiting Pickup"
                  value={data.evacuation.waiting_pickup}
                  caption="Belum di Evakuasi"
                  color="merah"
                />
                <StatCard
                  label="In Transit"
                  value={data.evacuation.in_transit}
                  caption="Sedang di Evakuasi"
                  color="kuning"
                />
                <StatCard
                  label="Arrived"
                  value={data.evacuation.arrived}
                  caption="Sudah di Evakuasi"
                  color="kuning"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <RegistrationSummaryRow value={data.registration.not_registered} label="Not registered" />
                <RegistrationSummaryRow value={data.registration.registered} label="Registered" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row">
            <div className="flex-1">
              <MapPanel victims={data.map.victims} posko={data.map.posko} />
            </div>
            <div className="flex flex-col gap-5 xl:w-[360px] xl:shrink-0">
              <PriorityQueueCard items={data.priorityQueue} />
              <RecentActivityCard items={data.recentActivity} />
            </div>
          </div>
        </>
      )}

      {activeTab !== "Overview" && (
        <div className="rounded-2xl bg-white p-8 text-sm text-muted shadow-sm">
          Tab "{activeTab}" belum diimplementasikan.
        </div>
      )}
    </div>
  );
}
