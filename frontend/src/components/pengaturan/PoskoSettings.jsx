import { useState } from "react";
import { Check } from "lucide-react";
import { updatePosko } from "../../services/poskoService";
import { ApiClientError } from "../../lib/apiClient";
import { BTN_ROW, INPUT } from "../common/Modal";

const JENIS_LABEL = { utama: "Utama", merah: "Merah", kuning: "Kuning", hijau: "Hijau" };
const JENIS_DOT = { utama: "bg-ink", merah: "bg-triase-merah", kuning: "bg-triase-kuning", hijau: "bg-triase-hijau" };

const ROW_GRID = "lg:grid-cols-[minmax(0,1.4fr)_7rem_minmax(0,1fr)_minmax(0,1fr)_7rem_10.5rem]";

function toForm(p) {
  return {
    nama_posko: p.nama_posko,
    kapasitas_maksimum: String(p.kapasitas_maksimum),
    lat: p.lokasi?.lat != null ? String(p.lokasi.lat) : "",
    lng: p.lokasi?.lng != null ? String(p.lokasi.lng) : "",
  };
}

function PoskoRow({ posko, onSaved }) {
  const [form, setForm] = useState(() => toForm(posko));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const original = toForm(posko);
  const dirty = Object.keys(form).some((k) => form[k] !== original[k]);

  const set = (field) => (event) => {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: event.target.value }));
  };

  async function handleSave() {
    setError("");
    const kapasitas = Number(form.kapasitas_maksimum);
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!form.nama_posko.trim()) return setError("Nama posko wajib diisi.");
    if (!Number.isInteger(kapasitas) || kapasitas < 1) return setError("Kapasitas harus bilangan bulat ≥ 1.");
    if (form.lat === "" || form.lng === "" || Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return setError("Koordinat tidak valid.");
    }
    setSaving(true);
    try {
      await updatePosko(posko.posko_id, { nama_posko: form.nama_posko.trim(), kapasitas_maksimum: kapasitas, lokasi: { lat, lng } });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.details?.map((d) => d.message).join(" ") || err.message : "Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  const kapasitasBaru = Number(form.kapasitas_maksimum);
  const lebihKecil = Number.isInteger(kapasitasBaru) && kapasitasBaru < posko.jumlah_korban_saat_ini;

  return (
    <li className={`grid grid-cols-2 gap-3 px-4 py-4 lg:items-start lg:gap-4 lg:px-5 ${ROW_GRID}`}>
      <label className="col-span-2 block lg:col-span-1">
        <span className="mb-1 block text-xs text-muted lg:hidden">Nama posko</span>
        <input type="text" value={form.nama_posko} onChange={set("nama_posko")} maxLength={60} aria-label={`Nama ${posko.posko_id}`} className={INPUT} />
        <span className="mt-1 block font-mono text-[11px] text-muted">{posko.posko_id}</span>
      </label>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink lg:pt-2">
        <span className={`h-2.5 w-2.5 rounded-full ${JENIS_DOT[posko.jenis]}`} />
        {JENIS_LABEL[posko.jenis]}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-muted lg:hidden">Latitude</span>
        <input type="number" step="any" value={form.lat} onChange={set("lat")} aria-label={`Latitude ${posko.posko_id}`} className={`${INPUT} tabular-nums`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted lg:hidden">Longitude</span>
        <input type="number" step="any" value={form.lng} onChange={set("lng")} aria-label={`Longitude ${posko.posko_id}`} className={`${INPUT} tabular-nums`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted lg:hidden">Kapasitas</span>
        <input
          type="number"
          min={1}
          step={1}
          value={form.kapasitas_maksimum}
          onChange={set("kapasitas_maksimum")}
          aria-label={`Kapasitas ${posko.posko_id}`}
          className={`${INPUT} tabular-nums`}
        />
        <span className={`mt-1 block text-[11px] tabular-nums ${lebihKecil ? "text-triase-merah" : "text-muted"}`}>
          terisi {posko.jumlah_korban_saat_ini}
        </span>
      </label>
      <div className="col-span-2 flex flex-col items-start gap-1 lg:col-span-1 lg:items-end">
        <button type="button" onClick={handleSave} disabled={!dirty || saving} className={BTN_ROW}>
          {saved && !dirty ? <Check size={14} /> : null}
          {saving ? "Menyimpan..." : saved && !dirty ? "Tersimpan" : "Simpan"}
        </button>
        {error && <span role="alert" className="text-xs text-triase-merah">{error}</span>}
      </div>
    </li>
  );
}

// Tab Posko: nama, koordinat (marker peta), kapasitas (alert & dropdown tujuan).
export default function PoskoSettings({ posko, onSaved }) {
  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="p-4 md:px-5 md:pt-5">
        <h2 className="font-semibold text-ink">Posko</h2>
        <p className="text-sm text-muted">
          Nama dan koordinat digunakan pada peta dan pilihan posko tujuan; kapasitas digunakan untuk alert kapasitas. Jenis posko tidak dapat diubah.
        </p>
      </div>
      <ul className="divide-y divide-black/5">
        <li aria-hidden="true" className={`hidden gap-4 px-5 py-2.5 text-xs font-medium text-muted lg:grid ${ROW_GRID}`}>
          <span>Nama posko</span>
          <span>Jenis</span>
          <span>Latitude</span>
          <span>Longitude</span>
          <span>Kapasitas</span>
          <span className="text-right">Aksi</span>
        </li>
        {posko.map((p) => (
          <PoskoRow key={p.posko_id} posko={p} onSaved={onSaved} />
        ))}
      </ul>
    </div>
  );
}
