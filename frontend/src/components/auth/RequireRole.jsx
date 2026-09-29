import { Navigate, Outlet } from "react-router-dom";
import { getRole } from "../../services/authService";

// Dipasang di dalam <ProtectedRoute> (lihat App.jsx), jadi saat ini jalan
// user sudah pasti terautentikasi - getRole() tidak akan null.
export default function RequireRole({ roles }) {
  return roles.includes(getRole()) ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
