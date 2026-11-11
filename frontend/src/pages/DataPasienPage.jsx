import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, RefreshCw, Download, ChevronRight, ChevronLeft, ArrowUp, ArrowDown } from "lucide-react";
import LevelFilter, { TRIASE_OPTIONS } from "../components/common/LevelFilter";
import SegmentedFilter from "../components/common/SegmentedFilter";
import { BTN_ROW, BTN_SECONDARY } from "../components/common/Modal";
import VictimDrawer from "../components/pasien/VictimDrawer";
import KorbanJiwaTab from "../components/korbanJiwa/KorbanJiwaTab";
import { searchVictims } from "../services/victimService";
import { listPosko } from "../services/poskoService";
import { exportVictimsCsv } from "../services/reportService";
import { STATUS_ORDER, STATUS_LABEL, formatElapsed, formatTime } from "../lib/activity";
import { TRIASE_DOT, TRIASE_TEXT, TRIASE_BADGE, TRIASE_LABEL } from "../lib/triase";

const JK_SHORT = { L: "L", P: "P" };
import { formatDateTime } from "../lib/datetime";
import { POLL_INTERVAL_MS } from "../lib/config";
import { record } from "../lib/metrics";

const TABS = [
  { key: "korban", label: "Korban" },
  { key: "korban-jiwa", label: "Korban Jiwa" },
];

const STATUS_FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "aktif", label: "Aktif" },
  ...STATUS_ORDER.map((status) => ({ key: status, label: STATUS_LABEL[status] })),
];

const PAGE_SIZE = 25;
const DEFAULT_SORT = "-waktu_update_terakhir";

// Satu template kolom untuk header dan semua baris; kolom aksi lebar tetap.
const ROW_GRID =
  "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)_6.5rem_10.5rem]";

// Kolom yang bisa diurutkan: klik sekali naik, klik lagi turun.
const COLUMNS = [
  { label: "Korban", sort: "nama" },
  { label: "Triase", sort: "kategori_triase" },
  { label: "Status", sort: "status_korban" },
  { label: "Posko", sort: null },
  { label: "Update", sort: "waktu_update_terakhir" },
];

