// Helper bersama untuk skrip pengujian (simulate-tags, bench-api).
// Sengaja tanpa dependency: Node 20+ sudah punya fetch & performance.
const fs = require("fs");
const path = require("path");

// "--count 10 --batch-on-reconnect" -> { count: "10", "batch-on-reconnect": true }
function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function stats(values) {
  if (values.length === 0) return { n: 0, avg: null, min: null, p50: null, p95: null, max: null };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    n: values.length,
    avg: Math.round(sum / values.length),
    min: Math.min(...values),
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    max: Math.max(...values),
  };
}

function csvCell(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Tulis CSV ke scripts/out/<prefix>_<waktu>.csv (atau path dari --out).
function writeCsv(outPath, header, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  return outPath;
}

function defaultOutPath(prefix) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return path.join(__dirname, "..", "out", `${prefix}_${stamp}.csv`);
}

module.exports = { parseArgs, stats, writeCsv, defaultOutPath };
