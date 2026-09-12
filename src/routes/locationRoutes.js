const express = require("express");
const { receiveLocation, receiveLocationBatch } = require("../controllers/locationController");

const router = express.Router();

// POST /api/locations (Auth: Tidak) — dikirim langsung oleh firmware tag
router.post("/", receiveLocation);

// POST /api/locations/batch (Auth: Tidak) — sinkronisasi offline buffer
router.post("/batch", receiveLocationBatch);

module.exports = router;