function SortHeader({ column, sort, onSort }) {
  if (!column.sort) return <span>{column.label}</span>;
  const activeKey = sort.replace(/^-/, "");
  const active = activeKey === column.sort;
  const desc = sort.startsWith("-");
  return (
    <button
      type="button"
      onClick={() => onSort(column.sort)}
      className={`flex items-center gap-1 text-left hover:text-ink ${active ? "text-ink" : ""}`}
      aria-label={`Urutkan berdasarkan ${column.label}`}
    >
      {column.label}
      {active && (desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
    </button>
  );
}

export default function DataPasienPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "korban-jiwa" ? "korban-jiwa" : "korban";
  const q = params.get("q") ?? "";
  const triase = params.get("triase") ?? "semua";
  const status = params.get("status") ?? "semua";
  const posko = params.get("posko") ?? "";
  const sort = params.get("sort") ?? DEFAULT_SORT;
  const page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  const openVictimId = params.get("victim");

  const [poskoList, setPoskoList] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [searchText, setSearchText] = useState(q);
  const [tick, setTick] = useState(0);

  // Ubah satu/lebih parameter URL. Filter apa pun selain halaman -> balik ke halaman 1.
  const updateParams = useCallback(
    (changes, { replace = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === "" || value === "semua") next.delete(key);
            else next.set(key, value);
          }
          if (!("page" in changes)) next.delete("page");
          return next;
        },
        { replace }
      );
    },
    [setParams]
  );

  useEffect(() => {
    listPosko()
      .then(setPoskoList)
      .catch(() => setPoskoList([]));
  }, []);

  // Pencarian di-debounce 300 ms supaya tidak request tiap ketukan.
  useEffect(() => {
    if (searchText === q) return undefined;
    const timer = setTimeout(() => updateParams({ q: searchText.trim() }, { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [searchText, q, updateParams]);

  const filter = useMemo(
    () => ({
      q: q || undefined,
      kategori_triase: triase !== "semua" ? triase : undefined,
      status_korban: status !== "semua" ? status : undefined,
      posko: posko || undefined,
    }),
    [q, triase, status, posko]
  );
  const queryKey = JSON.stringify({ filter, sort, page });

  // Muat ulang tiap siklus polling (data korban berubah dari HP petugas lain).
  useEffect(() => {
    if (tab !== "korban") return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [tab]);

  const requestRef = useRef(0);
  const lastKeyRef = useRef(null);
  useEffect(() => {
    if (tab !== "korban") return;
    const id = ++requestRef.current;
    // P-05: ukur hanya perubahan filter/halaman, bukan siklus polling.
    const measure = lastKeyRef.current !== queryKey;
    lastKeyRef.current = queryKey;
    const t0 = performance.now();
    if (measure) setLoading(true);
    searchVictims({ ...filter, sort, page, limit: PAGE_SIZE })
      .then((data) => {
        if (id !== requestRef.current) return;
        setResult(data);
        setError(null);
        if (measure) {
          requestAnimationFrame(() => {
            const ms = Math.round(performance.now() - t0);
            record("P-05", { value_ms: ms, query: filter.q ?? "", total: data.total, ok: true });
          });
        }
      })
      .catch((err) => {
        if (id === requestRef.current) setError(err);
      })
      .finally(() => {
        if (id === requestRef.current) setLoading(false);
      });
    // queryKey sudah mewakili filter/sort/page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, queryKey, tick]);

  function handleSort(column) {
    const current = sort.replace(/^-/, "");
    let next;
    if (current === column) next = sort.startsWith("-") ? column : `-${column}`;
    else next = column === "waktu_update_terakhir" ? `-${column}` : column;
    updateParams({ sort: next === DEFAULT_SORT ? null : next });
  }

  async function handleExport() {
    setExportError("");
    setExporting(true);
    try {
      await exportVictimsCsv(filter);
    } catch (err) {
      setExportError(err.message || "Gagal mengekspor data.");
    } finally {
      setExporting(false);
    }
  }

  const poskoName = (id) => (id ? poskoList.find((p) => p.posko_id === id)?.nama_posko ?? id : null);
  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const from = result && result.total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = result ? Math.min(page * PAGE_SIZE, result.total) : 0;
  const hasFilter = Boolean(q || triase !== "semua" || status !== "semua" || posko);

  return (
    <div className="min-w-0 flex-1 space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink md:text-2xl">Data Pasien</h1>
          <p className="mt-1 text-sm text-muted">
            Data seluruh korban, termasuk yang sudah tiba di posko, beserta riwayat perubahan dan catatan korban jiwa.
          </p>
        </div>
        {tab === "korban" && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              className={`flex items-center gap-1.5 text-sm font-medium ${error ? "text-triase-merah" : "text-muted hover:text-ink"}`}
            >
              {error ? "Terputus" : "Refresh"}
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              title={exportError || (hasFilter ? "Unduh korban sesuai filter (CSV)" : "Unduh semua korban (CSV)")}
              className={BTN_SECONDARY}
            >
              <Download size={14} />
              {exporting ? "Mengekspor..." : exportError ? "Ekspor gagal" : hasFilter ? "Ekspor hasil filter" : "Ekspor CSV"}
            </button>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Jenis data" className="flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => updateParams({ tab: t.key === "korban" ? null : t.key, victim: null, page: null })}
            className={`rounded-md px-4 py-2.5 text-sm leading-5 transition-colors md:px-5 md:text-[15px] ${
              tab === t.key ? "bg-white font-bold text-ink shadow-sm" : "font-semibold text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "korban-jiwa" ? (
        <KorbanJiwaTab posko={poskoList} />
      ) : (
        <>
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Cari ID tag atau nama korban, mis. GPS-002"
                  aria-label="Cari korban"
                  className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <select
                value={posko}
                onChange={(event) => updateParams({ posko: event.target.value })}
                aria-label="Filter posko"
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand sm:w-56"
              >
                <option value="">Semua posko</option>
                {poskoList.map((p) => (
                  <option key={p.posko_id} value={p.posko_id}>
                    {p.nama_posko}
                  </option>
                ))}
              </select>
            </div>
            <LevelFilter label="Triase" options={TRIASE_OPTIONS} value={triase} onChange={(v) => updateParams({ triase: v })} />
            <SegmentedFilter label="Status" options={STATUS_FILTERS} value={status} onChange={(v) => updateParams({ status: v })} />
          </div>

          <div className={`rounded-xl bg-white shadow-sm transition-opacity ${loading ? "opacity-60" : ""}`}>
            {!result ? (
              <p className="p-5 text-sm text-muted">{error ? error.message : "Memuat data korban..."}</p>
            ) : result.items.length === 0 ? (
              <p className="p-5 text-sm text-muted">
                {hasFilter ? "Tidak ada korban yang cocok dengan pencarian atau filter." : "Belum ada korban terdaftar."}
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                <li className={`hidden gap-4 px-5 py-2.5 text-xs font-medium text-muted xl:grid ${ROW_GRID}`}>
                  {COLUMNS.map((column) => (
                    <SortHeader key={column.label} column={column} sort={sort} onSort={handleSort} />
                  ))}
                  <span className="text-right">Aksi</span>
                </li>
                {result.items.map((v) => (
                  <li
                    key={v.victim_id}
                    className={`grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 xl:items-center xl:gap-4 xl:px-5 ${ROW_GRID} ${
                      v.victim_id === openVictimId ? "bg-brand/5" : ""
                    }`}
                  >
                    <div className="col-span-2 min-w-0 sm:col-span-4 xl:col-span-1">
                      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TRIASE_DOT[v.kategori_triase]}`} />
                        <span className={`truncate ${TRIASE_TEXT[v.kategori_triase]}`}>{v.tag_id}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[13px] text-ink/70">{v.nama || "(tanpa nama)"}</div>
                    </div>

                    <div className="text-[13px]">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${TRIASE_BADGE[v.kategori_triase]}`}>
                        {TRIASE_LABEL[v.kategori_triase]}
                      </span>
                      <div className="mt-0.5 text-muted">
                        {[v.usia != null ? `${v.usia} th` : null, JK_SHORT[v.jenis_kelamin]].filter(Boolean).join(" · ") ||
                          "Usia/JK -"}
                      </div>
                    </div>

                    <div className="text-[13px]">
                      <div className="font-semibold text-ink">{STATUS_LABEL[v.status_korban]}</div>
                      <div className="whitespace-nowrap text-muted">{formatElapsed(v.waktu_update_terakhir)} lalu</div>
                    </div>

                    <div className="min-w-0 text-[13px]">
                      <div className="truncate font-semibold text-ink">
                        {poskoName(v.posko_tujuan) ?? <span className="font-normal text-muted">Tujuan belum dipilih</span>}
                      </div>
                      <div className="truncate text-muted">
                        {v.posko_asal ? `dari ${poskoName(v.posko_asal)}` : "Asal tidak tercatat"}
                      </div>
                    </div>

                    <div className="text-[13px]">
                      <div className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatDateTime(v.waktu_update_terakhir)}</div>
                      <div className="whitespace-nowrap tabular-nums text-muted">daftar {formatTime(v.created_at)}</div>
                    </div>

                    <div className="col-span-2 flex sm:col-span-4 xl:col-span-1 xl:justify-end">
                      <button type="button" onClick={() => updateParams({ victim: v.victim_id, page: params.get("page") })} className={`${BTN_ROW} pr-7`}>
                        Detail & riwayat
                        <ChevronRight size={14} className="absolute right-2.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {result && result.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-5 py-3 text-sm">
                <span className="tabular-nums text-muted">
                  {from}–{to} dari {result.total} korban
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateParams({ page: page - 1 > 1 ? String(page - 1) : null })}
                    disabled={page <= 1}
                    aria-label="Halaman sebelumnya"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 text-ink hover:bg-page disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="tabular-nums text-ink">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateParams({ page: String(page + 1) })}
                    disabled={page >= totalPages}
                    aria-label="Halaman berikutnya"
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 text-ink hover:bg-page disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {openVictimId && (
        <VictimDrawer
          key={openVictimId}
          victimId={openVictimId}
          posko={poskoList}
          onClose={() => updateParams({ victim: null, page: params.get("page") }, { replace: true })}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}
