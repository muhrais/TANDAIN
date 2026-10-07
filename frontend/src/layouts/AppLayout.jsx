import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import DebugMetricsPanel from "../components/debug/DebugMetricsPanel";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function handleAuthExpired() {
      navigate("/login?expired=1", { replace: true });
    }
    function handleForbidden() {
      navigate("/forbidden", { replace: true });
    }
    window.addEventListener("auth:expired", handleAuthExpired);
    window.addEventListener("role:forbidden", handleForbidden);
    return () => {
      window.removeEventListener("auth:expired", handleAuthExpired);
      window.removeEventListener("role:forbidden", handleForbidden);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-page md:flex-row">
      <header className="flex items-center justify-between bg-sidebar px-4 py-3 md:hidden">
        <img src="/logo-tandain.png" alt="TANDAIN" className="h-8" />
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka menu"
          className="text-white"
        >
          <Menu size={24} />
        </button>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Outlet />

      <DebugMetricsPanel />
    </div>
  );
}
