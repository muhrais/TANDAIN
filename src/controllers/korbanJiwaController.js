const KorbanJiwa = require("../models/KorbanJiwa");
const Posko = require("../models/Posko");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { getUserNameMap } = require("../utils/userNames");

// Tenaga medis lapangan boleh mengoreksi entri miliknya sendiri selama
// jendela ini setelah dibuat; sesudahnya hanya koordinator.
const EDIT_WINDOW_MIN = 30;
const JENIS_KELAMIN = ["L", "P", "tidak_diketahui"];

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Validasi & normalisasi body. `partial` = PUT (field yang tidak dikirim
 * dibiarkan). Melempar 422 dengan daftar field yang salah.
 */
async function normalizeBody(body, { partial }) {
  const out = {};
  const errors = [];
  const has = (field) => body[field] !== undefined;

  if (!partial || has("jumlah")) {
    const { jumlah } = body;
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 500) {
      errors.push({ field: "jumlah", message: "jumlah harus bilangan bulat 1-500." });
    } else out.jumlah = jumlah;
  }

  if (has("nama")) {
    if (typeof body.nama !== "string") errors.push({ field: "nama", message: "nama harus teks." });
    else out.nama = body.nama.trim();
  }

  if (has("jenis_kelamin")) {
    if (!JENIS_KELAMIN.includes(body.jenis_kelamin)) {
      errors.push({ field: "jenis_kelamin", message: "jenis_kelamin harus L, P, atau tidak_diketahui." });
    } else out.jenis_kelamin = body.jenis_kelamin;
  }

  if (has("perkiraan_usia")) {
    const usia = body.perkiraan_usia;
    if (usia === null || usia === "") out.perkiraan_usia = null;
    else if (!isNumber(usia) || usia < 0 || usia > 150) {
      errors.push({ field: "perkiraan_usia", message: "perkiraan_usia harus angka 0-150." });
    } else out.perkiraan_usia = usia;
  }

  if (has("lokasi")) {
    const lokasi = body.lokasi || {};
    const lat = lokasi.lat ?? null;
    const lng = lokasi.lng ?? null;
    if (lat === null && lng === null) out.lokasi = { lat: null, lng: null };
    else if (!isNumber(lat) || !isNumber(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push({ field: "lokasi", message: "lokasi harus berisi lat (-90..90) dan lng (-180..180), atau keduanya kosong." });
    } else out.lokasi = { lat, lng };
  }

  if (has("posko_id")) {
    if (body.posko_id === null || body.posko_id === "") out.posko_id = null;
    else if (typeof body.posko_id !== "string" || !(await Posko.exists({ posko_id: body.posko_id }))) {
      errors.push({ field: "posko_id", message: "posko_id tidak ditemukan." });
    } else out.posko_id = body.posko_id;
  }

  if (has("waktu_ditemukan")) {
    const waktu = new Date(body.waktu_ditemukan);
    if (body.waktu_ditemukan === null || Number.isNaN(waktu.getTime())) {
      errors.push({ field: "waktu_ditemukan", message: "waktu_ditemukan harus tanggal ISO 8601 yang valid." });
    } else if (waktu.getTime() > Date.now() + 5 * 60 * 1000) {
      errors.push({ field: "waktu_ditemukan", message: "waktu_ditemukan tidak boleh di masa depan." });
    } else out.waktu_ditemukan = waktu;
  }

  if (has("catatan")) {
    if (typeof body.catatan !== "string") errors.push({ field: "catatan", message: "catatan harus teks." });
    else out.catatan = body.catatan.trim();
  }

  if (errors.length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Data korban jiwa tidak valid.", errors);
  }
  return out;
}

async function withNames(entries) {
  const nameById = await getUserNameMap(entries.flatMap((e) => [e.dicatat_oleh, e.diubah_oleh]));
  return entries.map((e) => ({
    ...e.toJSON(),
    dicatat_oleh_nama: e.dicatat_oleh ? nameById.get(e.dicatat_oleh) ?? null : null,
    diubah_oleh_nama: e.diubah_oleh ? nameById.get(e.diubah_oleh) ?? null : null,
  }));
}

