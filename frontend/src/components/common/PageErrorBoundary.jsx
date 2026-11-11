import { Component } from "react";

// Menangkap error render di satu halaman supaya aplikasi tidak jadi layar
// putih kosong: sidebar tetap ada, pesan error terlihat, dan bisa muat ulang.
// Dipasang di AppLayout dengan key = path, jadi pindah halaman me-reset error.
export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[PageErrorBoundary]", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-w-0 flex-1 p-4 md:p-8">
        <div role="alert" className="max-w-2xl space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h1 className="text-lg font-bold text-ink">Halaman gagal ditampilkan</h1>
          <p className="text-sm text-muted">
            Coba muat ulang halaman. Kalau masih muncul, kirim pesan error di bawah ke tim software.
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-page px-3 py-2 text-xs text-triase-merah">
            {String(error?.message ?? error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="relative flex w-[10.5rem] items-center justify-start rounded-md bg-brand px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Muat ulang halaman
          </button>
        </div>
      </div>
    );
  }
}
