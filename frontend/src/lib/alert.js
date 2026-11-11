import { Siren, Timer, Users, MapPinOff, BatteryLow } from "lucide-react";

// Ambang default, sama dengan DEFAULT_AMBANG di backend (models/Incident.js).
// Nilai yang dipakai dibaca dari insiden aktif (Pengaturan > Ambang Alert);
// default ini hanya cadangan kalau field-nya belum ada.
export const DEFAULT_AMBANG = {
  merah_menunggu_mnt: 10,
  gps_diam_mnt: 5,
  baterai_rendah_pct: 20,
  kapasitas_peringatan_pct: 80,
};
// Tombol darurat dianggap masih aktif selama ini setelah ditekan.
export const EMERGENCY_WINDOW_MIN = 10;

export function resolveAmbang(ambang) {
  return { ...DEFAULT_AMBANG, ...(ambang ?? {}) };
}

export const ALERT_TYPES = {
  darurat: {
    label: "Tombol darurat ditekan",
    icon: Siren,
    rule: () => "Langsung kritis",
  },
  merah_menunggu: {
    label: "Korban merah menunggu jemputan",
    icon: Timer,
    rule: (a) => `> ${a.merah_menunggu_mnt} menit`,
  },
  kapasitas_posko: {
    label: "Kapasitas posko hampir penuh",
    icon: Users,
    rule: (a) => `≥ ${a.kapasitas_peringatan_pct}% · penuh = kritis`,
  },
  sinyal_gps: {
    label: "Sinyal GPS hilang",
    icon: MapPinOff,
    rule: (a) => `> ${a.gps_diam_mnt} menit tanpa update`,
  },
  baterai_rendah: {
    label: "Baterai tag rendah",
    icon: BatteryLow,
    rule: (a) => `< ${a.baterai_rendah_pct}%`,
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
export function deriveAlerts({ summary, posko = [], locations, now = new Date(), ambang }) {
  const a = resolveAmbang(ambang);
  const alerts = [];
  const MENUNGGU_STATUSES = ["registered", "triaged", "waiting_transfer"];

  for (const item of summary?.priority_queue ?? []) {
    if (item.kategori_triase !== "merah") continue;
    if (!MENUNGGU_STATUSES.includes(item.status_korban)) continue;
    const waitMinutes = (now - new Date(item.waktu_update_terakhir)) / 60000;
    if (waitMinutes <= a.merah_menunggu_mnt) continue;
    alerts.push({
      alert_id: `merah_menunggu:${item.tag_id}`,
      jenis: "merah_menunggu",
      severity: "kritis",
      status: "aktif",
      subjek: item.tag_id,
      kategori_triase: item.kategori_triase,
      waktu: item.waktu_update_terakhir,
      detail: `Menunggu jemputan ${Math.round(waitMinutes)} menit, melewati batas ${a.merah_menunggu_mnt} menit.`,
    });
  }

  for (const p of posko) {
    if (!p.kapasitas_maksimum) continue;
    const pct = (p.jumlah_korban_saat_ini / p.kapasitas_maksimum) * 100;
    if (pct < a.kapasitas_peringatan_pct) continue;
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
    if (item.last_button_pressed_at) {
      const pressedMinutes = (now - new Date(item.last_button_pressed_at)) / 60000;
      if (pressedMinutes <= EMERGENCY_WINDOW_MIN) {
        alerts.push({
          // Waktu tekan ikut di id: tekanan baru setelah alert "ditangani"
          // memunculkan alert baru, bukan tertutup status lama.
          alert_id: `darurat:${item.tag_id}:${item.last_button_pressed_at}`,
          jenis: "darurat",
          severity: "kritis",
          status: "aktif",
          subjek: item.tag_id,
          kategori_triase: item.victim?.kategori_triase,
          waktu: item.last_button_pressed_at,
          detail: item.victim
            ? `Tombol darurat ditekan pada tag ${item.victim.nama || item.tag_id}.`
            : "Tombol darurat ditekan pada tag yang belum diregistrasi.",
        });
      }
    }

    const silentMinutes = (now - new Date(item.received_at)) / 60000;
    if (item.gps_fix === false || silentMinutes > a.gps_diam_mnt) {
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

    if (item.battery_pct != null && item.battery_pct < a.baterai_rendah_pct) {
      alerts.push({
        alert_id: `baterai_rendah:${item.tag_id}`,
        jenis: "baterai_rendah",
        severity: "peringatan",
        status: "aktif",
        subjek: item.tag_id,
        kategori_triase: item.victim?.kategori_triase,
        waktu: item.received_at,
        detail: `Baterai tag tersisa ${item.battery_pct}%, di bawah batas ${a.baterai_rendah_pct}%.`,
      });
    }
  }

  return alerts.map((alert) => ({
    ...alert,
    usia_menit: Math.max(0, Math.round((now - new Date(alert.waktu)) / 60000)),
  }));
}
