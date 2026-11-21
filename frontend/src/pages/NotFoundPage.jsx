import { Link } from "react-router-dom";
import { getRole } from "../services/authService";

// Path yang tidak dikenal: tampil di dalam layout (sidebar tetap ada),
// bukan layar kosong.
export default function NotFoundPage() {
  const home = getRole() === "koordinator" ? "/" : "/scan";
  return (
    <div className="min-w-0 flex-1 p-4 md:p-8">
      <div className="max-w-xl space-y-2 rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-lg font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="text-sm text-muted">
          Halaman yang dituju tidak tersedia. Apabila aplikasi baru saja diperbarui, refresh halaman dengan Ctrl+Shift+R.
        </p>
        <Link to={home} className="inline-block text-sm font-semibold text-ink hover:underline">
          Kembali ke halaman utama
        </Link>
      </div>
    </div>
  );
}
