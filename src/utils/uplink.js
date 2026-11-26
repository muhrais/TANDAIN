/**
 * Latensi uplink perangkat -> server dari field `sent_at` (jam NTP ESP32
 * tepat sebelum request dikirim). Dipakai lokasi dan tombol darurat.
 */

// Di luar rentang ini jam perangkat dianggap belum benar (NTP belum sinkron
// atau melenceng), jadi uplink disimpan null, bukan angka yang menyesatkan.
const UPLINK_MIN_MS = -1000;
const UPLINK_MAX_MS = 60000;

// sent_at opsional; bila ada harus string ISO 8601 yang valid.
function validateSentAt(sentAt) {
  if (sentAt === undefined || sentAt === null) return null;
  if (typeof sentAt !== "string" || Number.isNaN(new Date(sentAt).getTime())) {
    return { field: "sent_at", message: "sent_at harus memakai format ISO 8601 yang valid." };
  }
  return null;
}

function parseSentAt(sentAt) {
  if (typeof sentAt !== "string") return null;
  const date = new Date(sentAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function uplinkMs(sentAt, receivedAt) {
  if (!sentAt) return null;
  const ms = receivedAt.getTime() - sentAt.getTime();
  return ms >= UPLINK_MIN_MS && ms <= UPLINK_MAX_MS ? ms : null;
}

module.exports = { validateSentAt, parseSentAt, uplinkMs, UPLINK_MIN_MS, UPLINK_MAX_MS };
