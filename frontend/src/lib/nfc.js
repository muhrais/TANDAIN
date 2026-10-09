// Web NFC API: cuma jalan di Chrome Android + secure context (HTTPS/localhost).
// Browser lain (Safari iOS, desktop) ga punya window.NDEFReader sama sekali.
export const NFC_SUPPORTED = typeof window !== "undefined" && "NDEFReader" in window;

// Pesan error Web NFC yang bisa langsung ditampilkan ke petugas.
export function nfcErrorMessage(err) {
  if (err?.name === "NotAllowedError") return "Izin akses NFC ditolak. Aktifkan lewat pengaturan browser.";
  if (err?.name === "NotSupportedError") return "NFC tidak aktif di perangkat ini. Cek pengaturan NFC HP.";
  if (err?.name === "AbortError") return "Pembacaan NFC dibatalkan.";
  return "Gagal membaca tag NFC: " + (err?.message ?? "error tidak dikenal");
}

// Baca satu tag lalu berhenti mendengarkan. Resolve dengan serial number
// (UID hardware, contoh "04:9f:f5:73:bf:2a:81"), reject kalau gagal/dibatalkan.
export function readNfcSerial({ signal } = {}) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    signal?.addEventListener("abort", () => {
      controller.abort();
      reject(new DOMException("Dibatalkan", "AbortError"));
    });

    const reader = new window.NDEFReader();
    reader.onreading = (event) => {
      controller.abort();
      if (event.serialNumber) resolve(event.serialNumber);
      else reject(new Error("Tag terbaca tapi tidak ada serial number."));
    };
    reader.onreadingerror = () => {
      controller.abort();
      reject(new Error("Gagal membaca tag. Coba tempelkan ulang ke bagian belakang HP."));
    };
    reader.scan({ signal: controller.signal }).catch(reject);
  });
}
