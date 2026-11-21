export const STATUS_ORDER = ["registered", "triaged", "waiting_transfer", "in_transit", "arrived"];

export const STATUS_LABEL = {
  registered: "Terdaftar",
  triaged: "Ditriase",
  waiting_transfer: "Menunggu jemputan",
  in_transit: "Dalam perjalanan",
  arrived: "Tiba di posko",
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export function formatTime(iso) {
  return timeFormatter.format(new Date(iso));
}

const TRIASE_LABEL = { merah: "Merah", kuning: "Kuning", hijau: "Hijau" };

// Label ringkas satu aktivitas: transisi status ("Terdaftar → Ditriase"),
// transisi triase, atau jenis perubahan lain. Menggantikan kalimat deskripsi
// panjang dari backend, yang isinya sama dengan label ini.
export function transitionLabel(activity) {
  if (activity.jenis === "triase") {
    return `Triase ${TRIASE_LABEL[activity.nilai_lama] ?? activity.nilai_lama} → ${
      TRIASE_LABEL[activity.nilai_baru] ?? activity.nilai_baru
    }`;
  }
  if (activity.jenis === "data") return "Data diperbarui";
  if (activity.jenis === "korban_jiwa") return "Dicatat";
  return activity.status_lama
    ? `${STATUS_LABEL[activity.status_lama]} → ${STATUS_LABEL[activity.status_baru]}`
    : STATUS_LABEL[activity.status_baru];
}

// Judul baris: tag gelang, atau jumlah untuk catatan korban jiwa (tanpa tag).
export function activityHeadline(activity) {
  if (activity.tag_id) return activity.tag_id;
  return activity.jenis === "korban_jiwa" ? `${activity.nilai_baru} korban jiwa` : "-";
}

export function formatElapsed(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} mnt`;
  return `${Math.round(minutes / 60)} jam`;
}
