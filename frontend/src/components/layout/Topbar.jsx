import { Link } from "react-router-dom";
import { TriangleAlert, Bell, RefreshCw } from "lucide-react";

const TABS = ["Ringkasan", "Alert", "Aktivitas"];

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

// Baris identitas insiden: "Simulasi MCI FT UI • Depok • 15 korban • 2 korban
// jiwa • 12 relawan • 6 nakes". Nama/lokasi kosong -> tautan ke Pengaturan,
// bukan teks placeholder.
function incidentParts(info) {
  const parts = [];
  if (info.nama_insiden) parts.push({ key: "nama", text: info.nama_insiden });
  if (info.lokasi) parts.push({ key: "lokasi", text: info.lokasi });
  if (!info.nama_insiden && !info.lokasi) {
    parts.push({ key: "atur", text: "Atur identitas insiden", to: "/pengaturan" });
  }
  parts.push({ key: "korban", text: `${info.total_korban} korban` });
  parts.push({ key: "kj", text: `${info.korban_jiwa} korban jiwa` });
  if (info.jumlah_relawan) parts.push({ key: "relawan", text: `${info.jumlah_relawan} relawan` });
  if (info.jumlah_nakes) parts.push({ key: "nakes", text: `${info.jumlah_nakes} nakes` });
  return parts;
}

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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink md:text-2xl">Dashboard</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {incidentParts(incidentInfo).map((part, index) => (
              <span key={part.key} className="flex items-center gap-2">
                {index > 0 && <span className="text-muted/50">•</span>}
                {part.to ? (
                  <Link to={part.to} className="underline decoration-dotted underline-offset-4 hover:text-ink">
                    {part.text}
                  </Link>
                ) : (
                  <span>{part.text}</span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Satu indikator alert saja: merah bila ada yang kritis, netral bila
              hanya ada alert biasa. Angkanya selalu sama dengan isi tab Alert. */}
          {alertCounts.aktif > 0 && (
            <button
              type="button"
              onClick={() => onTabChange("Alert")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                alertCounts.kritis > 0
                  ? "bg-triase-merah-soft text-triase-merah hover:bg-triase-merah/15"
                  : "bg-white text-ink hover:bg-black/5"
              }`}
            >
              {alertCounts.kritis > 0 ? <TriangleAlert size={14} aria-hidden="true" /> : <Bell size={14} aria-hidden="true" />}
              {alertCounts.kritis > 0
                ? `${alertCounts.kritis} alert kritis`
                : `${alertCounts.aktif} alert aktif`}
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh manual (data juga diperbarui otomatis)"
            className={`flex items-center gap-1.5 text-sm font-medium ${
              isLive ? "text-logo-green" : "text-triase-merah"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLive ? "bg-logo-green" : "bg-triase-merah"}`} />
            {isLive ? "Live" : "Terputus"} · {isLive ? "update" : "data"}{" "}
            {lastUpdated ? clockFormatter.format(lastUpdated) : "--:--:--"}
            <RefreshCw size={14} aria-hidden="true" />
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
