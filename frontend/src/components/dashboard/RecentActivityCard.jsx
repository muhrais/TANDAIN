import { ChevronRight } from "lucide-react";

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
          <li key={`${item.time}-${index}`} className="flex items-center gap-3 py-2.5 text-[13px]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted/60" />
            <span className="w-10 shrink-0 tabular-nums text-muted">{item.time}</span>
            <span className="shrink-0 text-muted/50">—</span>
            <span className="min-w-0 text-ink/80">{item.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
