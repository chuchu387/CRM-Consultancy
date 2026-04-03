const StudentNote = require("../models/StudentNote");
const User = require("../models/User");
const { logStudentActivity } = require("../utils/activity");

const getStudentNotes = async (req, res, next) => {
  try {
    const notes = await StudentNote.find({ studentId: req.params.studentId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notes,
      message: "Student notes retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const createStudentNote = async (req, res, next) => {
  try {
    const { title, note } = req.body;

    if (!title || !note) {
      return res.status(400).json({
        success: false,
        message: "Title and note are required",
      });
    }

    const student = await User.findOne({ _id: req.params.studentId, role: "student" });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const createdNote = await StudentNote.create({
      studentId: req.params.studentId,
      createdBy: req.user.id,
      title: title.trim(),
      note: note.trim(),
    });

    await logStudentActivity({
      studentId: req.params.studentId,
      actor: req.user,
      actionType: "note_created",
      entityType: "student_note",
      entityId: createdNote._id,
      message: `Added an internal note: ${title.trim()}`,
    });

    const populatedNote = await StudentNote.findById(createdNote._id).populate(
      "createdBy",
      "name email"
    );

    return res.status(201).json({
      success: true,
      data: populatedNote,
      message: "Student note created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteStudentNote = async (req, res, next) => {
  try {
    const note = await StudentNote.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Student note not found",
      });
    }

    await logStudentActivity({
      studentId: note.studentId,
      actor: req.user,
      actionType: "note_deleted",
      entityType: "student_note",
      entityId: note._id,
      message: `Deleted internal note: ${note.title}`,
    });

    await note.deleteOne();

    return res.status(200).json({
      success: true,
      data: null,
      message: "Student note deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStudentNotes,
  createStudentNote,
  deleteStudentNote,
};
