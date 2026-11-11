const Tag = require("../models/Tag");
const Victim = require("../models/Victim");
const StatusHistory = require("../models/StatusHistory");
const Location = require("../models/Location");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { getUserNameMap } = require("../utils/userNames");

const TRIASE_CATEGORIES = ["merah", "kuning", "hijau"];

// Urutan status wajib berjalan sekuensial sesuai PRD bagian 4.2 (FR-BE-05)
// dan kriteria keberhasilan #6 pada bagian 11.
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

/**
 * POST /api/tags/:tag_id/scan (Auth: Ya)
 * Petugas Pos Medis melakukan scan NFC. FR-BE-02.
 * Mengembalikan data korban aktif jika tag sudah terdaftar (Registered),
 * atau status "not_registered" jika tag belum punya korban aktif.
 *
 * `:tag_id` boleh berisi UID NFC gelang atau tag_id kanonik (stiker,
 * mis. GPS-002, untuk input manual). UID dicari lewat pairing (nfc_uid)
 * dulu, lalu sebagai tag_id (tag lama yang didaftarkan pakai UID).
 * Respons selalu memakai tag_id kanonik.
 *
 * Body opsional: { source: "nfc" } dari frontend saat tag dibaca Web NFC.
 * UID NFC yang belum di-pairing -> status "not_paired" (bukan 404), supaya
 * petugas diarahkan ke koordinator, bukan ke form registrasi.
 */
const scanTag = asyncHandler(async (req, res) => {
  const scanned = req.params.tag_id.trim();
  const fromNfc = req.body?.source === "nfc";

  const tag =
    (await Tag.findOne({ nfc_uid: scanned.toLowerCase() })) || (await Tag.findOne({ tag_id: scanned }));

  if (!tag) {
    if (fromNfc) {
      return sendSuccess(res, 200, { status: "not_paired", nfc_uid: scanned.toLowerCase() });
    }
    throw new ApiError(404, "TAG_NOT_FOUND", "tag_id tidak terdaftar pada koleksi tags.");
  }
  const { tag_id } = tag;

  const victim = await Victim.findOne({
    tag_id,
    status_korban: { $ne: "arrived" },
  }).sort({ created_at: -1 });

  if (!victim) {
    // Week 5: sertakan status_tag juga, berguna kalau frontend perlu tahu
    // tag-nya rusak/nonaktif sebelum menampilkan form registrasi (FR-DASH-07).
    return sendSuccess(res, 200, {
      status: "not_registered",
      tag_id,
      status_tag: tag.status_tag,
    });
  }

  // Week 5 (review bareng Raditya): lengkapi field yang dikembalikan supaya
  // halaman Scan NFC bisa langsung menampilkan kartu detail korban tanpa
  // perlu request tambahan ke GET /api/victims/:id.
  return sendSuccess(res, 200, {
    status: "registered",
    victim_id: victim.victim_id,
    tag_id: victim.tag_id,
    nama: victim.nama,
    usia: victim.usia,
    jenis_kelamin: victim.jenis_kelamin,
    kategori_triase: victim.kategori_triase,
    kondisi_klinis: victim.kondisi_klinis,
    status_korban: victim.status_korban,
    posko_asal: victim.posko_asal,
    posko_tujuan: victim.posko_tujuan,
    lokasi_terakhir: victim.lokasi_terakhir,
    waktu_update_terakhir: victim.waktu_update_terakhir,
  });
});

/**
 * POST /api/victims (Auth: Ya)
 * Registrasi data korban baru & menghubungkannya dengan tag_id. FR-BE-03.
 */
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

  // Pastikan tag terdaftar (auto-register jika belum ada, konsisten dengan locationController).
  await Tag.findOneAndUpdate(
    { tag_id },
    { $setOnInsert: { tag_id, status_tag: "active" } },
    { upsert: true }
  );

  // FR-BE dan error DUPLICATE_ACTIVE_VICTIM: satu tag hanya boleh punya
  // satu korban aktif (belum berstatus "arrived") pada satu waktu.
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
    triase_updated_at: new Date(),
  });

  await StatusHistory.create({
    victim_id: victim.victim_id,
    status_lama: null,
    status_baru: "registered",
    diubah_oleh: req.user ? req.user.user_id : null,
  });

  // Week 5 (review response): field `_id` Mongo internal otomatis
  // disembunyikan lewat schemaOptions() toJSON transform pada model Victim,
  // jadi frontend cukup pakai `victim_id` sebagai identifier.
  return sendSuccess(res, 201, victim);
});

// Field identitas/kondisi yang perubahannya dicatat sebagai riwayat jenis "data".
const DATA_FIELDS = ["nama", "usia", "jenis_kelamin", "kondisi_klinis"];
const JENIS_KELAMIN = ["L", "P", "tidak_diketahui"];

