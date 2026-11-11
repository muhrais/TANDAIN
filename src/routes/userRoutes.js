const express = require("express");
const { listUsers, createUser, updateUser } = require("../controllers/userController");
const { authenticate, requireRole, ROLES } = require("../middleware/auth");

const router = express.Router();

// Manajemen pengguna (Pengaturan > Pengguna) hanya untuk koordinator.
router.use(authenticate, requireRole(...ROLES.KOORDINATOR));

router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id", updateUser);

module.exports = router;
