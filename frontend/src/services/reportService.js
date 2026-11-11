import { listVictims } from "./victimService";
import { listKorbanJiwa } from "./korbanJiwaService";
import { downloadCsv } from "../lib/csv";
import { STATUS_ORDER } from "../lib/activity";

const COLUMNS = [
  "tag_id",
  "nama",
  "usia",
  "jenis_kelamin",
  "kategori_triase",
  "status_korban",
  "posko_asal",
  "posko_tujuan",
  "lat",
  "lng",
  "waktu_update_terakhir",
  "created_at",
];

function victimRow(v) {
  return [
    v.tag_id,
    v.nama,
    v.usia,
    v.jenis_kelamin,
    v.kategori_triase,
    v.status_korban,
    v.posko_asal,
    v.posko_tujuan,
    v.lokasi_terakhir?.lat,
    v.lokasi_terakhir?.lng,
    v.waktu_update_terakhir,
    v.created_at,
  ];
}

function countBy(victims, key, values) {
  return values.map((value) => [value, victims.filter((v) => v[key] === value).length]);
}

// CSV disusun di FE dari GET /api/victims (filter yang sama dengan tampilan),
// jadi angka ringkasan konsisten dengan yang terlihat di layar (PRD #7).
// `filter` opsional: kategori_triase, status_korban, posko, q - dipakai
// tombol ekspor di Data Pasien supaya file mengikuti filter aktif.
export async function exportVictimsCsv(filter = {}) {
  const [victims, korbanJiwa] = await Promise.all([
    listVictims(filter),
    listKorbanJiwa().catch(() => null),
  ]);
  const exportedAt = new Date();
  const activeFilters = Object.entries(filter).filter(([, value]) => value != null && value !== "");

  const rows = [
    COLUMNS,
    ...victims.map(victimRow),
    [],
    ["Ringkasan", `diekspor ${exportedAt.toISOString()}`],
    ...(activeFilters.length > 0 ? [["filter", activeFilters.map(([k, v]) => `${k}=${v}`).join("; ")]] : []),
    ["total_korban", victims.length],
    ...countBy(victims, "kategori_triase", ["merah", "kuning", "hijau"]),
    ...countBy(victims, "status_korban", STATUS_ORDER),
    ...(korbanJiwa ? [["korban_jiwa", korbanJiwa.total], ["korban_jiwa_entri", korbanJiwa.items.length]] : []),
  ];

  const stamp = exportedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadCsv(`tandain_korban_${stamp}.csv`, rows);
  return victims.length;
}
