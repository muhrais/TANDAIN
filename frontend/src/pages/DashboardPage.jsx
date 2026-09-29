import { useState } from "react";
import Topbar from "../components/layout/Topbar";
import TriageDistributionCard from "../components/dashboard/TriageDistributionCard";
import StatCard from "../components/dashboard/StatCard";
import RegistrationSummaryRow from "../components/dashboard/RegistrationSummaryRow";
import MapPanel from "../components/dashboard/MapPanel";
import PriorityQueueCard from "../components/dashboard/PriorityQueueCard";
import RecentActivityCard from "../components/dashboard/RecentActivityCard";
import ActivityTab from "../components/activity/ActivityTab";
import AlertTab from "../components/alert/AlertTab";
import { resolveAlert } from "../services/alertService";
import { countAlerts } from "../lib/alert";
import { useDashboardData } from "../hooks/useDashboardData";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const { data, error, lastUpdated, refresh } = useDashboardData();

  async function handleResolveAlert(alertId) {
    await resolveAlert(alertId);
    // resolveAlert menyimpan status "ditangani" ke localStorage (lihat
    // alertService); refresh langsung supaya UI sinkron tanpa nunggu
    // siklus polling berikutnya (~5 dtk).
    refresh();
  }

  // Loading awal saja yang menampilkan pesan ini. Refresh berikutnya dari
  // polling tidak mengosongkan `data` lama (lihat usePolling), jadi tidak flicker.
  if (!data) {
    return <div className="min-w-0 flex-1 p-8 text-sm text-muted">Memuat dashboard...</div>;
  }

  const alerts = data.alerts;

  return (
    <div className="min-w-0 flex-1 space-y-6 p-4 md:space-y-8 md:p-8">
      <Topbar
        incidentInfo={data.incidentInfo}
        alertCounts={countAlerts(alerts)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lastUpdated={lastUpdated}
        pollError={error}
        onRefresh={refresh}
      />

      {activeTab === "Overview" && (
        // Satu grid 12 kolom: baris atas 6/6 (lebar sama), baris bawah 8/4 (peta lebih lebar).
        // Tinggi tiap baris mengikuti kolom tertinggi sehingga tepi bawah kartu selalu rata.
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <TriageDistributionCard data={data.triage} className="xl:col-span-6" />

          <div className="flex flex-col gap-5 xl:col-span-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-5">
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
            <div className="grid flex-1 grid-rows-2 gap-5">
              <RegistrationSummaryRow value={data.registration.not_registered} label="Not registered" />
              <RegistrationSummaryRow value={data.registration.registered} label="Registered" />
            </div>
          </div>

          <MapPanel
            markers={data.map.markers}
            posko={data.map.posko}
            serverTime={data.map.serverTime}
            className="xl:col-span-8"
          />

          <div className="grid grid-rows-2 gap-5 xl:col-span-4">
            <PriorityQueueCard items={data.priorityQueue} />
            <RecentActivityCard items={data.recentActivity} />
          </div>
        </div>
      )}

      {activeTab === "Aktivitas" && <ActivityTab activities={data.activities} />}

      {activeTab === "Alert" && <AlertTab alerts={alerts} onResolve={handleResolveAlert} />}
    </div>
  );
}
