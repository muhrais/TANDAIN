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

export default function PriorityQueueCard({ items }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Priority Queue</h3>
        <ChevronRight size={18} className="text-muted" />
      </div>
      <ul className="divide-y divide-black/5">
        {items.map((item) => (
          <li key={item.tag_id} className="flex items-center justify-between py-2.5 text-sm">
            <span className="flex items-center gap-2 font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLOR[item.kategori_triase]}`} />
              <span className={TEXT_COLOR[item.kategori_triase]}>{item.tag_id}</span>
            </span>
            <span className="text-muted">{item.status_label}</span>
            <span className="text-muted/70">{item.elapsed}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
