import { useState } from "react";
import { Minus, Plus, LocateFixed, X } from "lucide-react";
import Modal, { INPUT, LABEL, BTN_DIALOG_PRIMARY, BTN_DIALOG_SECONDARY } from "../common/Modal";
import { createKorbanJiwa, updateKorbanJiwa } from "../../services/korbanJiwaService";
import { ApiClientError } from "../../lib/apiClient";
import { toLocalInput, fromLocalInput } from "../../lib/datetime";

const JK_OPTIONS = [
  { value: "tidak_diketahui", label: "Tidak diketahui" },
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
];

function errorText(err) {
  if (err instanceof ApiClientError) {
    const detail = err.details?.map((d) => d.message).join(" ");
    return detail || err.message;
  }
  return "Gagal terhubung ke server.";
}

function initialState(entry) {
  return {
    jumlah: entry?.jumlah ?? 1,
    waktu: toLocalInput(entry?.waktu_ditemukan ?? new Date()),
    lat: entry?.lokasi?.lat ?? null,
    lng: entry?.lokasi?.lng ?? null,
    posko_id: entry?.posko_id ?? "",
    nama: entry?.nama ?? "",
    jenis_kelamin: entry?.jenis_kelamin ?? "tidak_diketahui",
    perkiraan_usia: entry?.perkiraan_usia ?? "",
    catatan: entry?.catatan ?? "",
  };
}

// Catat / ubah korban jiwa (keputusan K1: diinput langsung, tidak terhubung
// ke gelang). Dipakai dari dashboard, halaman Scan, dan Data Pasien.
export default function KorbanJiwaForm({ entry = null, posko = [], onSaved, onClose }) {
  const [form, setForm] = useState(() => initialState(entry));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  const clampJumlah = (value) => Math.min(500, Math.max(1, value || 1));
  const setJumlah = (value) => setForm((f) => ({ ...f, jumlah: clampJumlah(value) }));
  // Pakai nilai terbaru dari state (bukan closure), supaya klik cepat beruntun tetap terhitung.
  const stepJumlah = (delta) => setForm((f) => ({ ...f, jumlah: clampJumlah(f.jumlah + delta) }));

  function fillDeviceLocation() {
    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung lokasi.");
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? "Izin lokasi ditolak." : "Lokasi HP tidak bisa dibaca.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const waktu = fromLocalInput(form.waktu);
    if (!waktu) {
      setError("Isi waktu ditemukan.");
      return;
    }
    const payload = {
      jumlah: form.jumlah,
      waktu_ditemukan: waktu,
      lokasi: { lat: form.lat, lng: form.lng },
      posko_id: form.posko_id || null,
      nama: form.nama,
      jenis_kelamin: form.jenis_kelamin,
      perkiraan_usia: form.perkiraan_usia === "" ? null : Number(form.perkiraan_usia),
      catatan: form.catatan,
    };
    setSaving(true);
    try {
      const saved = entry ? await updateKorbanJiwa(entry.kj_id, payload) : await createKorbanJiwa(payload);
      onSaved(saved);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={entry ? "Ubah Catatan Korban Jiwa" : "Catat Korban Jiwa"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN_DIALOG_SECONDARY}>
            Batal
          </button>
          <button type="submit" form="korban-jiwa-form" disabled={saving} className={BTN_DIALOG_PRIMARY}>
            {saving ? "Menyimpan..." : entry ? "Simpan perubahan" : "Simpan catatan"}
          </button>
        </>
      }
    >
      <form id="korban-jiwa-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className={LABEL}>Jumlah jenazah</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepJumlah(-1)}
                aria-label="Kurangi jumlah"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-ink hover:bg-page"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={500}
                value={form.jumlah}
                onChange={(event) => setJumlah(parseInt(event.target.value, 10))}
                aria-label="Jumlah jenazah"
                className={`${INPUT} w-20 text-center tabular-nums`}
              />
              <button
                type="button"
                onClick={() => stepJumlah(1)}
                aria-label="Tambah jumlah"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-ink hover:bg-page"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <label className="block">
            <span className={LABEL}>Waktu ditemukan</span>
            <input type="datetime-local" value={form.waktu} onChange={set("waktu")} required className={INPUT} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Posko (opsional)</span>
            <select value={form.posko_id} onChange={set("posko_id")} className={INPUT}>
              <option value="">Tidak di posko</option>
              {posko.map((p) => (
                <option key={p.posko_id} value={p.posko_id}>
                  {p.nama_posko}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className={LABEL}>Lokasi ditemukan (opsional)</span>
            {form.lat != null ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-page px-3 py-2 text-sm tabular-nums text-ink">
                {form.lat}, {form.lng}
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, lat: null, lng: null }))}
                  aria-label="Hapus lokasi"
                  className="text-muted hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={fillDeviceLocation}
                disabled={locating}
                className="flex w-full items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60"
              >
                <LocateFixed size={16} />
                {locating ? "Membaca lokasi..." : "Pakai lokasi perangkat ini"}
              </button>
            )}
          </div>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-black/5 p-3">
          <legend className="px-1 text-xs font-semibold text-muted">Identitas (isi bila diketahui)</legend>
          <label className="block">
            <span className={LABEL}>Nama</span>
            <input type="text" value={form.nama} onChange={set("nama")} className={INPUT} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL}>Jenis kelamin</span>
              <select value={form.jenis_kelamin} onChange={set("jenis_kelamin")} className={INPUT}>
                {JK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={LABEL}>Perkiraan usia</span>
              <input
                type="number"
                min={0}
                max={150}
                value={form.perkiraan_usia}
                onChange={set("perkiraan_usia")}
                className={INPUT}
              />
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className={LABEL}>Catatan</span>
          <textarea value={form.catatan} onChange={set("catatan")} rows={2} className={INPUT} />
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
