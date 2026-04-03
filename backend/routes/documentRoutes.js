const express = require("express");
const multer = require("multer");

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
  storage: multer.memoryStorage(),
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
