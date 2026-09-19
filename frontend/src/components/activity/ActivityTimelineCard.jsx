import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { STATUS_ORDER, STATUS_LABEL, describeActivity, formatTime } from "../../lib/activity";

const DOT_COLOR = {
  merah: "bg-triase-merah",
  kuning: "bg-triase-kuning",
  hijau: "bg-triase-hijau",
};

const TEXT_COLOR = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning",
  hijau: "text-triase-hijau",
};

const STATUS_FILTERS = [
  { key: "semua", label: "Semua" },
  ...STATUS_ORDER.map((key) => ({ key, label: STATUS_LABEL[key] })),
];

const TRIASE_FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "merah", label: "Merah" },
  { key: "kuning", label: "Kuning" },
  { key: "hijau", label: "Hijau" },
];

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active ? "bg-sidebar text-white" : "bg-page text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function TimelineRow({ activity, isFirst, isLast }) {
  const transition = activity.status_lama
    ? `${STATUS_LABEL[activity.status_lama]} → ${STATUS_LABEL[activity.status_baru]}`
    : STATUS_LABEL[activity.status_baru];

  return (
    <li className="grid grid-cols-[3rem_1rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3 text-sm">
      <span className="tabular-nums text-muted">{formatTime(activity.waktu_perubahan)}</span>

      <span className="relative flex h-full justify-center self-stretch">
        <span
          aria-hidden="true"
          className={`absolute w-px bg-black/10 ${isFirst ? "top-2" : "-top-3"} ${
            isLast ? "h-2" : "-bottom-3"
          }`}
        />
        <span
          className={`relative mt-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${DOT_COLOR[activity.kategori_triase]}`}
        />
      </span>

      <span className="min-w-0">
        <span className={`mr-2 font-semibold ${TEXT_COLOR[activity.kategori_triase]}`}>
          {activity.tag_id}
        </span>
        <span className="text-ink/80">{describeActivity(activity)}</span>
      </span>

      <span className="whitespace-nowrap rounded-md bg-page px-2 py-1 text-xs text-muted">
        {transition}
      </span>
    </li>
  );
}

export default function ActivityTimelineCard({ activities, className = "" }) {
  const [status, setStatus] = useState("semua");
  const [triase, setTriase] = useState("semua");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter(
      (a) =>
        (status === "semua" || a.status_baru === status) &&
        (triase === "semua" || a.kategori_triase === triase) &&
        (!q || a.tag_id.toLowerCase().includes(q))
    );
  }, [activities, status, triase, query]);

  return (
    <div className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Activity Timeline</h3>
        <span className="text-sm text-muted">{filtered.length} aktivitas</span>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-[260px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari tag, mis. TDN-004"
              aria-label="Cari aktivitas berdasarkan tag"
              className="h-9 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter kategori triase">
            {TRIASE_FILTERS.map(({ key, label }) => (
              <FilterChip key={key} active={triase === key} onClick={() => setTriase(key)}>
                {key !== "semua" && (
                  <span className={`h-2 w-2 rounded-full ${DOT_COLOR[key]}`} />
                )}
                {label}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
          {STATUS_FILTERS.map(({ key, label }) => (
            <FilterChip key={key} active={status === key} onClick={() => setStatus(key)}>
              {label}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
          Tidak ada aktivitas yang cocok dengan filter.
        </div>
      ) : (
        <ul className="max-h-[520px] overflow-y-auto pr-2">
          {filtered.map((activity, index) => (
            <TimelineRow
              key={activity.history_id}
              activity={activity}
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
