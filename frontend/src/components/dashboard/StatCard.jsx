// Satu label saja (nama tahap evakuasi). Netral: warna merah/kuning/hijau
// dicadangkan untuk kategori triase, bukan tahap evakuasi.
export default function StatCard({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-2 py-4 text-center shadow-sm">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1 text-3xl font-extrabold tabular-nums text-ink">{value}</div>
    </div>
  );
}
