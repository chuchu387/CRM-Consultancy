const Task = require("../models/Task");
const User = require("../models/User");
const { logStudentActivity } = require("../utils/activity");
const { createNotification } = require("../utils/notification");

const populateTaskQuery = (query) =>
  query
    .populate("studentId", "name email phone")
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

const getTasks = async (req, res, next) => {
  try {
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.studentId) {
      filters.studentId = req.query.studentId;
    }

    const tasks = await populateTaskQuery(Task.find(filters).sort({ dueDate: 1, createdAt: -1 }));

    return res.status(200).json({
      success: true,
      data: tasks,
      message: "Tasks retrieved successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description = "",
      category = "general",
      status = "pending",
      priority = "medium",
      dueDate,
      studentId = null,
      assignedTo,
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Title and due date are required",
      });
    }

    if (studentId) {
      const student = await User.findOne({ _id: studentId, role: "student" });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }
    }

    const assigneeId = assignedTo || req.user.id;
    const consultancyUser = await User.findOne({ _id: assigneeId, role: "consultancy" });

    if (!consultancyUser) {
      return res.status(404).json({
        success: false,
        message: "Assigned consultancy user not found",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      category,
      status,
      priority,
      dueDate,
      studentId,
      assignedTo: assigneeId,
      createdBy: req.user.id,
    });

    if (studentId) {
      await logStudentActivity({
        studentId,
        actor: req.user,
        actionType: "task_created",
        entityType: "task",
        entityId: task._id,
        message: `Created task: ${title.trim()}`,
        metadata: { category, dueDate },
      });
    }

    await createNotification({
      userId: assigneeId,
      type: "task",
      title: "New task assigned",
      message: title.trim(),
      link: "/consultancy/tasks",
      metadata: { taskId: task._id },
    });

    const populatedTask = await populateTaskQuery(Task.findById(task._id));

    return res.status(201).json({
      success: true,
      data: populatedTask,
      message: "Task created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const {
      title,
      description,
      category,
      status,
      priority,
      dueDate,
      studentId,
      assignedTo,
    } = req.body;

    if (studentId) {
      const student = await User.findOne({ _id: studentId, role: "student" });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }
    }

    if (assignedTo) {
      const consultancyUser = await User.findOne({ _id: assignedTo, role: "consultancy" });

      if (!consultancyUser) {
        return res.status(404).json({
          success: false,
          message: "Assigned consultancy user not found",
        });
      }
      task.assignedTo = assignedTo;
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (category !== undefined) task.category = category;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (studentId !== undefined) task.studentId = studentId || null;

    await task.save();

    if (task.studentId) {
      await logStudentActivity({
        studentId: task.studentId,
        actor: req.user,
        actionType: "task_updated",
        entityType: "task",
        entityId: task._id,
        message: `Updated task: ${task.title}`,
        metadata: { status: task.status, priority: task.priority },
      });
    }

    const populatedTask = await populateTaskQuery(Task.findById(task._id));

    return res.status(200).json({
      success: true,
      data: populatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    if (task.studentId) {
      await logStudentActivity({
        studentId: task.studentId,
        actor: req.user,
        actionType: "task_deleted",
        entityType: "task",
        entityId: task._id,
        message: `Deleted task: ${task.title}`,
      });
    }

    await task.deleteOne();

    return res.status(200).json({
      success: true,
      data: null,
      message: "Task deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
