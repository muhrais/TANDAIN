import { Siren, Timer, Users, MapPinOff, BatteryLow } from "lucide-react";

// Ambang batas awal (asumsi sementara, belum diatur di PRD).
export const MERAH_WAIT_LIMIT_MIN = 10;
export const GPS_SILENT_LIMIT_MIN = 5;
export const BATTERY_LOW_PCT = 20;
export const CAPACITY_WARN_PCT = 80;

export const ALERT_TYPES = {
  darurat: {
    label: "Tombol darurat ditekan",
    icon: Siren,
    rule: "Langsung kritis",
  },
  merah_menunggu: {
    label: "Korban merah menunggu jemputan",
    icon: Timer,
    rule: `> ${MERAH_WAIT_LIMIT_MIN} menit`,
  },
  kapasitas_posko: {
    label: "Kapasitas posko hampir penuh",
    icon: Users,
    rule: `≥ ${CAPACITY_WARN_PCT}% · penuh = kritis`,
  },
  sinyal_gps: {
    label: "Sinyal GPS hilang",
    icon: MapPinOff,
    rule: `> ${GPS_SILENT_LIMIT_MIN} menit tanpa update`,
  },
  baterai_rendah: {
    label: "Baterai tag rendah",
    icon: BatteryLow,
    rule: `< ${BATTERY_LOW_PCT}%`,
  },
};

export const SEVERITY = {
  kritis: {
    label: "Kritis",
    icon: "bg-triase-merah-soft text-triase-merah",
    pill: "bg-triase-merah-soft text-triase-merah",
  },
  peringatan: {
    label: "Peringatan",
    icon: "bg-triase-kuning-soft text-triase-kuning-dark",
    pill: "bg-triase-kuning-soft text-triase-kuning-dark",
  },
};

const SEVERITY_RANK = { kritis: 0, peringatan: 1 };

// Alert aktif dulu (kritis di atas), lalu yang sudah ditangani; terbaru di atas.
export function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    if (a.status !== b.status) return a.status === "aktif" ? -1 : 1;
    if (a.status === "aktif" && a.severity !== b.severity) {
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    }
    return new Date(b.waktu) - new Date(a.waktu);
  });
}

export function countAlerts(alerts) {
  const aktif = alerts.filter((a) => a.status === "aktif");
  return {
    aktif: aktif.length,
    kritis: aktif.filter((a) => a.severity === "kritis").length,
  };
}
