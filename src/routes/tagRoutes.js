const express = require("express");
const { scanTag } = require("../controllers/victimController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// POST /api/tags/:tag_id/scan (Auth: Ya)
router.post("/:tag_id/scan", authenticate, requireRole(...ROLES.STAFF_MEDIS), scanTag);

module.exports = router;
