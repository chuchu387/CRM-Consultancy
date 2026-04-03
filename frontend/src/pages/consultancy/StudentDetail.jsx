import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentText,
  HiOutlineInboxStack,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import MeetingCard from "../../components/MeetingCard";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import { formatDateOnly, formatDateTime } from "../../utils/date";

const tabConfig = [
  { key: "visa", label: "Visa Applications", icon: HiOutlineInboxStack },
  { key: "documents", label: "Documents", icon: HiOutlineDocumentText },
  { key: "meetings", label: "Meetings", icon: HiOutlineCalendarDays },
  { key: "notes", label: "Internal Notes", icon: HiOutlineSparkles },
  { key: "activity", label: "Activity Log", icon: HiOutlineClipboardDocumentList },
];

const visaTypeOptions = ["Tourist", "Student", "Work", "Business", "Dependent"];

const initialVisaForm = {
  country: "",
  visaType: "Tourist",
  note: "",
};

const initialDocumentForm = {
  documentName: "",
  description: "",
  visaApplicationId: "",
};

const initialMeetingForm = {
  title: "",
  proposedDate: "",
  note: "",
};

const initialNoteForm = {
  title: "",
  note: "",
};

const initialRescheduleForm = {
  confirmedDate: "",
  rescheduledNote: "",
};

const StudentDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("visa");
  const [student, setStudent] = useState(null);
  const [visas, setVisas] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [visaModalOpen, setVisaModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [visaForm, setVisaForm] = useState(initialVisaForm);
  const [documentForm, setDocumentForm] = useState(initialDocumentForm);
  const [meetingForm, setMeetingForm] = useState(initialMeetingForm);
  const [noteForm, setNoteForm] = useState(initialNoteForm);
  const [rescheduleForm, setRescheduleForm] = useState(initialRescheduleForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState("");

  const fetchStudentData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        studentsResponse,
        visaResponse,
        documentsResponse,
        meetingsResponse,
        notesResponse,
        activityResponse,
      ] = await Promise.all([
        api.get("/users/students"),
        api.get("/visa"),
        api.get(`/documents/student/${id}`),
        api.get("/meetings"),
        api.get(`/notes/student/${id}`),
        api.get(`/activities/student/${id}`),
      ]);

      const allStudents = studentsResponse.data.data || [];
      const allVisas = visaResponse.data.data || [];
      const studentDocuments = documentsResponse.data.data || [];
      const allMeetings = meetingsResponse.data.data || [];

      setStudent(allStudents.find((item) => item._id === id) || null);
      setVisas(allVisas.filter((item) => item.studentId?._id === id || item.studentId === id));
      setDocuments(studentDocuments);
      setMeetings(
        allMeetings.filter((item) => item.studentId?._id === id || item.studentId === id)
      );
      setNotes(notesResponse.data.data || []);
      setActivityLog(activityResponse.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load student detail");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const resetForms = useCallback(() => {
    setVisaForm(initialVisaForm);
    setDocumentForm(initialDocumentForm);
    setMeetingForm(initialMeetingForm);
    setNoteForm(initialNoteForm);
    setRescheduleForm(initialRescheduleForm);
    setErrors({});
  }, []);

  const handleCreateVisa = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!visaForm.country.trim()) {
      nextErrors.country = "Country is required";
    }

    if (!visaForm.visaType.trim()) {
      nextErrors.visaType = "Visa type is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("visa");

    try {
      await api.post("/visa", {
        studentId: id,
        country: visaForm.country.trim(),
        visaType: visaForm.visaType,
        note: visaForm.note.trim(),
      });
      toast.success("Visa application created");
      setVisaModalOpen(false);
      resetForms();
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create visa application");
    } finally {
      setSubmitting("");
    }
  };

  const handleRequestDocument = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!documentForm.documentName.trim()) {
      nextErrors.documentName = "Document name is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("document");

    try {
      await api.post("/documents/request", {
        studentId: id,
        documentName: documentForm.documentName.trim(),
        description: documentForm.description.trim(),
        visaApplicationId: documentForm.visaApplicationId || null,
      });
      toast.success("Document request created");
      setDocumentModalOpen(false);
      resetForms();
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to request document");
    } finally {
      setSubmitting("");
    }
  };

  const handleScheduleMeeting = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!meetingForm.title.trim()) {
      nextErrors.title = "Meeting title is required";
    }

    if (!meetingForm.proposedDate) {
      nextErrors.proposedDate = "Meeting date is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("meeting");

    try {
      await api.post("/meetings", {
        studentId: id,
        title: meetingForm.title.trim(),
        proposedDate: meetingForm.proposedDate,
        note: meetingForm.note.trim(),
      });
      toast.success("Meeting scheduled");
      setMeetingModalOpen(false);
      resetForms();
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to schedule meeting");
    } finally {
      setSubmitting("");
    }
  };

  const handleCreateNote = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!noteForm.title.trim()) {
      nextErrors.noteTitle = "Title is required";
    }

    if (!noteForm.note.trim()) {
      nextErrors.noteBody = "Note is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("note");

    try {
      await api.post(`/notes/student/${id}`, {
        title: noteForm.title.trim(),
        note: noteForm.note.trim(),
      });
      toast.success("Internal note added");
      setNoteModalOpen(false);
      resetForms();
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save note");
    } finally {
      setSubmitting("");
    }
  };

  const handleDeleteNote = async () => {
    if (!confirmAction?.noteId) {
      return;
    }

    setSubmitting(`delete-note-${confirmAction.noteId}`);

    try {
      await api.delete(`/notes/${confirmAction.noteId}`);
      toast.success("Internal note deleted");
      setConfirmAction(null);
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete note");
    } finally {
      setSubmitting("");
    }
  };

  const handleMeetingAction = async (action, meeting) => {
    try {
      if (action === "reschedule") {
        setSelectedMeeting(meeting);
        setRescheduleForm({
          confirmedDate: meeting.confirmedDate
            ? new Date(meeting.confirmedDate).toISOString().slice(0, 16)
            : "",
          rescheduledNote: meeting.rescheduledNote || "",
        });
        setErrors({});
        setRescheduleModalOpen(true);
        return;
      }

      if (action === "rejected") {
        setConfirmAction({
          type: "reject-meeting",
          meeting,
        });
        return;
      }

      if (action === "delete") {
        setConfirmAction({
          type: "delete-meeting",
          meeting,
        });
        return;
      }

      setSubmitting(meeting._id);

      await api.patch(`/meetings/${meeting._id}/status`, {
        status: action,
        confirmedDate: action === "accepted" ? meeting.proposedDate : undefined,
      });
      toast.success("Meeting updated");
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update meeting");
    } finally {
      setSubmitting("");
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "delete-note") {
      await handleDeleteNote();
      return;
    }

    if (confirmAction.type === "reject-meeting" && confirmAction.meeting) {
      setSubmitting(confirmAction.meeting._id);

      try {
        await api.patch(`/meetings/${confirmAction.meeting._id}/status`, {
          status: "rejected",
        });
        toast.success("Meeting updated");
        setConfirmAction(null);
        await fetchStudentData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to update meeting");
      } finally {
        setSubmitting("");
      }
      return;
    }

    if (confirmAction.type === "delete-meeting" && confirmAction.meeting) {
      setSubmitting(confirmAction.meeting._id);

      try {
        await api.delete(`/meetings/${confirmAction.meeting._id}`);
        toast.success("Meeting deleted");
        setConfirmAction(null);
        await fetchStudentData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to delete meeting");
      } finally {
        setSubmitting("");
      }
    }
  };

  const handleRescheduleSubmit = async (event) => {
    event.preventDefault();

    if (!rescheduleForm.confirmedDate) {
      setErrors({ confirmedDate: "A new date is required" });
      return;
    }

    setSubmitting("reschedule");

    try {
      await api.patch(`/meetings/${selectedMeeting._id}/status`, {
        status: "rescheduled",
        confirmedDate: rescheduleForm.confirmedDate,
        rescheduledNote: rescheduleForm.rescheduledNote.trim(),
      });
      toast.success("Meeting rescheduled");
      setRescheduleModalOpen(false);
      setSelectedMeeting(null);
      setErrors({});
      await fetchStudentData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to reschedule meeting");
    } finally {
      setSubmitting("");
    }
  };

  const activitySummary = useMemo(
    () => ({
      visaCount: visas.length,
      documentCount: documents.length,
      meetingCount: meetings.length,
      noteCount: notes.length,
    }),
    [documents.length, meetings.length, notes.length, visas.length]
  );

  const renderVisaTab = () => (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-gray-900">Visa applications</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create and monitor visa records for this student.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForms();
            setVisaModalOpen(true);
          }}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Create Visa Application
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Country", "Visa Type", "Status", "Last Updated"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visas.length ? (
              visas.map((visa) => (
                <tr key={visa._id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">{visa.country}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{visa.visaType}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={visa.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {formatDateTime(visa.updatedAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-4 py-12 text-center text-sm text-gray-500">
                  No visa applications exist for this student yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-gray-900">Documents</h3>
          <p className="mt-2 text-sm text-gray-500">
            Request supporting files and monitor student acceptance and uploads.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForms();
            setDocumentModalOpen(true);
          }}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Request Document
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Document", "Visa", "Student Response", "Status", "Uploaded"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.length ? (
              documents.map((document) => (
                <tr key={document._id} className="transition hover:bg-blue-50/40">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">{document.documentName}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {document.description || "No description provided"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {document.visaApplicationId
                      ? `${document.visaApplicationId.country} • ${document.visaApplicationId.visaType}`
                      : "General"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      status={
                        document.studentAcceptanceStatus === "accepted"
                          ? "Accepted by Student"
                          : "Awaiting Acceptance"
                      }
                    />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={document.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {formatDateTime(document.uploadedAt, "Not uploaded")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-12 text-center text-sm text-gray-500">
                  No document requests exist for this student yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMeetingsTab = () => (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-gray-900">Meetings</h3>
          <p className="mt-2 text-sm text-gray-500">Schedule and manage calls with the student.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForms();
            setMeetingModalOpen(true);
          }}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Schedule Meeting
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {meetings.length ? (
          meetings.map((meeting) => (
            <div key={meeting._id} className="relative">
              {submitting === meeting._id ? (
                <div className="absolute inset-0 z-10 rounded-[1.75rem] bg-white/60" />
              ) : null}
              <MeetingCard meeting={meeting} role="consultancy" onAction={handleMeetingAction} />
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
            No meetings have been scheduled with this student yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderNotesTab = () => (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-2xl font-semibold text-gray-900">Internal notes</h3>
          <p className="mt-2 text-sm text-gray-500">
            Private consultancy-only notes for context, handoff, and follow-up.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForms();
            setNoteModalOpen(true);
          }}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Add Note
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {notes.length ? (
          notes.map((note) => (
            <div key={note._id} className="rounded-[1.75rem] border border-gray-200 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-heading text-xl font-semibold text-gray-900">{note.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{note.note}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-gray-400">
                    {note.createdBy?.name || "Consultancy"} • {formatDateTime(note.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction({
                      type: "delete-note",
                      noteId: note._id,
                      noteTitle: note.title,
                    })
                  }
                  disabled={submitting === `delete-note-${note._id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                  {submitting === `delete-note-${note._id}` ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
            No private notes have been added for this student yet.
          </div>
        )}
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-heading text-2xl font-semibold text-gray-900">Activity log</h3>
        <p className="mt-2 text-sm text-gray-500">
          Audit trail of documents, meetings, visas, notes, tasks, invoices, and tracker updates.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {activityLog.length ? (
          activityLog.map((item, index) => (
            <div key={item._id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full bg-blue-600" />
                {index !== activityLog.length - 1 ? (
                  <span className="mt-2 h-full w-px bg-gray-200" />
                ) : null}
              </div>
              <div className="flex-1 rounded-[1.5rem] border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-gray-900">{item.message}</p>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {item.actorRole}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {item.actorName} • {item.actionType.replace(/_/g, " ")}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gray-400">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
            No activity has been recorded for this student yet.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-80 animate-pulse rounded bg-gray-100" />
          </div>
        ) : student ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem] bg-blue-100 text-blue-700">
                {student.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <HiOutlineUserCircle className="h-10 w-10" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                  Student Profile
                </p>
                <h2 className="mt-2 font-heading text-3xl font-semibold text-gray-900">
                  {student.name}
                </h2>
                <p className="mt-2 text-sm text-gray-500">{student.email}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>Phone: {student.phone || "Not provided"}</span>
                  <span>Address: {student.address || "Not provided"}</span>
                  <span>Joined: {formatDateOnly(student.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-gray-900">Student summary</p>
              <div className="mt-3 grid gap-3 text-sm text-gray-600">
                <p>{activitySummary.visaCount} visa application(s)</p>
                <p>{activitySummary.documentCount} document request(s)</p>
                <p>{activitySummary.meetingCount} meeting record(s)</p>
                <p>{activitySummary.noteCount} internal note(s)</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Student not found.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {tabConfig.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "visa" ? renderVisaTab() : null}
      {activeTab === "documents" ? renderDocumentsTab() : null}
      {activeTab === "meetings" ? renderMeetingsTab() : null}
      {activeTab === "notes" ? renderNotesTab() : null}
      {activeTab === "activity" ? renderActivityTab() : null}

      <Modal
        isOpen={visaModalOpen}
        onClose={() => {
          setVisaModalOpen(false);
          resetForms();
        }}
        title="Create Visa Application"
      >
        <form onSubmit={handleCreateVisa} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Country</label>
            <input
              type="text"
              value={visaForm.country}
              onChange={(event) =>
                setVisaForm((current) => ({ ...current, country: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.country ? <p className="mt-2 text-sm text-rose-600">{errors.country}</p> : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Visa Type</label>
            <select
              value={visaForm.visaType}
              onChange={(event) =>
                setVisaForm((current) => ({ ...current, visaType: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              {visaTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              rows="4"
              value={visaForm.note}
              onChange={(event) =>
                setVisaForm((current) => ({ ...current, note: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting === "visa"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "visa" ? "Creating..." : "Create Visa Application"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={documentModalOpen}
        onClose={() => {
          setDocumentModalOpen(false);
          resetForms();
        }}
        title="Request Document"
      >
        <form onSubmit={handleRequestDocument} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Document Name</label>
            <input
              type="text"
              value={documentForm.documentName}
              onChange={(event) =>
                setDocumentForm((current) => ({
                  ...current,
                  documentName: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.documentName ? (
              <p className="mt-2 text-sm text-rose-600">{errors.documentName}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
            <textarea
              rows="4"
              value={documentForm.description}
              onChange={(event) =>
                setDocumentForm((current) => ({ ...current, description: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Related Visa Application
            </label>
            <select
              value={documentForm.visaApplicationId}
              onChange={(event) =>
                setDocumentForm((current) => ({
                  ...current,
                  visaApplicationId: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">General document request</option>
              {visas.map((visa) => (
                <option key={visa._id} value={visa._id}>
                  {visa.country} • {visa.visaType}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting === "document"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "document" ? "Requesting..." : "Request Document"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={meetingModalOpen}
        onClose={() => {
          setMeetingModalOpen(false);
          resetForms();
        }}
        title="Schedule Meeting"
      >
        <form onSubmit={handleScheduleMeeting} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
            <input
              type="text"
              value={meetingForm.title}
              onChange={(event) =>
                setMeetingForm((current) => ({ ...current, title: event.target.value }))
              }
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
              onChange={(event) =>
                setMeetingForm((current) => ({ ...current, note: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting === "meeting"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "meeting" ? "Scheduling..." : "Schedule Meeting"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          resetForms();
        }}
        title="Add Internal Note"
      >
        <form onSubmit={handleCreateNote} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
            <input
              type="text"
              value={noteForm.title}
              onChange={(event) =>
                setNoteForm((current) => ({ ...current, title: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.noteTitle ? (
              <p className="mt-2 text-sm text-rose-600">{errors.noteTitle}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              rows="5"
              value={noteForm.note}
              onChange={(event) =>
                setNoteForm((current) => ({ ...current, note: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.noteBody ? (
              <p className="mt-2 text-sm text-rose-600">{errors.noteBody}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting === "note"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "note" ? "Saving..." : "Save Note"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setSelectedMeeting(null);
          resetForms();
        }}
        title="Reschedule Meeting"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">New Date</label>
            <input
              type="datetime-local"
              value={rescheduleForm.confirmedDate}
              onChange={(event) =>
                setRescheduleForm((current) => ({
                  ...current,
                  confirmedDate: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            {errors.confirmedDate ? (
              <p className="mt-2 text-sm text-rose-600">{errors.confirmedDate}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Reschedule Note</label>
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
            disabled={submitting === "reschedule"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "reschedule" ? "Saving..." : "Save Reschedule"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmAction?.type === "delete-note"
            ? "Delete Internal Note"
            : confirmAction?.type === "delete-meeting"
              ? "Delete Completed Meeting"
              : "Reject Meeting"
        }
        message={
          confirmAction?.type === "delete-note"
            ? `Delete "${confirmAction?.noteTitle || "this note"}"? This note is private and will be removed permanently.`
            : confirmAction?.type === "delete-meeting"
              ? `Delete "${confirmAction?.meeting?.title || "this meeting"}"? This completed meeting record will be removed.`
            : `Reject "${confirmAction?.meeting?.title || "this meeting"}" for ${confirmAction?.meeting?.studentId?.name || student?.name || "this student"}?`
        }
        confirmLabel={
          confirmAction?.type === "delete-note"
            ? "Delete Note"
            : confirmAction?.type === "delete-meeting"
              ? "Delete Meeting"
              : "Reject Meeting"
        }
        cancelLabel={
          confirmAction?.type === "delete-note"
            ? "Keep Note"
            : confirmAction?.type === "delete-meeting"
              ? "Keep Meeting"
              : "Keep Pending"
        }
        tone="danger"
        isLoading={Boolean(
          (confirmAction?.type === "delete-note" &&
            submitting === `delete-note-${confirmAction?.noteId}`) ||
            ((confirmAction?.type === "reject-meeting" ||
              confirmAction?.type === "delete-meeting") &&
              submitting === confirmAction?.meeting?._id)
        )}
      />
    </div>
  );
};

export default StudentDetail;
