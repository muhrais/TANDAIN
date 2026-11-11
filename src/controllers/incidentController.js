const { getActiveIncident } = require("../models/Incident");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { getUserNameMap } = require("../utils/userNames");

// Rentang wajar tiap ambang alert, supaya salah ketik (mis. 0 atau 1000)
// tidak membuat alert selalu/tidak pernah muncul.
const AMBANG_RANGE = {
  merah_menunggu_mnt: [1, 120],
  gps_diam_mnt: [1, 60],
  baterai_rendah_pct: [1, 99],
  kapasitas_peringatan_pct: [10, 100],
};

async function serialize(incident) {
  const nameById = await getUserNameMap([incident.updated_by]);
  return {
    ...incident.toJSON(),
    updated_by_nama: incident.updated_by ? nameById.get(incident.updated_by) ?? null : null,
  };
}

/** GET /api/incident - ketiga role. */
const getIncident = asyncHandler(async (req, res) => {
  const incident = await getActiveIncident();
  return sendSuccess(res, 200, await serialize(incident));
});

/**
 * PUT /api/incident - koordinator. Semua field opsional; hanya field yang
 * dikirim yang diubah. `ambang` boleh sebagian.
 */
const updateIncident = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = [];
  const update = {};

  for (const field of ["nama_insiden", "lokasi"]) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string" || body[field].trim().length > 120) {
      errors.push({ field, message: `${field} harus teks maksimal 120 karakter.` });
    } else update[field] = body[field].trim();
  }

  if (body.waktu_mulai !== undefined) {
    if (body.waktu_mulai === null || body.waktu_mulai === "") update.waktu_mulai = null;
    else {
      const waktu = new Date(body.waktu_mulai);
      if (Number.isNaN(waktu.getTime())) {
        errors.push({ field: "waktu_mulai", message: "waktu_mulai harus tanggal ISO 8601 yang valid." });
      } else update.waktu_mulai = waktu;
    }
  }

  for (const field of ["jumlah_relawan", "jumlah_nakes"]) {
    if (body[field] === undefined) continue;
    if (!Number.isInteger(body[field]) || body[field] < 0 || body[field] > 100000) {
      errors.push({ field, message: `${field} harus bilangan bulat 0 atau lebih.` });
    } else update[field] = body[field];
  }

  if (body.ambang !== undefined) {
    if (typeof body.ambang !== "object" || body.ambang === null) {
      errors.push({ field: "ambang", message: "ambang harus objek." });
    } else {
      for (const [key, [min, max]] of Object.entries(AMBANG_RANGE)) {
        const value = body.ambang[key];
        if (value === undefined) continue;
        if (!Number.isInteger(value) || value < min || value > max) {
          errors.push({ field: `ambang.${key}`, message: `${key} harus bilangan bulat ${min}-${max}.` });
        } else update[`ambang.${key}`] = value;
      }
    }
  }

  if (errors.length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Data insiden tidak valid.", errors);
  }

  const incident = await getActiveIncident();
  incident.set({ ...update, updated_by: req.user.user_id });
  await incident.save();
  return sendSuccess(res, 200, await serialize(incident));
});

module.exports = { getIncident, updateIncident, AMBANG_RANGE };
