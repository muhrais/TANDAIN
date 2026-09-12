const express = require("express");
const authRoutes = require("./authRoutes");
const locationRoutes = require("./locationRoutes");
const victimRoutes = require("./victimRoutes");
const tagRoutes = require("./tagRoutes");

const router = express.Router();

// Health check sederhana.
router.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } });
});

router.use("/auth", authRoutes);
router.use("/locations", locationRoutes);
router.use("/victims", victimRoutes);
router.use("/tags", tagRoutes);

module.exports = router;
