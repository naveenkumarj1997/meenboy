const express = require("express");
const { protect, authorizeRoles } = require("../middleware/auth");
const { getAllUsers, updateUser, deleteUser } = require("../controllers/userController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/", getAllUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