async function findActive(id) {
  const entry = await KorbanJiwa.findOne({ kj_id: id, dihapus: false });
  if (!entry) {
    throw new ApiError(404, "KORBAN_JIWA_NOT_FOUND", "Catatan korban jiwa tidak ditemukan.");
  }
  return entry;
}

/**
 * Boleh ubah: koordinator selalu; tenaga medis lapangan hanya entri
 * miliknya yang dibuat <= EDIT_WINDOW_MIN menit lalu.
 */
function canEdit(user, entry, now = Date.now()) {
  if (user.role === "koordinator") return true;
  if (user.role !== "tenaga_medis_lapangan") return false;
  const ageMin = (now - new Date(entry.created_at).getTime()) / 60000;
  return entry.dicatat_oleh === user.user_id && ageMin <= EDIT_WINDOW_MIN;
}

/** GET /api/korban-jiwa - daftar entri yang tidak dihapus, terbaru dulu. */
const listKorbanJiwa = asyncHandler(async (req, res) => {
  const entries = await KorbanJiwa.find({ dihapus: false }).sort({ waktu_ditemukan: -1, created_at: -1 });
  const items = await withNames(entries);
  const now = Date.now();
  return sendSuccess(res, 200, {
    total: entries.reduce((sum, e) => sum + e.jumlah, 0),
    edit_window_min: EDIT_WINDOW_MIN,
    items: items.map((item, i) => ({ ...item, bisa_diubah: canEdit(req.user, entries[i], now) })),
  });
});

/** POST /api/korban-jiwa - koordinator & tenaga medis lapangan. */
const createKorbanJiwa = asyncHandler(async (req, res) => {
  const data = await normalizeBody(req.body || {}, { partial: false });
  const entry = await KorbanJiwa.create({ ...data, dicatat_oleh: req.user.user_id });
  const [item] = await withNames([entry]);
  return sendSuccess(res, 201, { ...item, bisa_diubah: true });
});

/** PUT /api/korban-jiwa/:id */
const updateKorbanJiwa = asyncHandler(async (req, res) => {
  const entry = await findActive(req.params.id);
  if (!canEdit(req.user, entry)) {
    throw new ApiError(
      403,
      "FORBIDDEN_EDIT_WINDOW",
      `Tenaga medis lapangan hanya bisa mengubah catatan miliknya dalam ${EDIT_WINDOW_MIN} menit setelah dibuat.`
    );
  }
  const data = await normalizeBody(req.body || {}, { partial: true });
  Object.assign(entry, data, { diubah_oleh: req.user.user_id });
  await entry.save();
  const [item] = await withNames([entry]);
  return sendSuccess(res, 200, { ...item, bisa_diubah: canEdit(req.user, entry) });
});

/** DELETE /api/korban-jiwa/:id - koordinator, soft delete dengan alasan. */
const deleteKorbanJiwa = asyncHandler(async (req, res) => {
  const alasan = typeof req.body?.alasan === "string" ? req.body.alasan.trim() : "";
  if (!alasan) {
    throw new ApiError(422, "VALIDATION_ERROR", "Alasan penghapusan wajib diisi.");
  }
  const entry = await findActive(req.params.id);
  Object.assign(entry, {
    dihapus: true,
    alasan_hapus: alasan,
    dihapus_oleh: req.user.user_id,
    dihapus_at: new Date(),
  });
  await entry.save();
  return sendSuccess(res, 200, { kj_id: entry.kj_id, dihapus: true });
});

module.exports = {
  listKorbanJiwa,
  createKorbanJiwa,
  updateKorbanJiwa,
  deleteKorbanJiwa,
  EDIT_WINDOW_MIN,
};
