const express = require("express");
const {
  receiveLocation,
  receiveLocationBatch,
  getLatestLocations,
} = require("../controllers/locationController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// POST /api/locations (Auth: Tidak) — dikirim langsung oleh firmware tag
router.post("/", receiveLocation);

// POST /api/locations/batch (Auth: Tidak) — sinkronisasi offline buffer
router.post("/batch", receiveLocationBatch);

// GET /api/locations/latest (Auth: Ya, koordinator) — peta dashboard
router.get("/latest", authenticate, requireRole(...ROLES.KOORDINATOR), getLatestLocations);

module.exports = router;
