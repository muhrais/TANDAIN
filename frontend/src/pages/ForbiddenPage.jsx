import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { getRole } from "../services/authService";

// Dituju oleh RequireRole (guard client-side) dan event `role:forbidden`
// (dispatch dari apiClient.js saat backend balas 403 FORBIDDEN_ROLE).
export default function ForbiddenPage() {
  const role = getRole();
  const homePath = role === "koordinator" ? "/" : "/scan";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <ShieldAlert size={40} className="text-triase-merah" />
      <h1 className="text-xl font-bold text-ink">Tidak punya akses</h1>
      <p className="max-w-sm text-sm text-muted">
        Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi koordinator kalau menurut Anda ini keliru.
      </p>
      <Link to={homePath} className="mt-2 text-sm font-semibold text-brand hover:text-brand-dark">
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
