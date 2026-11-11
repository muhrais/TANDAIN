import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateVictim } from "../../services/victimService";
import { ApiClientError } from "../../lib/apiClient";
import { JK_LABEL } from "../../lib/triase";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "../common/Modal";

// Ubah nama, usia, jenis kelamin. Backend mencatatnya sebagai satu entri
// riwayat jenis "data" beserta nama pengubah (victimController.updateVictim).
export default function VictimIdentityForm({ victim, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit() {
    setForm({
      nama: victim.nama ?? "",
      usia: victim.usia ?? "",
      jenis_kelamin: victim.jenis_kelamin ?? "tidak_diketahui",
    });
    setError("");
    setEditing(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateVictim(victim.victim_id, {
        nama: form.nama,
        usia: form.usia === "" ? null : Number(form.usia),
        jenis_kelamin: form.jenis_kelamin,
      });
      setEditing(false);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Identitas</span>
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark"
          >
            <Pencil size={14} />
            Ubah
          </button>
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-page px-3.5 py-2.5 text-sm">
          <div className="col-span-3 sm:col-span-1">
            <dt className="text-xs text-muted">Nama</dt>
            <dd className="font-semibold text-ink">{victim.nama || "(tanpa nama)"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Usia</dt>
            <dd className="font-semibold text-ink">{victim.usia ?? "-"}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-muted">Jenis kelamin</dt>
            <dd className="font-semibold text-ink">{JK_LABEL[victim.jenis_kelamin] ?? "-"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <span className="block text-sm font-semibold text-ink">Ubah Identitas</span>
      <label className="block">
        <span className={LABEL}>Nama</span>
        <input type="text" value={form.nama} onChange={set("nama")} autoFocus className={INPUT} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL}>Usia</span>
          <input type="number" min={0} max={150} value={form.usia} onChange={set("usia")} className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Jenis kelamin</span>
          <select value={form.jenis_kelamin} onChange={set("jenis_kelamin")} className={INPUT}>
            <option value="tidak_diketahui">Tidak diketahui</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(false)} disabled={saving} className={BTN_SECONDARY}>
          Batal
        </button>
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? "Menyimpan..." : "Simpan identitas"}
        </button>
      </div>
    </form>
  );
}
