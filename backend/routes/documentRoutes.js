const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const {
  acceptDocumentRequest,
  getAllDocuments,
  getDocsByStudent,
  getMyDocs,
  requestDocument,
  updateDocStatus,
  uploadDocument,
} = require("../controllers/documentController");
const { protect } = require("../middleware/auth");
const { isConsultancy, isStudent } = require("../middleware/role");

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

  return `${baseName || "file"}${extension}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new Error("Only PDF, JPG, JPEG, PNG, and DOCX files are allowed"));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.get("/", protect, isConsultancy, getAllDocuments);
router.post("/request", protect, isConsultancy, requestDocument);
router.get("/student/:studentId", protect, isConsultancy, getDocsByStudent);
router.get("/my", protect, isStudent, getMyDocs);
router.patch("/:id/accept", protect, isStudent, acceptDocumentRequest);
router.post("/:id/upload", protect, isStudent, upload.single("file"), uploadDocument);
router.patch("/:id/status", protect, isConsultancy, updateDocStatus);

module.exports = router;
module.exports.upload = upload;
