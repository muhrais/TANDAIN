const express = require("express");
const {
  createTestSession,
  stopTestSession,
  listTestSessions,
  getTestSessionSummary,
} = require("../controllers/testSessionController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// Sesi uji lapangan (S-01, S-02, S-09, R-02) dikelola koordinator.
router.use(authenticate, requireRole(...ROLES.KOORDINATOR));
router.get("/", listTestSessions);
router.post("/", createTestSession);
router.post("/:id/stop", stopTestSession);
router.get("/:id/summary", getTestSessionSummary);

module.exports = router;
