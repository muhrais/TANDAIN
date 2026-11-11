import { BTN_PRIMARY } from "../common/Modal";

// Baris bawah form Pengaturan: pesan sukses/galat atau info terakhir diubah, lalu tombol simpan.
export default function SaveBar({ saving, notice, error, label, meta }) {
  return (
    <div className="flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        {error ? (
          <span role="alert" className="text-triase-merah">
            {error}
          </span>
        ) : notice ? (
          <span role="status" className="text-triase-hijau">
            {notice}
          </span>
        ) : (
          <span className="text-muted">{meta}</span>
        )}
      </div>
      <button type="submit" disabled={saving} className={BTN_PRIMARY}>
        {saving ? "Menyimpan..." : label}
      </button>
    </div>
  );
}
