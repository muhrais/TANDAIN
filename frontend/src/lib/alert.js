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

// Alert diturunkan dari data yang sudah di-fetch untuk dashboard (summary,
// posko, lokasi terkini) - tidak butuh endpoint khusus alert di backend.
// `alert_id` deterministik (`${jenis}:${subjek}`) supaya status "ditangani"
// yang disimpan terpisah (lihat alertService) tetap nempel ke alert yang
// sama walau daftar ini diturunkan ulang tiap siklus polling.
//
// Catatan: alert `merah_menunggu` baru akurat setelah bug B1 diperbaiki di
// backend (waktu_update_terakhir saat ini masih ketimpa tiap ping GPS).
export function deriveAlerts({ summary, posko = [], locations, now = new Date() }) {
  const alerts = [];
  const MENUNGGU_STATUSES = ["registered", "triaged", "waiting_transfer"];

  for (const item of summary?.priority_queue ?? []) {
    if (item.kategori_triase !== "merah") continue;
    if (!MENUNGGU_STATUSES.includes(item.status_korban)) continue;
    const waitMinutes = (now - new Date(item.waktu_update_terakhir)) / 60000;
    if (waitMinutes <= MERAH_WAIT_LIMIT_MIN) continue;
    alerts.push({
      alert_id: `merah_menunggu:${item.tag_id}`,
      jenis: "merah_menunggu",
      severity: "kritis",
      status: "aktif",
      subjek: item.tag_id,
      kategori_triase: item.kategori_triase,
      waktu: item.waktu_update_terakhir,
      detail: `Menunggu jemputan ${Math.round(waitMinutes)} menit, melewati batas ${MERAH_WAIT_LIMIT_MIN} menit.`,
    });
  }

  for (const p of posko) {
    if (!p.kapasitas_maksimum) continue;
    const pct = (p.jumlah_korban_saat_ini / p.kapasitas_maksimum) * 100;
    if (pct < CAPACITY_WARN_PCT) continue;
    alerts.push({
      alert_id: `kapasitas_posko:${p.posko_id}`,
      jenis: "kapasitas_posko",
      severity: pct >= 100 ? "kritis" : "peringatan",
      status: "aktif",
      subjek: p.nama_posko,
      waktu: now.toISOString(),
      detail: `Kapasitas terisi ${p.jumlah_korban_saat_ini} dari ${p.kapasitas_maksimum} korban (${Math.round(pct)}%).`,
    });
  }

  for (const item of locations?.markers ?? []) {
    const silentMinutes = (now - new Date(item.received_at)) / 60000;
    if (item.gps_fix === false || silentMinutes > GPS_SILENT_LIMIT_MIN) {
      alerts.push({
        alert_id: `sinyal_gps:${item.tag_id}`,
        jenis: "sinyal_gps",
        severity: "peringatan",
        status: "aktif",
        subjek: item.tag_id,
        kategori_triase: item.victim?.kategori_triase,
        waktu: item.received_at,
        detail: `Tidak ada update GPS selama ${Math.max(0, Math.round(silentMinutes))} menit. Menampilkan lokasi terakhir yang diketahui.`,
      });
    }

    if (item.battery_pct != null && item.battery_pct < BATTERY_LOW_PCT) {
      alerts.push({
        alert_id: `baterai_rendah:${item.tag_id}`,
        jenis: "baterai_rendah",
        severity: "peringatan",
        status: "aktif",
        subjek: item.tag_id,
        kategori_triase: item.victim?.kategori_triase,
        waktu: item.received_at,
        detail: `Baterai tag tersisa ${item.battery_pct}%, di bawah batas ${BATTERY_LOW_PCT}%.`,
      });
    }
  }

  return alerts.map((a) => ({
    ...a,
    usia_menit: Math.max(0, Math.round((now - new Date(a.waktu)) / 60000)),
  }));
}
