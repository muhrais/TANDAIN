import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Ringkasan satu baris. Telemetri rinci (IP, satelit, heartbeat) sengaja tidak
// ditampilkan di dashboard; petugas cukup tahu gelang mana yang offline, dan
// detailnya ada di halaman Perangkat.
export default function DeviceStatusCard({ devices, error = "" }) {
  const online = devices.filter((device) => device.online).length;
  const offline = devices.length - online;

  return (
    <Link
      to="/perangkat"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white px-5 py-3 shadow-sm transition-shadow hover:shadow-md xl:col-span-12"
    >
      <span className="text-sm font-semibold text-ink">Gelang GPS</span>

      {devices.length === 0 ? (
        <span className="text-sm text-muted">Belum ada heartbeat dari perangkat.</span>
      ) : (
        <span className="text-sm text-ink/80">
          <span className="font-semibold tabular-nums text-triase-hijau">{online} online</span>
          {offline > 0 && (
            <>
              {" · "}
              <span className="font-semibold tabular-nums text-triase-merah">{offline} offline</span>
            </>
          )}
        </span>
      )}

      {devices.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {devices.map((device) => (
            <li key={device.tag_id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${device.online ? "bg-logo-green" : "bg-neutral-300"}`}
              />
              {device.tag_id}
              <span className="sr-only">{device.online ? "online" : "offline"}</span>
            </li>
          ))}
        </ul>
      )}

      {error && <span className="text-xs text-triase-merah">Status belum dapat diperbarui</span>}

      <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-muted">
        Detail perangkat
        <ChevronRight size={14} aria-hidden="true" />
      </span>
    </Link>
  );
}
