const SEGMENT_COLORS = {
  merah: "var(--color-triase-merah)",
  hijau: "var(--color-triase-hijau)",
  kuning: "var(--color-triase-kuning)",
};

const RADIUS = 60;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function DonutChart({ data }) {
  const total = data.merah + data.kuning + data.hijau;
  const order = ["hijau", "merah", "kuning"];
  let cumulative = 0;

  return (
    <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
      <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="#eef0f2" strokeWidth={STROKE} />
      {order.map((key) => {
        const value = data[key];
        const fraction = total > 0 ? value / total : 0;
        const dash = fraction * CIRCUMFERENCE;
        const offset = -cumulative * CIRCUMFERENCE;
        cumulative += fraction;
        return (
          <circle
            key={key}
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke={SEGMENT_COLORS[key]}
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

const LEGEND_ROWS = [
  { key: "merah", label: "Merah", color: "bg-triase-merah" },
  { key: "hijau", label: "Hijau", color: "bg-triase-hijau" },
  { key: "kuning", label: "Kuning", color: "bg-triase-kuning" },
];

export default function TriageDistributionCard({ data, className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-10 gap-y-6 rounded-2xl bg-white p-6 shadow-sm ${className}`}
    >
      <div className="relative shrink-0">
        <DonutChart data={data} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-ink">{data.total_tags}</span>
          <span className="text-xs text-muted">Tags</span>
        </div>
      </div>

      <div className="min-w-[220px] max-w-[320px] flex-1">
        <h3 className="mb-3 font-semibold text-ink">Triage Distribution</h3>
        <ul className="space-y-2 text-sm">
          {LEGEND_ROWS.map(({ key, label, color }) => (
            <li key={key} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-ink/80">
                <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                {label}
              </span>
              <span className="font-semibold text-ink">{data[key]}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-ink/80">
            <span className="h-2.5 w-2.5 rounded-full bg-ink" />
            Korban Jiwa
          </span>
          <span className="font-semibold text-ink">{data.korban_jiwa}</span>
        </div>
      </div>
    </div>
  );
}
