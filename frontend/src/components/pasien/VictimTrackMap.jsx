import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { TRIASE_HEX } from "../../lib/triase";
import { formatDateTime } from "../../lib/datetime";

// Peta kecil jejak lokasi korban (FR-DB-02): garis dari titik pertama ke
// terakhir, titik terakhir ditandai warna triase. Peta dibuat ulang (key)
// kalau titiknya berubah, supaya bounds selalu pas.
export default function VictimTrackMap({ points, kategoriTriase }) {
  if (!points || points.length === 0) {
    return <p className="rounded-lg bg-page px-3.5 py-2.5 text-sm text-muted">Belum ada data lokasi dari gelang korban ini.</p>;
  }

  const positions = points.map((p) => [p.lat, p.lng]);
  const last = points[points.length - 1];
  const color = TRIASE_HEX[kategoriTriase] ?? "#111827";
  const boundsKey = `${points.length}:${last.received_at}`;

  return (
    <div className="space-y-1.5">
      <div className="h-56 overflow-hidden rounded-lg border border-black/5">
        <MapContainer
          key={boundsKey}
          bounds={positions.length > 1 ? positions : undefined}
          center={positions.length === 1 ? positions[0] : undefined}
          zoom={positions.length === 1 ? 18 : undefined}
          boundsOptions={{ padding: [24, 24], maxZoom: 18 }}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color, weight: 3, opacity: 0.7 }} />}
          <CircleMarker
            center={positions[0]}
            radius={4}
            pathOptions={{ color: "#6b7280", fillColor: "#fff", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip>Titik pertama · {formatDateTime(points[0].received_at)}</Tooltip>
          </CircleMarker>
          <CircleMarker center={positions[positions.length - 1]} radius={8} pathOptions={{ color: "#fff", fillColor: color, fillOpacity: 1, weight: 2 }}>
            <Tooltip>Terakhir · {formatDateTime(last.received_at)}</Tooltip>
          </CircleMarker>
        </MapContainer>
      </div>
      <p className="text-xs text-muted">
        {points.length} titik · terakhir {formatDateTime(last.received_at)} ({last.lat.toFixed(5)}, {last.lng.toFixed(5)})
      </p>
    </div>
  );
}
