const Posko = require("../models/Posko");
const Victim = require("../models/Victim");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { currentPoskoId } = require("../utils/poskoHelper");

/**
 * GET /api/posko (Auth: Ya) - FR-BE-07
 * Daftar seluruh posko beserta jumlah korban yang SAAT INI berada di sana.
 *
 * Catatan desain: `jumlah_korban_saat_ini` dihitung live dari koleksi
 * `victims` (bukan hanya membaca field cache di dokumen Posko) supaya
 * selalu akurat mengikuti perpindahan status korban terbaru. Field cache
 * pada model Posko tetap ada untuk kebutuhan lain di masa depan (mis. jika
 * nanti perhitungan live dirasa terlalu berat dan ingin di-precompute).
 */
const listPosko = asyncHandler(async (req, res) => {
  const [poskoList, activeVictims] = await Promise.all([
    Posko.find({}),
    Victim.find({ status_korban: { $ne: "arrived" } }),
  ]);

  const countByPoskoId = new Map();
  for (const v of activeVictims) {
    const poskoId = currentPoskoId(v);
    if (!poskoId) continue;
    countByPoskoId.set(poskoId, (countByPoskoId.get(poskoId) || 0) + 1);
  }

  const result = poskoList.map((p) => {
    const jumlah_korban_saat_ini = countByPoskoId.get(p.posko_id) || 0;
    return {
      posko_id: p.posko_id,
      nama_posko: p.nama_posko,
      jenis: p.jenis,
      lokasi: p.lokasi,
      kapasitas_maksimum: p.kapasitas_maksimum,
      jumlah_korban_saat_ini,
      sisa_kapasitas: Math.max(p.kapasitas_maksimum - jumlah_korban_saat_ini, 0),
      status_kapasitas:
        jumlah_korban_saat_ini >= p.kapasitas_maksimum ? "penuh" : "tersedia",
    };
  });

  return sendSuccess(res, 200, result);
});

/**
 * GET /api/posko/:posko_id (Auth: Ya) - FR-BE-07
 * Detail satu posko beserta daftar korban yang saat ini berada di sana.
 */
const getPoskoDetail = asyncHandler(async (req, res) => {
  const { posko_id } = req.params;

  const posko = await Posko.findOne({ posko_id });
  if (!posko) {
    throw new ApiError(404, "POSKO_NOT_FOUND", "posko_id tidak ditemukan pada koleksi posko.");
  }

  const activeVictims = await Victim.find({ status_korban: { $ne: "arrived" } });
  const victimsHere = activeVictims
    .filter((v) => currentPoskoId(v) === posko_id)
    .map((v) => ({
      victim_id: v.victim_id,
      tag_id: v.tag_id,
      nama: v.nama,
      kategori_triase: v.kategori_triase,
      status_korban: v.status_korban,
      waktu_update_terakhir: v.waktu_update_terakhir,
    }));

  return sendSuccess(res, 200, {
    posko_id: posko.posko_id,
    nama_posko: posko.nama_posko,
    jenis: posko.jenis,
    lokasi: posko.lokasi,
    kapasitas_maksimum: posko.kapasitas_maksimum,
    jumlah_korban_saat_ini: victimsHere.length,
    sisa_kapasitas: Math.max(posko.kapasitas_maksimum - victimsHere.length, 0),
    victims: victimsHere,
  });
});

module.exports = { listPosko, getPoskoDetail };
