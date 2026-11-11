import { RefreshCw } from "lucide-react";

// Tombol refresh manual yang sama di semua halaman: hanya ikon, ber-border
// supaya terlihat sebagai tombol. Data tetap diperbarui otomatis; tombol ini
// untuk memaksa muat ulang, dan menjadi merah bila koneksi terputus.
export default function RefreshButton({ onClick, error = false }) {
  const label = error ? "Terputus, coba muat ulang" : "Refresh";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white transition-colors ${
        error
          ? "border-triase-merah/40 text-triase-merah hover:bg-triase-merah-soft"
          : "border-black/10 text-muted hover:bg-page hover:text-ink"
      }`}
    >
      <RefreshCw size={15} aria-hidden="true" />
    </button>
  );
}
