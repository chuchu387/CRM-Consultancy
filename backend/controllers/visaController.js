const User = require("../models/User");
const VisaApplication = require("../models/VisaApplication");
const { logStudentActivity } = require("../utils/activity");
const { createNotification } = require("../utils/notification");

const validStatuses = [
  "Application Received",
  "Documents Pending",
  "Documents Under Review",
  "Submitted to Embassy",
  "Interview Scheduled",
  "Approved",
  "Rejected",
  "On Hold",
];

const createVisa = async (req, res, next) => {
  try {
    const { studentId, country, visaType, note = "" } = req.body;

    if (!studentId || !country || !visaType) {
      return res.status(400).json({
        success: false,
        message: "Student, country, and visa type are required",
      });
    }

    const student = await User.findOne({ _id: studentId, role: "student" });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const visaApplication = await VisaApplication.create({
      studentId,
      country: country.trim(),
      visaType: visaType.trim(),
      note: note.trim(),
      statusHistory: [
        {
          status: "Application Received",
          note: note.trim() || "Visa application has been created",
          updatedBy: req.user.id,
          updatedAt: new Date(),
        },
      ],
    });

    const populatedVisa = await VisaApplication.findById(visaApplication._id).populate(
      "studentId",
      "name email phone address"
    );

    await logStudentActivity({
      studentId,
      actor: req.user,
      actionType: "visa_created",
      entityType: "visa_application",
      entityId: visaApplication._id,
      message: `Created visa application for ${country.trim()} (${visaType.trim()})`,
    });

    return res.status(201).json({
      success: true,
      data: populatedVisa,
      message: "Visa application created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getAllVisa = async (req, res, next) => {
  try {
    const visaApplications = await VisaApplication.find()
      .populate("studentId", "name email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: visaApplications,
      message: "Visa applications retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getMyVisa = async (req, res, next) => {
  try {
    const visaApplications = await VisaApplication.find({ studentId: req.user.id }).sort({
      updatedAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: visaApplications,
      message: "Visa applications retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getVisaById = async (req, res, next) => {
  try {
    const visaApplication = await VisaApplication.findById(req.params.id).populate(
      "studentId",
      "name email phone address createdAt"
    );

    if (!visaApplication) {
      return res.status(404).json({
        success: false,
        message: "Visa application not found",
      });
    }

    if (
      req.user.role === "student" &&
      visaApplication.studentId?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: visaApplication,
      message: "Visa application retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, note = "" } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid visa status",
      });
    }

    const visaApplication = await VisaApplication.findById(req.params.id).populate(
      "studentId",
      "name email"
    );

    if (!visaApplication) {
      return res.status(404).json({
        success: false,
        message: "Visa application not found",
      });
    }

    visaApplication.status = status;
    visaApplication.statusHistory.push({
      status,
      note: note.trim(),
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await visaApplication.save();

    await logStudentActivity({
      studentId: visaApplication.studentId._id,
      actor: req.user,
      actionType: "visa_status_updated",
      entityType: "visa_application",
      entityId: visaApplication._id,
      message: `Visa status changed to ${status}`,
      metadata: {
        status,
        note: note.trim(),
      },
    });

    await createNotification({
      userId: visaApplication.studentId._id,
      type: "visa",
      title: "Visa status updated",
      message: `${visaApplication.country} ${visaApplication.visaType} is now ${status}`,
      link: "/student/visa",
      metadata: {
        visaId: visaApplication._id,
        status,
      },
    });

    return res.status(200).json({
      success: true,
      data: visaApplication,
      message: "Visa status updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createVisa,
  getAllVisa,
  getMyVisa,
  getVisaById,
  updateStatus,
};
