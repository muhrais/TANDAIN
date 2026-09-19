// Data dummy alert. Belum ada di PRD/backend, jadi bentuknya asumsi sementara.
// MOCK_NOW disamakan dengan aktivitas terbaru (10:48) agar konsisten dengan Overview.
const at = (hhmm) => `2026-05-13T${hhmm}:00+07:00`;

export const MOCK_NOW = at("10:48");

export const mockAlerts = [
  {
    alert_id: "A-007", jenis: "merah_menunggu", severity: "kritis", status: "aktif",
    subjek: "TDN-010", kategori_triase: "merah", waktu: at("10:46"),
    detail: "Menunggu jemputan 12 menit, melewati batas 10 menit.",
  },
  {
    alert_id: "A-006", jenis: "darurat", severity: "kritis", status: "aktif",
    subjek: "TDN-007", kategori_triase: "merah", waktu: at("10:45"),
    detail: "Tombol darurat ditekan pada tag. Lokasi terakhir dikirim 10:45.",
  },
  {
    alert_id: "A-005", jenis: "sinyal_gps", severity: "peringatan", status: "aktif",
    subjek: "TDN-001", kategori_triase: "merah", waktu: at("10:42"),
    detail: "Tidak ada update GPS selama 6 menit. Menampilkan lokasi terakhir yang diketahui.",
  },
  {
    alert_id: "A-004", jenis: "kapasitas_posko", severity: "peringatan", status: "aktif",
    subjek: "Pos Merah", waktu: at("10:40"),
    detail: "Kapasitas terisi 18 dari 20 korban (90%).",
  },
  {
    alert_id: "A-003", jenis: "baterai_rendah", severity: "peringatan", status: "aktif",
    subjek: "TDN-005", kategori_triase: "kuning", waktu: at("10:38"),
    detail: "Baterai tag tersisa 14%, di bawah batas 20%.",
  },
  {
    alert_id: "A-002", jenis: "sinyal_gps", severity: "peringatan", status: "ditangani",
    subjek: "TDN-006", kategori_triase: "hijau", waktu: at("10:12"), waktu_ditangani: at("10:20"),
    detail: "Tidak ada update GPS selama 7 menit. Sinyal pulih setelah korban dipindahkan.",
  },
  {
    alert_id: "A-001", jenis: "kapasitas_posko", severity: "peringatan", status: "ditangani",
    subjek: "Pos Kuning", waktu: at("10:05"), waktu_ditangani: at("10:18"),
    detail: "Kapasitas terisi 25 dari 30 korban (83%).",
  },
];
