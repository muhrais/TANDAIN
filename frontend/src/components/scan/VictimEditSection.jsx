import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateVictim } from "../../services/victimService";
import { ApiClientError } from "../../lib/apiClient";

const TRIASE_OPTIONS = [
  { value: "merah", label: "Merah" },
  { value: "kuning", label: "Kuning" },
  { value: "hijau", label: "Hijau" },
];

// Makin besar = makin ringan. Dipakai untuk minta konfirmasi saat triase diturunkan.
const TRIASE_RANK = { merah: 0, kuning: 1, hijau: 2 };

// Tailwind butuh nama class literal (sama dengan VictimRegistrationForm).
const TRIASE_SELECTED_CLASS = {
  merah: "border-triase-merah bg-triase-merah-soft text-triase-merah",
  kuning: "border-triase-kuning bg-triase-kuning-soft text-triase-kuning-dark",
  hijau: "border-triase-hijau bg-triase-hijau-soft text-triase-hijau",
};

function errorText(err) {
  return err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.";
}

// Ubah triase dan kondisi klinis korban dari hasil scan. Firmware gelang
// membaca kategori_triase dari respons heartbeat (data.assignment), jadi
// warna LED ikut berubah pada heartbeat berikutnya tanpa perintah terpisah.
export default function VictimEditSection({ victim, onUpdated }) {
  const [saving, setSaving] = useState(null); // "triase" | "kondisi" | null
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingKondisi, setEditingKondisi] = useState(false);
  const [kondisi, setKondisi] = useState(victim.kondisi_klinis ?? "");

  async function save(field, payload, successText) {
    setError("");
    setNotice("");
    setSaving(field);
    try {
      const updated = await updateVictim(victim.victim_id, payload);
      onUpdated(updated);
      setNotice(successText);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setSaving(null);
    }
  }

  function handleTriase(next) {
    const current = victim.kategori_triase;
    if (next === current || saving) return;
    if (
      TRIASE_RANK[next] > TRIASE_RANK[current] &&
      !window.confirm(`Turunkan triase ${victim.tag_id} dari ${current} ke ${next}?`)
    ) {
      return;
    }
    save(
      "triase",
      { kategori_triase: next },
      `Triase diubah ke ${next}. LED gelang ${victim.tag_id} ikut berganti pada heartbeat berikutnya (±3 detik) bila gelang online.`
    );
  }

  async function handleSaveKondisi() {
    const ok = await save("kondisi", { kondisi_klinis: kondisi.trim() }, "Kondisi klinis disimpan.");
    if (ok) setEditingKondisi(false);
  }

  function cancelKondisi() {
    setKondisi(victim.kondisi_klinis ?? "");
    setEditingKondisi(false);
  }

  return (
    <div className="space-y-4 border-t border-black/5 pt-4">
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-ink">Ubah Triase</span>
        <div className="flex gap-2" role="group" aria-label="Ubah kategori triase">
          {TRIASE_OPTIONS.map((opt) => {
            const active = victim.kategori_triase === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => handleTriase(opt.value)}
                disabled={saving !== null}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  active ? TRIASE_SELECTED_CLASS[opt.value] : "border-neutral-200 text-muted hover:border-neutral-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Kondisi Klinis</span>
          {!editingKondisi && (
            <button
              type="button"
              onClick={() => setEditingKondisi(true)}
              className="flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              <Pencil size={14} />
              Ubah
            </button>
          )}
        </div>
        {editingKondisi ? (
          <div className="space-y-2">
            <textarea
              value={kondisi}
              onChange={(event) => setKondisi(event.target.value)}
              rows={3}
              autoFocus
              aria-label="Kondisi klinis"
              className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelKondisi}
                disabled={saving !== null}
                className="w-[10.5rem] rounded-md border text-left border-black/10 px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-page disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveKondisi}
                disabled={saving !== null}
                className="w-[10.5rem] rounded-md bg-brand text-left px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving === "kondisi" ? "Menyimpan..." : "Simpan kondisi"}
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap rounded-lg bg-page px-3.5 py-2.5 text-sm text-ink/80">
            {victim.kondisi_klinis || <span className="text-muted">Belum diisi.</span>}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-triase-hijau-soft px-3 py-2 text-sm text-triase-hijau">
          {notice}
        </p>
      )}
    </div>
  );
}
