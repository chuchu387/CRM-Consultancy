import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineUserPlus,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../api/axios";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import StudentSummaryCard from "../../components/StudentSummaryCard";
import { useAuth } from "../../context/AuthContext";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateOnly, formatDateTime } from "../../utils/date";
import {
  formatLeadSource,
  formatLeadStatus,
  isClosedLead,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
} from "../../utils/lead";

const initialLeadForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  interestedCourse: "",
  interestedIntake: "",
  source: "walk_in",
  status: "new",
  assignedTo: "",
  followUpDate: "",
  nextAction: "",
  initialNote: "",
};

const initialContactForm = {
  channel: "call",
  message: "",
  nextFollowUpDate: "",
  status: "",
};

const initialConvertForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  password: "",
};

const toDateTimeLocalValue = (value) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

const sortDescendingByDate = (items, field = "createdAt") =>
  [...items].sort((a, b) => new Date(b[field] || 0).getTime() - new Date(a[field] || 0).getTime());

const Leads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: leads, loading, error, refetch } = useApi("/leads");
  const { data: consultancies, error: consultanciesError } = useApi("/users/consultancies");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [contactForm, setContactForm] = useState(initialContactForm);
  const [convertForm, setConvertForm] = useState(initialConvertForm);
  const [noteInput, setNoteInput] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (consultanciesError) {
      toast.error(consultanciesError);
    }
  }, [consultanciesError]);

  const hydrateLeadState = useCallback((lead) => {
    setLeadForm({
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      address: lead?.address || "",
      country: lead?.country || "",
      interestedCourse: lead?.interestedCourse || "",
      interestedIntake: lead?.interestedIntake || "",
      source: lead?.source || "walk_in",
      status: lead?.status || "new",
      assignedTo: lead?.assignedTo?._id || lead?.assignedTo || "",
      followUpDate: toDateTimeLocalValue(lead?.followUpDate),
      nextAction: lead?.nextAction || "",
      initialNote: "",
    });
    setContactForm({
      channel: "call",
      message: "",
      nextFollowUpDate: toDateTimeLocalValue(lead?.followUpDate),
      status: lead?.status || "contacted",
    });
    setConvertForm({
      name: lead?.name || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      address: lead?.address || "",
      password: "",
    });
    setNoteInput("");
    setValidationErrors({});
  }, []);

  const resetCreateForm = useCallback(() => {
    setLeadForm({
      ...initialLeadForm,
      assignedTo: user?.id || "",
    });
    setValidationErrors({});
  }, [user?.id]);

  const loadLeadDetail = useCallback(
    async (leadId) => {
      if (!leadId) {
        return;
      }

      setDetailLoading(true);

      try {
        const response = await api.get(`/leads/${leadId}`);
        const fetchedLead = response.data?.data;

        setDetailLead(fetchedLead);
        hydrateLeadState(fetchedLead);
      } catch (loadError) {
        toast.error(loadError.response?.data?.message || "Unable to load lead details");
      } finally {
        setDetailLoading(false);
      }
    },
    [hydrateLeadState]
  );

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchesSearch =
        !query ||
        [lead.name, lead.email, lead.phone, lead.country, lead.interestedCourse, lead.interestedIntake]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [leads, searchTerm, sourceFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      open: leads.filter((lead) => !isClosedLead(lead.status)).length,
      followUpsToday: leads.filter((lead) => {
        if (!lead.followUpDate || isClosedLead(lead.status)) {
          return false;
        }

        return formatDateOnly(lead.followUpDate) === formatDateOnly(new Date());
      }).length,
      converted: leads.filter((lead) => lead.status === "converted").length,
      lost: leads.filter((lead) => lead.status === "lost").length,
    }),
    [leads]
  );

  const {
    currentPage,
    endItem,
    paginatedItems,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(filteredLeads);

  useEffect(() => {
    resetPage();
  }, [resetPage, searchTerm, sourceFilter, statusFilter]);

  const openCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  const openDetailModal = async (leadId) => {
    setIsDetailModalOpen(true);
    await loadLeadDetail(leadId);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailLead(null);
    setDetailLoading(false);
    setValidationErrors({});
    setNoteInput("");
  };

  const syncUpdatedLead = useCallback(
    async (updatedLead) => {
      setDetailLead(updatedLead);
      hydrateLeadState(updatedLead);
      await refetch();
    },
    [hydrateLeadState, refetch]
  );

  const validateLeadForm = useCallback((form) => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Lead name is required";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Phone is required";
    }

    return nextErrors;
  }, []);

  const handleCreateLead = async (event) => {
    event.preventDefault();

    const nextErrors = validateLeadForm(leadForm);
    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("create");

    try {
      await api.post("/leads", {
        ...leadForm,
        followUpDate: leadForm.followUpDate || null,
      });

      toast.success("Lead created");
      setIsCreateModalOpen(false);
      resetCreateForm();
      await refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to create lead");
    } finally {
      setSubmitting("");
    }
  };

  const handleUpdateLead = async (event) => {
    event.preventDefault();

    if (!detailLead) {
      return;
    }

    const nextErrors = validateLeadForm(leadForm);
    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("update");

    try {
      const response = await api.patch(`/leads/${detailLead._id}`, {
        ...leadForm,
        followUpDate: leadForm.followUpDate || null,
      });

      toast.success("Lead updated");
      await syncUpdatedLead(response.data?.data);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to update lead");
    } finally {
      setSubmitting("");
    }
  };

  const handleAddNote = async () => {
    if (!detailLead) {
      return;
    }

    if (!noteInput.trim()) {
      setValidationErrors((current) => ({
        ...current,
        note: "A note is required",
      }));
      return;
    }

    setSubmitting("note");

    try {
      const response = await api.post(`/leads/${detailLead._id}/notes`, {
        note: noteInput.trim(),
      });

      toast.success("Note added");
      await syncUpdatedLead(response.data?.data);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to add note");
    } finally {
      setSubmitting("");
    }
  };

  const handleLogContact = async (event) => {
    event.preventDefault();

    if (!detailLead) {
      return;
    }

    const nextErrors = {};

    if (!contactForm.message.trim()) {
      nextErrors.contactMessage = "Contact details are required";
    }

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("contact");

    try {
      const response = await api.post(`/leads/${detailLead._id}/contact-log`, {
        ...contactForm,
        nextFollowUpDate: contactForm.nextFollowUpDate || null,
        status: contactForm.status || undefined,
      });

      toast.success("Contact logged");
      await syncUpdatedLead(response.data?.data);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to log contact");
    } finally {
      setSubmitting("");
    }
  };

  const handleConvertLead = async (event) => {
    event.preventDefault();

    if (!detailLead) {
      return;
    }

    const nextErrors = {};

    if (!convertForm.name.trim()) {
      nextErrors.convertName = "Student name is required";
    }

    if (!convertForm.email.trim()) {
      nextErrors.convertEmail = "Email is required";
    }

    if (!convertForm.password.trim()) {
      nextErrors.convertPassword = "Password is required";
    } else if (convertForm.password.trim().length < 6) {
      nextErrors.convertPassword = "Password must be at least 6 characters";
    }

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting("convert");

    try {
      const response = await api.post(`/leads/${detailLead._id}/convert`, {
        ...convertForm,
      });

      toast.success("Lead converted to student");
      await syncUpdatedLead(response.data?.data);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to convert lead");
    } finally {
      setSubmitting("");
    }
  };

  const notes = useMemo(
    () => sortDescendingByDate(detailLead?.notes || []),
    [detailLead?.notes]
  );
  const activityLog = useMemo(
    () => sortDescendingByDate(detailLead?.activityLog || []),
    [detailLead?.activityLog]
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Inquiry Pipeline
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">Leads</h2>
            <p className="mt-2 text-sm text-gray-500">
              Track inquiries before they become students and convert them when they are ready.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search leads"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All stages</option>
              {LEAD_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatLeadStatus(status)}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All sources</option>
              {LEAD_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {formatLeadSource(source)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + New Lead
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Open Leads", value: stats.open, tone: "text-blue-700" },
          { label: "Follow-Ups Today", value: stats.followUpsToday, tone: "text-amber-700" },
          { label: "Converted", value: stats.converted, tone: "text-emerald-700" },
          { label: "Lost", value: stats.lost, tone: "text-rose-700" },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              {stat.label}
            </p>
            <p className={`mt-3 text-4xl font-semibold ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {!loading && filteredLeads.length ? (
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <Pagination
              currentPage={currentPage}
              endItem={endItem}
              itemLabel="leads"
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
            <div
              key={index}
              className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-44 animate-pulse rounded bg-gray-200" />
            </div>
          ))
        ) : filteredLeads.length ? (
          paginatedItems.map((lead) => (
            <StudentSummaryCard
              key={lead._id}
              label="Lead"
              name={lead.name}
              email={lead.email || lead.phone}
              meta={`${lead.phone}${lead.country ? ` • ${lead.country}` : ""}`}
              stats={[
                { label: "Stage", value: formatLeadStatus(lead.status) },
                { label: "Source", value: formatLeadSource(lead.source) },
                {
                  label: "Follow-Up",
                  value: formatDateOnly(lead.followUpDate, "Not scheduled"),
                  tone: lead.followUpDate ? "amber" : "default",
                },
                {
                  label: "Assigned",
                  value: lead.assignedTo?.name || "Unassigned",
                },
              ]}
              updatedText={`Updated ${formatDateTime(lead.updatedAt)}`}
              actionLabel="View"
              onAction={() => openDetailModal(lead._id)}
            >
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={lead.status} label={formatLeadStatus(lead.status)} />
                {lead.convertedStudentId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/consultancy/students/${lead.convertedStudentId._id}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5" />
                    View Student
                  </button>
                ) : null}
              </div>
            </StudentSummaryCard>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineUserPlus className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No leads found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Add inquiries here to track follow-ups before they become enrolled students.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Add New Lead"
        size="lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Lead Name</label>
              <input
                type="text"
                value={leadForm.name}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.name ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.name}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Phone</label>
              <input
                type="text"
                value={leadForm.phone}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.phone ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.phone}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={leadForm.email}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Country</label>
              <input
                type="text"
                value={leadForm.country}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, country: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Interested Course
              </label>
              <input
                type="text"
                value={leadForm.interestedCourse}
                onChange={(event) =>
                  setLeadForm((current) => ({
                    ...current,
                    interestedCourse: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Interested Intake
              </label>
              <input
                type="text"
                value={leadForm.interestedIntake}
                onChange={(event) =>
                  setLeadForm((current) => ({
                    ...current,
                    interestedIntake: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Source</label>
              <select
                value={leadForm.source}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, source: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                {LEAD_SOURCE_OPTIONS.map((source) => (
                  <option key={source} value={source}>
                    {formatLeadSource(source)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Assigned To</label>
              <select
                value={leadForm.assignedTo}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, assignedTo: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select counselor</option>
                {consultancies.map((consultancy) => (
                  <option key={consultancy._id} value={consultancy._id}>
                    {consultancy.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
              <select
                value={leadForm.status}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, status: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatLeadStatus(status)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Follow-Up Date
              </label>
              <input
                type="datetime-local"
                value={leadForm.followUpDate}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, followUpDate: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Address</label>
            <textarea
              rows="3"
              value={leadForm.address}
              onChange={(event) =>
                setLeadForm((current) => ({ ...current, address: event.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Next Action</label>
              <input
                type="text"
                value={leadForm.nextAction}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, nextAction: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Initial Note
              </label>
              <textarea
                rows="3"
                value={leadForm.initialNote}
                onChange={(event) =>
                  setLeadForm((current) => ({ ...current, initialNote: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting === "create"}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting === "create" ? "Creating..." : "Create Lead"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Lead Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-32 animate-pulse rounded-3xl bg-gray-100" />
            <div className="h-32 animate-pulse rounded-3xl bg-gray-100" />
          </div>
        ) : detailLead ? (
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Lead Summary
                  </p>
                  <h3 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
                    {detailLead.name}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge
                      status={detailLead.status}
                      label={formatLeadStatus(detailLead.status)}
                    />
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-200">
                      {formatLeadSource(detailLead.source)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p>{detailLead.email || "No email added"}</p>
                    <p>{detailLead.phone}</p>
                    <p>{detailLead.country || "No country added"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {detailLead.convertedStudentId ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeDetailModal();
                        navigate(`/consultancy/students/${detailLead.convertedStudentId._id}`);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
                      View Student
                    </button>
                  ) : null}
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600">
                    <p>Assigned: {detailLead.assignedTo?.name || "Unassigned"}</p>
                    <p className="mt-1">
                      Follow-Up: {formatDateTime(detailLead.followUpDate, "Not scheduled")}
                    </p>
                    <p className="mt-1">
                      Last Contact: {formatDateTime(detailLead.lastContactedAt, "Not contacted yet")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateLead} className="space-y-5 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Lead Profile
                  </p>
                  <h4 className="mt-2 font-heading text-xl font-semibold text-gray-900">
                    Update details
                  </h4>
                </div>
                <button
                  type="submit"
                  disabled={submitting === "update"}
                  className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {submitting === "update" ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Name</label>
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                  {validationErrors.name ? (
                    <p className="mt-2 text-sm text-rose-600">{validationErrors.name}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                  {validationErrors.phone ? (
                    <p className="mt-2 text-sm text-rose-600">{validationErrors.phone}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Country</label>
                  <input
                    type="text"
                    value={leadForm.country}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, country: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Interested Course
                  </label>
                  <input
                    type="text"
                    value={leadForm.interestedCourse}
                    onChange={(event) =>
                      setLeadForm((current) => ({
                        ...current,
                        interestedCourse: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Interested Intake
                  </label>
                  <input
                    type="text"
                    value={leadForm.interestedIntake}
                    onChange={(event) =>
                      setLeadForm((current) => ({
                        ...current,
                        interestedIntake: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, source: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    {LEAD_SOURCE_OPTIONS.map((source) => (
                      <option key={source} value={source}>
                        {formatLeadSource(source)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Stage</label>
                  <select
                    value={leadForm.status}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, status: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    {LEAD_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatLeadStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Assigned To</label>
                  <select
                    value={leadForm.assignedTo}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, assignedTo: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select counselor</option>
                    {consultancies.map((consultancy) => (
                      <option key={consultancy._id} value={consultancy._id}>
                        {consultancy.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Follow-Up Date
                  </label>
                  <input
                    type="datetime-local"
                    value={leadForm.followUpDate}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, followUpDate: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Address</label>
                  <textarea
                    rows="4"
                    value={leadForm.address}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, address: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Next Action
                  </label>
                  <textarea
                    rows="4"
                    value={leadForm.nextAction}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, nextAction: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </form>

            <form
              onSubmit={handleLogContact}
              className="space-y-5 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Contact Log
                  </p>
                  <h4 className="mt-1 font-heading text-xl font-semibold text-gray-900">
                    Record a follow-up
                  </h4>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Channel</label>
                  <select
                    value={contactForm.channel}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, channel: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="walk_in">Walk-In</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Next Follow-Up
                  </label>
                  <input
                    type="datetime-local"
                    value={contactForm.nextFollowUpDate}
                    onChange={(event) =>
                      setContactForm((current) => ({
                        ...current,
                        nextFollowUpDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Move Stage To
                  </label>
                  <select
                    value={contactForm.status}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, status: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Keep current stage</option>
                    {LEAD_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {formatLeadStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  What happened in this follow-up?
                </label>
                <textarea
                  rows="4"
                  value={contactForm.message}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, message: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
                {validationErrors.contactMessage ? (
                  <p className="mt-2 text-sm text-rose-600">{validationErrors.contactMessage}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={submitting === "contact"}
                className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
              >
                {submitting === "contact" ? "Saving..." : "Log Contact"}
              </button>
            </form>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="space-y-5 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Internal Notes
                  </p>
                  <h4 className="mt-2 font-heading text-xl font-semibold text-gray-900">
                    Team notes
                  </h4>
                </div>

                <div>
                  <textarea
                    rows="4"
                    value={noteInput}
                    onChange={(event) => setNoteInput(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    placeholder="Add an internal update or reminder"
                  />
                  {validationErrors.note ? (
                    <p className="mt-2 text-sm text-rose-600">{validationErrors.note}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={submitting === "note"}
                    className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:border-blue-100 disabled:bg-blue-50 disabled:text-blue-300"
                  >
                    {submitting === "note" ? "Adding..." : "Add Note"}
                  </button>
                </div>

                <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
                  {notes.length ? (
                    notes.map((note) => (
                      <div key={note._id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-sm leading-7 text-gray-700">{note.body}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gray-400">
                          {note.createdBy?.name || "Consultancy"} • {formatDateTime(note.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                      No internal notes added yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-5 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Activity
                  </p>
                  <h4 className="mt-2 font-heading text-xl font-semibold text-gray-900">
                    Follow-up history
                  </h4>
                </div>

                <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {activityLog.length ? (
                    activityLog.map((activity) => (
                      <div
                        key={activity._id}
                        className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <p className="text-sm font-semibold text-gray-900">{activity.message}</p>
                        <p className="mt-2 text-sm text-gray-500">
                          {activity.createdBy?.name || "Consultancy"}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                      Lead activity will appear here after the first update or follow-up.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <form
              onSubmit={handleConvertLead}
              className="space-y-5 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Conversion
                  </p>
                  <h4 className="mt-2 font-heading text-xl font-semibold text-gray-900">
                    {detailLead.convertedStudentId
                      ? "Lead converted"
                      : "Convert this lead into a student"}
                  </h4>
                </div>
                {detailLead.convertedStudentId ? (
                  <StatusBadge status="converted" label="Converted" />
                ) : null}
              </div>

              {detailLead.convertedStudentId ? (
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-emerald-800">
                    Student account linked
                  </p>
                  <p className="mt-2 text-sm text-emerald-700">
                    {detailLead.convertedStudentId.name} • {detailLead.convertedStudentId.email}
                  </p>
                  <p className="mt-2 text-sm text-emerald-700">
                    Converted {formatDateTime(detailLead.convertedAt)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student Name
                      </label>
                      <input
                        type="text"
                        value={convertForm.name}
                        onChange={(event) =>
                          setConvertForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      />
                      {validationErrors.convertName ? (
                        <p className="mt-2 text-sm text-rose-600">
                          {validationErrors.convertName}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student Email
                      </label>
                      <input
                        type="email"
                        value={convertForm.email}
                        onChange={(event) =>
                          setConvertForm((current) => ({ ...current, email: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      />
                      {validationErrors.convertEmail ? (
                        <p className="mt-2 text-sm text-rose-600">
                          {validationErrors.convertEmail}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student Phone
                      </label>
                      <input
                        type="text"
                        value={convertForm.phone}
                        onChange={(event) =>
                          setConvertForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Initial Password
                      </label>
                      <input
                        type="text"
                        value={convertForm.password}
                        onChange={(event) =>
                          setConvertForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                      />
                      {validationErrors.convertPassword ? (
                        <p className="mt-2 text-sm text-rose-600">
                          {validationErrors.convertPassword}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Student Address
                    </label>
                    <textarea
                      rows="3"
                      value={convertForm.address}
                      onChange={(event) =>
                        setConvertForm((current) => ({ ...current, address: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                    Converting this lead creates a student account immediately. Use credentials the
                    student can log in with right away.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting === "convert"}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                  >
                    {submitting === "convert" ? "Converting..." : "Convert to Student"}
                  </button>
                </>
              )}
            </form>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Leads;
