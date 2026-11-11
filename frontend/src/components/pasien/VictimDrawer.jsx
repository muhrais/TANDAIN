import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { getVictimDetail, getVictimLocations } from "../../services/victimService";
import { ApiClientError } from "../../lib/apiClient";
import { STATUS_LABEL, formatElapsed } from "../../lib/activity";
import { TRIASE_BADGE, TRIASE_LABEL, JK_LABEL } from "../../lib/triase";
import { formatDateTime } from "../../lib/datetime";
import VictimEditSection from "../scan/VictimEditSection";
import StatusActionButton from "../evacuation/StatusActionButton";
import VictimIdentityForm from "./VictimIdentityForm";
import VictimTrackMap from "./VictimTrackMap";

const DATA_FIELD_LABEL = { nama: "nama", usia: "usia", jenis_kelamin: "jenis kelamin", kondisi_klinis: "kondisi klinis" };

function showValue(field, value) {
  if (value === null || value === undefined || value === "") return "kosong";
  if (field === "jenis_kelamin") return JK_LABEL[value] ?? value;
  if (field === "kondisi_klinis" && String(value).length > 40) return `${String(value).slice(0, 40)}…`;
  return String(value);
}

function describeHistory(entry) {
  if (entry.jenis === "triase") {
    return `Triase ${TRIASE_LABEL[entry.nilai_lama] ?? entry.nilai_lama} → ${TRIASE_LABEL[entry.nilai_baru] ?? entry.nilai_baru}`;
  }
  if (entry.jenis === "data") {
    const changes = Object.keys(entry.nilai_baru ?? {}).map(
      (f) =>
        `${DATA_FIELD_LABEL[f] ?? f}: ${showValue(f, entry.nilai_lama?.[f])} → ${showValue(f, entry.nilai_baru[f])}`
    );
    return `Data diubah (${changes.join("; ")})`;
  }
  return entry.status_lama
    ? `${STATUS_LABEL[entry.status_lama] ?? entry.status_lama} → ${STATUS_LABEL[entry.status_baru] ?? entry.status_baru}`
    : `${STATUS_LABEL[entry.status_baru] ?? entry.status_baru}`;
}

const HISTORY_DOT = { status: "bg-ink", triase: "bg-brand", data: "bg-neutral-400" };

// Panel detail korban di Data Pasien: identitas, triase & kondisi klinis,
// aksi status berikutnya, jejak lokasi, dan linimasa riwayat dengan nama
// pengubah. Drawer kanan di desktop, layar penuh di HP.
export default function VictimDrawer({ victimId, posko, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [points, setPoints] = useState(null);
  const [error, setError] = useState("");

  // `active` mencegah respons lama menimpa state setelah drawer ditutup.
  const fetchInto = useCallback(
    (isActive = () => true) =>
      Promise.all([getVictimDetail(victimId), getVictimLocations(victimId)])
        .then(([d, loc]) => {
          if (!isActive()) return;
          setDetail(d);
          setPoints(loc.points);
          setError("");
        })
        .catch((err) => {
          if (isActive()) setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
        }),
    [victimId]
  );
  const load = () => fetchInto();

  // Parent memasang key={victimId}, jadi ganti korban = komponen baru dengan
  // state kosong; efek ini cukup memuat data pertama kali.
  useEffect(() => {
    let active = true;
    fetchInto(() => active);
    return () => {
      active = false;
    };
  }, [fetchInto]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleUpdated() {
    load();
    onChanged();
  }

  const poskoName = (id) => (id ? posko.find((p) => p.posko_id === id)?.nama_posko ?? id : "-");
  const history = detail ? [...detail.status_history].reverse() : [];

  return (
    <div className="fixed inset-0 z-[900] flex justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detail korban"
        className="relative flex h-full w-full flex-col bg-white shadow-xl sm:max-w-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/5 px-5 py-4">
          {detail ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink">{detail.tag_id}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TRIASE_BADGE[detail.kategori_triase]}`}>
                  {TRIASE_LABEL[detail.kategori_triase]}
                </span>
              </div>
              <h2 className="mt-1 truncate text-lg font-bold text-ink">{detail.nama || "(tanpa nama)"}</h2>
              <p className="text-sm text-muted">
                {STATUS_LABEL[detail.status_korban]} · update {formatElapsed(detail.waktu_update_terakhir)} lalu
              </p>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-ink">Detail korban</h2>
          )}
          <button type="button" onClick={onClose} aria-label="Tutup detail" className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {error && (
            <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
              {error}
            </p>
          )}
          {!detail && !error && <p className="text-sm text-muted">Memuat detail korban...</p>}

          {detail && (
            <>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/5 px-3.5 py-3">
                  <div className="text-sm">
                    <div className="text-xs text-muted">Posko asal → tujuan</div>
                    <div className="font-semibold text-ink">
                      {poskoName(detail.posko_asal)} → {poskoName(detail.posko_tujuan)}
                    </div>
                  </div>
                  <StatusActionButton
                    key={detail.status_korban}
                    victim={detail}
                    posko={posko}
                    onUpdated={handleUpdated}
                    onError={handleUpdated}
                  />
                </div>
                <p className="text-xs text-muted">Terdaftar {formatDateTime(detail.created_at)}</p>
              </section>

              <VictimIdentityForm victim={detail} onUpdated={handleUpdated} />

              <VictimEditSection
                victim={detail}
                onUpdated={handleUpdated}
              />

              <section>
                <h3 className="mb-1.5 text-sm font-semibold text-ink">Jejak lokasi</h3>
                {points === null ? (
                  <p className="text-sm text-muted">Memuat jejak lokasi...</p>
                ) : (
                  <VictimTrackMap points={points} kategoriTriase={detail.kategori_triase} />
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-ink">Riwayat ({history.length})</h3>
                <ol className="space-y-3">
                  {history.map((entry) => (
                    <li key={entry.history_id} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3 text-sm">
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${HISTORY_DOT[entry.jenis] ?? "bg-ink"}`} />
                      <div className="min-w-0">
                        <div className="text-ink/90">{describeHistory(entry)}</div>
                        <div className="text-xs text-muted">
                          {formatDateTime(entry.waktu_perubahan)} · {entry.diubah_oleh_nama ?? "sistem"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
