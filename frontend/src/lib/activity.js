export const STATUS_ORDER = ["registered", "triaged", "waiting_transfer", "in_transit", "arrived"];

export const STATUS_LABEL = {
  registered: "Terdaftar",
  triaged: "Sudah ditriase",
  waiting_transfer: "Menunggu jemputan",
  in_transit: "Dalam perjalanan",
  arrived: "Tiba di posko",
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export function formatTime(iso) {
  return timeFormatter.format(new Date(iso));
}

export function formatElapsed(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} mnt`;
  return `${Math.round(minutes / 60)} jam`;
}
