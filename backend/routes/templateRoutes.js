const express = require("express");

const {
  createTemplate,
  deleteTemplate,
  getTemplates,
  updateTemplate,
} = require("../controllers/templateController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

router.get("/", protect, isConsultancy, getTemplates);
router.post("/", protect, isConsultancy, createTemplate);
router.put("/:id", protect, isConsultancy, updateTemplate);
router.delete("/:id", protect, isConsultancy, deleteTemplate);

module.exports = router;
