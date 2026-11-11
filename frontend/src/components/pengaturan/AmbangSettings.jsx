import { useState } from "react";
import { updateIncident } from "../../services/incidentService";
import { ApiClientError } from "../../lib/apiClient";
import { ALERT_TYPES, DEFAULT_AMBANG, resolveAmbang } from "../../lib/alert";
import { INPUT } from "../common/Modal";
import SaveBar from "./SaveBar";
import { lastUpdatedText } from "../../lib/datetime";

// Rentang sama dengan AMBANG_RANGE di backend (incidentController).
const FIELDS = [
  {
    key: "merah_menunggu_mnt",
    alert: "merah_menunggu",
    unit: "menit",
    min: 1,
    max: 120,
    help: "Korban merah yang belum dijemput (terdaftar, ditriase, atau menunggu jemputan) lebih lama dari ini menjadi alert kritis.",
  },
  {
    key: "gps_diam_mnt",
    alert: "sinyal_gps",
    unit: "menit",
    min: 1,
    max: 60,
    help: "Gelang yang tidak mengirim lokasi selama ini dianggap kehilangan sinyal GPS.",
  },
  {
    key: "baterai_rendah_pct",
    alert: "baterai_rendah",
    unit: "%",
    min: 1,
    max: 99,
    help: "Baterai gelang di bawah persentase ini memunculkan peringatan. Hanya untuk gelang yang melaporkan baterai.",
  },
  {
    key: "kapasitas_peringatan_pct",
    alert: "kapasitas_posko",
    unit: "%",
    min: 10,
    max: 100,
    help: "Posko yang terisi sebanyak ini memunculkan peringatan; posko penuh (100%) selalu kritis.",
  },
];

// Tab Ambang Alert: nilai dibaca lib/alert.js lewat summary.incident.ambang.
export default function AmbangSettings({ incident, onSaved }) {
  const [form, setForm] = useState(() => {
    const ambang = resolveAmbang(incident.ambang);
    return Object.fromEntries(FIELDS.map((f) => [f.key, String(ambang[f.key])]));
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const ambang = {};
    for (const field of FIELDS) {
      const value = Number(form[field.key]);
      if (!Number.isInteger(value) || value < field.min || value > field.max) {
        setError(`${ALERT_TYPES[field.alert].label}: isi bilangan bulat ${field.min}–${field.max}.`);
        return;
      }
      ambang[field.key] = value;
    }
    setSaving(true);
    try {
      const saved = await updateIncident({ ambang });
      onSaved(saved);
      setNotice("Ambang alert disimpan. Tab Alert di dashboard memakai nilai baru pada siklus polling berikutnya.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.details?.map((d) => d.message).join(" ") || err.message : "Gagal terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  function resetDefault() {
    setNotice("");
    setForm(Object.fromEntries(FIELDS.map((f) => [f.key, String(DEFAULT_AMBANG[f.key])])));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Ambang Alert</h2>
          <p className="text-sm text-muted">Batas nilai yang memicu alert pada tab Alert di dashboard.</p>
        </div>
        <button type="button" onClick={resetDefault} className="text-sm font-semibold text-brand hover:text-brand-dark">
          Kembalikan ke default
        </button>
      </div>
      <ul className="divide-y divide-black/5">
        {FIELDS.map((field) => {
          const type = ALERT_TYPES[field.alert];
          const Icon = type.icon;
          return (
            <li key={field.key} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
              <div className="flex gap-3">
                <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <div className="text-sm font-semibold text-ink">{type.label}</div>
                  <p className="text-xs text-muted">{field.help}</p>
                  <p className="mt-0.5 text-xs text-muted">Default {DEFAULT_AMBANG[field.key]} {field.unit} · rentang {field.min}–{field.max}</p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={1}
                  value={form[field.key]}
                  onChange={(event) => {
                    setNotice("");
                    setForm((f) => ({ ...f, [field.key]: event.target.value }));
                  }}
                  aria-label={`${type.label} (${field.unit})`}
                  className={`${INPUT} text-right tabular-nums`}
                />
                <span className="w-12 shrink-0 text-sm text-muted">{field.unit}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <SaveBar saving={saving} notice={notice} error={error} label="Simpan ambang" meta={lastUpdatedText(incident)} />
    </form>
  );
}
