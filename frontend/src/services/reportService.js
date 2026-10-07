import { listVictims } from "./victimService";
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

// Belum ada GET /api/report/export (T-BE-7), jadi CSV disusun di FE dari
// GET /api/victims. Isinya sama dengan yang dipakai dashboard, jadi angka
// ringkasan konsisten dengan tampilan (PRD #7). Begitu endpoint backend ada,
// cukup ganti isi fungsi ini.
export async function exportVictimsCsv() {
  const victims = await listVictims();
  const exportedAt = new Date();

  const rows = [
    COLUMNS,
    ...victims.map(victimRow),
    [],
    ["Ringkasan", `diekspor ${exportedAt.toISOString()}`],
    ["total_korban", victims.length],
    ...countBy(victims, "kategori_triase", ["merah", "kuning", "hijau"]),
    ...countBy(victims, "status_korban", STATUS_ORDER),
  ];

  const stamp = exportedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  downloadCsv(`tandain_korban_${stamp}.csv`, rows);
  return victims.length;
}
