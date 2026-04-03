const UniversityApplication = require("../models/UniversityApplication");
const User = require("../models/User");
const { logStudentActivity } = require("../utils/activity");
const { createNotification } = require("../utils/notification");

const populateUniversityQuery = (query) => query.populate("studentId", "name email phone");

const getAllUniversityApplications = async (req, res, next) => {
  try {
    const applications = await populateUniversityQuery(
      UniversityApplication.find().sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: applications,
      message: "University applications retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getUniversityApplicationsByStudent = async (req, res, next) => {
  try {
    const applications = await populateUniversityQuery(
      UniversityApplication.find({ studentId: req.params.studentId }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      data: applications,
      message: "Student university applications retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getMyUniversityApplications = async (req, res, next) => {
  try {
    const applications = await UniversityApplication.find({ studentId: req.user.id }).sort({
      updatedAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: applications,
      message: "University applications retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const createUniversityApplication = async (req, res, next) => {
  try {
    const {
      studentId,
      country,
      universityName,
      programName,
      intake,
      applicationStatus = "draft",
      offerLetterStatus = "pending",
      tuitionDepositStatus = "pending",
      enrollmentDocumentType = "I-20",
      enrollmentDocumentStatus = "pending",
      note = "",
    } = req.body;

    if (!studentId || !country || !universityName || !programName || !intake) {
      return res.status(400).json({
        success: false,
        message: "Student, country, university, program, and intake are required",
      });
    }

    const normalizedEnrollmentDocumentType = String(enrollmentDocumentType || "").trim() || "I-20";

    const student = await User.findOne({ _id: studentId, role: "student" });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const application = await UniversityApplication.create({
      studentId,
      country: country.trim(),
      universityName: universityName.trim(),
      programName: programName.trim(),
      intake: intake.trim(),
      applicationStatus,
      offerLetterStatus,
      tuitionDepositStatus,
      enrollmentDocumentType: normalizedEnrollmentDocumentType,
      enrollmentDocumentStatus,
      note: note.trim(),
    });

    await logStudentActivity({
      studentId,
      actor: req.user,
      actionType: "university_application_created",
      entityType: "university_application",
      entityId: application._id,
      message: `Added university application for ${universityName.trim()}`,
    });

    await createNotification({
      userId: studentId,
      type: "system",
      title: "University application added",
      message: `${universityName.trim()} has been added to your application tracker`,
      link: "/student/university-applications",
      metadata: { applicationId: application._id },
    });

    const populatedApplication = await populateUniversityQuery(
      UniversityApplication.findById(application._id)
    );

    return res.status(201).json({
      success: true,
      data: populatedApplication,
      message: "University application created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateUniversityApplication = async (req, res, next) => {
  try {
    const application = await UniversityApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "University application not found",
      });
    }

    const fields = [
      "country",
      "universityName",
      "programName",
      "intake",
      "applicationStatus",
      "offerLetterStatus",
      "tuitionDepositStatus",
      "enrollmentDocumentType",
      "enrollmentDocumentStatus",
      "note",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        application[field] =
          typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    });

    if (!application.enrollmentDocumentType) {
      application.enrollmentDocumentType = "I-20";
    }

    await application.save();

    await logStudentActivity({
      studentId: application.studentId,
      actor: req.user,
      actionType: "university_application_updated",
      entityType: "university_application",
      entityId: application._id,
      message: `Updated university application for ${application.universityName}`,
      metadata: {
        applicationStatus: application.applicationStatus,
        offerLetterStatus: application.offerLetterStatus,
        tuitionDepositStatus: application.tuitionDepositStatus,
        enrollmentDocumentStatus: application.enrollmentDocumentStatus,
      },
    });

    await createNotification({
      userId: application.studentId,
      type: "system",
      title: "University application updated",
      message: `${application.universityName} tracker was updated`,
      link: "/student/university-applications",
      metadata: { applicationId: application._id },
    });

    const populatedApplication = await populateUniversityQuery(
      UniversityApplication.findById(application._id)
    );

    return res.status(200).json({
      success: true,
      data: populatedApplication,
      message: "University application updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllUniversityApplications,
  getUniversityApplicationsByStudent,
  getMyUniversityApplications,
  createUniversityApplication,
  updateUniversityApplication,
};
