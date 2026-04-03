import { useEffect, useMemo, useState } from "react";
import { HiOutlineCalendarDays } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import StudentSummaryCard from "../../components/StudentSummaryCard";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatCalendarLabel, formatDateTime } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";

const filterTabs = ["all", "pending", "accepted", "rescheduled", "completed"];

const Meetings = () => {
  const { data: meetings, loading, error, refetch } = useApi("/meetings");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [pendingMeetingAction, setPendingMeetingAction] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ confirmedDate: "", rescheduledNote: "" });
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredMeetings = useMemo(() => {
    if (statusFilter === "all") {
      return meetings;
    }

    return meetings.filter((meeting) => meeting.status === statusFilter);
  }, [meetings, statusFilter]);

  const studentGroups = useMemo(() => {
    const groups = filteredMeetings.reduce((collection, meeting) => {
      const studentId = meeting.studentId?._id || meeting.studentId || "unknown";
      const scheduledAt = meeting.confirmedDate || meeting.proposedDate;

      if (!collection[studentId]) {
        collection[studentId] = {
          studentId,
          studentName: meeting.studentId?.name || "Student",
          studentEmail: meeting.studentId?.email || "",
          meetings: [],
        };
      }

      collection[studentId].meetings.push(meeting);

      if (
        scheduledAt &&
        (!collection[studentId].latestMeetingAt ||
          new Date(scheduledAt).getTime() > collection[studentId].latestMeetingAt)
      ) {
        collection[studentId].latestMeetingAt = new Date(scheduledAt).getTime();
      }

      return collection;
    }, {});

    return Object.values(groups)
      .map((group) => {
        const sortedMeetings = [...group.meetings].sort(
          (a, b) =>
            new Date(b.confirmedDate || b.proposedDate || 0).getTime() -
            new Date(a.confirmedDate || a.proposedDate || 0).getTime()
        );
        const now = Date.now();
        const nextMeeting =
          [...group.meetings]
            .filter((meeting) =>
              ["pending", "accepted", "rescheduled"].includes(meeting.status)
            )
            .sort(
              (a, b) =>
                new Date(a.confirmedDate || a.proposedDate || 0).getTime() -
                new Date(b.confirmedDate || b.proposedDate || 0).getTime()
            )
            .find((meeting) => new Date(meeting.confirmedDate || meeting.proposedDate || 0).getTime() >= now) ||
          sortedMeetings[0] ||
          null;

        return {
          ...group,
          meetings: sortedMeetings,
          totalMeetings: sortedMeetings.length,
          pendingCount: sortedMeetings.filter((meeting) => meeting.status === "pending").length,
          acceptedCount: sortedMeetings.filter((meeting) => meeting.status === "accepted").length,
          rescheduledCount: sortedMeetings.filter((meeting) => meeting.status === "rescheduled")
            .length,
          completedCount: sortedMeetings.filter((meeting) => meeting.status === "completed").length,
          nextMeeting,
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredMeetings]);

  const selectedStudentGroup = useMemo(
    () => studentGroups.find((group) => group.studentId === selectedStudentId) || null,
    [selectedStudentId, studentGroups]
  );

  const {
    currentPage,
    endItem,
    paginatedItems: paginatedStudentGroups,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(studentGroups);

  const groupedStudents = useMemo(
    () =>
      paginatedStudentGroups.reduce((accumulator, group) => {
        const anchorDate =
          group.nextMeeting?.confirmedDate ||
          group.nextMeeting?.proposedDate ||
          group.latestMeetingAt;
        const key = formatCalendarLabel(anchorDate, "No scheduled date");
        accumulator[key] = accumulator[key] || [];
        accumulator[key].push(group);
        return accumulator;
      }, {}),
    [paginatedStudentGroups]
  );

  useEffect(() => {
    resetPage();
  }, [resetPage, statusFilter, viewMode]);

  const handleAction = async (meeting, status, skipConfirm = false) => {
    if (["rejected", "delete"].includes(status) && !skipConfirm) {
      setPendingMeetingAction({ meeting, type: status });
      return;
    }

    if (status === "delete") {
      setActionLoadingId(`${meeting._id}-delete`);

      try {
        await api.delete(`/meetings/${meeting._id}`);
        toast.success("Meeting deleted");
        refetch();
      } catch (updateError) {
        toast.error(updateError.response?.data?.message || "Unable to delete meeting");
      } finally {
        setActionLoadingId("");
      }
      return;
    }

    setActionLoadingId(`${meeting._id}-${status}`);

    try {
      await api.patch(`/meetings/${meeting._id}/status`, {
        status,
        confirmedDate: status === "accepted" ? meeting.proposedDate : undefined,
      });
      toast.success("Meeting updated");
      refetch();
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to update meeting");
    } finally {
      setActionLoadingId("");
    }
  };

  const confirmMeetingAction = async () => {
    if (!pendingMeetingAction?.meeting || !pendingMeetingAction?.type) {
      return;
    }

    await handleAction(pendingMeetingAction.meeting, pendingMeetingAction.type, true);
    setPendingMeetingAction(null);
  };

  const openRescheduleModal = (meeting) => {
    setSelectedMeeting(meeting);
    setRescheduleForm({
      confirmedDate: meeting.confirmedDate
        ? new Date(meeting.confirmedDate).toISOString().slice(0, 16)
        : "",
      rescheduledNote: meeting.rescheduledNote || "",
    });
    setValidationError("");
    setRescheduleModalOpen(true);
  };

  const handleExport = (type) => {
    if (!studentGroups.length) {
      toast.info("No meetings to export");
      return;
    }

    const rows = studentGroups.map((group) => ({
      Student: group.studentName,
      Email: group.studentEmail || "",
      Meetings: group.totalMeetings,
      Pending: group.pendingCount,
      Accepted: group.acceptedCount,
      Completed: group.completedCount,
      NextMeeting: formatDateTime(
        group.nextMeeting?.confirmedDate || group.nextMeeting?.proposedDate,
        "Not scheduled"
      ),
    }));

    if (type === "csv") {
      downloadCsv("meetings", rows);
      return;
    }

    downloadPdf({
      filename: "meetings",
      title: "Meetings by Student",
      columns: ["Student", "Email", "Meetings", "Pending", "Accepted", "Completed", "Next Meeting"],
      rows: rows.map((meeting) => [
        meeting.Student,
        meeting.Email,
        meeting.Meetings,
        meeting.Pending,
        meeting.Accepted,
        meeting.Completed,
        meeting.NextMeeting,
      ]),
    });
  };

  const handleRescheduleSubmit = async (event) => {
    event.preventDefault();

    if (!rescheduleForm.confirmedDate) {
      setValidationError("Please select the rescheduled date");
      return;
    }

    setActionLoadingId(`${selectedMeeting._id}-rescheduled`);

    try {
      await api.patch(`/meetings/${selectedMeeting._id}/status`, {
        status: "rescheduled",
        confirmedDate: rescheduleForm.confirmedDate,
        rescheduledNote: rescheduleForm.rescheduledNote.trim(),
      });
      toast.success("Meeting rescheduled");
      setRescheduleModalOpen(false);
      setSelectedMeeting(null);
      refetch();
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to reschedule meeting");
    } finally {
      setActionLoadingId("");
    }
  };

  const renderActions = (meeting) => {
    if (meeting.status === "pending") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAction(meeting, "accepted")}
            disabled={actionLoadingId === `${meeting._id}-accepted`}
            className="rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {actionLoadingId === `${meeting._id}-accepted` ? "Accepting..." : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => openRescheduleModal(meeting)}
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => handleAction(meeting, "rejected")}
            disabled={actionLoadingId === `${meeting._id}-rejected`}
            className="rounded-2xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
          >
            {actionLoadingId === `${meeting._id}-rejected` ? "Rejecting..." : "Reject"}
          </button>
        </div>
      );
    }

    if (meeting.status === "accepted") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAction(meeting, "completed")}
            disabled={actionLoadingId === `${meeting._id}-completed`}
            className="rounded-2xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:bg-teal-300"
          >
            {actionLoadingId === `${meeting._id}-completed` ? "Saving..." : "Mark Complete"}
          </button>
          <button
            type="button"
            onClick={() => openRescheduleModal(meeting)}
            disabled={actionLoadingId === `${meeting._id}-rescheduled`}
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            No Show / Reschedule
          </button>
        </div>
      );
    }

    if (meeting.status === "completed") {
      return (
        <button
          type="button"
          onClick={() => handleAction(meeting, "delete")}
          disabled={actionLoadingId === `${meeting._id}-delete`}
          className="rounded-2xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
        >
          {actionLoadingId === `${meeting._id}-delete` ? "Deleting..." : "Delete"}
        </button>
      );
    }

    return <span className="text-sm text-gray-400">No actions</span>;
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Scheduling Desk
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">Meetings</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  statusFilter === tab
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1">
            {["list", "calendar"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  viewMode === mode ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-blue-50"
                }`}
              >
                {mode === "list" ? "List view" : "Calendar hint"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {!loading && filteredMeetings.length ? (
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <Pagination
            currentPage={currentPage}
            endItem={endItem}
            itemLabel="students"
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPage={rowsPerPage}
            startItem={startItem}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        </div>
      ) : null}

      {viewMode === "list" ? (
        <div className="grid gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
              </div>
            ))
          ) : studentGroups.length ? (
            paginatedStudentGroups.map((group) => (
              <StudentSummaryCard
                key={group.studentId}
                name={group.studentName}
                email={group.studentEmail}
                meta={`Next meeting ${formatDateTime(
                  group.nextMeeting?.confirmedDate || group.nextMeeting?.proposedDate,
                  "Not scheduled"
                )}`}
                stats={[
                  { label: "Meetings", value: group.totalMeetings },
                  { label: "Pending", value: group.pendingCount, tone: "amber" },
                  { label: "Accepted", value: group.acceptedCount, tone: "emerald" },
                  { label: "Completed", value: group.completedCount, tone: "teal" },
                ]}
                updatedText={`Updated ${formatDateTime(group.latestMeetingAt)}`}
                onAction={() => setSelectedStudentId(group.studentId)}
              >
                <div className="flex flex-wrap gap-2">
                  {group.pendingCount ? <StatusBadge status="pending" compact /> : null}
                  {group.acceptedCount ? <StatusBadge status="accepted" compact /> : null}
                  {group.rescheduledCount ? <StatusBadge status="rescheduled" compact /> : null}
                  {group.completedCount ? <StatusBadge status="completed" compact /> : null}
                </div>
              </StudentSummaryCard>
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
                <HiOutlineCalendarDays className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
                No meetings found
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Scheduled meetings will appear here. Change the filter to inspect other states in
                the pipeline.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.keys(groupedStudents).length ? (
            Object.entries(groupedStudents).map(([dateLabel, groupsForDate]) => (
              <div key={dateLabel} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                    <HiOutlineCalendarDays className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-gray-900">{dateLabel}</h3>
                </div>

                <div className="mt-5 grid gap-4">
                  {groupsForDate.map((group) => (
                    <StudentSummaryCard
                      key={group.studentId}
                      name={group.studentName}
                      email={group.studentEmail}
                      meta={`Next meeting ${formatDateTime(
                        group.nextMeeting?.confirmedDate || group.nextMeeting?.proposedDate,
                        "Not scheduled"
                      )}`}
                      stats={[
                        { label: "Meetings", value: group.totalMeetings },
                        { label: "Pending", value: group.pendingCount, tone: "amber" },
                        { label: "Accepted", value: group.acceptedCount, tone: "emerald" },
                        { label: "Completed", value: group.completedCount, tone: "teal" },
                      ]}
                      updatedText={`Updated ${formatDateTime(group.latestMeetingAt)}`}
                      actionLabel="View Meetings"
                      onAction={() => setSelectedStudentId(group.studentId)}
                    >
                      <div className="flex flex-wrap gap-2">
                        <div className="flex flex-wrap gap-2">
                          {group.pendingCount ? <StatusBadge status="pending" compact /> : null}
                          {group.acceptedCount ? <StatusBadge status="accepted" compact /> : null}
                          {group.rescheduledCount ? (
                            <StatusBadge status="rescheduled" compact />
                          ) : null}
                          {group.completedCount ? (
                            <StatusBadge status="completed" compact />
                          ) : null}
                        </div>
                      </div>
                    </StudentSummaryCard>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              No meetings match the current status filter.
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(selectedStudentGroup)}
        onClose={() => setSelectedStudentId("")}
        title="Student Meetings"
        size="lg"
      >
        {selectedStudentGroup ? (
          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Student
                  </p>
                  <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
                    {selectedStudentGroup.studentName}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedStudentGroup.studentEmail || "No email"}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Meetings
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {selectedStudentGroup.totalMeetings}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Pending
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">
                      {selectedStudentGroup.pendingCount}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Accepted
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                      {selectedStudentGroup.acceptedCount}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Completed
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-teal-700">
                      {selectedStudentGroup.completedCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {selectedStudentGroup.meetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{meeting.title}</h4>
                        <StatusBadge status={meeting.status} compact />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {formatDateTime(meeting.confirmedDate || meeting.proposedDate)}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Requested by {meeting.requestedBy}
                      </p>
                      {meeting.note ? (
                        <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          {meeting.note}
                        </p>
                      ) : null}
                      {meeting.rescheduledNote ? (
                        <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                          Reschedule note: {meeting.rescheduledNote}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0">{renderActions(meeting)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Meeting"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">New Date</label>
            <input
              type="datetime-local"
              value={rescheduleForm.confirmedDate}
              onChange={(event) =>
                setRescheduleForm((current) => ({ ...current, confirmedDate: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {validationError ? <p className="mt-2 text-sm text-rose-600">{validationError}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Reason</label>
            <textarea
              rows="4"
              value={rescheduleForm.rescheduledNote}
              onChange={(event) =>
                setRescheduleForm((current) => ({
                  ...current,
                  rescheduledNote: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoadingId === `${selectedMeeting?._id}-rescheduled`}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {actionLoadingId === `${selectedMeeting?._id}-rescheduled`
              ? "Saving..."
              : "Save Reschedule"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingMeetingAction)}
        onClose={() => setPendingMeetingAction(null)}
        onConfirm={confirmMeetingAction}
        title={pendingMeetingAction?.type === "delete" ? "Delete Completed Meeting" : "Reject Meeting"}
        message={
          pendingMeetingAction?.type === "delete"
            ? `Delete "${pendingMeetingAction?.meeting?.title || "this meeting"}"? This completed meeting record will be removed.`
            : `Reject "${pendingMeetingAction?.meeting?.title || "this meeting"}" for ${pendingMeetingAction?.meeting?.studentId?.name || "this student"}?`
        }
        confirmLabel={pendingMeetingAction?.type === "delete" ? "Delete Meeting" : "Reject Meeting"}
        cancelLabel={pendingMeetingAction?.type === "delete" ? "Keep Meeting" : "Keep Pending"}
        tone="danger"
        isLoading={Boolean(
          pendingMeetingAction?.meeting &&
            actionLoadingId ===
              `${pendingMeetingAction.meeting._id}-${pendingMeetingAction.type === "delete" ? "delete" : pendingMeetingAction.type}`
        )}
      />
    </div>
  );
};

export default Meetings;
