import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Modal, { BTN_PRIMARY, BTN_SECONDARY, BTN_ROW, INPUT, LABEL } from "../common/Modal";
import KorbanJiwaForm from "./KorbanJiwaForm";
import { usePolling } from "../../hooks/usePolling";
import { listKorbanJiwa, deleteKorbanJiwa } from "../../services/korbanJiwaService";
import { ApiClientError } from "../../lib/apiClient";
import { JK_LABEL } from "../../lib/triase";
import { formatDateTime } from "../../lib/datetime";
import { getRole } from "../../services/authService";

// Sama dengan ROLES.PENCATAT_KORBAN_JIWA di backend.
const PENCATAT = ["koordinator", "tenaga_medis_lapangan"];

// Satu template kolom untuk header dan semua baris (aturan UI: kolom aksi lebar tetap).
const ROW_GRID =
  "lg:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)_21.5rem]";

function identitas(entry) {
  const parts = [];
  if (entry.nama) parts.push(entry.nama);
  if (entry.jenis_kelamin && entry.jenis_kelamin !== "tidak_diketahui") parts.push(JK_LABEL[entry.jenis_kelamin]);
  if (entry.perkiraan_usia != null) parts.push(`±${entry.perkiraan_usia} th`);
  return parts.length ? parts.join(", ") : "Tidak teridentifikasi";
}

function DeleteDialog({ entry, onClose, onDeleted }) {
  const [alasan, setAlasan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!alasan.trim()) {
      setError("Tulis alasan penghapusan.");
      return;
    }
    setSaving(true);
    try {
      await deleteKorbanJiwa(entry.kj_id, alasan.trim());
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Hapus Catatan Korban Jiwa"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>
            Batal
          </button>
          <button type="submit" form="hapus-kj-form" disabled={saving} className={BTN_PRIMARY}>
            {saving ? "Menghapus..." : "Hapus catatan"}
          </button>
        </>
      }
    >
      <form id="hapus-kj-form" onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-ink/80">
          Catatan {entry.jumlah} korban jiwa ({formatDateTime(entry.waktu_ditemukan)}) akan dikeluarkan dari total.
          Catatan tidak benar-benar dihapus dari database, alasannya disimpan untuk audit.
        </p>
        <label className="block">
          <span className={LABEL}>Alasan</span>
          <textarea
            value={alasan}
            onChange={(event) => setAlasan(event.target.value)}
            rows={2}
            autoFocus
            placeholder="mis. Tercatat dua kali"
            className={INPUT}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

// Tab Korban Jiwa di Data Pasien: total, daftar entri, catat/ubah/hapus
// sesuai role (koordinator semua; tenaga medis lapangan ubah miliknya
// <= 30 menit; petugas pos medis hanya lihat).
export default function KorbanJiwaTab({ posko }) {
  const role = getRole();
  const { data, error, refresh } = usePolling(listKorbanJiwa);
  const [editing, setEditing] = useState(null); // null | "baru" | entry
  const [deleting, setDeleting] = useState(null);

  const poskoName = (id) => posko.find((p) => p.posko_id === id)?.nama_posko ?? id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-baseline gap-3">
          <span className="w-12 text-3xl font-extrabold tabular-nums text-ink">{data?.total ?? "-"}</span>
          <span className="text-sm text-ink/80">
            korban jiwa tercatat
            {data && <span className="text-muted"> · {data.items.length} catatan</span>}
          </span>
        </div>
        {PENCATAT.includes(role) && (
          <button type="button" onClick={() => setEditing("baru")} className={BTN_PRIMARY}>
            <Plus size={14} />
            Catat korban jiwa
          </button>
        )}
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {!data ? (
          <p className="p-5 text-sm text-muted">{error ? error.message : "Memuat catatan korban jiwa..."}</p>
        ) : data.items.length === 0 ? (
          <p className="p-5 text-sm text-muted">Belum ada korban jiwa yang dicatat.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            <li aria-hidden="true" className={`hidden gap-4 px-5 py-2.5 text-xs font-medium text-muted lg:grid ${ROW_GRID}`}>
              <span>Jumlah</span>
              <span>Waktu ditemukan</span>
              <span>Lokasi</span>
              <span>Identitas</span>
              <span>Dicatat oleh</span>
              <span className="text-right">Aksi</span>
            </li>
            {data.items.map((entry) => (
              <li key={entry.kj_id} className={`grid grid-cols-1 gap-2 px-4 py-4 lg:items-center lg:gap-4 lg:px-5 ${ROW_GRID}`}>
                <div className="text-2xl font-extrabold tabular-nums text-ink">{entry.jumlah}</div>
                <div className="text-[13px]">
                  <div className="font-semibold text-ink">{formatDateTime(entry.waktu_ditemukan)}</div>
                  <div className="text-muted">dicatat {formatDateTime(entry.created_at)}</div>
                </div>
                <div className="min-w-0 text-[13px]">
                  <div className="truncate font-semibold text-ink">
                    {entry.posko_id ? poskoName(entry.posko_id) : "Di luar posko"}
                  </div>
                  <div className="truncate tabular-nums text-muted">
                    {entry.lokasi?.lat != null
                      ? `${entry.lokasi.lat.toFixed(5)}, ${entry.lokasi.lng.toFixed(5)}`
                      : "Koordinat tidak dicatat"}
                  </div>
                </div>
                <div className="min-w-0 text-[13px]">
                  <div className="truncate font-semibold text-ink">{identitas(entry)}</div>
                  <div className="truncate text-muted" title={entry.catatan || undefined}>
                    {entry.catatan || "Tanpa catatan"}
                  </div>
                </div>
                <div className="min-w-0 text-[13px]">
                  <div className="truncate font-semibold text-ink">{entry.dicatat_oleh_nama ?? "-"}</div>
                  <div className="truncate text-muted">
                    {entry.diubah_oleh_nama ? `diubah ${entry.diubah_oleh_nama}` : "belum diubah"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {entry.bisa_diubah && (
                    <button type="button" onClick={() => setEditing(entry)} className={BTN_ROW}>
                      <Pencil size={14} />
                      Ubah
                    </button>
                  )}
                  {role === "koordinator" && (
                    <button type="button" onClick={() => setDeleting(entry)} className={BTN_ROW}>
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  )}
                  {!entry.bisa_diubah && role !== "koordinator" && (
                    <span className="text-[13px] text-muted">Hanya bisa dilihat</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <KorbanJiwaForm
          entry={editing === "baru" ? null : editing}
          posko={posko}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          entry={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
