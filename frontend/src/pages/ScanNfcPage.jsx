import { useState } from "react";
import { Nfc, CircleCheck, CircleAlert } from "lucide-react";
import { scanTag } from "../services/tagService";
import { ApiClientError } from "../lib/apiClient";
import VictimRegistrationForm from "../components/scan/VictimRegistrationForm";

const TRIASE_LABEL = { merah: "Merah", kuning: "Kuning", hijau: "Hijau" };
const TRIASE_BADGE_CLASS = {
  merah: "bg-triase-merah-soft text-triase-merah",
  kuning: "bg-triase-kuning-soft text-triase-kuning-dark",
  hijau: "bg-triase-hijau-soft text-triase-hijau",
};
const STATUS_LABEL = {
  registered: "Terdaftar",
  triaged: "Sudah Ditriase",
  waiting_transfer: "Menunggu Evakuasi",
  in_transit: "Sedang Dievakuasi",
  arrived: "Sudah Tiba",
};

export default function ScanNfcPage() {
  const [tagId, setTagId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleScan(event) {
    event.preventDefault();
    const trimmed = tagId.trim();
    if (!trimmed) return;

    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await scanTag(trimmed);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTagId("");
    setResult(null);
    setError("");
  }

  return (
    <div className="min-w-0 flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Scan NFC</h1>
        <p className="mt-1 text-sm text-muted">
          Masukkan tag_id secara manual (fallback selama Web NFC API belum tersedia di semua perangkat).
        </p>
      </div>

      <form onSubmit={handleScan} className="flex items-end gap-3 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex-1">
          <label htmlFor="tag_id" className="mb-1.5 block text-sm font-semibold text-ink">
            Tag ID
          </label>
          <div className="relative">
            <Nfc size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              id="tag_id"
              type="text"
              value={tagId}
              onChange={(event) => setTagId(event.target.value)}
              placeholder="mis. TAG-0001"
              autoFocus
              className="w-full rounded-lg border border-neutral-200 py-2.5 pl-10 pr-3.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !tagId.trim()}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Memindai..." : "Scan"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg bg-triase-merah-soft px-4 py-3 text-sm text-triase-merah">
          {error}
        </p>
      )}

      {result?.status === "registered" && (
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-triase-hijau">
            <CircleCheck size={20} />
            <span className="text-sm font-semibold">Tag terdaftar</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted">Nama</div>
              <div className="font-semibold text-ink">{result.nama || "-"}</div>
            </div>
            <div>
              <div className="text-muted">Kategori Triase</div>
              <span
                className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TRIASE_BADGE_CLASS[result.kategori_triase] ?? "bg-neutral-100 text-neutral-600"}`}
              >
                {TRIASE_LABEL[result.kategori_triase] ?? result.kategori_triase}
              </span>
            </div>
            <div>
              <div className="text-muted">Status</div>
              <div className="font-semibold text-ink">{STATUS_LABEL[result.status_korban] ?? result.status_korban}</div>
            </div>
            <div>
              <div className="text-muted">Posko Asal / Tujuan</div>
              <div className="font-semibold text-ink">
                {result.posko_asal ?? "-"} / {result.posko_tujuan ?? "-"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="text-sm font-semibold text-brand hover:text-brand-dark"
          >
            Scan tag lain
          </button>
        </div>
      )}

      {result?.status === "not_registered" && (
        <>
          <p className="flex items-center gap-2 rounded-lg bg-triase-kuning-soft px-4 py-3 text-sm text-triase-kuning-dark">
            <CircleAlert size={18} />
            Tag belum terdaftar. Lengkapi data korban di bawah untuk mendaftarkan.
          </p>
          <VictimRegistrationForm
            tagId={result.tag_id}
            onRegistered={(victim) =>
              setResult({
                status: "registered",
                nama: victim.nama,
                kategori_triase: victim.kategori_triase,
                status_korban: victim.status_korban,
                posko_asal: victim.posko_asal,
                posko_tujuan: victim.posko_tujuan,
              })
            }
          />
        </>
      )}
    </div>
  );
}
