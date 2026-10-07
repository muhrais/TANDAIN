import { useEffect, useState } from "react";
import { Download, RotateCcw, X } from "lucide-react";
import { isDebugEnabled, getSummary, getRecords, exportCsv, clear, subscribe } from "../../lib/metrics";

// Melayang di pojok, aktif hanya kalau ?debug=1 / localStorage.tandain_debug
// = "1" (lihat lib/metrics.js) - tidak muncul sama sekali di tampilan normal.
export default function DebugMetricsPanel() {
  const [visible, setVisible] = useState(true);
  const [summary, setSummary] = useState(() => (isDebugEnabled() ? getSummary() : []));

  useEffect(() => {
    if (!isDebugEnabled()) return undefined;
    return subscribe(() => setSummary(getSummary()));
  }, []);

  if (!isDebugEnabled() || !visible) return null;

  const s11 = getRecords("S-11");
  const s11Rate = s11.length ? Math.round((s11.filter((r) => r.success).length / s11.length) * 100) : null;

  return (
    <div className="fixed bottom-4 right-4 z-[2000] w-72 rounded-xl bg-ink/95 p-3 text-xs text-white shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Debug Metrics</span>
        <button type="button" onClick={() => setVisible(false)} aria-label="Tutup panel debug" className="text-white/70 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {summary.length === 0 ? (
        <p className="text-white/60">Belum ada sampel. Coba scan tag, buka Map, atau tunggu polling.</p>
      ) : (
        <ul className="space-y-1 tabular-nums">
          {summary.map((row) => (
            <li key={row.test_id} className="flex items-center justify-between gap-2">
              <span className="font-medium">{row.test_id}</span>
              <span className="text-white/80">
                n={row.count} avg={row.avg_ms ?? "-"}ms p95={row.p95_ms ?? "-"}ms
              </span>
            </li>
          ))}
          {s11Rate != null && (
            <li className="flex items-center justify-between gap-2">
              <span className="font-medium">S-11 rate</span>
              <span className="text-white/80">{s11Rate}% (n={s11.length})</span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={exportCsv}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5 font-semibold hover:bg-white/20"
        >
          <Download size={12} /> Unduh CSV
        </button>
        <button
          type="button"
          onClick={clear}
          className="flex items-center justify-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5 font-semibold hover:bg-white/20"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}