function normalizeDataField(field, value) {
  if (field === "nama" || field === "kondisi_klinis") {
    if (typeof value !== "string") {
      throw new ApiError(422, "VALIDATION_ERROR", `${field} harus berupa teks.`);
    }
    return value.trim();
  }
  if (field === "usia") {
    if (value === null || value === "") return null;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "usia harus angka 0 atau lebih.");
    }
    return value;
  }
  if (!JENIS_KELAMIN.includes(value)) {
    throw new ApiError(422, "VALIDATION_ERROR", "jenis_kelamin harus L, P, atau tidak_diketahui.");
  }
  return value;
}

/**
 * PUT /api/victims/:id (Auth: Ya)
 * Memperbarui kategori triase, identitas & kondisi klinis, status
 * perpindahan, dan posko tujuan korban. FR-BE-04, FR-BE-05.
 *
 * Setiap perubahan yang benar-benar mengubah nilai dicatat di status_history
 * beserta pengubahnya: jenis "status", "triase", dan satu entri "data" per
 * request untuk field identitas/kondisi.
 */
const updateVictim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { kategori_triase, status_korban, posko_tujuan } = req.body;
  const diubah_oleh = req.user ? req.user.user_id : null;

  const victim = await Victim.findOne({ victim_id: id });
  if (!victim) {
    throw new ApiError(404, "VICTIM_NOT_FOUND", "Data korban dengan ID tersebut tidak ditemukan.");
  }

  // Validasi semua input dulu, baru catat riwayat, supaya request yang
  // ditolak tidak meninggalkan entri riwayat setengah jadi.
  if (kategori_triase !== undefined && !TRIASE_CATEGORIES.includes(kategori_triase)) {
    throw new ApiError(422, "INVALID_TRIASE_CATEGORY", "Nilai kategori_triase di luar Merah/Kuning/Hijau.");
  }

  const statusChanged = status_korban !== undefined && status_korban !== victim.status_korban;
  if (statusChanged && !isValidTransition(victim.status_korban, status_korban)) {
    throw new ApiError(
      422,
      "INVALID_STATUS_TRANSITION",
      `Perubahan status dari '${victim.status_korban}' ke '${status_korban}' tidak mengikuti urutan yang diizinkan.`
    );
  }

  const dataLama = {};
  const dataBaru = {};
  for (const field of DATA_FIELDS) {
    if (req.body[field] === undefined) continue;
    const next = normalizeDataField(field, req.body[field]);
    const prev = victim[field] ?? null;
    if (next !== prev) {
      dataLama[field] = prev;
      dataBaru[field] = next;
    }
  }

  const now = new Date();
  const history = [];

  if (kategori_triase !== undefined && kategori_triase !== victim.kategori_triase) {
    history.push({ jenis: "triase", nilai_lama: victim.kategori_triase, nilai_baru: kategori_triase });
    victim.kategori_triase = kategori_triase;
    victim.triase_updated_at = now;
  }

  if (Object.keys(dataBaru).length > 0) {
    history.push({ jenis: "data", nilai_lama: dataLama, nilai_baru: dataBaru });
    Object.assign(victim, dataBaru);
  }

  if (posko_tujuan !== undefined) victim.posko_tujuan = posko_tujuan;

  if (statusChanged) {
    history.push({ jenis: "status", status_lama: victim.status_korban, status_baru: status_korban });
    victim.status_korban = status_korban;
  }

  // waktu_update_terakhir = waktu tunggu di antrian & alert "merah menunggu",
  // jadi hanya maju untuk perubahan status/triase, bukan koreksi data.
  if (history.some((h) => h.jenis !== "data")) {
    victim.waktu_update_terakhir = now;
  }

  await victim.save();
  if (history.length > 0) {
    await StatusHistory.insertMany(
      history.map((h) => ({ ...h, victim_id: victim.victim_id, diubah_oleh, waktu_perubahan: now }))
    );
  }

  return sendSuccess(res, 200, victim);
});

// Kolom yang boleh dipakai `sort`. Triase & status diurutkan menurut makna
// (merah dulu; registered -> arrived), bukan abjad.
const SORT_FIELDS = {
  waktu_update_terakhir: "waktu_update_terakhir",
  created_at: "created_at",
  nama: "nama",
  tag_id: "tag_id",
  usia: "usia",
  kategori_triase: "_triase_rank",
  status_korban: "_status_rank",
};
const MAX_LIMIT = 100;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildVictimFilter(query) {
  const { kategori_triase, status_korban, posko, q } = query;
  const filter = {};
  if (kategori_triase) filter.kategori_triase = kategori_triase;
  if (status_korban === "aktif") filter.status_korban = { $ne: "arrived" };
  else if (status_korban) filter.status_korban = status_korban;
  const and = [];
  if (posko) and.push({ $or: [{ posko_asal: posko }, { posko_tujuan: posko }] });
  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    and.push({ $or: [{ tag_id: pattern }, { nama: pattern }] });
  }
  if (and.length > 0) filter.$and = and;
  return filter;
}

