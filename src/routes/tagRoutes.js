const express = require("express");
const { scanTag } = require("../controllers/victimController");
const { pairTag, unpairTag, identifyTag } = require("../controllers/tagController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// POST /api/tags/:tag_id/scan (Auth: Ya)
router.post("/:tag_id/scan", authenticate, requireRole(...ROLES.STAFF_MEDIS), scanTag);

// Pairing NFC <-> perangkat GPS saat persiapan alat (koordinator).
router.post("/:tag_id/pair", authenticate, requireRole(...ROLES.KOORDINATOR), pairTag);
router.delete("/:tag_id/pair", authenticate, requireRole(...ROLES.KOORDINATOR), unpairTag);
router.post("/:tag_id/identify", authenticate, requireRole(...ROLES.KOORDINATOR), identifyTag);

module.exports = router;
