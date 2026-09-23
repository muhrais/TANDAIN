const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/summary (Auth: Ya) - FR-BE-06
router.get("/summary", authenticate, getDashboardSummary);

module.exports = router;
