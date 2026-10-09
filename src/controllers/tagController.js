const Tag = require("../models/Tag");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

// Lama LED berkedip setelah koordinator menekan "Identifikasi".
const IDENTIFY_DURATION_MS = 15 * 1000;

async function findTagOrThrow(tag_id) {
  const tag = await Tag.findOne({ tag_id });
  if (!tag) {
    throw new ApiError(
      404,
      "TAG_NOT_FOUND",
      "tag_id tidak ditemukan. Nyalakan perangkat dulu supaya terdaftar lewat heartbeat."
    );
  }
  return tag;
}

/**
 * POST /api/tags/:tag_id/pair (Auth: Ya, koordinator)
 * Memasangkan UID NFC gelang ke perangkat GPS (satu unit fisik), dilakukan
 * sekali saat persiapan alat. Body: { nfc_uid, force? }
 *
 * - UID yang sudah terpasang ke gelang lain -> 409 NFC_ALREADY_PAIRED,
 *   kecuali force: true (mis. NFC dipindah karena casing rusak).
 * - Perangkat yang sudah punya UID lain -> diganti (pairing ulang).
 */
const pairTag = asyncHandler(async (req, res) => {
  const { tag_id } = req.params;
  const { nfc_uid, force = false } = req.body ?? {};

  if (!nfc_uid || typeof nfc_uid !== "string" || !nfc_uid.trim()) {
    throw new ApiError(400, "VALIDATION_ERROR", "nfc_uid wajib diisi (string).");
  }
  const uid = nfc_uid.trim().toLowerCase();

  const tag = await findTagOrThrow(tag_id);

  const holder = await Tag.findOne({ nfc_uid: uid, tag_id: { $ne: tag_id } });
  if (holder && !force) {
    throw new ApiError(
      409,
      "NFC_ALREADY_PAIRED",
      `UID NFC ini sudah dipasangkan ke ${holder.tag_id}. Kirim force: true untuk memindahkannya.`,
      { paired_to: holder.tag_id }
    );
  }
  if (holder) {
    await Tag.updateOne({ tag_id: holder.tag_id }, { $unset: { nfc_uid: 1 } });
  }

  const previous = tag.nfc_uid ?? null;
  tag.nfc_uid = uid;
  await tag.save();

  return sendSuccess(res, 200, {
    tag_id,
    nfc_uid: uid,
    previous_nfc_uid: previous !== uid ? previous : null,
    moved_from: holder ? holder.tag_id : null,
  });
});

/**
 * DELETE /api/tags/:tag_id/pair (Auth: Ya, koordinator)
 * Melepas UID NFC dari perangkat (gelang diganti/rusak).
 */
const unpairTag = asyncHandler(async (req, res) => {
  const { tag_id } = req.params;
  const tag = await findTagOrThrow(tag_id);
  const previous = tag.nfc_uid ?? null;

  await Tag.updateOne({ tag_id }, { $unset: { nfc_uid: 1 } });

  return sendSuccess(res, 200, { tag_id, previous_nfc_uid: previous });
});

/**
 * POST /api/tags/:tag_id/identify (Auth: Ya, koordinator)
 * Menyuruh LED perangkat berkedip selama 15 dtk, supaya koordinator bisa
 * mencocokkan gelang fisik sebelum pairing. Sampai ke perangkat lewat
 * respons heartbeat berikutnya (≤ 5 dtk).
 */
const identifyTag = asyncHandler(async (req, res) => {
  const { tag_id } = req.params;
  await findTagOrThrow(tag_id);

  const identifyUntil = new Date(Date.now() + IDENTIFY_DURATION_MS);
  await Tag.updateOne({ tag_id }, { $set: { identify_until: identifyUntil } });

  return sendSuccess(res, 200, { tag_id, identify_until: identifyUntil });
});

module.exports = { pairTag, unpairTag, identifyTag };
