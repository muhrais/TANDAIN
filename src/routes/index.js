const express = require("express");
const authRoutes = require("./authRoutes");
const locationRoutes = require("./locationRoutes");
const victimRoutes = require("./victimRoutes");
const tagRoutes = require("./tagRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const poskoRoutes = require("./poskoRoutes");

const router = express.Router();

// Health check sederhana untuk memastikan server & koneksi DB hidup.
router.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } });
});

router.use("/auth", authRoutes);
router.use("/locations", locationRoutes);
router.use("/victims", victimRoutes);
router.use("/tags", tagRoutes);
router.use("/dashboard", dashboardRoutes); // Week 5: FR-BE-06
router.use("/posko", poskoRoutes); // Week 5: FR-BE-07

module.exports = router;
