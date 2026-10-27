// Filter tingkat (triase, keparahan alert): pill berwarna sesuai tingkatnya.
// Dibedakan dari SegmentedFilter (kategori/status) yang netral tanpa warna.
const TONE = {
  merah: {
    dot: "bg-triase-merah",
    active: "border-triase-merah/40 bg-triase-merah-soft text-triase-merah",
  },
  kuning: {
    dot: "bg-triase-kuning",
    active: "border-triase-kuning/50 bg-triase-kuning-soft text-triase-kuning-dark",
  },
  hijau: {
    dot: "bg-triase-hijau",
    active: "border-triase-hijau/40 bg-triase-hijau-soft text-triase-hijau",
  },
  // Tag tanpa korban: sama dengan marker abu-abu bergaris putus di peta.
  abu: {
    dot: "border border-dashed border-neutral-400 bg-neutral-200",
    active: "border-neutral-400 bg-neutral-100 text-ink",
  },
  netral: {
    dot: null,
    active: "border-sidebar bg-sidebar text-white",
  },
};

export default function LevelFilter({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      {label && <span className="shrink-0 text-xs font-medium text-muted sm:w-14 sm:pt-1.5">{label}</span>}
      <div className="flex min-w-0 flex-wrap gap-1.5" role="group" aria-label={`Filter ${label ?? ""}`.trim()}>
        {options.map((option) => {
          const tone = TONE[option.tone ?? "netral"];
          const active = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
                active ? tone.active : "border-black/10 bg-white text-ink/70 hover:border-black/20 hover:text-ink"
              }`}
            >
              {tone.dot && <span className={`h-2 w-2 rounded-full ${tone.dot}`} />}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const TRIASE_OPTIONS = [
  { key: "semua", label: "Semua" },
  { key: "merah", label: "Merah", tone: "merah" },
  { key: "kuning", label: "Kuning", tone: "kuning" },
  { key: "hijau", label: "Hijau", tone: "hijau" },
];
