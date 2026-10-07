import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MARKER_COLOR = {
  merah: "#dc2626",
  kuning: "#f0a835",
  hijau: "#2f9e57",
};

const poskoIcon = L.divIcon({
  className: "",
  html: `<div style="display:inline-block;background:#000;color:#fff;font-size:11px;font-weight:600;
    padding:4px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">
    Posko Utama<div style="font-weight:400;font-size:9px;opacity:.7">Triase Awal</div></div>`,
  iconSize: [0, 0],
  iconAnchor: [-10, 30],
});

function DeviceViewport({ victims, fallbackCenter }) {
  const map = useMap();

  useEffect(() => {
    if (victims.length === 0) {
      map.setView(fallbackCenter, 16);
      return;
    }

    const points = victims.map((victim) => [
      victim.lokasi_terakhir.lat,
      victim.lokasi_terakhir.lng,
    ]);

    if (points.length === 1) {
      map.setView(points[0], 17);
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
    }
  }, [fallbackCenter, map, victims]);

  return null;
}

export default function MapPanel({ victims, posko, className = "" }) {
  const center = [posko.lokasi.lat, posko.lokasi.lng];

  return (
    <div className={`relative min-h-[420px] overflow-hidden rounded-2xl bg-white shadow-sm ${className}`}>
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        className="absolute inset-0 h-full w-full"
      >
        <DeviceViewport victims={victims} fallbackCenter={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center} icon={poskoIcon} />

        {victims.map((victim) => (
          <CircleMarker
            key={victim.tag_id}
            center={[victim.lokasi_terakhir.lat, victim.lokasi_terakhir.lng]}
            radius={9}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: MARKER_COLOR[victim.kategori_triase],
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              {victim.tag_id}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
