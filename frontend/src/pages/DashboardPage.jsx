import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/layout/Topbar";
import TriageDistributionCard from "../components/dashboard/TriageDistributionCard";
import StatCard from "../components/dashboard/StatCard";
import RegistrationSummaryRow from "../components/dashboard/RegistrationSummaryRow";
import MapPanel from "../components/dashboard/MapPanel";
import DeviceStatusCard from "../components/dashboard/DeviceStatusCard";
import PriorityQueueCard from "../components/dashboard/PriorityQueueCard";
import RecentActivityCard from "../components/dashboard/RecentActivityCard";
import ActivityTab from "../components/activity/ActivityTab";
import AlertTab from "../components/alert/AlertTab";
import { resolveAlert } from "../services/alertService";
import { countAlerts } from "../lib/alert";
import { useDashboardData } from "../hooks/useDashboardData";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Ringkasan");
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
      />

      {activeTab === "Ringkasan" && (
        // Urutan menurut prioritas petugas: apa yang harus ditangani dulu
        // (antrean + triase), lalu progres evakuasi, baru peta dan aktivitas.
        // Perangkat hanya strip satu baris di paling atas.
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <DeviceStatusCard devices={data.devices} />

          {/* Tinggi baris mengikuti kartu triase; antrean di-scroll di dalam kartu
              (xl:h-0 + min-h-full) supaya daftar panjang tidak memanjangkan baris. */}
          <div className="grid max-h-96 xl:col-span-6 xl:h-0 xl:max-h-none xl:min-h-full">
            <PriorityQueueCard items={data.priorityQueue} />
          </div>
          <TriageDistributionCard data={data.triage} className="xl:col-span-6" />

          <div className="grid grid-cols-2 gap-2 sm:gap-5 xl:col-span-12 xl:grid-cols-4">
            <StatCard label="Menunggu jemputan" value={data.evacuation.waiting_pickup} color="merah" />
            <StatCard label="Dalam perjalanan" value={data.evacuation.in_transit} color="kuning" />
            <StatCard label="Tiba di posko" value={data.evacuation.arrived} color="hijau" />
            <div className="grid grid-rows-2 gap-2">
              <RegistrationSummaryRow
                value={data.registration.not_registered}
                label="Tag belum terdaftar"
                to="/perangkat?filter=bebas"
              />
              <RegistrationSummaryRow
                value={data.registration.registered}
                label="Tag terdaftar"
                to="/pasien?status=aktif"
              />
            </div>
          </div>

          <MapPanel
            markers={data.map.markers}
            posko={data.map.posko}
            serverTime={data.map.serverTime}
            onMarkerClick={(item) =>
              item.victim && navigate(`/evakuasi?victim=${encodeURIComponent(item.victim.victim_id)}`)
            }
            className="aspect-square xl:col-span-7"
          />

          {/* Tinggi baris mengikuti peta (persegi). */}
          <div className="grid max-h-96 xl:col-span-5 xl:h-0 xl:max-h-none xl:min-h-full">
            <RecentActivityCard items={data.recentActivity} onShowAll={() => setActiveTab("Aktivitas")} />
          </div>
        </div>
      )}

      {activeTab === "Aktivitas" && <ActivityTab activities={data.activities} />}

      {activeTab === "Alert" && (
        <AlertTab alerts={alerts} ambang={data.incidentInfo.ambang} onResolve={handleResolveAlert} />
      )}
    </div>
  );
}
