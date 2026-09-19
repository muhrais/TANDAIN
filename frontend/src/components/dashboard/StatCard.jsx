const COLOR_CLASSES = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning",
  hijau: "text-triase-hijau",
};

export default function StatCard({ label, value, caption, color }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <div className={`text-xs font-semibold ${COLOR_CLASSES[color]}`}>{label}</div>
      <div className="my-1 text-3xl font-extrabold text-ink">{value}</div>
      <div className="text-[11px] text-muted">{caption}</div>
    </div>
  );
}
