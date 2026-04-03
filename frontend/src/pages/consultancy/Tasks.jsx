import { useEffect, useMemo, useState } from "react";
import { HiOutlineBriefcase } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";

const initialTaskForm = {
  title: "",
  description: "",
  category: "general",
  priority: "medium",
  dueDate: "",
  studentId: "",
  assignedTo: "",
};

const Tasks = () => {
  const { data: tasks, loading, error, refetch } = useApi("/tasks");
  const { data: students } = useApi("/users/students");
  const { data: consultancies } = useApi("/users/consultancies");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState(null);
  const [taskForm, setTaskForm] = useState(initialTaskForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") {
      return tasks;
    }
    return tasks.filter((task) => task.status === statusFilter);
  }, [statusFilter, tasks]);

  const {
    currentPage,
    endItem,
    paginatedItems: paginatedTasks,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredTasks);

  useEffect(() => {
    resetPage();
  }, [resetPage, statusFilter]);

  const resetForm = () => {
    setTaskForm(initialTaskForm);
    setEditingTask(null);
    setValidationErrors({});
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      studentId: task.studentId?._id || "",
      assignedTo: task.assignedTo?._id || "",
    });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!taskForm.title.trim()) nextErrors.title = "Title is required";
    if (!taskForm.dueDate) nextErrors.dueDate = "Due date is required";

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        category: taskForm.category,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
        studentId: taskForm.studentId || null,
        assignedTo: taskForm.assignedTo || null,
      };

      if (editingTask) {
        await api.patch(`/tasks/${editingTask._id}`, payload);
        toast.success("Task updated");
      } else {
        await api.post("/tasks", payload);
        toast.success("Task created");
      }

      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatus = async (task, status) => {
    try {
      await api.patch(`/tasks/${task._id}`, { status });
      toast.success("Task updated");
      refetch();
    } catch (statusError) {
      toast.error(statusError.response?.data?.message || "Unable to update task");
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteTask) {
      return;
    }

    setDeleteLoadingId(pendingDeleteTask._id);

    try {
      await api.delete(`/tasks/${pendingDeleteTask._id}`);
      toast.success("Task deleted");
      setPendingDeleteTask(null);
      refetch();
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || "Unable to delete task");
    } finally {
      setDeleteLoadingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Staff Workflow
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Task management
            </h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + New Task
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {!loading && filteredTasks.length ? (
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <Pagination
              currentPage={currentPage}
              endItem={endItem}
              itemLabel="tasks"
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
              rowsPerPage={rowsPerPage}
              startItem={startItem}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </div>
        ) : null}

        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
            </div>
          ))
        ) : filteredTasks.length ? (
          paginatedTasks.map((task) => (
            <div key={task._id} className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-heading text-xl font-semibold text-gray-900">{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {task.description || "No description added"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>Category: {task.category}</span>
                    <span>Priority: {task.priority}</span>
                    <span>Due: {formatDateTime(task.dueDate)}</span>
                    <span>Assigned to: {task.assignedTo?.name || "Unassigned"}</span>
                    <span>Student: {task.studentId?.name || "General task"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {task.status !== "in_progress" ? (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(task, "in_progress")}
                      className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Start
                    </button>
                  ) : null}
                  {task.status !== "completed" ? (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(task, "completed")}
                      className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Complete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEditModal(task)}
                    className="rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteTask(task)}
                    disabled={deleteLoadingId === task._id}
                    className="rounded-2xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
                  >
                    {deleteLoadingId === task._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineBriefcase className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">No tasks yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Create staff tasks like follow-up calls, document verification, and embassy prep.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingTask ? "Edit Task" : "Create Task"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
            <input
              type="text"
              value={taskForm.title}
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, title: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {validationErrors.title ? (
              <p className="mt-2 text-sm text-rose-600">{validationErrors.title}</p>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Category</label>
              <select
                value={taskForm.category}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, category: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="general">General</option>
                <option value="call student">Call Student</option>
                <option value="verify passport">Verify Passport</option>
                <option value="follow up on bank statement">Follow Up on Bank Statement</option>
                <option value="schedule embassy prep">Schedule Embassy Prep</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, priority: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Due Date</label>
              <input
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.dueDate ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.dueDate}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Assigned To</label>
              <select
                value={taskForm.assignedTo}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, assignedTo: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Default to me</option>
                {consultancies.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Related Student
            </label>
            <select
              value={taskForm.studentId}
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, studentId: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">General internal task</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} • {student.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              rows="4"
              value={taskForm.description}
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, description: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteTask)}
        onClose={() => setPendingDeleteTask(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Delete "${pendingDeleteTask?.title || "this task"}"? This action cannot be undone.`}
        confirmLabel="Delete Task"
        cancelLabel="Keep Task"
        tone="danger"
        isLoading={Boolean(pendingDeleteTask && deleteLoadingId === pendingDeleteTask._id)}
      />
    </div>
  );
};

export default Tasks;
