import { STATUS_ORDER } from "./activity";

// Urutan prioritas sama dengan priority_queue di backend (dashboardController):
// merah -> kuning -> hijau, lalu yang paling lama menunggu di atas.
const TRIASE_RANK = { merah: 0, kuning: 1, hijau: 2 };

export function sortByPriority(victims) {
  return [...victims].sort((a, b) => {
    const rankDiff = (TRIASE_RANK[a.kategori_triase] ?? 99) - (TRIASE_RANK[b.kategori_triase] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.waktu_update_terakhir) - new Date(b.waktu_update_terakhir);
  });
}

// Backend hanya menerima satu langkah maju (isValidTransition di
// victimController), jadi UI cuma menawarkan status berikutnya - tidak ada
// jalan untuk melompati status dari sisi tampilan.
export function nextStatus(status) {
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1 || index === STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[index + 1];
}

// Label tombol aksi, dikunci ke status TUJUAN.
export const NEXT_ACTION_LABEL = {
  triaged: "Tandai ditriase",
  waiting_transfer: "Siap dievakuasi",
  in_transit: "Berangkat",
  arrived: "Tiba",
};

// Langkah yang wajib memilih posko tujuan sebelum dikirim.
export const STATUS_NEEDS_POSKO = "waiting_transfer";
