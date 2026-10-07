// Escape satu sel CSV (RFC 4180): bungkus kutip kalau ada koma, kutip, atau
// baris baru; kutip di dalam nilai digandakan.
function escapeCell(value) {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

// BOM supaya Excel membaca UTF-8 dengan benar (nama korban bisa ber-aksen).
export function downloadCsv(filename, rows) {
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
