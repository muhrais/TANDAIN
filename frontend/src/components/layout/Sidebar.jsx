import {
  LayoutDashboard,
  Map,
  ScanLine,
  ArrowLeftRight,
  Stethoscope,
  ClipboardList,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Maps", icon: Map },
  { label: "Scan NFC", icon: ScanLine },
  { label: "Evakuasi", icon: ArrowLeftRight },
  { label: "Medis", icon: Stethoscope },
  { label: "Data Pasien", icon: ClipboardList },
  { label: "Pengaturan", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
          <span className="text-sm font-bold text-brand">+</span>
        </div>
        <div className="leading-tight">
          <div className="text-lg font-extrabold tracking-wide text-brand">TANDAIN</div>
          <div className="text-[9px] tracking-[0.15em] text-muted">
            TRIAGE DARURAT INDIVIDU
          </div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            className={`flex w-full items-center gap-3 rounded-md border-l-4 px-3 py-2.5 text-sm transition-colors ${
              active
                ? "border-brand bg-white/5 font-semibold text-white"
                : "border-transparent text-white/70 hover:bg-sidebar-hover hover:text-white"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-xs text-white/60">
          <span className="h-2 w-2 rounded-full bg-triase-hijau" />
          Server Online
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold">
            BP
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium">Budi Prasetyo</div>
            <div className="text-[11px] text-white/50">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
