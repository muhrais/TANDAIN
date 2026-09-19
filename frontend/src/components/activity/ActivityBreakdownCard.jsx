export default function ActivityBreakdownCard({ title, items, className = "" }) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <div className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-3 font-semibold text-ink">{title}</h3>
      <ul className="flex flex-col gap-5">
        {items.map((item) => (
          <li key={item.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/80">{item.label}</span>
              <span className="font-semibold text-ink">{item.count}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-black/5">
              <div
                className="h-full rounded-full bg-sidebar"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
