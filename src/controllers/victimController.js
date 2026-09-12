const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const StatusHistory = require("../models/StatusHistory");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const TRIASE_CATEGORIES = ["merah", "kuning", "hijau"];

// Urutan status korban harus berurutan.
const STATUS_ORDER = [
  "registered",
  "triaged",
  "waiting_transfer",
  "in_transit",
  "arrived",
];

function isValidTransition(from, to) {
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}

// POST /api/tags/:tag_id/scan
const scanTag = asyncHandler(async (req, res) => {
  const { tag_id } = req.params;

  const tag = await Tag.findOne({ tag_id });
  if (!tag) {
    throw new ApiError(404, "TAG_NOT_FOUND", "tag_id tidak terdaftar pada koleksi tags.");
  }

  const victim = await Victim.findOne({
    tag_id,
    status_korban: { $ne: "arrived" },
  }).sort({ created_at: -1 });

  if (!victim) {
    return sendSuccess(res, 200, { status: "not_registered", tag_id });
  }

  return sendSuccess(res, 200, {
    status: "registered",
    victim_id: victim.victim_id,
    nama: victim.nama,
    kategori_triase: victim.kategori_triase,
    status_korban: victim.status_korban,
    posko_asal: victim.posko_asal,
    posko_tujuan: victim.posko_tujuan,
  });
});

// POST /api/victims
const createVictim = asyncHandler(async (req, res) => {
  const {
    tag_id,
    nama,
    usia,
    jenis_kelamin,
    kategori_triase,
    kondisi_klinis,
    posko_asal,
    posko_tujuan,
    lokasi_terakhir,
  } = req.body;

  if (!tag_id || !kategori_triase) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Field tag_id dan kategori_triase wajib diisi."
    );
  }

  if (!TRIASE_CATEGORIES.includes(kategori_triase)) {
    throw new ApiError(
      422,
      "INVALID_TRIASE_CATEGORY",
      "Nilai kategori_triase di luar Merah/Kuning/Hijau."
    );
  }

  // Pastikan tag sudah ada sebelum registrasi korban.
  await Tag.findOneAndUpdate(
    { tag_id },
    { $setOnInsert: { tag_id, status_tag: "active" } },
    { upsert: true }
  );

  // Satu tag hanya boleh punya satu korban aktif.
  const existingActive = await Victim.findOne({
    tag_id,
    status_korban: { $ne: "arrived" },
  });
  if (existingActive) {
    throw new ApiError(
      409,
      "DUPLICATE_ACTIVE_VICTIM",
      "Tag masih memiliki korban aktif (belum berstatus arrived)."
    );
  }

  const victim = await Victim.create({
    tag_id,
    nama,
    usia,
    jenis_kelamin,
    kategori_triase,
    kondisi_klinis,
    posko_asal: posko_asal || null,
    posko_tujuan: posko_tujuan || null,
    lokasi_terakhir: lokasi_terakhir || { lat: null, lng: null },
    status_korban: "registered",
  });

  await StatusHistory.create({
    victim_id: victim.victim_id,
    status_lama: null,
    status_baru: "registered",
    diubah_oleh: req.user ? req.user.user_id : null,
  });

  return sendSuccess(res, 201, victim);
});

// PUT /api/victims/:id
const updateVictim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { kategori_triase, kondisi_klinis, status_korban, posko_tujuan, nama, usia } = req.body;

  const victim = await Victim.findOne({ victim_id: id });
  if (!victim) {
    throw new ApiError(404, "VICTIM_NOT_FOUND", "Data korban dengan ID tersebut tidak ditemukan.");
  }

  if (kategori_triase !== undefined) {
    if (!TRIASE_CATEGORIES.includes(kategori_triase)) {
      throw new ApiError(
        422,
        "INVALID_TRIASE_CATEGORY",
        "Nilai kategori_triase di luar Merah/Kuning/Hijau."
      );
    }
    victim.kategori_triase = kategori_triase;
  }

  if (kondisi_klinis !== undefined) victim.kondisi_klinis = kondisi_klinis;
  if (posko_tujuan !== undefined) victim.posko_tujuan = posko_tujuan;
  if (nama !== undefined) victim.nama = nama;
  if (usia !== undefined) victim.usia = usia;

  if (status_korban !== undefined && status_korban !== victim.status_korban) {
    if (!isValidTransition(victim.status_korban, status_korban)) {
      throw new ApiError(
        422,
        "INVALID_STATUS_TRANSITION",
        `Perubahan status dari '${victim.status_korban}' ke '${status_korban}' tidak mengikuti urutan yang diizinkan.`
      );
    }

    await StatusHistory.create({
      victim_id: victim.victim_id,
      status_lama: victim.status_korban,
      status_baru: status_korban,
      diubah_oleh: req.user ? req.user.user_id : null,
    });

    victim.status_korban = status_korban;
  }

  victim.waktu_update_terakhir = new Date();
  await victim.save();

  return sendSuccess(res, 200, victim);
});

// GET /api/victims
const listVictims = asyncHandler(async (req, res) => {
  const { kategori_triase, status_korban } = req.query;
  const filter = {};
  if (kategori_triase) filter.kategori_triase = kategori_triase;
  if (status_korban) filter.status_korban = status_korban;

  const victims = await Victim.find(filter).sort({ created_at: -1 });
  return sendSuccess(res, 200, victims);
});

// GET /api/victims/:id
const getVictimDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const victim = await Victim.findOne({ victim_id: id });
  if (!victim) {
    throw new ApiError(404, "VICTIM_NOT_FOUND", "Data korban dengan ID tersebut tidak ditemukan.");
  }

  const history = await StatusHistory.find({ victim_id: id }).sort({ waktu_perubahan: 1 });

  return sendSuccess(res, 200, {
    ...victim.toObject(),
    status_history: history,
  });
});

module.exports = {
  scanTag,
  createVictim,
  updateVictim,
  listVictims,
  getVictimDetail,
};
