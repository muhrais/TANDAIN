/**
 * Menentukan posko "saat ini" untuk seorang korban berdasarkan status
 * penanganannya — dipakai bersama oleh dashboardController & poskoController
 * (FR-BE-06, FR-BE-07) supaya logikanya konsisten di satu tempat saja.
 *
 * Aturan (sesuai alur status pada PRD bagian 4.2):
 * - registered / triaged  -> korban masih berada di posko_asal
 * - waiting_transfer / in_transit / arrived -> korban sudah menuju/berada
 *   di posko_tujuan (fallback ke posko_asal kalau posko_tujuan belum diisi)
 */
function currentPoskoId(victim) {
  const earlyStages = ["registered", "triaged"];
  if (earlyStages.includes(victim.status_korban)) {
    return victim.posko_asal || null;
  }
  return victim.posko_tujuan || victim.posko_asal || null;
}

module.exports = { currentPoskoId };
