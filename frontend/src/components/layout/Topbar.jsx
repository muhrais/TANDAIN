import { useState } from "react";
import { TriangleAlert, Bell, RefreshCw, Download } from "lucide-react";
import { exportVictimsCsv } from "../../services/reportService";

const TABS = ["Overview", "Alert", "Aktivitas"];

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export default function Topbar({
  incidentInfo,
  alertCounts,
  activeTab,
  onTabChange,
  lastUpdated,
  pollError,
  onRefresh,
}) {
  const isLive = Boolean(lastUpdated) && !pollError;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExportError("");
    setExporting(true);
    try {
      await exportVictimsCsv();
    } catch (err) {
      setExportError(err.message || "Gagal mengekspor data.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink md:text-2xl">Dashboard</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>{incidentInfo.nama_bencana}</span>
            <span className="text-muted/50">•</span>
            <span>{incidentInfo.lokasi}</span>
            <span className="text-muted/50">•</span>
            <span>{incidentInfo.total_korban} korban</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            title={exportError || "Unduh data seluruh korban (CSV)"}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
              exportError
                ? "border-triase-merah/40 text-triase-merah"
                : "border-black/10 text-ink hover:bg-white"
            }`}
          >
            <Download size={14} />
            {exporting ? "Mengekspor..." : exportError ? "Ekspor gagal, coba lagi" : "Ekspor CSV"}
          </button>
          {alertCounts.kritis > 0 && (
            <button
              type="button"
              onClick={() => onTabChange("Alert")}
              className="flex items-center gap-1.5 rounded-full bg-triase-merah-soft px-3 py-1 text-xs font-semibold text-triase-merah transition-colors hover:bg-triase-merah/15"
            >
              <TriangleAlert size={14} />
              {alertCounts.kritis} alert kritis
            </button>
          )}
          <button
            type="button"
            onClick={() => onTabChange("Alert")}
            className="relative text-muted hover:text-ink"
            aria-label={`Notifikasi, ${alertCounts.aktif} alert aktif`}
          >
            <Bell size={20} />
            {alertCounts.aktif > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {alertCounts.aktif}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh manual"
            className={`hidden items-center gap-1.5 text-sm font-medium sm:flex ${
              isLive ? "text-logo-green" : "text-triase-merah"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLive ? "bg-logo-green" : "bg-triase-merah"}`} />
            {isLive ? "Live" : "Terputus"} · {isLive ? "update" : "data"}{" "}
            {lastUpdated ? clockFormatter.format(lastUpdated) : "--:--:--"}
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Tampilan dashboard" className="mt-5 flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab)}
              className={`shrink-0 rounded-md px-3.5 py-2.5 text-sm leading-5 transition-colors md:px-5 md:py-3 md:text-[15px] ${
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
