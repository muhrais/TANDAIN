// Instrumentasi pengukuran untuk dataset pengujian (P-01, S-11, P-03, P-poll
// di PLANNING_WEEK6_SOFTWARE.md §4.8/§6). Aktif hanya kalau ?debug=1 di URL
// atau localStorage.tandain_debug = "1", supaya tidak mengganggu tampilan
// normal / menambah overhead saat tidak sedang diukur.
const STORAGE_KEY = "tandain_metrics";
const DEBUG_KEY = "tandain_debug";

let records = loadFromStorage();
let serverOffsetMs = 0;
const listeners = new Set();

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage penuh/diblokir - sampel sesi ini tetap ada di memori,
    // cuma tidak bertahan lintas reload.
  }
}

function notify() {
  for (const fn of listeners) fn();
}

export function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

// offset = server_time - Date.now(), diperbarui tiap ada respons yang bawa
// jam server (lihat locationService.getLatestLocations). Dipakai supaya
// perhitungan delay lintas alat (HP vs laptop, jam beda) pakai referensi sama.
export function setServerTimeOffset(serverTime) {
  serverOffsetMs = new Date(serverTime).getTime() - Date.now();
}

export function correctedNow() {
  return Date.now() + serverOffsetMs;
}

export function detectNetwork() {
  const host = window.location.hostname;
  if (host.includes("ngrok")) return "ngrok";
  if (host === "localhost" || host === "127.0.0.1" || /^192\.168\.|^10\./.test(host)) {
    return "wifi lokal";
  }
  return host;
}

function shortUserAgent() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh/i.test(ua)) return "Mac";
  return ua.slice(0, 40);
}

// Simpan satu baris sampel. `fields.value_ms` (kalau ada) dipakai sebagai
// metrik numerik utama untuk ringkasan avg/p95 di getSummary() - nama kolom
// semantik lain (latency_ms, delay_ms, duration_ms) tetap ikut disimpan apa
// adanya di CSV.
export function record(testId, fields) {
  if (!isDebugEnabled()) return;
  records.push({
    test_id: testId,
    recorded_at: new Date().toISOString(),
    user_agent: shortUserAgent(),
    ...fields,
  });
  persist();
  notify();
}

export function getRecords(testId) {
  return testId ? records.filter((r) => r.test_id === testId) : [...records];
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function getSummary() {
  const byTest = new Map();
  for (const r of records) {
    if (!byTest.has(r.test_id)) byTest.set(r.test_id, { count: 0, values: [] });
    const entry = byTest.get(r.test_id);
    entry.count += 1;
    if (typeof r.value_ms === "number") entry.values.push(r.value_ms);
  }
  return [...byTest.entries()].map(([testId, { count, values }]) => ({
    test_id: testId,
    count,
    avg_ms: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    p95_ms: values.length ? Math.round(percentile(values, 95)) : null,
  }));
}

export function clear() {
  records = [];
  persist();
  notify();
}

function toCsvValue(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv() {
  if (records.length === 0) return;
  const columns = [...new Set(records.flatMap((r) => Object.keys(r)))];
  const lines = [
    columns.join(","),
    ...records.map((r) => columns.map((c) => toCsvValue(r[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tandain_metrics_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
