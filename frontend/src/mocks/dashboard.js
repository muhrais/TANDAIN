// Data dummy untuk panel ringkasan dashboard (FR-DASH-02).
// Mengikuti bentuk agregat yang nantinya dikembalikan GET /api/dashboard/summary (FR-BE-06).
export const mockTriageDistribution = {
  total_tags: 49,
  merah: 12,
  kuning: 14,
  hijau: 20,
  korban_jiwa: 2,
};

export const mockEvacuationStatus = {
  waiting_pickup: 5,
  in_transit: 2,
  arrived: 6,
};

export const mockRegistrationStatus = {
  not_registered: 19,
  registered: 30,
};

export const mockPriorityQueue = [
  { tag_id: "TDN-010", kategori_triase: "merah", status_label: "Waiting Pickup", elapsed: "12 mnt" },
  { tag_id: "TDN-005", kategori_triase: "kuning", status_label: "Waiting Pickup", elapsed: "5 mnt" },
  { tag_id: "TDN-004", kategori_triase: "merah", status_label: "In Transit", elapsed: "5 mnt" },
  { tag_id: "TDN-002", kategori_triase: "kuning", status_label: "In Transit", elapsed: "5 mnt" },
];

export const mockRecentActivity = [
  { time: "10:48", message: "TDN-018 Registered by Medical Post" },
  { time: "10:46", message: "TDN-008 Arrived at Hijau Pos" },
  { time: "10:43", message: "TDN-004 Picked Up by Team" },
  { time: "10:43", message: "TDN-002 Picked Up by Team" },
];

export const mockIncidentInfo = {
  nama_bencana: "Nama Bencana",
  tanggal: "13/05/2026",
  waktu: "21.50 WIB",
  alert_kritis: 2,
  notifikasi: 5,
};
