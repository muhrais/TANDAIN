import { useEffect } from "react";
import { X } from "lucide-react";

// Dialog sederhana: overlay gelap, panel putih di tengah (layar penuh di HP),
// tutup lewat tombol X, klik overlay, atau Escape.
export default function Modal({ title, onClose, children, footer, size = "md" }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const width = size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[100dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl ${width}`}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-black/5 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// Gaya tombol bersama (lihat aturan UI: lebar tetap w-[10.5rem], teks rata kiri).
export const BTN_PRIMARY =
  "relative flex w-[10.5rem] items-center justify-start gap-1.5 whitespace-nowrap rounded-md bg-brand px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60";
export const BTN_SECONDARY =
  "relative flex w-[10.5rem] items-center justify-start gap-1.5 whitespace-nowrap rounded-md border border-black/10 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-page disabled:opacity-60";
export const BTN_ROW =
  "relative flex w-[10.5rem] items-center justify-start gap-1.5 whitespace-nowrap rounded-md border border-brand/30 bg-white px-3 py-1.5 text-[13px] font-semibold text-brand transition-colors hover:border-brand hover:bg-brand/5 disabled:opacity-60";

export const INPUT =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:bg-page";
export const LABEL = "mb-1 block text-xs font-semibold text-muted";
