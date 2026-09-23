import { useState } from "react";
import { createVictim } from "../../services/victimService";
import { ApiClientError } from "../../lib/apiClient";

const TRIASE_OPTIONS = [
  { value: "merah", label: "Merah" },
  { value: "kuning", label: "Kuning" },
  { value: "hijau", label: "Hijau" },
];

const GENDER_OPTIONS = [
  { value: "tidak_diketahui", label: "Tidak diketahui" },
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
];

// Tailwind butuh nama class literal buat di-scan, jadi ga bisa disusun via template string.
const TRIASE_SELECTED_CLASS = {
  merah: "border-triase-merah bg-triase-merah-soft text-triase-merah",
  kuning: "border-triase-kuning bg-triase-kuning-soft text-triase-kuning-dark",
  hijau: "border-triase-hijau bg-triase-hijau-soft text-triase-hijau",
};

export default function VictimRegistrationForm({ tagId, onRegistered }) {
  const [nama, setNama] = useState("");
  const [usia, setUsia] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("tidak_diketahui");
  const [kategoriTriase, setKategoriTriase] = useState("");
  const [kondisiKlinis, setKondisiKlinis] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!kategoriTriase) {
      setError("Kategori triase wajib dipilih.");
      return;
    }

    setLoading(true);
    try {
      const victim = await createVictim({
        tag_id: tagId,
        nama: nama.trim(),
        usia: usia ? Number(usia) : undefined,
        jenis_kelamin: jenisKelamin,
        kategori_triase: kategoriTriase,
        kondisi_klinis: kondisiKlinis.trim(),
      });
      onRegistered(victim);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm" noValidate>
      <div>
        <h2 className="text-base font-bold text-ink">Registrasi Korban Baru</h2>
        <p className="mt-0.5 text-sm text-muted">
          Tag <span className="font-semibold text-ink">{tagId}</span> belum terdaftar. Isi data korban di bawah.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label htmlFor="nama" className="mb-1.5 block text-sm font-semibold text-ink">
            Nama
          </label>
          <input
            id="nama"
            type="text"
            value={nama}
            onChange={(event) => setNama(event.target.value)}
            placeholder="Opsional jika belum diketahui"
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label htmlFor="usia" className="mb-1.5 block text-sm font-semibold text-ink">
            Usia
          </label>
          <input
            id="usia"
            type="number"
            min="0"
            value={usia}
            onChange={(event) => setUsia(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label htmlFor="jenis_kelamin" className="mb-1.5 block text-sm font-semibold text-ink">
            Jenis Kelamin
          </label>
          <select
            id="jenis_kelamin"
            value={jenisKelamin}
            onChange={(event) => setJenisKelamin(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Kategori Triase</span>
          <div className="flex gap-2">
            {TRIASE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKategoriTriase(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  kategoriTriase === opt.value
                    ? TRIASE_SELECTED_CLASS[opt.value]
                    : "border-neutral-200 text-muted hover:border-neutral-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <label htmlFor="kondisi_klinis" className="mb-1.5 block text-sm font-semibold text-ink">
            Kondisi Klinis
          </label>
          <textarea
            id="kondisi_klinis"
            value={kondisiKlinis}
            onChange={(event) => setKondisiKlinis(event.target.value)}
            rows={3}
            placeholder="Opsional"
            className="w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-triase-merah-soft px-3 py-2 text-sm text-triase-merah">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : "Daftarkan Korban"}
      </button>
    </form>
  );
}
