import { NavLink, useNavigate } from "react-router-dom";
import {
  House,
  Map,
  Nfc,
  ArrowLeftRight,
  CirclePlus,
  Database,
  Settings,
  LogOut,
} from "lucide-react";
import { getCurrentUser, logout } from "../../services/authService";

const NAV_ITEMS = [
  { label: "Dashboard", icon: House, path: "/" },
  { label: "Maps", icon: Map },
  { label: "Scan NFC", icon: Nfc, path: "/scan" },
  { label: "Evakuasi", icon: ArrowLeftRight },
  { label: "Medis", icon: CirclePlus },
  { label: "Data Pasien", icon: Database },
  { label: "Pengaturan", icon: Settings },
];

const ROLE_LABELS = {
  koordinator: "Koordinator",
  petugas_pos_medis: "Petugas Pos Medis",
  tenaga_medis_lapangan: "Tenaga Medis Lapangan",
};

const ACTIVE_STRIPE = {
  backgroundImage:
    "linear-gradient(to right, var(--color-brand) 0 2px, var(--color-logo-yellow) 2px 6px, var(--color-logo-green) 6px 10px)",
};

function getInitials(nama) {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function NavItem({ label, icon: Icon, path }) {
  const content = (active) => (
    <>
      {active && (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5" style={ACTIVE_STRIPE} />
      )}
      <Icon
        size={20}
        strokeWidth={1.75}
        className={active ? "text-white" : "text-neutral-300 group-hover:text-white"}
      />
      {label}
    </>
  );

  const className = (active) =>
    `group relative flex h-10 items-center gap-2.5 pl-5 text-left text-[15px] font-semibold transition-colors ${
      active ? "rounded-r-full bg-brand text-white" : "text-neutral-400 hover:text-white"
    }`;

  if (!path) {
    return (
      <button type="button" disabled className={`${className(false)} cursor-not-allowed opacity-50`}>
        {content(false)}
      </button>
    );
  }

  return (
    <NavLink to={path} end={path === "/"} className={({ isActive }) => className(isActive)}>
      {({ isActive }) => content(isActive)}
    </NavLink>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[204px] shrink-0 flex-col bg-sidebar">
      <div className="px-5 pb-5 pt-7">
        <img
          src="/logo-tandain.png"
          alt="TANDAIN - Triage Darurat Individu"
          className="block w-[156px]"
        />
      </div>

      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-2 pr-6">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>

      <div className="border-t border-neutral-700 px-5 py-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-neutral-300">
          <span className="h-2 w-2 rounded-full bg-logo-green" />
          Server Online
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-600 text-sm font-medium text-white">
              {user ? getInitials(user.nama) : "?"}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-white">{user?.nama ?? "Tidak dikenal"}</div>
              <div className="text-[10px] text-neutral-400">
                {user ? (ROLE_LABELS[user.role] ?? user.role) : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Keluar"
            className="text-neutral-400 hover:text-white"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}
