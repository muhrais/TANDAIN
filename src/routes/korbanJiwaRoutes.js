const express = require("express");
const {
  listKorbanJiwa,
  createKorbanJiwa,
  updateKorbanJiwa,
  deleteKorbanJiwa,
} = require("../controllers/korbanJiwaController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRole(...ROLES.STAFF_MEDIS), listKorbanJiwa);
router.post("/", requireRole(...ROLES.PENCATAT_KORBAN_JIWA), createKorbanJiwa);
// Batas 30 menit untuk tenaga medis lapangan dicek di controller.
router.put("/:id", requireRole(...ROLES.PENCATAT_KORBAN_JIWA), updateKorbanJiwa);
router.delete("/:id", requireRole(...ROLES.KOORDINATOR), deleteKorbanJiwa);

module.exports = router;
