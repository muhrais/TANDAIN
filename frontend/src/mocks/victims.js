// Data dummy korban, strukturnya mengikuti koleksi `victims` pada PRD section 5.3.
// Titik pusat memakai koordinat Kampus UI Depok (sama seperti contoh payload di PRD 6.1).
const CENTER = { lat: -6.3612, lng: 106.8249 };

function offset(dLat, dLng) {
  return { lat: CENTER.lat + dLat, lng: CENTER.lng + dLng };
}

export const mockVictims = [
  { tag_id: "TDN-001", nama: "", kategori_triase: "merah", status_korban: "waiting_transfer", lokasi_terakhir: offset(0.0015, -0.0035) },
  { tag_id: "TDN-002", nama: "", kategori_triase: "kuning", status_korban: "in_transit", lokasi_terakhir: offset(0.0026, -0.0018) },
  { tag_id: "TDN-003", nama: "", kategori_triase: "hijau", status_korban: "arrived", lokasi_terakhir: offset(0.0006, 0.0012) },
  { tag_id: "TDN-004", nama: "", kategori_triase: "merah", status_korban: "in_transit", lokasi_terakhir: offset(0.0022, -0.0022) },
  { tag_id: "TDN-005", nama: "", kategori_triase: "kuning", status_korban: "waiting_transfer", lokasi_terakhir: offset(0.0032, -0.0008) },
  { tag_id: "TDN-006", nama: "", kategori_triase: "hijau", status_korban: "arrived", lokasi_terakhir: offset(0.0018, 0.0028) },
  { tag_id: "TDN-007", nama: "", kategori_triase: "merah", status_korban: "waiting_transfer", lokasi_terakhir: offset(-0.0008, -0.0038) },
  { tag_id: "TDN-008", nama: "", kategori_triase: "hijau", status_korban: "arrived", lokasi_terakhir: offset(-0.0004, 0.0034) },
  { tag_id: "TDN-009", nama: "", kategori_triase: "kuning", status_korban: "waiting_transfer", lokasi_terakhir: offset(-0.0012, -0.0005) },
  { tag_id: "TDN-010", nama: "", kategori_triase: "merah", status_korban: "waiting_transfer", lokasi_terakhir: offset(0.0018, -0.0045) },
];

export const mockPoskoUtama = {
  posko_id: "POSKO-UTAMA",
  nama_posko: "Posko Utama",
  jenis: "utama",
  lokasi: CENTER,
};
