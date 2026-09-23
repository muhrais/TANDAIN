import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <Outlet />
    </div>
  );
}
