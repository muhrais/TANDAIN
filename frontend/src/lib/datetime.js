// Konversi Date <-> nilai <input type="datetime-local"> (jam lokal browser).
export function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

// "Terakhir diubah 11 Nov 09.42 oleh Koordinator Posko"
export function lastUpdatedText(doc) {
  if (!doc?.updated_at) return "";
  return `Terakhir diubah ${formatDateTime(doc.updated_at)}${doc.updated_by_nama ? ` oleh ${doc.updated_by_nama}` : ""}`;
}

// "11 Nov 09.42"
export function formatDateTime(value) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}
