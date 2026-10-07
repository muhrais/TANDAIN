const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/summary (Auth: Ya) - FR-BE-06
router.get("/summary", authenticate, requireRole(...ROLES.KOORDINATOR), getDashboardSummary);

module.exports = router;
