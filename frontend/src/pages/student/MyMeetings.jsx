import { useEffect, useMemo, useState } from "react";
import { HiOutlineCalendarDays } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import MeetingCard from "../../components/MeetingCard";
import Modal from "../../components/Modal";
import useApi from "../../hooks/useApi";

const filterTabs = ["all", "pending", "accepted", "rescheduled"];

const initialMeetingForm = {
  title: "",
  proposedDate: "",
  note: "",
};

const MyMeetings = () => {
  const { data: meetings, loading, error, refetch } = useApi("/meetings/my");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reproposeModalOpen, setReproposeModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState(initialMeetingForm);
  const [reproposeForm, setReproposeForm] = useState({ proposedDate: "", note: "" });
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState("");

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

  const handleCreateMeeting = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!meetingForm.title.trim()) {
      nextErrors.title = "Title is required";
    }

    if (!meetingForm.proposedDate) {
      nextErrors.proposedDate = "Date is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("create");

    try {
      await api.post("/meetings", {
        title: meetingForm.title.trim(),
        proposedDate: meetingForm.proposedDate,
        note: meetingForm.note.trim(),
      });
      toast.success("Meeting request submitted");
      setRequestModalOpen(false);
      setMeetingForm(initialMeetingForm);
      setErrors({});
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to request meeting");
    } finally {
      setSubmitting("");
    }
  };

  const handleMeetingAction = async (action, meeting) => {
    if (action === "repropose") {
      setSelectedMeeting(meeting);
      setReproposeForm({
        proposedDate: meeting.proposedDate
          ? new Date(meeting.proposedDate).toISOString().slice(0, 16)
          : "",
        note: meeting.note || "",
      });
      setErrors({});
      setReproposeModalOpen(true);
      return;
    }

    if (action === "accept-reschedule") {
      setSubmitting(meeting._id);

      try {
        await api.patch(`/meetings/${meeting._id}/reschedule`, {
          acceptReschedule: true,
          proposedDate: meeting.confirmedDate || meeting.proposedDate,
          note: meeting.note || "",
        });
        toast.success("Rescheduled meeting confirmed");
        refetch();
      } catch (submitError) {
        toast.error(submitError.response?.data?.message || "Unable to accept reschedule");
      } finally {
        setSubmitting("");
      }
    }
  };

  const handleReproposeSubmit = async (event) => {
    event.preventDefault();

    if (!reproposeForm.proposedDate) {
      setErrors({ reproposedDate: "Please select a new date" });
      return;
    }

    setSubmitting("repropose");

    try {
      await api.patch(`/meetings/${selectedMeeting._id}/reschedule`, {
        proposedDate: reproposeForm.proposedDate,
        note: reproposeForm.note.trim(),
      });
      toast.success("New meeting date proposed");
      setReproposeModalOpen(false);
      setSelectedMeeting(null);
      setErrors({});
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to propose a new date");
    } finally {
      setSubmitting("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Meeting Queue
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              My meetings
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Request Meeting
          </button>
        </div>
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

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-4 w-64 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : filteredMeetings.length ? (
          filteredMeetings.map((meeting) => (
            <div key={meeting._id} className="relative">
              {submitting === meeting._id ? (
                <div className="absolute inset-0 z-10 rounded-[1.75rem] bg-white/60" />
              ) : null}
              <MeetingCard meeting={meeting} role="student" onAction={handleMeetingAction} />
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineCalendarDays className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No meetings found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Use the request button to ask for a consultation with your consultancy.
            </p>
          </div>
        )}
      </div>

      <Modal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request Meeting">
        <form onSubmit={handleCreateMeeting} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
            <input
              type="text"
              value={meetingForm.title}
              onChange={(event) => setMeetingForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.title ? <p className="mt-2 text-sm text-rose-600">{errors.title}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Proposed Date</label>
            <input
              type="datetime-local"
              value={meetingForm.proposedDate}
              onChange={(event) =>
                setMeetingForm((current) => ({ ...current, proposedDate: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.proposedDate ? (
              <p className="mt-2 text-sm text-rose-600">{errors.proposedDate}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              rows="4"
              value={meetingForm.note}
              onChange={(event) => setMeetingForm((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting === "create"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "create" ? "Submitting..." : "Request Meeting"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={reproposeModalOpen}
        onClose={() => setReproposeModalOpen(false)}
        title="Propose New Date"
      >
        <form onSubmit={handleReproposeSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">New Proposed Date</label>
            <input
              type="datetime-local"
              value={reproposeForm.proposedDate}
              onChange={(event) =>
                setReproposeForm((current) => ({ ...current, proposedDate: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.reproposedDate ? (
              <p className="mt-2 text-sm text-rose-600">{errors.reproposedDate}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              rows="4"
              value={reproposeForm.note}
              onChange={(event) =>
                setReproposeForm((current) => ({ ...current, note: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting === "repropose"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "repropose" ? "Submitting..." : "Propose New Date"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default MyMeetings;
