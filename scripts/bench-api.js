/**
 * Benchmark latensi API TANDAIN (uji P-02, target rata-rata ≤ 500 ms).
 *
 * Login sekali sebagai koordinator, lalu memanggil tiap endpoint utama
 * sebanyak N kali secara berurutan (bukan paralel, supaya yang diukur
 * latensi per request, bukan throughput).
 *
 * Contoh:
 *   npm run bench
 *   npm run bench -- --n 50 --user koordinator1 --pass koordinator123
 *
 * Opsi:
 *   --n N            jumlah panggilan per endpoint (default 50)
 *   --base URL       alamat backend (default http://localhost:3000)
 *   --user / --pass  akun koordinator (default akun seed koordinator1)
 *   --scan-tag ID    tag untuk uji POST /api/tags/:id/scan (default TND-DEMO-01)
 *   --target MS      batas rata-rata yang dianggap lulus (default 500)
 *   --out PATH       file CSV (default scripts/out/bench_<waktu>.csv)
 */
const { parseArgs, stats, writeCsv, defaultOutPath } = require("./lib/util");

const args = parseArgs();
const N = Number(args.n ?? 50);
const BASE = String(args.base ?? "http://localhost:3000").replace(/\/$/, "");
const USER = String(args.user ?? "koordinator1");
const PASS = String(args.pass ?? "koordinator123");
const SCAN_TAG = String(args["scan-tag"] ?? "TND-DEMO-01");
const TARGET_MS = Number(args.target ?? 500);
const OUT = args.out ? String(args.out) : defaultOutPath("bench");

const ENDPOINTS = [
  ["GET", "/api/dashboard/summary"],
  ["GET", "/api/locations/latest"],
  ["GET", "/api/victims"],
  ["GET", "/api/posko"],
  ["GET", "/api/devices"],
  ["POST", `/api/tags/${encodeURIComponent(SCAN_TAG)}/scan`],
];

async function request(method, path, token) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(10000),
    });
    await res.text();
    return { status: res.status, latency: Math.round(performance.now() - t0) };
  } catch {
    return { status: 0, latency: Math.round(performance.now() - t0) };
  }
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.token) {
    throw new Error(`Login gagal (${res.status}): ${json?.error?.message ?? "cek --user/--pass dan backend"}`);
  }
  return json.data.token;
}

async function main() {
  const token = await login();
  console.log(`Benchmark ${N}× per endpoint -> ${BASE} (target rata-rata ≤ ${TARGET_MS} ms)\n`);

  const rows = [];
  const table = [];
  for (const [method, path] of ENDPOINTS) {
    const latencies = [];
    let okCount = 0;
    for (let run = 1; run <= N; run += 1) {
      const r = await request(method, path, token);
      rows.push([`${method} ${path}`, run, r.latency, r.status]);
      if (r.status >= 200 && r.status < 300) {
        okCount += 1;
        latencies.push(r.latency);
      }
    }
    const s = stats(latencies);
    table.push({
      endpoint: `${method} ${path}`,
      ok: `${okCount}/${N}`,
      avg: s.avg,
      min: s.min,
      p50: s.p50,
      p95: s.p95,
      max: s.max,
      lulus: s.avg != null && s.avg <= TARGET_MS && okCount === N ? "ya" : "tidak",
    });
  }

  console.table(table);
  const file = writeCsv(OUT, ["endpoint", "run", "latency_ms", "status"], rows);
  console.log(`Log CSV: ${file}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
