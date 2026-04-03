const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const {
  changeMyPassword,
  getAllConsultancies,
  getAllStudents,
  updateMyProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { isConsultancy } = require("../middleware/role");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const sanitizeFilename = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  const baseName = path
    .basename(filename, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "avatar"}${extension}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`);
  },
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp"]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed"));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
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
