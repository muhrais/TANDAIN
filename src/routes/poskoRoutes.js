const express = require("express");
const { listPosko, getPoskoDetail } = require("../controllers/poskoController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole(...ROLES.STAFF_MEDIS));

// GET /api/posko (Auth: Ya) - FR-BE-07
router.get("/", listPosko);

// GET /api/posko/:posko_id (Auth: Ya) - FR-BE-07
router.get("/:posko_id", getPoskoDetail);

module.exports = router;
