const express = require("express");
const {
  receiveHeartbeat,
  receiveButtonPress,
  listDevices,
} = require("../controllers/deviceController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");
const { requireDeviceKey } = require("../middleware/deviceKey");

const router = express.Router();

// Firmware mengirim heartbeat tanpa token pengguna; di server publik dikunci
// dengan header X-Device-Key (aktif bila DEVICE_API_KEY diisi).
router.post("/heartbeat", requireDeviceKey, receiveHeartbeat);
router.post("/button", requireDeviceKey, receiveButtonPress);

// Dashboard harus login untuk membaca armada perangkat.
router.get("/", authenticate, requireRole(...ROLES.KOORDINATOR), listDevices);

module.exports = router;
