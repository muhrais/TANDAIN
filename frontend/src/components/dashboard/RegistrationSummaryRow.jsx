import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Tanpa `to`, baris tampil sebagai ringkasan biasa (tanpa chevron) supaya
// tidak ada tombol yang tidak melakukan apa-apa.
export default function RegistrationSummaryRow({ value, label, to }) {
  const content = (
    <span className="flex items-baseline gap-3">
      <span className="text-2xl font-extrabold text-ink">{value}</span>
      <span className="text-sm font-medium text-ink/80">{label}</span>
    </span>
  );
  const className = "flex h-full w-full items-center justify-between rounded-2xl bg-white px-5 py-3 text-left shadow-sm";

  if (!to) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link to={to} className={`${className} transition-shadow hover:shadow-md`}>
      {content}
      <ChevronRight size={18} className="text-muted" />
    </Link>
  );
}
