const express = require("express");
const { listPosko, getPoskoDetail, updatePosko } = require("../controllers/poskoController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// GET /api/posko (Auth: Ya) - FR-BE-07
router.get("/", requireRole(...ROLES.STAFF_MEDIS), listPosko);

// GET /api/posko/:posko_id (Auth: Ya) - FR-BE-07
router.get("/:posko_id", requireRole(...ROLES.STAFF_MEDIS), getPoskoDetail);

// PUT /api/posko/:posko_id - Pengaturan > Posko (koordinator)
router.put("/:posko_id", requireRole(...ROLES.KOORDINATOR), updatePosko);

module.exports = router;
