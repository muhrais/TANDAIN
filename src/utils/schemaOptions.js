/**
 * Opsi schema Mongoose yang dipakai bersama oleh seluruh model.
 *
 * Alasan (Week 5 - review response API, koordinasi dgn Frontend):
 * Setiap koleksi sudah punya business ID sendiri yang eksplisit di PRD
 * (tag_id, victim_id, location_id, history_id, posko_id, user_id), jadi
 * `_id` bawaan MongoDB hanya noise di response JSON dan berisiko membuat
 * frontend salah pakai ID. `toJSON.transform` di bawah menyembunyikan
 * `_id` (dan `id` virtual bawaan Mongoose) setiap kali dokumen diubah ke
 * JSON lewat res.json(), tanpa mengubah cara field itu dipakai secara
 * internal di kode backend (query, ref, dsb tetap jalan seperti biasa).
 */
function schemaOptions(extra = {}) {
  return {
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.id;
        return ret;
      },
    },
    ...extra,
  };
}

module.exports = schemaOptions;
