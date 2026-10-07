const express = require("express");
const {
  receiveHeartbeat,
  receiveButtonPress,
  listDevices,
} = require("../controllers/deviceController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// Firmware mengirim heartbeat tanpa token pengguna.
router.post("/heartbeat", receiveHeartbeat);
router.post("/button", receiveButtonPress);

// Dashboard harus login untuk membaca armada perangkat.
router.get("/", authenticate, requireRole(...ROLES.KOORDINATOR), listDevices);

module.exports = router;
