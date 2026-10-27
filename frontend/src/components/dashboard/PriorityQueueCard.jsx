import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

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

export default function PriorityQueueCard({ items, className = "" }) {
  return (
    <div className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Antrian Prioritas</h3>
        <Link to="/evakuasi" aria-label="Buka halaman Evakuasi" className="text-muted hover:text-ink">
          <ChevronRight size={18} />
        </Link>
      </div>
      {items.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">Tidak ada korban aktif.</p>
      )}
      <ul className="divide-y divide-black/5">
        {items.map((item) => (
          <li
            key={item.tag_id}
            className="grid grid-cols-[minmax(0,1fr)_8.5rem_3.75rem] items-center gap-2 py-2.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[item.kategori_triase]}`} />
              <span className={`truncate whitespace-nowrap ${TEXT_COLOR[item.kategori_triase]}`}>{item.tag_id}</span>
            </span>
            <span className="truncate text-[13px] text-muted">{item.status_label}</span>
            <span className="whitespace-nowrap text-right text-[13px] tabular-nums text-muted">{item.elapsed}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
