const ActivityLog = require("../models/ActivityLog");

const getStudentActivity = async (req, res, next) => {
  try {
    const activity = await ActivityLog.find({ studentId: req.params.studentId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: activity,
      message: "Student activity retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStudentActivity,
};
