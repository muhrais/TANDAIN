import { mockActivities } from "../mocks/activities";

// Nanti diganti fetch ke endpoint daftar status_history (belum ada di backend;
// saat ini riwayat hanya tersedia lewat GET /api/victims/:id).
export async function getActivities() {
  return [...mockActivities].sort(
    (a, b) => new Date(b.waktu_perubahan) - new Date(a.waktu_perubahan)
  );
}
