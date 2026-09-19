import { ChevronRight } from "lucide-react";

export default function RegistrationSummaryRow({ value, label }) {
  return (
    <button
      type="button"
      className="flex h-full w-full items-center justify-between rounded-2xl bg-white px-5 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="flex items-baseline gap-3">
        <span className="text-2xl font-extrabold text-ink">{value}</span>
        <span className="text-sm font-medium text-ink/80">{label}</span>
      </span>
      <ChevronRight size={18} className="text-muted" />
    </button>
  );
}
