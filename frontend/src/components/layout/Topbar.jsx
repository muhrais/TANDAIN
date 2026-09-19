import { TriangleAlert, Bell, Clock } from "lucide-react";

const TABS = ["Overview", "Alert", "Aktivitas"];

export default function Topbar({ incidentInfo, activeTab, onTabChange }) {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span>{incidentInfo.nama_bencana}</span>
            <span className="text-muted/50">•</span>
            <span>{incidentInfo.tanggal}</span>
            <span className="text-muted/50">•</span>
            <span>{incidentInfo.waktu}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 rounded-full bg-triase-merah-soft px-3 py-1 text-xs font-semibold text-triase-merah">
            <TriangleAlert size={14} />
            {incidentInfo.alert_kritis} alert kritis
          </span>
          <button type="button" className="relative text-muted hover:text-ink" aria-label="Notifikasi">
            <Bell size={20} />
            {incidentInfo.notifikasi > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {incidentInfo.notifikasi}
              </span>
            )}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Clock size={16} />
            09:15 WIB
          </span>
        </div>
      </div>

      <div role="tablist" aria-label="Tampilan dashboard" className="mt-5 flex items-center gap-1">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab)}
              className={`rounded-md px-5 py-3 text-[15px] leading-5 transition-colors ${
                active
                  ? "bg-white font-bold text-ink"
                  : "font-semibold text-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
