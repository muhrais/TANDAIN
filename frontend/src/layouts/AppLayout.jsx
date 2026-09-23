import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    </div>
  );
}
