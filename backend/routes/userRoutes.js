const express = require("express");
const multer = require("multer");

const {
  changeMyPassword,
  getAllConsultancies,
  getAllStudents,
  updateMyProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed"));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/students", protect, isConsultancy, getAllStudents);
router.get("/consultancies", protect, isConsultancy, getAllConsultancies);
router.patch("/profile", protect, upload.single("avatar"), updateMyProfile);
router.patch("/password", protect, changeMyPassword);

module.exports = router;
