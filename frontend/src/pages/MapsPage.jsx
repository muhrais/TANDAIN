import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import MapPanel from "../components/dashboard/MapPanel";
import FilterChip from "../components/common/FilterChip";
import { usePolling } from "../hooks/usePolling";
import { getMapMarkers } from "../services/dashboardService";
import { STATUS_LABEL } from "../lib/activity";
import { STALE_THRESHOLD_MS, formatAgo } from "../lib/map";

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "merah", label: "Merah" },
  { key: "kuning", label: "Kuning" },
  { key: "hijau", label: "Hijau" },
  { key: "belum", label: "Belum registrasi" },
];

const DOT_COLOR = {
  merah: "bg-triase-merah",
  kuning: "bg-triase-kuning",
  hijau: "bg-triase-hijau",
};

function matchesFilter(item, filter) {
  if (filter === "semua") return true;
  if (filter === "belum") return !item.victim;
  return item.victim?.kategori_triase === filter;
}

export default function MapsPage() {
  const navigate = useNavigate();
  const { data, error, refresh } = usePolling(getMapMarkers);
  const [filter, setFilter] = useState("semua");

  const markers = useMemo(
    () => (data?.markers ?? []).filter((item) => matchesFilter(item, filter)),
    [data, filter]
  );

  function openInEvakuasi(item) {
    if (item.victim) navigate(`/evakuasi?victim=${encodeURIComponent(item.victim.victim_id)}`);
  }

  if (!data) {
    return (
      <div className="min-w-0 flex-1 p-8 text-sm text-muted">{error ? error.message : "Memuat peta..."}</div>
    );
  }

  const now = data.serverTime ?? new Date();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:h-screen md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink md:text-2xl">Maps</h1>
          <p className="mt-1 text-sm text-muted">
            {data.markers.length} tag mengirim lokasi · {data.posko.length} posko
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className={`flex items-center gap-1.5 text-sm font-medium ${
            error ? "text-triase-merah" : "text-muted hover:text-ink"
          }`}
        >
          {error ? "Terputus" : "Muat ulang"}
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter tag">
        {FILTERS.map((f) => (
          <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {DOT_COLOR[f.key] && <span className={`h-2 w-2 rounded-full ${DOT_COLOR[f.key]}`} />}
            {f.label}
          </FilterChip>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <MapPanel
          markers={markers}
          posko={data.posko}
          serverTime={data.serverTime}
          onMarkerClick={openInEvakuasi}
          scrollWheelZoom
          className="h-[60vh] lg:h-full"
        />

        <ul className="max-h-[60vh] divide-y divide-black/5 overflow-y-auto rounded-2xl bg-white shadow-sm lg:max-h-none">
          {markers.length === 0 && <li className="p-4 text-sm text-muted">Tidak ada tag untuk filter ini.</li>}
          {markers.map((item) => {
            const elapsedMs = now - new Date(item.received_at);
            const isStale = elapsedMs > STALE_THRESHOLD_MS;
            return (
              <li key={item.tag_id}>
                <button
                  type="button"
                  onClick={() => openInEvakuasi(item)}
                  disabled={!item.victim}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left text-[13px] transition-colors enabled:hover:bg-page ${
                    isStale ? "opacity-60" : ""
                  }`}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      item.victim ? DOT_COLOR[item.victim.kategori_triase] : "border border-dashed border-muted bg-neutral-200"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{item.tag_id}</span>
                    <span className="block truncate text-ink/70">
                      {item.victim
                        ? `${item.victim.nama || "(tanpa nama)"} · ${STATUS_LABEL[item.victim.status_korban] ?? item.victim.status_korban}`
                        : "Belum diregistrasi"}
                    </span>
                    <span className="block text-muted">
                      {isStale ? "Lokasi terakhir · " : "Update "}
                      {formatAgo(elapsedMs)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