/**
 * GET /api/victims (Auth: Ya)
 * Daftar korban. FR-DASH-03 (pencarian).
 *
 * Query opsional: kategori_triase, status_korban ("aktif" = belum tiba),
 * posko (asal atau tujuan), q (cari tag_id/nama, tidak peka huruf besar).
 *
 * Tanpa `page`: array semua korban yang cocok (dipakai Evakuasi, CSV, dll).
 * Dengan `page`: { items, total, page, limit } + `sort` (mis.
 * "-waktu_update_terakhir", "kategori_triase", "nama").
 */
const listVictims = asyncHandler(async (req, res) => {
  const filter = buildVictimFilter(req.query);

  if (req.query.page === undefined) {
    const victims = await Victim.find(filter).sort({ created_at: -1 });
    return sendSuccess(res, 200, victims);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const sortParam = typeof req.query.sort === "string" ? req.query.sort : "-waktu_update_terakhir";
  const desc = sortParam.startsWith("-");
  const sortKey = SORT_FIELDS[sortParam.replace(/^-/, "")];
  if (!sortKey) {
    throw new ApiError(422, "VALIDATION_ERROR", `sort harus salah satu dari: ${Object.keys(SORT_FIELDS).join(", ")}.`);
  }
  const direction = desc ? -1 : 1;

  const [result] = await Victim.aggregate([
    { $match: filter },
    {
      $addFields: {
        _triase_rank: { $indexOfArray: [TRIASE_CATEGORIES, "$kategori_triase"] },
        _status_rank: { $indexOfArray: [STATUS_ORDER, "$status_korban"] },
      },
    },
    // victim_id sebagai pemecah seri supaya urutan antar-halaman stabil.
    { $sort: { [sortKey]: direction, victim_id: 1 } },
    {
      $facet: {
        items: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 0, _triase_rank: 0, _status_rank: 0 } }],
        total: [{ $count: "n" }],
      },
    },
  ]);

  return sendSuccess(res, 200, {
    items: result.items,
    total: result.total[0]?.n ?? 0,
    page,
    limit,
  });
});

/**
 * GET /api/victims/:id/locations?limit=200 (Auth: Ya) - FR-DB-02
 * Jejak lokasi korban dari koleksi `locations`: titik dari tag korban
 * sejak korban didaftarkan sampai tiba (gelang bisa dipakai korban lain
 * sesudahnya). Diurutkan lama -> baru; `limit` mengambil titik TERBARU.
 */
const getVictimLocations = asyncHandler(async (req, res) => {
  const victim = await Victim.findOne({ victim_id: req.params.id });
  if (!victim) {
    throw new ApiError(404, "VICTIM_NOT_FOUND", "Data korban dengan ID tersebut tidak ditemukan.");
  }
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));

  const range = { $gte: victim.created_at };
  if (victim.status_korban === "arrived") {
    const arrived = await StatusHistory.findOne({ victim_id: victim.victim_id, status_baru: "arrived" }).sort({
      waktu_perubahan: -1,
    });
    if (arrived) range.$lte = arrived.waktu_perubahan;
  }

  const points = await Location.find({ tag_id: victim.tag_id, received_at: range }, { latitude: 1, longitude: 1, received_at: 1, timestamp: 1 })
    .sort({ received_at: -1 })
    .limit(limit)
    .lean();

  return sendSuccess(res, 200, {
    victim_id: victim.victim_id,
    tag_id: victim.tag_id,
    points: points.reverse().map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      timestamp: p.timestamp,
      received_at: p.received_at,
    })),
  });
});

/**
 * GET /api/victims/:id (Auth: Ya)
 * Detail satu korban beserta riwayat status.
 */
const getVictimDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const victim = await Victim.findOne({ victim_id: id });
  if (!victim) {
    throw new ApiError(404, "VICTIM_NOT_FOUND", "Data korban dengan ID tersebut tidak ditemukan.");
  }

  const history = await StatusHistory.find({ victim_id: id }).sort({ waktu_perubahan: 1 });
  const nameById = await getUserNameMap(history.map((h) => h.diubah_oleh));

  return sendSuccess(res, 200, {
    ...victim.toObject(),
    status_history: history.map((h) => ({
      ...h.toJSON(),
      diubah_oleh_nama: h.diubah_oleh ? nameById.get(h.diubah_oleh) ?? null : null,
    })),
  });
});

module.exports = {
  scanTag,
  createVictim,
  updateVictim,
  listVictims,
  getVictimDetail,
  getVictimLocations,
};
