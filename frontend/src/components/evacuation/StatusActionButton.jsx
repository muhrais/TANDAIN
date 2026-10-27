import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { updateVictim } from "../../services/victimService";
import { ApiClientError } from "../../lib/apiClient";
import { nextStatus, NEXT_ACTION_LABEL, STATUS_NEEDS_POSKO } from "../../lib/evacuation";

// Posko tujuan default = posko yang jenisnya sama dengan kategori triase
// korban (korban merah -> Pos Merah), kalau ada.
function defaultPoskoId(victim, posko) {
  if (victim.posko_tujuan) return victim.posko_tujuan;
  return posko.find((p) => p.jenis === victim.kategori_triase)?.posko_id ?? "";
}

function errorMessage(err) {
  if (err instanceof ApiClientError && err.code === "INVALID_STATUS_TRANSITION") {
    // Satu-satunya cara UI kena 422 ini: status sudah diubah dari perangkat
    // lain sejak data terakhir dimuat (UI sendiri hanya menawarkan langkah berikutnya).
    return "Status korban sudah berubah di perangkat lain. Data dimuat ulang, coba lagi.";
  }
  return err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.";
}

// "primary" (merah solid) untuk aksi utama halaman, mis. hasil Scan NFC.
// "secondary" untuk aksi per baris di daftar, supaya belasan tombol tidak
// semuanya terlihat sama mendesak.
const VARIANT_CLASS = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-brand/30 bg-white text-brand hover:border-brand hover:bg-brand/5",
};

export default function StatusActionButton({ victim, posko = [], onUpdated, onError, variant = "primary" }) {
  const next = nextStatus(victim.status_korban);
  const needsPosko = next === STATUS_NEEDS_POSKO;
  const tujuanOptions = posko.filter((p) => p.jenis !== "utama");
  // Pilihan user disimpan terpisah dari default: daftar posko bisa datang
  // belakangan (mis. di halaman Scan NFC), dan default harus ikut menyesuaikan.
  const [pickedPosko, setPickedPosko] = useState("");
  const poskoTujuan = pickedPosko || defaultPoskoId(victim, tujuanOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!next) {
    return (
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-triase-hijau">
        <Check size={14} />
        Selesai
      </span>
    );
  }

  async function handleClick() {
    setError("");
    if (needsPosko && !poskoTujuan) {
      setError("Pilih posko tujuan dulu.");
      return;
    }
    setLoading(true);
    try {
      const updated = await updateVictim(victim.victim_id, {
        status_korban: next,
        ...(needsPosko ? { posko_tujuan: poskoTujuan } : {}),
      });
      onUpdated?.(updated);
    } catch (err) {
      setError(errorMessage(err));
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {needsPosko && (
          <select
            aria-label={`Posko tujuan untuk ${victim.tag_id}`}
            value={poskoTujuan}
            onChange={(event) => setPickedPosko(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand sm:flex-none"
          >
            <option value="" disabled>
              Pilih posko tujuan
            </option>
            {tujuanOptions.map((p) => (
              <option key={p.posko_id} value={p.posko_id}>
                {p.nama_posko} · sisa {p.sisa_kapasitas}
                {p.status_kapasitas === "penuh" ? " (penuh)" : ""}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          // Lebar tetap: label beda per status, tombol tetap sama besar di semua baris.
          // Teks rata kiri, panah menempel di kanan.
          className={`relative flex w-[10.5rem] items-center justify-start whitespace-nowrap rounded-md pl-3 pr-7 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${VARIANT_CLASS[variant]}`}
        >
          {loading ? "Menyimpan..." : NEXT_ACTION_LABEL[next]}
          {!loading && <ArrowRight size={14} className="absolute right-2.5" />}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-triase-merah">
          {error}
        </p>
      )}
    </div>
  );
}
