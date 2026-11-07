const User = require("../models/User");

/**
 * Peta user_id -> nama untuk menampilkan "oleh siapa" pada riwayat korban.
 * Satu query untuk semua id unik; id null (perubahan sistem) diabaikan.
 */
async function getUserNameMap(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const users = await User.find({ user_id: { $in: ids } }, { user_id: 1, nama: 1 }).lean();
  return new Map(users.map((u) => [u.user_id, u.nama]));
}

module.exports = { getUserNameMap };
