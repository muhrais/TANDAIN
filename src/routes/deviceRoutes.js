const express = require("express");
const { receiveHeartbeat, listDevices } = require("../controllers/deviceController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Firmware mengirim heartbeat tanpa token pengguna.
router.post("/heartbeat", receiveHeartbeat);

// Dashboard harus login untuk membaca armada perangkat.
router.get("/", authenticate, listDevices);

module.exports = router;
