const DocumentRequest = require("../models/DocumentRequest");
const User = require("../models/User");
const VisaApplication = require("../models/VisaApplication");
const { logStudentActivity } = require("../utils/activity");
const { createNotification } = require("../utils/notification");

const populateDocumentQuery = (query) =>
  query
    .populate("studentId", "name email")
    .populate("requestedBy", "name email")
    .populate("visaApplicationId", "country visaType status");

const buildRequestedDocuments = (payload) => {
  if (Array.isArray(payload.documents) && payload.documents.length) {
    return payload.documents.map((item) => ({
      documentName: (item.documentName || "").trim(),
      description: (item.description || "").trim(),
    }));
  }

  return [
    {
      documentName: (payload.documentName || "").trim(),
      description: (payload.description || "").trim(),
    },
  ];
};

const normalizeCorrectionItems = (correctionItems = []) =>
  Array.isArray(correctionItems)
    ? correctionItems
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

const requestDocument = async (req, res, next) => {
  try {
    const {
      studentId,
      visaApplicationId = null,
      documentName,
      description = "",
      documents = [],
    } = req.body;
    const requestedDocuments = buildRequestedDocuments({
      documentName,
      description,
      documents,
    });

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student is required",
      });
    }

    if (!requestedDocuments.length || requestedDocuments.some((item) => !item.documentName)) {
      return res.status(400).json({
        success: false,
        message: "Every requested document must include a document name",
      });
    }

    const student = await User.findOne({ _id: studentId, role: "student" });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (visaApplicationId) {
      const visaApplication = await VisaApplication.findOne({
        _id: visaApplicationId,
        studentId,
      });

      if (!visaApplication) {
        return res.status(404).json({
          success: false,
          message: "Visa application not found for this student",
        });
      }
    }

    const requestBatchId =
      requestedDocuments.length > 1
        ? `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        : "";

    const createdDocuments = await DocumentRequest.insertMany(
      requestedDocuments.map((item) => ({
        studentId,
        visaApplicationId,
        requestedBy: req.user.id,
        documentName: item.documentName,
        description: item.description,
        requestBatchId,
      }))
    );

    const populatedDocuments = await populateDocumentQuery(
      DocumentRequest.find({
        _id: { $in: createdDocuments.map((item) => item._id) },
      }).sort({ createdAt: -1 })
    );

    await logStudentActivity({
      studentId,
      actor: req.user,
      actionType: "document_request_created",
      entityType: "document_request",
      entityId: requestBatchId || createdDocuments[0]?._id,
      message:
        populatedDocuments.length === 1
          ? `Requested document: ${populatedDocuments[0].documentName}`
          : `Requested ${populatedDocuments.length} documents in a checklist batch`,
      metadata: {
        count: populatedDocuments.length,
        requestBatchId,
      },
    });

    await createNotification({
      userId: studentId,
      type: "document",
      title:
        populatedDocuments.length === 1
          ? "New document request"
          : "New checklist of required documents",
      message:
        populatedDocuments.length === 1
          ? `${populatedDocuments[0].documentName} has been requested`
          : `${populatedDocuments.length} required documents were sent to you`,
      link: "/student/documents",
      metadata: {
        requestBatchId,
        count: populatedDocuments.length,
      },
    });

    return res.status(201).json({
      success: true,
      data: populatedDocuments.length === 1 ? populatedDocuments[0] : populatedDocuments,
      message:
        populatedDocuments.length === 1
          ? "Document request created successfully"
          : `${populatedDocuments.length} required documents sent successfully`,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllDocuments = async (req, res, next) => {
  try {
    const documents = await populateDocumentQuery(DocumentRequest.find().sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      data: documents,
      message: "Document requests retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getDocsByStudent = async (req, res, next) => {
  try {
    const documents = await populateDocumentQuery(
      DocumentRequest.find({ studentId: req.params.studentId }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: documents,
      message: "Student documents retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getMyDocs = async (req, res, next) => {
  try {
    const documents = await populateDocumentQuery(
      DocumentRequest.find({ studentId: req.user.id }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: documents,
      message: "Documents retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const acceptDocumentRequest = async (req, res, next) => {
  try {
    const documentRequest = await populateDocumentQuery(DocumentRequest.findById(req.params.id));

    if (!documentRequest) {
      return res.status(404).json({
        success: false,
        message: "Document request not found",
      });
    }

    if (documentRequest.studentId?._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (documentRequest.studentAcceptanceStatus === "accepted") {
      return res.status(200).json({
        success: true,
        data: documentRequest,
        message: "Document request already accepted",
      });
    }

    documentRequest.studentAcceptanceStatus = "accepted";
    documentRequest.acceptedAt = new Date();
    await documentRequest.save();

    await logStudentActivity({
      studentId: documentRequest.studentId._id,
      actor: req.user,
      actionType: "document_request_accepted",
      entityType: "document_request",
      entityId: documentRequest._id,
      message: `Accepted document request: ${documentRequest.documentName}`,
    });

    await createNotification({
      userId: documentRequest.requestedBy._id || documentRequest.requestedBy,
      type: "document",
      title: "Document request accepted",
      message: `${documentRequest.studentId.name} accepted ${documentRequest.documentName}`,
      link: "/consultancy/documents",
      metadata: {
        documentId: documentRequest._id,
        studentId: documentRequest.studentId._id,
      },
    });

    return res.status(200).json({
      success: true,
      data: documentRequest,
      message: "Document request accepted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A file upload is required",
      });
    }

    const documentRequest = await populateDocumentQuery(DocumentRequest.findById(req.params.id));

    if (!documentRequest) {
      return res.status(404).json({
        success: false,
        message: "Document request not found",
      });
    }

    if (documentRequest.studentId?._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (documentRequest.studentAcceptanceStatus !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Please accept this document request before uploading",
      });
    }

    documentRequest.uploadHistory = documentRequest.uploadHistory || [];

    if (documentRequest.fileUrl) {
      const latestExistingUpload =
        documentRequest.uploadHistory[documentRequest.uploadHistory.length - 1];

      if (!latestExistingUpload || latestExistingUpload.fileUrl !== documentRequest.fileUrl) {
        documentRequest.uploadHistory.push({
          fileUrl: documentRequest.fileUrl,
          fileName: documentRequest.fileName,
          fileMimeType: documentRequest.fileMimeType,
          uploadedAt: documentRequest.uploadedAt || new Date(),
          reviewStatus: documentRequest.status === "uploaded" ? "uploaded" : documentRequest.status,
          reviewedAt: documentRequest.reviewedAt || null,
          reviewNote: documentRequest.reviewNote || "",
          correctionItems: documentRequest.correctionItems || [],
          reviewedByName: documentRequest.reviewedByName || "",
        });
      }
    }

    documentRequest.fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    documentRequest.fileName = req.file.originalname;
    documentRequest.fileMimeType = req.file.mimetype;
    documentRequest.status = "uploaded";
    documentRequest.uploadedAt = new Date();
    documentRequest.reviewNote = "";
    documentRequest.correctionItems = [];
    documentRequest.reviewedAt = null;
    documentRequest.reviewedByName = "";
    documentRequest.uploadHistory.push({
      fileUrl: documentRequest.fileUrl,
      fileName: documentRequest.fileName,
      fileMimeType: documentRequest.fileMimeType,
      uploadedAt: documentRequest.uploadedAt,
      reviewStatus: "uploaded",
      reviewedAt: null,
      reviewNote: "",
      correctionItems: [],
      reviewedByName: "",
    });

    await documentRequest.save();

    await logStudentActivity({
      studentId: documentRequest.studentId._id,
      actor: req.user,
      actionType: "document_uploaded",
      entityType: "document_request",
      entityId: documentRequest._id,
      message: `Uploaded document: ${documentRequest.documentName}`,
      metadata: {
        fileName: documentRequest.fileName,
      },
    });

    await createNotification({
      userId: documentRequest.requestedBy._id || documentRequest.requestedBy,
      type: "document",
      title: "Student uploaded a document",
      message: `${documentRequest.studentId.name} uploaded ${documentRequest.documentName}`,
      link: "/consultancy/documents",
      metadata: {
        documentId: documentRequest._id,
        studentId: documentRequest.studentId._id,
      },
    });

    return res.status(200).json({
      success: true,
      data: documentRequest,
      message: "Document uploaded successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateDocStatus = async (req, res, next) => {
  try {
    const { status, reviewNote = "", correctionItems = [] } = req.body;
    const trimmedReviewNote = reviewNote.trim();
    const normalizedCorrectionItems = normalizeCorrectionItems(correctionItems);
    const effectiveCorrectionItems =
      normalizedCorrectionItems.length || status !== "changes_requested"
        ? normalizedCorrectionItems
        : trimmedReviewNote
          ? [trimmedReviewNote]
          : [];
    const reviewSummary = effectiveCorrectionItems.length
      ? effectiveCorrectionItems.join(" | ")
      : trimmedReviewNote;

    if (!["approved", "changes_requested", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved, changes_requested, or rejected",
      });
    }

    if (status === "changes_requested" && !effectiveCorrectionItems.length) {
      return res.status(400).json({
        success: false,
        message: "At least one correction point is required",
      });
    }

    if (status === "rejected" && !trimmedReviewNote) {
      return res.status(400).json({
        success: false,
        message: "A review message is required",
      });
    }

    const documentRequest = await populateDocumentQuery(DocumentRequest.findById(req.params.id));

    if (!documentRequest) {
      return res.status(404).json({
        success: false,
        message: "Document request not found",
      });
    }

    documentRequest.status = status;
    documentRequest.reviewNote =
      status === "changes_requested" ? (trimmedReviewNote || reviewSummary) : trimmedReviewNote;
    documentRequest.correctionItems =
      status === "changes_requested" ? effectiveCorrectionItems : [];
    documentRequest.reviewedAt = new Date();
    documentRequest.reviewedByName = req.user.name;
    documentRequest.uploadHistory = documentRequest.uploadHistory || [];
    if (!documentRequest.uploadHistory.length && documentRequest.fileUrl) {
      documentRequest.uploadHistory.push({
        fileUrl: documentRequest.fileUrl,
        fileName: documentRequest.fileName,
        fileMimeType: documentRequest.fileMimeType,
        uploadedAt: documentRequest.uploadedAt || new Date(),
        reviewStatus: status,
        reviewedAt: new Date(),
        reviewNote: status === "changes_requested" ? (trimmedReviewNote || reviewSummary) : trimmedReviewNote,
        correctionItems: status === "changes_requested" ? effectiveCorrectionItems : [],
        reviewedByName: req.user.name,
      });
    }
    if (documentRequest.uploadHistory?.length) {
      const latestUpload = documentRequest.uploadHistory[documentRequest.uploadHistory.length - 1];
      latestUpload.reviewStatus = status;
      latestUpload.reviewedAt = new Date();
      latestUpload.reviewNote =
        status === "changes_requested" ? (trimmedReviewNote || reviewSummary) : trimmedReviewNote;
      latestUpload.correctionItems =
        status === "changes_requested" ? effectiveCorrectionItems : [];
      latestUpload.reviewedByName = req.user.name;
    }
    await documentRequest.save();

    const activityMessage =
      status === "changes_requested"
        ? `Corrections requested for ${documentRequest.documentName}`
        : `${documentRequest.documentName} was ${status}`;
    const notificationMessage =
      status === "changes_requested" && effectiveCorrectionItems.length
        ? `Corrections requested for ${documentRequest.documentName}: ${effectiveCorrectionItems.length} item${effectiveCorrectionItems.length === 1 ? "" : "s"} need attention`
        : status === "changes_requested" && reviewSummary
          ? `Corrections requested for ${documentRequest.documentName}: ${reviewSummary}`
        : status === "rejected" && trimmedReviewNote
          ? `${documentRequest.documentName} was rejected: ${trimmedReviewNote}`
          : `${documentRequest.documentName} was ${status}`;

    await logStudentActivity({
      studentId: documentRequest.studentId._id,
      actor: req.user,
      actionType: "document_status_updated",
      entityType: "document_request",
      entityId: documentRequest._id,
      message: activityMessage,
      metadata: {
        status,
        reviewNote: status === "changes_requested" ? reviewSummary : trimmedReviewNote,
        correctionItems: effectiveCorrectionItems,
      },
    });

    await createNotification({
      userId: documentRequest.studentId._id,
      type: "document",
      title: status === "changes_requested" ? "Document changes requested" : "Document review updated",
      message: notificationMessage,
      link: "/student/documents",
      metadata: {
        documentId: documentRequest._id,
        status,
        reviewNote: status === "changes_requested" ? reviewSummary : trimmedReviewNote,
        correctionItems: effectiveCorrectionItems,
      },
    });

    return res.status(200).json({
      success: true,
      data: documentRequest,
      message: "Document status updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requestDocument,
  getAllDocuments,
  getDocsByStudent,
  getMyDocs,
  acceptDocumentRequest,
  uploadDocument,
  updateDocStatus,
};
