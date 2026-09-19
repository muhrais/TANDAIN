// Data dummy riwayat perubahan status, bentuknya mengikuti `status_history` (PRD 5.5)
// ditambah tag_id, kategori_triase, sumber, dan posko agar bisa ditampilkan tanpa join.
const at = (hhmm) => `2026-05-13T${hhmm}:00+07:00`;

export const mockActivities = [
  { history_id: "H-018", tag_id: "TDN-018", kategori_triase: "hijau", status_lama: null, status_baru: "registered", waktu_perubahan: at("10:48"), sumber: "medical_post" },
  { history_id: "H-017", tag_id: "TDN-008", kategori_triase: "hijau", status_lama: "in_transit", status_baru: "arrived", waktu_perubahan: at("10:46"), sumber: "evac_team", posko: "Hijau Pos" },
  { history_id: "H-016", tag_id: "TDN-004", kategori_triase: "merah", status_lama: "waiting_transfer", status_baru: "in_transit", waktu_perubahan: at("10:43"), sumber: "evac_team" },
  { history_id: "H-015", tag_id: "TDN-002", kategori_triase: "kuning", status_lama: "waiting_transfer", status_baru: "in_transit", waktu_perubahan: at("10:43"), sumber: "evac_team" },
  { history_id: "H-014", tag_id: "TDN-005", kategori_triase: "kuning", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:43"), sumber: "field_medic" },
  { history_id: "H-013", tag_id: "TDN-011", kategori_triase: "kuning", status_lama: null, status_baru: "registered", waktu_perubahan: at("10:39"), sumber: "medical_post" },
  { history_id: "H-012", tag_id: "TDN-010", kategori_triase: "merah", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:36"), sumber: "field_medic" },
  { history_id: "H-011", tag_id: "TDN-009", kategori_triase: "kuning", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:31"), sumber: "field_medic" },
  { history_id: "H-010", tag_id: "TDN-003", kategori_triase: "hijau", status_lama: "in_transit", status_baru: "arrived", waktu_perubahan: at("10:28"), sumber: "evac_team", posko: "Hijau Pos" },
  { history_id: "H-009", tag_id: "TDN-007", kategori_triase: "merah", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:24"), sumber: "field_medic" },
  { history_id: "H-008", tag_id: "TDN-004", kategori_triase: "merah", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:20"), sumber: "field_medic" },
  { history_id: "H-007", tag_id: "TDN-006", kategori_triase: "hijau", status_lama: "in_transit", status_baru: "arrived", waktu_perubahan: at("10:15"), sumber: "evac_team", posko: "Hijau Pos" },
  { history_id: "H-006", tag_id: "TDN-002", kategori_triase: "kuning", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:12"), sumber: "field_medic" },
  { history_id: "H-005", tag_id: "TDN-013", kategori_triase: "merah", status_lama: "registered", status_baru: "triaged", waktu_perubahan: at("10:05"), sumber: "medical_post" },
  { history_id: "H-004", tag_id: "TDN-001", kategori_triase: "merah", status_lama: "triaged", status_baru: "waiting_transfer", waktu_perubahan: at("10:02"), sumber: "field_medic" },
  { history_id: "H-003", tag_id: "TDN-016", kategori_triase: "kuning", status_lama: null, status_baru: "registered", waktu_perubahan: at("09:58"), sumber: "medical_post" },
  { history_id: "H-002", tag_id: "TDN-015", kategori_triase: "hijau", status_lama: "registered", status_baru: "triaged", waktu_perubahan: at("09:52"), sumber: "field_medic" },
  { history_id: "H-001", tag_id: "TDN-014", kategori_triase: "merah", status_lama: null, status_baru: "registered", waktu_perubahan: at("09:47"), sumber: "medical_post" },
];
