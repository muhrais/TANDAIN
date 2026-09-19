import { ChevronRight } from "lucide-react";

export default function RecentActivityCard({ items }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Recent Activity</h3>
        <ChevronRight size={18} className="text-muted" />
      </div>
      <ul className="divide-y divide-black/5">
        {items.map((item, index) => (
          <li key={`${item.time}-${index}`} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted/60" />
            <span className="text-muted">{item.time}</span>
            <span className="text-muted/50">—</span>
            <span className="text-ink/80">{item.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
