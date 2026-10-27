import { useLayoutEffect, useRef, useState } from "react";

// Filter kategori/status: segmented control netral (gaya tab), supaya tidak
// tertukar dengan LevelFilter yang berwarna. Sorotan putih berupa satu elemen
// yang digeser ke tombol aktif, bukan latar per tombol, supaya ada animasi.
export default function SegmentedFilter({ label, options, value, onChange }) {
  const trackRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const [indicator, setIndicator] = useState(null);
  // Transisi baru aktif setelah user memilih, supaya posisi awal (dan
  // pengukuran ulang saat font dimuat) tidak ikut beranimasi.
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    function measure() {
      const button = buttonRefs.current.get(value);
      if (!button) {
        setIndicator(null);
        return;
      }
      setIndicator({
        left: button.offsetLeft,
        top: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
      });
    }

    measure();
    // Ukur ulang saat ukuran bar atau tombol berubah (resize, font selesai dimuat).
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    buttonRefs.current.forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [value, options]);

  function select(key) {
    setAnimate(true);
    onChange(key);
    // Di HP bar bisa digeser; pastikan pilihan baru terlihat penuh.
    buttonRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  return (
    // Satu baris; kalau tidak muat (mis. di HP) bar digeser horizontal, bukan
    // turun baris, supaya tetap terbaca sebagai satu kontrol.
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      {label && <span className="shrink-0 text-xs font-medium text-muted sm:w-14 sm:pt-2">{label}</span>}
      <div
        ref={trackRef}
        // Scrollbar disembunyikan (di Windows tampil tebal di bawah bar);
        // tetap bisa digeser dengan sentuh/trackpad, dan pilihan aktif di-scroll otomatis.
        className="relative flex min-w-0 max-w-full gap-0.5 self-start overflow-x-auto rounded-lg bg-page p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label={`Filter ${label ?? ""}`.trim()}
      >
        {indicator && (
          <span
            aria-hidden="true"
            className={`absolute rounded-md bg-white shadow-sm ${
              animate ? "transition-[left,width] duration-300 ease-out motion-reduce:transition-none" : ""
            }`}
            style={indicator}
          />
        )}
        {options.map((option) => {
          const active = value === option.key;
          return (
            <button
              key={option.key}
              ref={(node) => {
                if (node) buttonRefs.current.set(option.key, node);
                else buttonRefs.current.delete(option.key);
              }}
              type="button"
              aria-pressed={active}
              onClick={() => select(option.key)}
              className={`relative shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-[13px] font-semibold transition-colors duration-300 ${
                active ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
