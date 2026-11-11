import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RequireRole from "./components/auth/RequireRole";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ScanNfcPage from "./pages/ScanNfcPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import MapsPage from "./pages/MapsPage";
import EvakuasiPage from "./pages/EvakuasiPage";
import PerangkatPage from "./pages/PerangkatPage";
import DataPasienPage from "./pages/DataPasienPage";
import PengaturanPage from "./pages/PengaturanPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route element={<RequireRole roles={["koordinator"]} />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/maps" element={<MapsPage />} />
            <Route path="/perangkat" element={<PerangkatPage />} />
            <Route path="/pengaturan" element={<PengaturanPage />} />
          </Route>
          <Route path="/scan" element={<ScanNfcPage />} />
          <Route path="/evakuasi" element={<EvakuasiPage />} />
          <Route path="/pasien" element={<DataPasienPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
