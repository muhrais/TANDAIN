import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import LevelFilter, { TRIASE_OPTIONS } from "../components/common/LevelFilter";
import StatusActionButton from "../components/evacuation/StatusActionButton";
import { usePolling } from "../hooks/usePolling";
import { listVictims } from "../services/victimService";
import { listPosko } from "../services/poskoService";
import { sortByPriority } from "../lib/evacuation";
import { STATUS_ORDER, STATUS_LABEL, formatElapsed } from "../lib/activity";

// Satu template kolom untuk header dan semua baris. Kolom aksi lebarnya tetap
// (bukan `auto`), karena isinya beda per status (tombol saja vs dropdown +
// tombol); dengan `auto` kolom lain ikut bergeser dan baris tidak sejajar.
const ROW_GRID = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)_22rem]";

const DOT_COLOR = {
  merah: "bg-triase-merah",
  kuning: "bg-triase-kuning",
  hijau: "bg-triase-hijau",
};

const TEXT_COLOR = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning-dark",
  hijau: "text-triase-hijau",
};

async function fetchEvacuationData() {
  const [victims, posko] = await Promise.all([listVictims(), listPosko()]);
  return { victims, posko };
}

function matchesSearch(victim, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return victim.tag_id.toLowerCase().includes(q) || (victim.nama ?? "").toLowerCase().includes(q);
}

export default function EvakuasiPage() {
  const [searchParams] = useSearchParams();
  const focusVictimId = searchParams.get("victim");
  const { data, error, refresh } = usePolling(fetchEvacuationData);
  const [triase, setTriase] = useState("semua");
  const [query, setQuery] = useState("");

  const poskoNameById = useMemo(
    () => new Map((data?.posko ?? []).map((p) => [p.posko_id, p.nama_posko])),
    [data?.posko]
  );

  // Halaman ini daftar kerja: korban yang sudah tiba tidak ditampilkan (arsipnya
  // di Data Pasien), kecuali dibuka dari peta dan korban itu sudah tiba.
  const focusedArrived = data?.victims.some(
    (v) => v.victim_id === focusVictimId && v.status_korban === "arrived"
  );

  // Dikelompokkan per tahap menurut urutan alur; di dalam grup, merah dulu lalu
  // yang paling lama menunggu. Grup kosong tidak ditampilkan.
  const groups = useMemo(() => {
    if (!data) return [];
    const filtered = data.victims.filter(
      (v) =>
        (triase === "semua" || v.kategori_triase === triase) &&
        matchesSearch(v, query.trim()) &&
        (v.status_korban !== "arrived" || (focusedArrived && v.victim_id === focusVictimId))
    );
    return STATUS_ORDER.map((status) => ({
      status,
      rows: sortByPriority(filtered.filter((v) => v.status_korban === status)),
    })).filter((group) => group.rows.length > 0);
  }, [data, triase, query, focusedArrived, focusVictimId]);

  // Scroll sekali ke baris korban yang dibuka dari peta.
  const scrolledToRef = useRef(null);
  useEffect(() => {
    if (!focusVictimId || scrolledToRef.current === focusVictimId || !data) return;
    document.getElementById(`victim-${focusVictimId}`)?.scrollIntoView({ block: "center" });
    scrolledToRef.current = focusVictimId;
  }, [focusVictimId, data]);

  return (
    <div className="min-w-0 flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink md:text-2xl">Evakuasi</h1>
          <p className="mt-1 text-sm text-muted">Antrean kerja per tahap, korban merah lebih dulu.</p>
        </div>
        {error && (
          <button type="button" onClick={refresh} className="text-sm font-medium text-triase-merah">
            Terputus · coba lagi
          </button>
        )}
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm md:p-5">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari tag_id atau nama"
            aria-label="Cari korban"
            className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <LevelFilter label="Triase" options={TRIASE_OPTIONS} value={triase} onChange={setTriase} />
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {!data ? (
          <p className="p-5 text-sm text-muted">{error ? error.message : "Memuat data korban…"}</p>
        ) : groups.length === 0 ? (
          <p className="p-5 text-sm text-muted">Tidak ada korban yang perlu diproses.</p>
        ) : (
          <ul>
            <li
              aria-hidden="true"
              className={`hidden gap-4 border-b border-black/5 px-5 py-2.5 text-xs font-medium text-muted lg:grid ${ROW_GRID}`}
            >
              <span>Tag & nama</span>
              <span>Menunggu</span>
              <span>Posko tujuan</span>
              <span className="text-right">Aksi</span>
            </li>
            {groups.map((group) => (
              <li key={group.status}>
                <h2 className="flex items-center gap-2 bg-page/70 px-4 py-2 text-xs font-semibold text-ink lg:px-5">
                  {STATUS_LABEL[group.status]}
                  <span className="tabular-nums text-muted">{group.rows.length}</span>
                </h2>
                <ul className="divide-y divide-black/5">
                  {group.rows.map((v) => (
                    <li
                      key={v.victim_id}
                      id={`victim-${v.victim_id}`}
                      className={`grid grid-cols-1 gap-3 px-4 py-4 lg:items-center lg:gap-4 lg:px-5 ${ROW_GRID} ${
                        v.victim_id === focusVictimId ? "bg-brand/5" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[v.kategori_triase]}`} />
                          <span className={TEXT_COLOR[v.kategori_triase]}>{v.tag_id}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[13px] text-ink/70">{v.nama || "(tanpa nama)"}</div>
                      </div>

                      <div className="text-[13px]">
                        <div className="font-semibold tabular-nums text-ink">
                          {formatElapsed(v.waktu_update_terakhir)}
                        </div>
                        <div className="text-muted">sejak update</div>
                      </div>

                      {/* Dua baris seperti kolom lain: tujuan di atas, asal di bawah. */}
                      <div className="min-w-0 text-[13px]">
                        {v.posko_tujuan ? (
                          <div className="truncate font-semibold text-ink">
                            {poskoNameById.get(v.posko_tujuan) ?? v.posko_tujuan}
                          </div>
                        ) : (
                          <div className="text-muted">Tujuan belum dipilih</div>
                        )}
                        <div className="truncate text-muted">
                          {v.posko_asal
                            ? `dari ${poskoNameById.get(v.posko_asal) ?? v.posko_asal}`
                            : "Asal tidak tercatat"}
                        </div>
                      </div>

                      <StatusActionButton
                        // key ikut status: state pilihan posko/error di-reset tiap status berubah.
                        key={`${v.victim_id}:${v.status_korban}`}
                        victim={v}
                        posko={data.posko}
                        variant="secondary"
                        onUpdated={refresh}
                        onError={refresh}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted">
        Korban yang sudah tiba di posko ada di{" "}
        <Link to="/pasien?status=arrived" className="font-semibold text-ink hover:underline">
          Data Pasien
        </Link>
        .
      </p>
    </div>
  );
}
