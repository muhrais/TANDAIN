import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MARKER_COLOR = {
  merah: "#dc2626",
  kuning: "#f0a835",
  hijau: "#2f9e57",
};

const poskoIcon = L.divIcon({
  className: "",
  html: `<div style="background:#17191d;color:#fff;font-size:11px;font-weight:600;
    padding:4px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)">
    Posko Utama<div style="font-weight:400;font-size:9px;opacity:.7">Triase Awal</div></div>`,
  iconSize: [0, 0],
  iconAnchor: [-10, 30],
});

export default function MapPanel({ victims, posko }) {
  const center = [posko.lokasi.lat, posko.lokasi.lng];

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl bg-white shadow-sm">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
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
