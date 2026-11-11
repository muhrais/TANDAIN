const COLOR_CLASSES = {
  merah: "text-triase-merah",
  kuning: "text-triase-kuning",
  hijau: "text-triase-hijau",
};

// Satu label saja (nama tahap evakuasi); tidak ada caption pengulang.
export default function StatCard({ label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-4 text-center shadow-sm">
      <div className={`text-xs font-semibold ${COLOR_CLASSES[color]}`}>{label}</div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  );
}
