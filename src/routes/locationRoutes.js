const express = require("express");
const {
  receiveLocation,
  receiveLocationBatch,
  getLatestLocations,
} = require("../controllers/locationController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");
const { requireDeviceKey } = require("../middleware/deviceKey");

const router = express.Router();

// POST /api/locations (Auth: X-Device-Key bila DEVICE_API_KEY diisi) — dikirim langsung oleh firmware tag
router.post("/", requireDeviceKey, receiveLocation);

// POST /api/locations/batch (Auth: Tidak) — sinkronisasi offline buffer
router.post("/batch", requireDeviceKey, receiveLocationBatch);

// GET /api/locations/latest (Auth: Ya, koordinator) — peta dashboard
router.get("/latest", authenticate, requireRole(...ROLES.KOORDINATOR), getLatestLocations);

module.exports = router;
