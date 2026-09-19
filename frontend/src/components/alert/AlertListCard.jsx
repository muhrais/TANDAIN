import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import FilterChip from "../common/FilterChip";
import { ALERT_TYPES, SEVERITY, sortAlerts } from "../../lib/alert";
import { formatTime } from "../../lib/activity";

const TEXT_COLOR = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning",
  hijau: "text-triase-hijau",
};

const STATUS_FILTERS = [
  { key: "aktif", label: "Aktif" },
  { key: "ditangani", label: "Ditangani" },
  { key: "semua", label: "Semua" },
];

const SEVERITY_FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "kritis", label: "Kritis" },
  { key: "peringatan", label: "Peringatan" },
];

function AlertRow({ alert, onResolve }) {
  const type = ALERT_TYPES[alert.jenis];
  const severity = SEVERITY[alert.severity];
  const Icon = type.icon;
  const resolved = alert.status === "ditangani";

  return (
    <li
      className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-4 py-5 ${
        resolved ? "opacity-60" : ""
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${severity.icon}`}>
        <Icon size={18} strokeWidth={1.75} />
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`text-sm font-semibold ${
              alert.kategori_triase ? TEXT_COLOR[alert.kategori_triase] : "text-ink"
            }`}
          >
            {alert.subjek}
          </span>
          <span className="text-sm font-semibold text-ink">{type.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${severity.pill}`}>
            {severity.label}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] text-ink/70">{alert.detail}</p>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {formatTime(alert.waktu)} · {alert.usia_menit} mnt lalu
        </p>
      </div>

      {resolved ? (
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-triase-hijau">
          <Check size={14} />
          Ditangani {formatTime(alert.waktu_ditangani)}
        </span>
      ) : (
        <button
          type="button"
          aria-label={`Tandai alert ${alert.subjek} ditangani`}
          onClick={() => onResolve(alert.alert_id)}
          className="whitespace-nowrap rounded-md border border-black/10 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-page"
        >
          Tandai ditangani
        </button>
      )}
    </li>
  );
}

export default function AlertListCard({ alerts, onResolve, className = "" }) {
  const [status, setStatus] = useState("aktif");
  const [severity, setSeverity] = useState("semua");

  const visible = useMemo(
    () =>
      sortAlerts(alerts).filter(
        (a) =>
          (status === "semua" || a.status === status) &&
          (severity === "semua" || a.severity === severity)
      ),
    [alerts, status, severity]
  );

  return (
    <div className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Daftar Alert</h3>
        <span className="text-sm text-muted">{visible.length} alert</span>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status alert">
          {STATUS_FILTERS.map(({ key, label }) => (
            <FilterChip key={key} active={status === key} onClick={() => setStatus(key)}>
              {label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter tingkat alert">
          {SEVERITY_FILTERS.map(({ key, label }) => (
            <FilterChip key={key} active={severity === key} onClick={() => setSeverity(key)}>
              {label}
            </FilterChip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
          Tidak ada alert yang cocok dengan filter.
        </div>
      ) : (
        <ul className="max-h-[520px] divide-y divide-black/5 overflow-y-auto pr-2">
          {visible.map((alert) => (
            <AlertRow key={alert.alert_id} alert={alert} onResolve={onResolve} />
          ))}
        </ul>
      )}
    </div>
  );
}
