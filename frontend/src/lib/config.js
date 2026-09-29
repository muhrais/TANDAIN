// Interval polling dashboard (ms). Bisa di-override lewat env (mis. saat
// demo di jaringan lemah) tanpa perlu ubah kode — lihat frontend/.env.example.
export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 5000;
