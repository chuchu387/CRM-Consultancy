import { useEffect, useMemo, useState } from "react";
import { HiOutlineRectangleStack } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import StudentSummaryCard from "../../components/StudentSummaryCard";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";

const commonDocumentTypes = [
  "I-20",
  "CAS",
  "COE",
  "PAL",
  "LOA",
  "Offer Letter",
  "Admission Letter",
  "Enrollment Letter",
];

const initialForm = {
  studentId: "",
  country: "",
  universityName: "",
  programName: "",
  intake: "",
  applicationStatus: "draft",
  offerLetterStatus: "pending",
  tuitionDepositStatus: "pending",
  enrollmentDocumentType: "I-20",
  enrollmentDocumentStatus: "pending",
  note: "",
};

const Applications = () => {
  const { data: applications, loading, error, refetch } = useApi("/universities");
  const { data: students } = useApi("/users/students");
  const { data: visas, error: visasError } = useApi("/visa");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (visasError) {
      toast.error(visasError);
    }
  }, [visasError]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((item) => {
      const matchesFilter =
        statusFilter === "all" ? true : item.applicationStatus === statusFilter;
      const matchesSearch = query
        ? [item.universityName, item.programName, item.studentId?.name, item.country]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [applications, search, statusFilter]);

  const studentGroups = useMemo(() => {
    const groups = filteredApplications.reduce((collection, item) => {
      const studentId = item.studentId?._id || item.studentId || "unknown";

      if (!collection[studentId]) {
        collection[studentId] = {
          studentId,
          studentName: item.studentId?.name || "Student",
          studentEmail: item.studentId?.email || "",
          applications: [],
        };
      }

      collection[studentId].applications.push(item);
      return collection;
    }, {});

    return Object.values(groups)
      .map((group) => {
        const sortedApplications = [...group.applications].sort(
          (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );

        return {
          ...group,
          applications: sortedApplications,
          totalApplications: sortedApplications.length,
          activeCount: sortedApplications.filter(
            (item) => !["completed", "closed"].includes(item.applicationStatus)
          ).length,
          offerReceivedCount: sortedApplications.filter(
            (item) => item.offerLetterStatus === "received"
          ).length,
          latestUpdatedAt: sortedApplications[0]?.updatedAt || null,
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredApplications]);

  const selectedStudentGroup = useMemo(
    () => studentGroups.find((group) => group.studentId === selectedStudentId) || null,
    [selectedStudentId, studentGroups]
  );

  const studentCountryLookup = useMemo(() => {
    const lookup = {};

    const registerCountry = (studentId, country, timestamp) => {
      if (!studentId || !country) {
        return;
      }

      const normalizedTimestamp = new Date(timestamp || 0).getTime();

      if (!lookup[studentId] || normalizedTimestamp >= lookup[studentId].timestamp) {
        lookup[studentId] = {
          country,
          timestamp: normalizedTimestamp,
        };
      }
    };

    visas.forEach((visa) => {
      registerCountry(
        visa.studentId?._id || visa.studentId,
        visa.country,
        visa.updatedAt || visa.createdAt
      );
    });

    applications.forEach((application) => {
      registerCountry(
        application.studentId?._id || application.studentId,
        application.country,
        application.updatedAt || application.createdAt
      );
    });

    return Object.keys(lookup).reduce((accumulator, studentId) => {
      accumulator[studentId] = lookup[studentId].country;
      return accumulator;
    }, {});
  }, [applications, visas]);

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

  useEffect(() => {
    resetPage();
  }, [resetPage, search, statusFilter]);

  const resetForm = () => {
    setEditingItem(null);
    setForm(initialForm);
    setValidationErrors({});
  };

  const handleStudentSelect = (studentId) => {
    setForm((current) => ({
      ...current,
      studentId,
      country: studentCountryLookup[studentId] || "",
    }));
    setValidationErrors((current) => ({
      ...current,
      studentId: "",
      country: "",
    }));
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      studentId: item.studentId?._id || "",
      country: item.country,
      universityName: item.universityName,
      programName: item.programName,
      intake: item.intake,
      applicationStatus: item.applicationStatus,
      offerLetterStatus: item.offerLetterStatus,
      tuitionDepositStatus: item.tuitionDepositStatus,
      enrollmentDocumentType: item.enrollmentDocumentType,
      enrollmentDocumentStatus: item.enrollmentDocumentStatus,
      note: item.note || "",
    });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    ["studentId", "country", "universityName", "programName", "intake"].forEach((field) => {
      if (!form[field]?.trim()) {
        nextErrors[field] = "This field is required";
      }
    });
    if (!form.enrollmentDocumentType.trim()) {
      nextErrors.enrollmentDocumentType = "Document type is required";
    }

    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...form,
        studentId: form.studentId,
        country: form.country.trim(),
        universityName: form.universityName.trim(),
        programName: form.programName.trim(),
        intake: form.intake.trim(),
        enrollmentDocumentType: form.enrollmentDocumentType.trim(),
        note: form.note.trim(),
      };

      if (editingItem) {
        await api.patch(`/universities/${editingItem._id}`, payload);
        toast.success("University application updated");
      } else {
        await api.post("/universities", payload);
        toast.success("University application created");
      }

      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to save university application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Admissions Tracker
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              University applications
            </h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, university, program, or country"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="applied">Applied</option>
              <option value="offer_received">Offer Received</option>
              <option value="offer_rejected">Offer Rejected</option>
              <option value="visa_filed">Visa Filed</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Add University Application
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {!loading && filteredApplications.length ? (
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

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="h-3 w-12 animate-pulse rounded bg-gray-100" />
                <div className="mt-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((__, statIndex) => (
                    <div key={statIndex} className="rounded-xl bg-gray-50 px-3 py-2">
                      <div className="h-2 w-10 animate-pulse rounded bg-gray-100" />
                      <div className="mt-2 h-4 w-8 animate-pulse rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : studentGroups.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {paginatedStudentGroups.map((group) => (
              <StudentSummaryCard
                key={group.studentId}
                compact
                name={group.studentName}
                email={group.studentEmail}
                meta={
                  group.applications[0]
                    ? `Latest ${group.applications[0].country} • ${group.applications[0].universityName}`
                    : ""
                }
                stats={[
                  { label: "Applications", value: group.totalApplications },
                  { label: "Active", value: group.activeCount, tone: "blue" },
                  { label: "Offer Received", value: group.offerReceivedCount, tone: "emerald" },
                ]}
                updatedText={`Updated ${formatDateTime(group.latestUpdatedAt)}`}
                onAction={() => setSelectedStudentId(group.studentId)}
              >
                <div className="flex flex-wrap gap-1.5">
                  {group.applications.slice(0, 3).map((item) => (
                    <span
                      key={item._id}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600"
                    >
                      {item.country}
                    </span>
                  ))}
                </div>
              </StudentSummaryCard>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineRectangleStack className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No university applications found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Track universities, offer letters, tuition deposits, and I-20/CAS/COE progress.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedStudentGroup)}
        onClose={() => setSelectedStudentId("")}
        title="Student University Applications"
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
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Applications
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {selectedStudentGroup.totalApplications}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Active
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-blue-700">
                      {selectedStudentGroup.activeCount}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Offers
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-700">
                      {selectedStudentGroup.offerReceivedCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {selectedStudentGroup.applications.map((item) => (
                <div
                  key={item._id}
                  className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                        {item.country}
                      </p>
                      <h4 className="mt-2 font-heading text-xl font-semibold text-gray-900">
                        {item.universityName}
                      </h4>
                      <p className="mt-2 text-sm text-gray-600">
                        {item.programName} • Intake {item.intake}
                      </p>
                      <div className="mt-4 grid gap-2 text-sm text-gray-500 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <span>Application:</span>
                          <StatusBadge status={item.applicationStatus} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Offer Letter:</span>
                          <StatusBadge status={item.offerLetterStatus} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Tuition Deposit:</span>
                          <StatusBadge status={item.tuitionDepositStatus} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{item.enrollmentDocumentType}:</span>
                          <StatusBadge status={item.enrollmentDocumentStatus} />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-gray-500">{item.note || "No notes added."}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gray-400">
                        Updated {formatDateTime(item.updatedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId("");
                        openEdit(item);
                      }}
                      className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingItem ? "Edit University Application" : "Add University Application"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Student</label>
              <select
                value={form.studentId}
                onChange={(event) => handleStudentSelect(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name}
                  </option>
                ))}
              </select>
              {validationErrors.studentId ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.studentId}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                This is auto-filled from the student&apos;s latest visa or university country when
                available. You can still edit it.
              </p>
              {validationErrors.country ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.country}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">University</label>
              <input
                type="text"
                value={form.universityName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, universityName: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.universityName ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.universityName}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Program</label>
              <input
                type="text"
                value={form.programName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, programName: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.programName ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.programName}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Intake</label>
              <input
                type="text"
                value={form.intake}
                onChange={(event) => setForm((current) => ({ ...current, intake: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.intake ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.intake}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Application Status</label>
              <select
                value={form.applicationStatus}
                onChange={(event) =>
                  setForm((current) => ({ ...current, applicationStatus: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="offer_received">Offer Received</option>
                <option value="offer_rejected">Offer Rejected</option>
                <option value="visa_filed">Visa Filed</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Offer Letter</label>
              <select
                value={form.offerLetterStatus}
                onChange={(event) =>
                  setForm((current) => ({ ...current, offerLetterStatus: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Tuition Deposit</label>
              <select
                value={form.tuitionDepositStatus}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tuitionDepositStatus: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="not_required">Not Required</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Document Type</label>
              <input
                type="text"
                value={form.enrollmentDocumentType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, enrollmentDocumentType: event.target.value }))
                }
                list="university-document-types"
                placeholder="I-20, CAS, COE, PAL, LOA..."
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <datalist id="university-document-types">
                {commonDocumentTypes.map((documentType) => (
                  <option key={documentType} value={documentType} />
                ))}
              </datalist>
              <p className="mt-2 text-xs text-gray-500">
                Add any custom document type. Common options are suggested.
              </p>
              {validationErrors.enrollmentDocumentType ? (
                <p className="mt-2 text-sm text-rose-600">
                  {validationErrors.enrollmentDocumentType}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Document Status</label>
              <select
                value={form.enrollmentDocumentStatus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    enrollmentDocumentStatus: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Note</label>
            <textarea
              rows="4"
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting
              ? "Saving..."
              : editingItem
                ? "Update University Application"
                : "Create University Application"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Applications;
