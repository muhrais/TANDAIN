export default function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active ? "bg-sidebar text-white" : "bg-page text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
