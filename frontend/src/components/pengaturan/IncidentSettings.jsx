import { useState } from "react";
import { updateIncident } from "../../services/incidentService";
import { ApiClientError } from "../../lib/apiClient";
import { toLocalInput, fromLocalInput, lastUpdatedText } from "../../lib/datetime";
import { INPUT, LABEL } from "../common/Modal";
import SaveBar from "./SaveBar";

function errorText(err) {
  if (err instanceof ApiClientError) return err.details?.map((d) => d.message).join(" ") || err.message;
  return "Gagal terhubung ke server.";
}

// Tab Insiden: identitas insiden yang tampil di Topbar dashboard (FR-DASH-05).
export default function IncidentSettings({ incident, onSaved }) {
  const [form, setForm] = useState(() => ({
    nama_insiden: incident.nama_insiden ?? "",
    lokasi: incident.lokasi ?? "",
    waktu_mulai: toLocalInput(incident.waktu_mulai),
    jumlah_relawan: String(incident.jumlah_relawan ?? 0),
    jumlah_nakes: String(incident.jumlah_nakes ?? 0),
  }));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const set = (field) => (event) => {
    setNotice("");
    setForm((f) => ({ ...f, [field]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const relawan = Number(form.jumlah_relawan);
    const nakes = Number(form.jumlah_nakes);
    if (!Number.isInteger(relawan) || relawan < 0 || !Number.isInteger(nakes) || nakes < 0) {
      setError("Jumlah relawan dan nakes harus bilangan bulat 0 atau lebih.");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateIncident({
        nama_insiden: form.nama_insiden,
        lokasi: form.lokasi,
        waktu_mulai: fromLocalInput(form.waktu_mulai),
        jumlah_relawan: relawan,
        jumlah_nakes: nakes,
      });
      onSaved(saved);
      setNotice("Identitas insiden disimpan. Dashboard ikut berubah pada siklus polling berikutnya.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-4 shadow-sm md:p-6">
      <div>
        <h2 className="font-semibold text-ink">Identitas Insiden</h2>
        <p className="text-sm text-muted">Nama insiden, lokasi, serta jumlah relawan dan tenaga kesehatan yang ditampilkan di bagian atas dashboard.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Nama insiden</span>
          <input type="text" value={form.nama_insiden} onChange={set("nama_insiden")} maxLength={120} placeholder="mis. Simulasi MCI FT UI" className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Lokasi</span>
          <input type="text" value={form.lokasi} onChange={set("lokasi")} maxLength={120} placeholder="mis. Depok" className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Waktu mulai</span>
          <input type="datetime-local" value={form.waktu_mulai} onChange={set("waktu_mulai")} className={INPUT} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={LABEL}>Jumlah relawan</span>
            <input type="number" min={0} step={1} value={form.jumlah_relawan} onChange={set("jumlah_relawan")} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>Jumlah nakes</span>
            <input type="number" min={0} step={1} value={form.jumlah_nakes} onChange={set("jumlah_nakes")} className={INPUT} />
          </label>
        </div>
      </div>
      <SaveBar saving={saving} notice={notice} error={error} label="Simpan insiden" meta={lastUpdatedText(incident)} />
    </form>
  );
}
