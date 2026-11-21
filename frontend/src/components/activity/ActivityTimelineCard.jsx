import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import LevelFilter, { TRIASE_OPTIONS } from "../common/LevelFilter";
import SegmentedFilter from "../common/SegmentedFilter";
import { STATUS_ORDER, STATUS_LABEL, formatTime, transitionLabel, activityHeadline } from "../../lib/activity";

const DOT_COLOR = {
  merah: "bg-triase-merah",
  kuning: "bg-triase-kuning",
  hijau: "bg-triase-hijau",
};

const TEXT_COLOR = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning",
  hijau: "text-triase-hijau",
};

// Fallback saat kategori_triase tidak diketahui (mis. korban sudah dihapus).
// Catatan korban jiwa memakai titik hitam, sama dengan legenda dashboard.
const NEUTRAL_DOT = "bg-neutral-300";
const KORBAN_JIWA_DOT = "bg-ink";
const NEUTRAL_TEXT = "text-ink";

// "perubahan" = entri riwayat selain perpindahan status (ubah triase / data).
const STATUS_FILTERS = [
  { key: "semua", label: "Semua" },
  ...STATUS_ORDER.map((key) => ({ key, label: STATUS_LABEL[key] })),
  { key: "perubahan", label: "Ubah triase & data" },
  { key: "korban_jiwa", label: "Korban jiwa" },
];

function matchesStatusFilter(activity, filter) {
  if (filter === "semua") return true;
  if (filter === "perubahan") return activity.jenis === "triase" || activity.jenis === "data";
  if (filter === "korban_jiwa") return activity.jenis === "korban_jiwa";
  return activity.jenis === "status" && activity.status_baru === filter;
}

const TRIASE_NAMES = ["merah", "kuning", "hijau"];

// Baris utama "apa yang berubah". Ubah triase menampilkan kedua kategori
// dengan warnanya masing-masing, supaya terbaca sekilas tanpa memindai teks.
function ChangeLabel({ activity }) {
  if (activity.jenis === "triase" && TRIASE_NAMES.includes(activity.nilai_lama) && TRIASE_NAMES.includes(activity.nilai_baru)) {
    const word = (key) => (
      <span className={`font-semibold ${TEXT_COLOR[key]}`}>{key[0].toUpperCase() + key.slice(1)}</span>
    );
    return (
      <>
        Triase {word(activity.nilai_lama)} <span className="text-muted">→</span> {word(activity.nilai_baru)}
      </>
    );
  }
  return transitionLabel(activity);
}

// Satu baris: jam, titik triase, tag + nama di kiri; di kanannya apa yang
// berubah, lalu satu baris kecil berisi keterangan (posko, kolom data) dan
// "oleh <pengubah>". Hanya satu kalimat pendek per baris, tanpa pengulangan.
function TimelineRow({ activity, isFirst, isLast }) {
  const dotColor =
    activity.jenis === "korban_jiwa" ? KORBAN_JIWA_DOT : DOT_COLOR[activity.kategori_triase] ?? NEUTRAL_DOT;
  const textColor = TEXT_COLOR[activity.kategori_triase] ?? NEUTRAL_TEXT;
  const detail = [activity.keterangan, activity.diubah_oleh_nama && `oleh ${activity.diubah_oleh_nama}`]
    .filter(Boolean)
    .join(" · ");

  return (
    // Kolom tag + nama lebar tetap (bukan auto) supaya kolom perubahan sejajar di semua baris.
    // Di HP, perubahan turun tepat di bawah tag.
    <li className="grid grid-cols-[3rem_1rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 py-3 text-sm md:grid-cols-[3rem_1rem_13rem_minmax(0,1fr)]">
      <span className="tabular-nums text-muted">{formatTime(activity.waktu_perubahan)}</span>

      <span className="relative flex h-full justify-center self-stretch">
        <span
          aria-hidden="true"
          className={`absolute w-px bg-black/10 ${isFirst ? "top-2" : "-top-3"} ${
            isLast ? "h-2" : "-bottom-3"
          }`}
        />
        <span className={`relative mt-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dotColor}`} />
      </span>

      <span className="min-w-0 truncate">
        <span className={`font-semibold ${textColor}`}>{activityHeadline(activity)}</span>
        {activity.nama && <span className="ml-2 text-ink/70">{activity.nama}</span>}
      </span>

      <span className="col-start-3 min-w-0 md:col-start-auto">
        <span className="block truncate text-ink">
          <ChangeLabel activity={activity} />
        </span>
        {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
      </span>
    </li>
  );
}

export default function ActivityTimelineCard({ activities, className = "" }) {
  const [status, setStatus] = useState("semua");
  const [triase, setTriase] = useState("semua");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter(
      (a) =>
        matchesStatusFilter(a, status) &&
        (triase === "semua" || a.kategori_triase === triase) &&
        (!q || (a.tag_id ?? "").toLowerCase().includes(q))
    );
  }, [activities, status, triase, query]);

  return (
    <div className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-ink">Linimasa Aktivitas</h3>
        <span className="text-sm text-muted">{filtered.length} aktivitas</span>
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative w-full max-w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari tag, mis. GPS-002"
              aria-label="Cari aktivitas berdasarkan tag"
              className="h-9 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
            />
        </div>
        <LevelFilter label="Triase" options={TRIASE_OPTIONS} value={triase} onChange={setTriase} />
        <SegmentedFilter label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted">
          Tidak ada aktivitas yang cocok dengan filter.
        </div>
      ) : (
        <ul className="max-h-[520px] overflow-y-auto pr-2">
          {filtered.map((activity, index) => (
            <TimelineRow
              key={activity.history_id}
              activity={activity}
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
