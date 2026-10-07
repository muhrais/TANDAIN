import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATUS_LABEL } from "../../lib/activity";
import { STALE_THRESHOLD_MS, pickMapCenter, formatAgo } from "../../lib/map";
import { record, correctedNow } from "../../lib/metrics";

const MARKER_COLOR = {
  merah: "#dc2626",
  kuning: "#f0a835",
  hijau: "#2f9e57",
};

const NO_VICTIM_COLOR = "#9ca3af";

const POSKO_COLOR = {
  utama: "#111827",
  merah: "#dc2626",
  kuning: "#f0a835",
  hijau: "#2f9e57",
};

function poskoIcon(posko) {
  const color = POSKO_COLOR[posko.jenis] ?? "#111827";
  const kapasitas =
    posko.kapasitas_maksimum != null
      ? `${posko.jumlah_korban_saat_ini ?? 0}/${posko.kapasitas_maksimum}`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="display:inline-block;background:${color};color:#fff;font-size:11px;font-weight:600;
      padding:4px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">
      ${posko.nama_posko}${kapasitas ? `<div style="font-weight:400;font-size:9px;opacity:.8">${kapasitas}</div>` : ""}</div>`,
    iconSize: [0, 0],
    iconAnchor: [-10, 30],
  });
}

const LEGEND_ITEMS = [
  { label: "Merah", color: MARKER_COLOR.merah },
  { label: "Kuning", color: MARKER_COLOR.kuning },
  { label: "Hijau", color: MARKER_COLOR.hijau },
  { label: "Belum diregistrasi", color: NO_VICTIM_COLOR, dashed: true },
  { label: "Tidak ada update", color: NO_VICTIM_COLOR, faded: true },
];

export default function MapPanel({
  markers = [],
  posko = [],
  serverTime,
  onMarkerClick,
  scrollWheelZoom = false,
  className = "",
}) {
  // Pusat peta ditentukan sekali saat mount saja (state initializer, bukan
  // useEffect) supaya peta tidak "loncat" tiap polling saat user sedang zoom/geser.
  const [center] = useState(() => pickMapCenter(posko, markers));
  const now = serverTime ?? new Date();

  // P-03: catat delay lokasi->marker sekali per (tag_id, received_at) unik,
  // saat pertama kali benar-benar dirender (bukan cuma pertama kali ada di
  // props) - dipakai requestAnimationFrame supaya setelah commit ke layar.
  const seenRef = useRef(new Set());
  useEffect(() => {
    const newOnes = markers.filter((item) => !seenRef.current.has(`${item.tag_id}|${item.received_at}`));
    if (newOnes.length === 0) return;
    requestAnimationFrame(() => {
      const renderedAtMs = correctedNow();
      for (const item of newOnes) {
        const key = `${item.tag_id}|${item.received_at}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        const receivedAtMs = new Date(item.received_at).getTime();
        record("P-03", {
          tag_id: item.tag_id,
          received_at: item.received_at,
          rendered_at: new Date(renderedAtMs).toISOString(),
          delay_ms: renderedAtMs - receivedAtMs,
          value_ms: renderedAtMs - receivedAtMs,
        });
      }
    });
  }, [markers]);

  return (
    <div className={`relative min-h-[420px] overflow-hidden rounded-2xl bg-white shadow-sm ${className}`}>
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={scrollWheelZoom}
        className="absolute inset-0 h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {posko
          .filter((p) => p.lokasi?.lat != null && p.lokasi?.lng != null)
          .map((p) => (
            <Marker key={p.posko_id} position={[p.lokasi.lat, p.lokasi.lng]} icon={poskoIcon(p)} />
          ))}

        {markers.map((item) => {
          const hasVictim = Boolean(item.victim);
          const elapsedMs = now - new Date(item.received_at);
          const isStale = elapsedMs > STALE_THRESHOLD_MS;
          const color = hasVictim
            ? MARKER_COLOR[item.victim.kategori_triase] ?? NO_VICTIM_COLOR
            : NO_VICTIM_COLOR;

          return (
            <CircleMarker
              key={item.tag_id}
              center={[item.lat, item.lng]}
              radius={9}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: color,
                fillOpacity: isStale ? 0.4 : 1,
                dashArray: hasVictim ? undefined : "4",
              }}
              eventHandlers={onMarkerClick ? { click: () => onMarkerClick(item) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{item.tag_id}</div>
                  {hasVictim ? (
                    <>
                      <div>
                        {item.victim.nama || "(tanpa nama)"} · {item.victim.kategori_triase}
                      </div>
                      <div>{STATUS_LABEL[item.victim.status_korban] ?? item.victim.status_korban}</div>
                    </>
                  ) : (
                    <div>Belum diregistrasi</div>
                  )}
                  {item.battery_pct != null && <div>Baterai {item.battery_pct}%</div>}
                  {hasVictim && onMarkerClick && (
                    <div className="mt-1 text-[10px] text-muted">Klik untuk buka di Evakuasi</div>
                  )}
                  <div>
                    {isStale
                      ? `Lokasi terakhir diketahui · ${formatAgo(elapsedMs)}`
                      : `Update ${formatAgo(elapsedMs)}`}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {markers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70">
          <p className="rounded-lg bg-white px-4 py-2 text-sm text-muted shadow-sm">
            Belum ada tag yang mengirim lokasi.
          </p>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-[1000] rounded-lg bg-white/90 px-3 py-2 text-[11px] shadow-sm">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 py-0.5">
            <span
              className="h-2.5 w-2.5 rounded-full border border-white"
              style={{
                backgroundColor: item.color,
                opacity: item.faded ? 0.4 : 1,
                outline: item.dashed ? `1px dashed ${item.color}` : undefined,
              }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
