const Victim = require("../models/Victim");
const Tag = require("../models/Tag");
const StatusHistory = require("../models/StatusHistory");
const Posko = require("../models/Posko");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const TRIASE_CATEGORIES = ["merah", "kuning", "hijau"];
const STATUS_ORDER = [
  "registered",
  "triaged",
  "waiting_transfer",
  "in_transit",
  "arrived",
];

// Urutan prioritas untuk Priority Queue di dashboard: merah dulu, lalu
// kuning, lalu hijau. Di dalam kategori yang sama, korban yang paling lama
// menunggu (waktu_update_terakhir paling lama) naik ke atas.
const TRIASE_PRIORITY_RANK = { merah: 0, kuning: 1, hijau: 2 };

const PRIORITY_QUEUE_LIMIT = 10;
const RECENT_ACTIVITY_LIMIT = 10;

/**
 * Membuat deskripsi singkat human-readable untuk satu entri riwayat status,
 * dipakai pada kartu "Recent Activity" di dashboard Overview/Aktivitas.
 * Contoh: "Budi terdaftar di Pos Triase Utama".
 */
function describeActivity(entry, victim, poskoNameById) {
  const label = (victim && (victim.nama || victim.tag_id)) || entry.victim_id;
  const poskoAsalNama = victim && victim.posko_asal ? poskoNameById.get(victim.posko_asal) || victim.posko_asal : null;
  const poskoTujuanNama = victim && victim.posko_tujuan ? poskoNameById.get(victim.posko_tujuan) || victim.posko_tujuan : null;

  switch (entry.status_baru) {
    case "registered":
      return poskoAsalNama ? `${label} terdaftar di ${poskoAsalNama}` : `${label} terdaftar sebagai korban baru`;
    case "triaged":
      return `${label} selesai ditriase${victim ? ` (kategori ${victim.kategori_triase})` : ""}`;
    case "waiting_transfer":
      return `${label} menunggu evakuasi${poskoAsalNama ? ` dari ${poskoAsalNama}` : ""}`;
    case "in_transit":
      return `${label} dalam perjalanan${poskoTujuanNama ? ` menuju ${poskoTujuanNama}` : ""}`;
    case "arrived":
      return `${label} tiba${poskoTujuanNama ? ` di ${poskoTujuanNama}` : ""}`;
    default:
      return `${label} berubah status menjadi ${entry.status_baru}`;
  }
}

/**
 * GET /api/dashboard/summary (Auth: Ya) - FR-BE-06
 *
 * Menyediakan seluruh angka & daftar ringkas yang dibutuhkan halaman
 * Dashboard Overview & Aktivitas di frontend (menggantikan mock data pada
 * dashboardService.js / activityService.js):
 * - triase_distribution   -> donut chart distribusi triase
 * - status_breakdown      -> kartu "Waiting Pickup" / "In Transit" / "Arrived" dkk.
 * - tags_summary          -> ringkasan "Registered" vs "Not Registered"
 * - priority_queue        -> kartu Priority Queue
 * - recent_activity       -> kartu/tab Recent Activity & Aktivitas
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const [allVictims, allTags, poskoList] = await Promise.all([
    Victim.find({}),
    Tag.find({}, { tag_id: 1 }),
    Posko.find({}, { posko_id: 1, nama_posko: 1 }),
  ]);

  const poskoNameById = new Map(poskoList.map((p) => [p.posko_id, p.nama_posko]));

  const activeVictims = allVictims.filter((v) => v.status_korban !== "arrived");

  // --- triase_distribution (di antara korban yang masih aktif) ---
  const triase_distribution = { merah: 0, kuning: 0, hijau: 0 };
  for (const v of activeVictims) {
    if (TRIASE_CATEGORIES.includes(v.kategori_triase)) {
      triase_distribution[v.kategori_triase] += 1;
    }
  }

  // --- status_breakdown (seluruh korban, termasuk yang sudah arrived) ---
  const status_breakdown = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
  for (const v of allVictims) {
    if (status_breakdown[v.status_korban] !== undefined) {
      status_breakdown[v.status_korban] += 1;
    }
  }

  // --- tags_summary: tag dengan korban aktif vs tag yang "kosong" ---
  const tagIdsWithActiveVictim = new Set(activeVictims.map((v) => v.tag_id));
  const total_tags = allTags.length;
  const registered_tags = tagIdsWithActiveVictim.size;
  const tags_summary = {
    total: total_tags,
    registered: registered_tags,
    not_registered: Math.max(total_tags - registered_tags, 0),
  };

  // --- priority_queue: korban aktif, diurutkan merah->kuning->hijau lalu paling lama menunggu ---
  const priority_queue = [...activeVictims]
    .sort((a, b) => {
      const rankDiff =
        (TRIASE_PRIORITY_RANK[a.kategori_triase] ?? 99) - (TRIASE_PRIORITY_RANK[b.kategori_triase] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.waktu_update_terakhir) - new Date(b.waktu_update_terakhir);
    })
    .slice(0, PRIORITY_QUEUE_LIMIT)
    .map((v) => ({
      victim_id: v.victim_id,
      tag_id: v.tag_id,
      nama: v.nama,
      kategori_triase: v.kategori_triase,
      status_korban: v.status_korban,
      posko_tujuan: v.posko_tujuan,
      waktu_update_terakhir: v.waktu_update_terakhir,
    }));

  // --- recent_activity: entri status_history terbaru, dilengkapi info korban ---
  const recentHistory = await StatusHistory.find({}).sort({ waktu_perubahan: -1 }).limit(RECENT_ACTIVITY_LIMIT);
  const victimById = new Map(allVictims.map((v) => [v.victim_id, v]));
  const recent_activity = recentHistory.map((entry) => {
    const victim = victimById.get(entry.victim_id);
    return {
      victim_id: entry.victim_id,
      tag_id: victim ? victim.tag_id : null,
      status_lama: entry.status_lama,
      status_baru: entry.status_baru,
      waktu_perubahan: entry.waktu_perubahan,
      description: describeActivity(entry, victim, poskoNameById),
    };
  });

  return sendSuccess(res, 200, {
    totals: {
      all_victims: allVictims.length,
      active_victims: activeVictims.length,
    },
    triase_distribution,
    status_breakdown,
    tags_summary,
    priority_queue,
    recent_activity,
  });
});

module.exports = { getDashboardSummary };
