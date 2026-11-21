import { getSummary } from "./dashboardService";

// T-BE-3 (`GET /api/activities`) belum ada di backend. Sementara pakai
// summary.recent_activity (10 terakhir, tanpa pagination - lihat
// PLANNING_WEEK6_SOFTWARE.md §4.6). Summary sudah menyertakan
// kategori_triase, jenis riwayat (status/triase/data), dan nama pengubah,
// jadi tidak perlu request tambahan ke GET /api/victims.
export async function getActivities() {
  const summary = await getSummary();

  return summary.recent_activity.map((item) => ({
    history_id: item.history_id ?? `${item.victim_id}:${item.waktu_perubahan}`,
    victim_id: item.victim_id,
    tag_id: item.tag_id,
    nama: item.nama ?? null,
    kategori_triase: item.kategori_triase ?? null,
    jenis: item.jenis ?? "status",
    status_lama: item.status_lama,
    status_baru: item.status_baru,
    nilai_lama: item.nilai_lama,
    nilai_baru: item.nilai_baru,
    diubah_oleh_nama: item.diubah_oleh_nama ?? null,
    waktu_perubahan: item.waktu_perubahan,
    keterangan: item.keterangan ?? null,
    description: item.description,
  }));
}
