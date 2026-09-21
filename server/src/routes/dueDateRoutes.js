const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  listDueDates,
  createDueDate,
  updateDueDate,
  deleteDueDate,
  acknowledgeDueDate,
  getDueDatesAttentionCount
} = require("../controllers/dueDateController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));
router.use(authorizeAdminSections("due_dates"));

router.get("/attention-count", getDueDatesAttentionCount);
router.get("/", listDueDates);
router.post("/", createDueDate);
router.put("/:id", updateDueDate);
router.patch("/:id/acknowledge", acknowledgeDueDate);
router.delete("/:id", deleteDueDate);

module.exports = router;
