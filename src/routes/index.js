const express = require("express");
const authRoutes = require("./authRoutes");
const locationRoutes = require("./locationRoutes");
const victimRoutes = require("./victimRoutes");
const tagRoutes = require("./tagRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const poskoRoutes = require("./poskoRoutes");
const deviceRoutes = require("./deviceRoutes");
const testSessionRoutes = require("./testSessionRoutes");
const korbanJiwaRoutes = require("./korbanJiwaRoutes");
const incidentRoutes = require("./incidentRoutes");
const userRoutes = require("./userRoutes");

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
router.use("/devices", deviceRoutes);
router.use("/test-sessions", testSessionRoutes);
router.use("/korban-jiwa", korbanJiwaRoutes);
router.use("/incident", incidentRoutes);
router.use("/users", userRoutes);

module.exports = router;
