import Sidebar from "./components/layout/Sidebar";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <DashboardPage />
    </div>
  );
}
