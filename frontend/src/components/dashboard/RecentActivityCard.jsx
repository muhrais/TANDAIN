import { ChevronRight } from "lucide-react";

const TEXT_COLOR = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning-dark",
  hijau: "text-triase-hijau",
};

export default function RecentActivityCard({ items, onShowAll, className = "" }) {
  return (
    <div className={`flex min-h-0 flex-col rounded-2xl bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Aktivitas Terbaru</h3>
        <button
          type="button"
          onClick={onShowAll}
          aria-label="Buka tab Aktivitas"
          className="text-muted hover:text-ink"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">Belum ada aktivitas.</p>
      )}
      <ul className="-mr-2 min-h-0 flex-1 divide-y divide-black/5 overflow-y-auto pr-2">
        {items.map((item, index) => (
          <li
            key={`${item.time}-${index}`}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-[13px]"
          >
            <span className="tabular-nums text-muted">{item.time}</span>
            <span className="min-w-0 truncate">
              <span className={`font-semibold ${TEXT_COLOR[item.kategori_triase] ?? "text-ink"}`}>{item.headline}</span>
              {item.nama && <span className="ml-2 text-ink/70">{item.nama}</span>}
            </span>
            <span className="truncate text-xs text-muted">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
