import { apiClient } from "../lib/apiClient";
import { getSummary } from "./dashboardService";

// T-BE-3 (`GET /api/activities`) belum ada di backend. Sementara pakai
// summary.recent_activity (10 terakhir, tanpa pagination - lihat
// PLANNING_WEEK6_SOFTWARE.md §4.6). Endpoint itu tidak menyertakan
// kategori_triase per entri, jadi diperkaya lewat GET /api/victims supaya
// timeline tetap bisa diwarnai per triase. `sumber` (medical_post/
// field_medic/evac_team) dari mock lama SENGAJA dihapus di sini - itu
// konsep UI-only, StatusHistory di backend cuma punya diubah_oleh (user_id
// atau null), bukan kategori sumber seperti itu.
export async function getActivities() {
  const [summary, victims] = await Promise.all([getSummary(), apiClient.get("/api/victims")]);
  const kategoriByVictimId = new Map(victims.map((v) => [v.victim_id, v.kategori_triase]));

  return summary.recent_activity.map((item) => ({
    history_id: `${item.victim_id}:${item.waktu_perubahan}`,
    victim_id: item.victim_id,
    tag_id: item.tag_id,
    kategori_triase: kategoriByVictimId.get(item.victim_id) ?? null,
    status_lama: item.status_lama,
    status_baru: item.status_baru,
    waktu_perubahan: item.waktu_perubahan,
    description: item.description,
  }));
}
