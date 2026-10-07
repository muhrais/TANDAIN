// Kampus UI Depok — fallback kalau posko utama belum punya koordinat
// (seed belum diisi, lihat T-BE-4 di PLANNING_WEEK6_SOFTWARE.md).
export const DEFAULT_CENTER = { lat: -6.3612, lng: 106.8249 };

// Ambang "stale": tag yang tidak update lebih dari ini dianggap sinyal
// terakhir yang diketahui, bukan posisi terkini (mitigasi risiko GPS hilang).
export const STALE_THRESHOLD_MS = 60 * 1000;

export function formatAgo(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} dtk lalu`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} mnt lalu`;
  return `${Math.round(minutes / 60)} jam lalu`;
}

// Pusat peta: posko utama kalau ada koordinatnya -> rata-rata marker -> fallback konstanta.
// Dipanggil sekali saat mount (lihat MapPanel), bukan tiap polling, supaya peta tidak "loncat".
export function pickMapCenter(posko, markers) {
  const utama = posko.find(
    (p) => p.jenis === "utama" && p.lokasi?.lat != null && p.lokasi?.lng != null
  );
  if (utama) return [utama.lokasi.lat, utama.lokasi.lng];

  const withCoords = markers.filter((m) => m.lat != null && m.lng != null);
  if (withCoords.length > 0) {
    const avgLat = withCoords.reduce((sum, m) => sum + m.lat, 0) / withCoords.length;
    const avgLng = withCoords.reduce((sum, m) => sum + m.lng, 0) / withCoords.length;
    return [avgLat, avgLng];
  }

  return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
}
