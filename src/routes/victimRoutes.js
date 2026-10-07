const express = require("express");
const {
  createVictim,
  updateVictim,
  listVictims,
  getVictimDetail,
} = require("../controllers/victimController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// Seluruh endpoint korban mewajibkan autentikasi (Auth: Ya pada PRD bagian 6).
router.use(authenticate, requireRole(...ROLES.STAFF_MEDIS));

router.get("/", listVictims); // GET /api/victims
router.get("/:id", getVictimDetail); // GET /api/victims/:id
router.post("/", createVictim); // POST /api/victims
router.put("/:id", updateVictim); // PUT /api/victims/:id

module.exports = router;
