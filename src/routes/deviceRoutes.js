const express = require("express");
const {
  receiveHeartbeat,
  receiveButtonPress,
  listDevices,
} = require("../controllers/deviceController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");
const { requireDeviceKey } = require("../middleware/deviceKey");
const { queueWifiCommand, readWifiCommand, prepareBluetoothCommand } = require("../controllers/deviceWifiController");

const router = express.Router();

// Firmware mengirim heartbeat tanpa token pengguna; di server publik dikunci
// dengan header X-Device-Key (aktif bila DEVICE_API_KEY diisi).
router.post("/heartbeat", requireDeviceKey, receiveHeartbeat);
router.post("/button", requireDeviceKey, receiveButtonPress);

// Dashboard harus login untuk membaca armada perangkat.
router.get("/", authenticate, requireRole(...ROLES.KOORDINATOR), listDevices);
router.post("/:tagId/wifi", authenticate, requireRole(...ROLES.KOORDINATOR), queueWifiCommand);
router.get("/:tagId/wifi/:commandId", authenticate, requireRole(...ROLES.KOORDINATOR), readWifiCommand);
router.post("/:tagId/wifi-bluetooth", authenticate, requireRole(...ROLES.KOORDINATOR), prepareBluetoothCommand);

module.exports = router;
