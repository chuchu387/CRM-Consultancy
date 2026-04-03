const Meeting = require("../models/Meeting");
const User = require("../models/User");
const { logStudentActivity } = require("../utils/activity");
const { createNotification } = require("../utils/notification");

const createMeeting = async (req, res, next) => {
  try {
    const { studentId, title, proposedDate, note = "" } = req.body;

    if (!title || !proposedDate) {
      return res.status(400).json({
        success: false,
        message: "Title and proposed date are required",
      });
    }

    let payload = {
      title: title.trim(),
      proposedDate,
      note: note.trim(),
    };

    if (req.user.role === "consultancy") {
      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: "Student is required",
        });
      }

      const student = await User.findOne({ _id: studentId, role: "student" });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      payload = {
        ...payload,
        studentId,
        consultancyId: req.user.id,
        requestedBy: "consultancy",
      };
    } else {
      const consultancyUser = await User.findOne({ role: "consultancy" }).sort({
        createdAt: 1,
      });

      if (!consultancyUser) {
        return res.status(404).json({
          success: false,
          message: "Consultancy account not found",
        });
      }

      payload = {
        ...payload,
        studentId: req.user.id,
        consultancyId: consultancyUser._id,
        requestedBy: "student",
      };
    }

    const meeting = await Meeting.create(payload);
    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate("studentId", "name email phone")
      .populate("consultancyId", "name email");

    await logStudentActivity({
      studentId: populatedMeeting.studentId._id,
      actor: req.user,
      actionType: "meeting_created",
      entityType: "meeting",
      entityId: populatedMeeting._id,
      message: `Created meeting request: ${title.trim()}`,
      metadata: {
        proposedDate,
        requestedBy: populatedMeeting.requestedBy,
      },
    });

    await createNotification({
      userId:
        req.user.role === "consultancy"
          ? populatedMeeting.studentId._id
          : populatedMeeting.consultancyId._id,
      type: "meeting",
      title:
        req.user.role === "consultancy" ? "New meeting scheduled" : "New meeting request",
      message:
        req.user.role === "consultancy"
          ? `${populatedMeeting.title} was scheduled for you`
          : `${populatedMeeting.studentId.name} requested ${populatedMeeting.title}`,
      link:
        req.user.role === "consultancy" ? "/student/meetings" : "/consultancy/meetings",
      metadata: {
        meetingId: populatedMeeting._id,
      },
    });

    return res.status(201).json({
      success: true,
      data: populatedMeeting,
      message: "Meeting created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getAllMeetings = async (req, res, next) => {
  try {
    const meetings = await Meeting.find()
      .populate("studentId", "name email phone")
      .populate("consultancyId", "name email")
      .sort({ proposedDate: -1 });

    return res.status(200).json({
      success: true,
      data: meetings,
      message: "Meetings retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const getMyMeetings = async (req, res, next) => {
  try {
    const meetings = await Meeting.find({ studentId: req.user.id })
      .populate("consultancyId", "name email")
      .sort({ proposedDate: -1 });

    return res.status(200).json({
      success: true,
      data: meetings,
      message: "Meetings retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateMeetingStatus = async (req, res, next) => {
  try {
    const { status, confirmedDate, rescheduledNote = "" } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const meeting = await Meeting.findById(req.params.id)
      .populate("studentId", "name email phone")
      .populate("consultancyId", "name email");

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const allowedTransitions = {
      pending: ["accepted", "rejected", "rescheduled"],
      accepted: ["completed", "rescheduled"],
    };

    const currentAllowedStatuses = allowedTransitions[meeting.status] || [];

    if (!currentAllowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition from ${meeting.status} to ${status}`,
      });
    }

    if (status === "rescheduled" && !confirmedDate) {
      return res.status(400).json({
        success: false,
        message: "A rescheduled date is required",
      });
    }

    meeting.status = status;

    if (status === "accepted") {
      meeting.confirmedDate = confirmedDate || meeting.proposedDate;
    }

    if (status === "rescheduled") {
      meeting.confirmedDate = confirmedDate;
      meeting.rescheduledNote = rescheduledNote.trim();
    }

    if (status === "rejected") {
      meeting.confirmedDate = undefined;
      meeting.rescheduledNote = "";
    }

    if (status === "completed" && !meeting.confirmedDate) {
      meeting.confirmedDate = meeting.proposedDate;
    }

    await meeting.save();

    await logStudentActivity({
      studentId: meeting.studentId._id,
      actor: req.user,
      actionType: "meeting_status_updated",
      entityType: "meeting",
      entityId: meeting._id,
      message: `Meeting "${meeting.title}" changed to ${status}`,
      metadata: {
        status,
        confirmedDate: meeting.confirmedDate,
        rescheduledNote: meeting.rescheduledNote,
      },
    });

    if (["accepted", "rescheduled"].includes(status)) {
      await createNotification({
        userId: meeting.studentId._id,
        type: "meeting",
        title: "Meeting update",
        message:
          status === "accepted"
            ? `${meeting.title} was accepted`
            : `${meeting.title} was rescheduled`,
        link: "/student/meetings",
        metadata: {
          meetingId: meeting._id,
          status,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting,
      message: "Meeting status updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate("studentId", "name email")
      .populate("consultancyId", "name email");

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed meetings can be deleted",
      });
    }

    await logStudentActivity({
      studentId: meeting.studentId._id,
      actor: req.user,
      actionType: "meeting_deleted",
      entityType: "meeting",
      entityId: meeting._id,
      message: `Deleted completed meeting "${meeting.title}"`,
      metadata: {
        completedAt: meeting.confirmedDate || meeting.proposedDate,
      },
    });

    await meeting.deleteOne();

    return res.status(200).json({
      success: true,
      data: null,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const studentReschedule = async (req, res, next) => {
  try {
    const { proposedDate, note = "", acceptReschedule = false } = req.body;

    if (!acceptReschedule && !proposedDate) {
      return res.status(400).json({
        success: false,
        message: "A proposed date is required",
      });
    }

    const meeting = await Meeting.findById(req.params.id)
      .populate("studentId", "name email")
      .populate("consultancyId", "name email");

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.studentId?._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (meeting.status !== "rescheduled") {
      return res.status(400).json({
        success: false,
        message: "Only rescheduled meetings can be reproposed",
      });
    }

    if (acceptReschedule) {
      meeting.proposedDate = meeting.confirmedDate || proposedDate || meeting.proposedDate;
      meeting.note = note.trim() || meeting.note;
      meeting.status = "accepted";
      meeting.confirmedDate = meeting.confirmedDate || proposedDate || meeting.proposedDate;

      await meeting.save();

      await logStudentActivity({
        studentId: meeting.studentId._id,
        actor: req.user,
        actionType: "meeting_reschedule_accepted",
        entityType: "meeting",
        entityId: meeting._id,
        message: `Student accepted the rescheduled meeting "${meeting.title}"`,
        metadata: {
          confirmedDate: meeting.confirmedDate,
        },
      });

      await createNotification({
        userId: meeting.consultancyId._id || meeting.consultancyId,
        type: "meeting",
        title: "Rescheduled meeting accepted",
        message: `${meeting.studentId.name} accepted the new time for ${meeting.title}`,
        link: "/consultancy/meetings",
        metadata: {
          meetingId: meeting._id,
        },
      });
    } else {
      meeting.proposedDate = proposedDate;
      meeting.note = note.trim() || meeting.note;
      meeting.status = "pending";
      meeting.confirmedDate = undefined;
      meeting.rescheduledNote = "";

      await meeting.save();

      await logStudentActivity({
        studentId: meeting.studentId._id,
        actor: req.user,
        actionType: "meeting_reproposed",
        entityType: "meeting",
        entityId: meeting._id,
        message: `Student reproposed meeting "${meeting.title}"`,
        metadata: {
          proposedDate,
        },
      });

      await createNotification({
        userId: meeting.consultancyId._id || meeting.consultancyId,
        type: "meeting",
        title: "Meeting reproposed by student",
        message: `${meeting.studentId.name} proposed a new date for ${meeting.title}`,
        link: "/consultancy/meetings",
        metadata: {
          meetingId: meeting._id,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting,
      message: acceptReschedule
        ? "Rescheduled meeting accepted successfully"
        : "Meeting proposed date updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createMeeting,
  deleteMeeting,
  getAllMeetings,
  getMyMeetings,
  updateMeetingStatus,
  studentReschedule,
};
