import {
  House,
  Map,
  Nfc,
  ArrowLeftRight,
  CirclePlus,
  Database,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: House, active: true },
  { label: "Maps", icon: Map },
  { label: "Scan NFC", icon: Nfc },
  { label: "Evakuasi", icon: ArrowLeftRight },
  { label: "Medis", icon: CirclePlus },
  { label: "Data Pasien", icon: Database },
  { label: "Pengaturan", icon: Settings },
];

const ACTIVE_STRIPE = {
  backgroundImage:
    "linear-gradient(to right, var(--color-brand) 0 2px, var(--color-logo-yellow) 2px 6px, var(--color-logo-green) 6px 10px)",
};

export default function Sidebar() {
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
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            aria-current={active ? "page" : undefined}
            className={`group relative flex h-10 items-center gap-2.5 pl-5 text-left text-[15px] font-semibold transition-colors ${
              active
                ? "rounded-r-full bg-brand text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {active && (
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2.5" style={ACTIVE_STRIPE} />
            )}
            <Icon
              size={20}
              strokeWidth={1.75}
              className={active ? "text-white" : "text-neutral-300 group-hover:text-white"}
            />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-neutral-700 px-5 py-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-neutral-300">
          <span className="h-2 w-2 rounded-full bg-logo-green" />
          Server Online
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-600 text-sm font-medium text-white">
            BP
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-white">Budi Prasetyo</div>
            <div className="text-[10px] text-neutral-400">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
