const express = require("express");

const {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/", protect, isConsultancy, getTasks);
router.post("/", protect, isConsultancy, createTask);
router.patch("/:id", protect, isConsultancy, updateTask);
router.delete("/:id", protect, isConsultancy, deleteTask);

module.exports = router;
