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
          </Route>
          <Route path="/scan" element={<ScanNfcPage />} />
          <Route path="/evakuasi" element={<EvakuasiPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
