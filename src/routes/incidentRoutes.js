const express = require("express");
const { getIncident, updateIncident } = require("../controllers/incidentController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRole(...ROLES.STAFF_MEDIS), getIncident);
router.put("/", requireRole(...ROLES.KOORDINATOR), updateIncident);

module.exports = router;
