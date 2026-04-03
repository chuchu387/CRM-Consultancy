import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineCheck,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperClip,
  HiOutlinePlus,
  HiOutlinePhoto,
  HiOutlineXMark,
} from "react-icons/hi2";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";
import { downloadCsv, downloadPdf } from "../../utils/export";

const initialRequestForm = {
  studentId: "",
  visaApplicationId: "",
  templateId: "",
  documents: [
    {
      documentName: "",
      description: "",
    },
  ],
};

const QUICK_DOCUMENT_PRESETS_STORAGE_KEY = "crm_custom_document_presets";

const defaultDocumentPresets = [
  "COA",
  "Citizenship",
  "Passport",
  "Academic Transcript",
  "Offer Letter",
  "Bank Statement",
  "English Proficiency",
  "SOP",
  "Recommendation Letter",
  "CV",
];

const normalizePresetName = (value = "") => value.trim().replace(/\s+/g, " ");

const getCurrentUpload = (document) => {
  const history = Array.isArray(document.uploadHistory) ? document.uploadHistory : [];

  if (history.length) {
    return history[history.length - 1];
  }

  if (document.fileUrl) {
    return {
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      fileMimeType: document.fileMimeType,
      uploadedAt: document.uploadedAt,
      reviewStatus: document.status === "uploaded" ? "uploaded" : document.status,
      reviewedAt: document.reviewedAt || null,
      reviewNote: document.reviewNote || "",
      correctionItems: document.correctionItems || [],
      reviewedByName: document.reviewedByName || "",
    };
  }

  return null;
};

const getPreviousUploads = (document) => {
  const history = Array.isArray(document.uploadHistory) ? [...document.uploadHistory] : [];

  if (!history.length) {
    return [];
  }

  return history.slice(0, -1).reverse();
};

const canPreviewInline = (fileMimeType = "") =>
  fileMimeType === "application/pdf" || fileMimeType.startsWith("image/");

const getFileKind = (fileMimeType = "", fileName = "") => {
  const normalizedName = String(fileName).toLowerCase();

  if (fileMimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(normalizedName)) {
    return "image";
  }

  if (fileMimeType === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    fileMimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedName.endsWith(".docx")
  ) {
    return "docx";
  }

  return "generic";
};

const FileTypeIcon = ({ kind }) => {
  if (kind === "image") {
    return <HiOutlinePhoto className="h-5 w-5" />;
  }

  if (kind === "docx") {
    return <HiOutlinePaperClip className="h-5 w-5" />;
  }

  return <HiOutlineDocumentText className="h-5 w-5" />;
};

const getCorrectionItems = (source) =>
  Array.isArray(source?.correctionItems)
    ? source.correctionItems.map((item) => item?.trim()).filter(Boolean)
    : [];

const getCorrectionSummary = (source) => {
  const summary = (source?.reviewNote || "").trim();
  const correctionItems = getCorrectionItems(source);

  if (!summary) {
    return "";
  }

  if (correctionItems.length && summary === correctionItems.join(" | ")) {
    return "";
  }

  return summary;
};

const getChecklistDraft = (source) => {
  const correctionItems = getCorrectionItems(source);

  return correctionItems.length ? correctionItems : [""];
};

const shortenBatchLabel = (value = "") => {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.length > 18
    ? `${normalizedValue.slice(0, 12)}...${normalizedValue.slice(-4)}`
    : normalizedValue;
};

const DocumentRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: documents, loading, error, refetch } = useApi("/documents");
  const { data: students, error: studentsError } = useApi("/users/students");
  const { data: visas, error: visasError } = useApi("/visa");
  const { data: templates, error: templatesError } = useApi("/templates");
  const [statusFilter, setStatusFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [rejectingDocument, setRejectingDocument] = useState(null);
  const [correctionSummary, setCorrectionSummary] = useState("");
  const [correctionItems, setCorrectionItems] = useState([""]);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [presetSearch, setPresetSearch] = useState("");
  const [customPresetInput, setCustomPresetInput] = useState("");
  const [pendingCustomPresetDelete, setPendingCustomPresetDelete] = useState("");
  const [customDocumentPresets, setCustomDocumentPresets] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const storedValue = window.localStorage.getItem(QUICK_DOCUMENT_PRESETS_STORAGE_KEY);
      const parsedValue = storedValue ? JSON.parse(storedValue) : [];

      return Array.isArray(parsedValue)
        ? parsedValue
            .map((item) => normalizePresetName(String(item || "")))
            .filter(Boolean)
        : [];
    } catch (storageError) {
      return [];
    }
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (studentsError) {
      toast.error(studentsError);
    }
  }, [studentsError]);

  useEffect(() => {
    if (visasError) {
      toast.error(visasError);
    }
  }, [visasError]);

  useEffect(() => {
    if (templatesError) {
      toast.error(templatesError);
    }
  }, [templatesError]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      QUICK_DOCUMENT_PRESETS_STORAGE_KEY,
      JSON.stringify(customDocumentPresets)
    );
  }, [customDocumentPresets]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [students]
  );

  const studentLookup = useMemo(
    () =>
      sortedStudents.reduce((lookup, student) => {
        lookup[student._id] = student;
        return lookup;
      }, {}),
    [sortedStudents]
  );

  const filteredDocuments = useMemo(() => {
    return [...documents]
      .filter((document) => {
        if (statusFilter !== "all" && document.status !== statusFilter) {
          return false;
        }

        const documentStudentId = document.studentId?._id || document.studentId;

        if (studentFilter !== "all" && documentStudentId !== studentFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [documents, statusFilter, studentFilter]);

  const studentGroups = useMemo(() => {
    const groups = filteredDocuments.reduce((collection, document) => {
      const studentId = document.studentId?._id || document.studentId || "unknown";
      const studentProfile = studentLookup[studentId];

      if (!collection[studentId]) {
        collection[studentId] = {
          studentId,
          studentName: document.studentId?.name || studentProfile?.name || "Student",
          studentEmail: document.studentId?.email || studentProfile?.email || "",
          studentPhone: document.studentId?.phone || studentProfile?.phone || "",
          studentAddress: document.studentId?.address || studentProfile?.address || "",
          studentAvatarUrl: studentProfile?.avatarUrl || "",
          documents: [],
        };
      }

      collection[studentId].documents.push(document);
      return collection;
    }, {});

    return Object.values(groups).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [filteredDocuments, studentLookup]);
  const normalizedStudentGroups = useMemo(
    () =>
      studentGroups.map((group) => {
        const pendingReviewCount = group.documents.filter(
          (document) => document.status === "uploaded"
        ).length;
        const awaitingUploadCount = group.documents.filter(
          (document) =>
            document.studentAcceptanceStatus !== "accepted" ||
            ["pending", "changes_requested", "rejected"].includes(document.status)
        ).length;
        const approvedCount = group.documents.filter(
          (document) => document.status === "approved"
        ).length;

        return {
          ...group,
          approvedCount,
          awaitingUploadCount,
          lastRequestedAt: group.documents.reduce((latest, document) => {
            const timestamp = new Date(document.createdAt || 0).getTime();
            return timestamp > latest ? timestamp : latest;
          }, 0),
          pendingReviewCount,
        };
      }),
    [studentGroups]
  );
  const selectedStudentGroup = useMemo(
    () =>
      normalizedStudentGroups.find((group) => group.studentId === selectedStudentId) || null,
    [normalizedStudentGroups, selectedStudentId]
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
  } = usePagination(normalizedStudentGroups);

  const studentVisaOptions = useMemo(() => {
    if (!requestForm.studentId) {
      return [];
    }

    return visas.filter(
      (visa) => (visa.studentId?._id || visa.studentId) === requestForm.studentId
    );
  }, [requestForm.studentId, visas]);

  const selectedVisa = useMemo(
    () => studentVisaOptions.find((visa) => visa._id === requestForm.visaApplicationId) || null,
    [requestForm.visaApplicationId, studentVisaOptions]
  );

  const matchingTemplates = useMemo(() => {
    if (!selectedVisa) {
      return templates;
    }

    return templates.filter(
      (template) =>
        template.country?.trim().toLowerCase() === selectedVisa.country?.trim().toLowerCase() &&
        template.visaType?.trim().toLowerCase() === selectedVisa.visaType?.trim().toLowerCase()
    );
  }, [selectedVisa, templates]);

  const selectedDocumentCurrentUpload = selectedDocument
    ? getCurrentUpload(selectedDocument)
    : null;
  const selectedDocumentPreviousUploads = selectedDocument
    ? getPreviousUploads(selectedDocument)
    : [];
  const selectedDocumentReviewSource = selectedDocumentCurrentUpload || selectedDocument;
  const selectedDocumentCorrectionItems = selectedDocument
    ? getCorrectionItems(selectedDocumentReviewSource)
    : [];
  const selectedDocumentCorrectionSummary = selectedDocument
    ? getCorrectionSummary(selectedDocumentReviewSource) || getCorrectionSummary(selectedDocument)
    : "";
  const allDocumentPresets = useMemo(() => {
    const presetMap = new Map();

    [...defaultDocumentPresets, ...customDocumentPresets].forEach((preset) => {
      const normalizedPreset = normalizePresetName(preset);

      if (!normalizedPreset) {
        return;
      }

      const lookupKey = normalizedPreset.toLowerCase();

      if (!presetMap.has(lookupKey)) {
        presetMap.set(lookupKey, normalizedPreset);
      }
    });

    return Array.from(presetMap.values());
  }, [customDocumentPresets]);
  const customPresetLookup = useMemo(
    () =>
      new Set(
        customDocumentPresets.map((preset) => normalizePresetName(preset).toLowerCase()).filter(Boolean)
      ),
    [customDocumentPresets]
  );
  const selectedPresetLookup = useMemo(
    () =>
      new Set(
        requestForm.documents
          .map((item) => item.documentName.trim().toLowerCase())
          .filter(Boolean)
      ),
    [requestForm.documents]
  );
  const filteredPresets = useMemo(() => {
    const query = presetSearch.trim().toLowerCase();

    if (!query) {
      return allDocumentPresets;
    }

    return allDocumentPresets.filter((preset) => preset.toLowerCase().includes(query));
  }, [allDocumentPresets, presetSearch]);

  useEffect(() => {
    resetPage();
  }, [resetPage, statusFilter, studentFilter]);

  const resetRequestForm = () => {
    setRequestForm(initialRequestForm);
    setValidationErrors({});
    setPresetSearch("");
    setCustomPresetInput("");
  };

  const applyTemplate = (templateId) => {
    const selectedTemplate = templates.find((template) => template._id === templateId);

    setRequestForm((current) => ({
      ...current,
      templateId,
      documents: selectedTemplate
        ? selectedTemplate.documents.map((item) => ({
            documentName: item.documentName,
            description: item.description || "",
          }))
        : initialRequestForm.documents,
    }));
  };

  useEffect(() => {
    const templateId = searchParams.get("templateId");

    if (!templateId || !templates.length) {
      return;
    }

    const selectedTemplate = templates.find((template) => template._id === templateId);

    if (selectedTemplate) {
      setIsModalOpen(true);
      applyTemplate(templateId);
      toast.info(`Template "${selectedTemplate.name}" is ready. Choose a student and send.`);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("templateId");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, templates]);

  const updateRequestedDocument = (index, field, value) => {
    setRequestForm((current) => ({
      ...current,
      documents: current.documents.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addRequestedDocument = () => {
    setRequestForm((current) => ({
      ...current,
      documents: [
        ...current.documents,
        {
          documentName: "",
          description: "",
        },
      ],
    }));
  };

  const addPresetToRequest = (documentName) => {
    const normalizedPreset = normalizePresetName(documentName);

    if (!normalizedPreset) {
      return;
    }

    setRequestForm((current) => {
      const alreadyAdded = current.documents.some(
        (item) => normalizePresetName(item.documentName).toLowerCase() === normalizedPreset.toLowerCase()
      );

      if (alreadyAdded) {
        return current;
      }

      const emptyIndex = current.documents.findIndex((item) => !normalizePresetName(item.documentName));

      if (emptyIndex >= 0) {
        return {
          ...current,
          documents: current.documents.map((item, index) =>
            index === emptyIndex ? { ...item, documentName: normalizedPreset } : item
          ),
        };
      }

      return {
        ...current,
        documents: [
          ...current.documents,
          {
            documentName: normalizedPreset,
            description: "",
          },
        ],
      };
    });
  };

  const toggleDocumentPreset = (documentName) => {
    setRequestForm((current) => {
      const normalizedDocumentName = normalizePresetName(documentName);
      const normalizedPreset = normalizedDocumentName.toLowerCase();
      const existingDocuments = current.documents.filter(
        (item) => normalizePresetName(item.documentName).toLowerCase() !== normalizedPreset
      );

      if (existingDocuments.length !== current.documents.length) {
        return {
          ...current,
          documents: existingDocuments.length
            ? existingDocuments
            : [
                {
                  documentName: "",
                  description: "",
                },
              ],
        };
      }

      const emptyIndex = current.documents.findIndex((item) => !item.documentName.trim());

      if (emptyIndex >= 0) {
        return {
          ...current,
          documents: current.documents.map((item, index) =>
            index === emptyIndex ? { ...item, documentName: normalizedDocumentName } : item
          ),
        };
      }

      return {
        ...current,
        documents: [
          ...current.documents,
          {
            documentName: normalizedDocumentName,
            description: "",
          },
        ],
      };
    });
  };

  const handleAddCustomPreset = () => {
    const normalizedPreset = normalizePresetName(customPresetInput);

    if (!normalizedPreset) {
      toast.error("Enter a document type name");
      return;
    }

    const existingPreset = allDocumentPresets.find(
      (preset) => preset.toLowerCase() === normalizedPreset.toLowerCase()
    );
    const presetToUse = existingPreset || normalizedPreset;

    if (!existingPreset) {
      setCustomDocumentPresets((current) => [...current, normalizedPreset]);
      toast.success(`${normalizedPreset} added to quick document types`);
    }

    if (!selectedPresetLookup.has(presetToUse.toLowerCase())) {
      addPresetToRequest(presetToUse);
    }

    setCustomPresetInput("");
    setPresetSearch("");
  };

  const handleDeleteCustomPreset = (presetToDelete) => {
    const normalizedPreset = normalizePresetName(presetToDelete);

    if (!normalizedPreset) {
      return;
    }
    setPendingCustomPresetDelete(normalizedPreset);
  };

  const confirmDeleteCustomPreset = () => {
    const normalizedPreset = normalizePresetName(pendingCustomPresetDelete);

    if (!normalizedPreset) {
      setPendingCustomPresetDelete("");
      return;
    }

    setCustomDocumentPresets((current) =>
      current.filter(
        (preset) => normalizePresetName(preset).toLowerCase() !== normalizedPreset.toLowerCase()
      )
    );

    setRequestForm((current) => {
      const remainingDocuments = current.documents.filter(
        (item) =>
          normalizePresetName(item.documentName).toLowerCase() !== normalizedPreset.toLowerCase()
      );

      return {
        ...current,
        documents: remainingDocuments.length
          ? remainingDocuments
          : [
              {
                documentName: "",
                description: "",
              },
            ],
      };
    });

    toast.success(`${normalizedPreset} removed from quick document types`);
    setPendingCustomPresetDelete("");
  };

  const clearSelectedPresets = () => {
    setRequestForm((current) => {
      const remainingDocuments = current.documents.filter(
        (item) =>
          !allDocumentPresets.some(
            (preset) =>
              preset.toLowerCase() === normalizePresetName(item.documentName).toLowerCase()
          )
      );

      return {
        ...current,
        documents: remainingDocuments.length
          ? remainingDocuments
          : [
              {
                documentName: "",
                description: "",
              },
            ],
      };
    });
  };

  const removeRequestedDocument = (index) => {
    setRequestForm((current) => ({
      ...current,
      documents:
        current.documents.length === 1
          ? current.documents
          : current.documents.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSendRequiredDocuments = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!requestForm.studentId) {
      nextErrors.studentId = "Please choose a student";
    }

    requestForm.documents.forEach((item, index) => {
      if (!item.documentName.trim()) {
        nextErrors[`documentName-${index}`] = "Document name is required";
      }
    });

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmittingRequest(true);

    try {
      const response = await api.post("/documents/request", {
        studentId: requestForm.studentId,
        visaApplicationId: requestForm.visaApplicationId || null,
        documents: requestForm.documents.map((item) => ({
          documentName: item.documentName.trim(),
          description: item.description.trim(),
        })),
      });

      toast.success(response.data.message || "Required documents sent successfully");
      setIsModalOpen(false);
      resetRequestForm();
      refetch();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to send required documents");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleUpdateStatus = async (id, status, reviewNote = "", correctionItemList = []) => {
    setActionLoadingId(`${id}-${status}`);

    try {
      const response = await api.patch(`/documents/${id}/status`, {
        status,
        reviewNote,
        correctionItems: correctionItemList,
      });
      toast.success(response.data.message || "Document updated");

      if (selectedDocument?._id === id) {
        setSelectedDocument(response.data.data);
      }

      await refetch();
      return true;
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Unable to update document");
      return false;
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectSubmit = async (event) => {
    event.preventDefault();

    if (!rejectingDocument) {
      return;
    }

    const normalizedCorrectionItems = correctionItems.map((item) => item.trim()).filter(Boolean);

    if (!normalizedCorrectionItems.length) {
      toast.error("Add at least one correction point");
      return;
    }

    const updated = await handleUpdateStatus(
      rejectingDocument._id,
      "changes_requested",
      correctionSummary.trim(),
      normalizedCorrectionItems
    );

    if (updated) {
      setRejectingDocument(null);
      setCorrectionSummary("");
      setCorrectionItems([""]);
    }
  };

  const handleOpenRejectModal = (document) => {
    setRejectingDocument(document);
    setCorrectionSummary(getCorrectionSummary(document));
    setCorrectionItems(getChecklistDraft(document));
  };

  const updateCorrectionItem = (index, value) => {
    setCorrectionItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const addCorrectionItem = () => {
    setCorrectionItems((current) => [...current, ""]);
  };

  const removeCorrectionItem = (index) => {
    setCorrectionItems((current) =>
      current.length === 1 ? [""] : current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleExport = (type) => {
    if (!filteredDocuments.length) {
      toast.info("No documents to export");
      return;
    }

    const rows = filteredDocuments.map((document) => ({
      Student: document.studentId?.name || "",
      Document: document.documentName,
      TemplateBatch: document.requestBatchId || "",
      Acceptance:
        document.studentAcceptanceStatus === "accepted"
          ? "Accepted by Student"
          : "Awaiting Acceptance",
      Status: document.status,
      Uploaded: formatDateTime(document.uploadedAt, "Not uploaded"),
      Visa: document.visaApplicationId
        ? `${document.visaApplicationId.country} ${document.visaApplicationId.visaType}`
        : "General",
    }));

    if (type === "csv") {
      downloadCsv("document-requests", rows);
      return;
    }

    downloadPdf({
      filename: "document-requests",
      title: "Document Requests",
      columns: ["Student", "Document", "Batch", "Acceptance", "Status", "Uploaded", "Visa"],
      rows: rows.map((document) => [
        document.Student,
        document.Document,
        document.TemplateBatch,
        document.Acceptance,
        document.Status,
        document.Uploaded,
        document.Visa,
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Document Pipeline
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Student document requests
            </h2>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <select
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 lg:w-64"
            >
              <option value="all">All students</option>
              {sortedStudents.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 lg:w-56"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="uploaded">Uploaded</option>
              <option value="approved">Approved</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + Send Required Documents
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
          <span>
            Showing {normalizedStudentGroups.length} student
            {normalizedStudentGroups.length === 1 ? "" : "s"}
          </span>
          <span>
            with {filteredDocuments.length} related document request
            {filteredDocuments.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {!loading && normalizedStudentGroups.length ? (
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <Pagination
              currentPage={currentPage}
              endItem={endItem}
              itemLabel="students"
              onPageChange={setCurrentPage}
              onRowsPerPageChange={setRowsPerPage}
              rowsPerPage={rowsPerPage}
              rowsPerPageLabel="Students per page"
              startItem={startItem}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </div>
        ) : null}

        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="h-6 w-52 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-4 w-72 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="p-6">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="mt-4 h-4 w-5/6 animate-pulse rounded bg-gray-100" />
                <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))
        ) : normalizedStudentGroups.length ? (
          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    {[
                      "Student",
                      "Contact",
                      "Documents",
                      "Pending Review",
                      "Awaiting Upload",
                      "Last Request",
                      "Actions",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedStudentGroups.map((group) => (
                    <tr key={group.studentId} className="transition hover:bg-blue-50/50">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1rem] bg-blue-100 font-heading text-base font-semibold text-blue-700">
                            {group.studentAvatarUrl ? (
                              <img
                                src={group.studentAvatarUrl}
                                alt={group.studentName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              group.studentName?.charAt(0)?.toUpperCase() || "S"
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{group.studentName}</p>
                            <p className="mt-1 text-sm text-gray-500">
                              {group.studentEmail || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        <p>{group.studentPhone || "No phone"}</p>
                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {group.studentAddress || "No address"}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                          {group.documents.length} document
                          {group.documents.length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                          {group.pendingReviewCount} pending review
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                          {group.awaitingUploadCount} awaiting upload
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">
                        {formatDateTime(group.lastRequestedAt, "Not available")}
                      </td>
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(group.studentId)}
                          className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-gray-200 bg-white px-6 py-20 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-3xl bg-blue-50 p-4 text-blue-600">
                <HiOutlineDocumentText className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
                No document requests found
              </h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Requested files and uploads will appear here once staff asks students for
                supporting documents. Try changing the student or status filter if you expected a
                different result.
              </p>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedStudentGroup)}
        onClose={() => setSelectedStudentId("")}
        title="Student Document Requests"
        size="lg"
      >
        {selectedStudentGroup ? (
          <div className="space-y-6">
            <div className="grid gap-4 rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5 md:grid-cols-[1.1fr_0.9fr]">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.25rem] bg-blue-100 font-heading text-xl font-semibold text-blue-700">
                  {selectedStudentGroup.studentAvatarUrl ? (
                    <img
                      src={selectedStudentGroup.studentAvatarUrl}
                      alt={selectedStudentGroup.studentName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    selectedStudentGroup.studentName?.charAt(0)?.toUpperCase() || "S"
                  )}
                </div>
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
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedStudentGroup.studentPhone || "No phone"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Documents
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {selectedStudentGroup.documents.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Pending Review
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-700">
                    {selectedStudentGroup.pendingReviewCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Awaiting Upload
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-blue-700">
                    {selectedStudentGroup.awaitingUploadCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-200 bg-white p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Requested Documents
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedStudentGroup.documents.length} item
                    {selectedStudentGroup.documents.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {selectedStudentGroup.documents.map((document) => {
                  const currentUpload = getCurrentUpload(document);
                  const fileKind = getFileKind(
                    currentUpload?.fileMimeType || "",
                    currentUpload?.fileName || document.documentName
                  );
                  const rowCorrectionItems = getCorrectionItems(currentUpload || document);
                  const rowCorrectionSummary =
                    getCorrectionSummary(currentUpload || document) ||
                    getCorrectionSummary(document);

                  return (
                    <div
                      key={document._id}
                      className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                          <FileTypeIcon kind={fileKind} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {document.documentName}
                              </p>
                              {document.description ? (
                                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-gray-500">
                                  {document.description}
                                </p>
                              ) : null}
                            </div>
                            <StatusBadge status={document.status} compact />
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                                document.studentAcceptanceStatus === "accepted"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : "bg-amber-50 text-amber-700 ring-amber-200"
                              }`}
                            >
                              {document.studentAcceptanceStatus === "accepted"
                                ? "Accepted"
                                : "Awaiting acceptance"}
                            </span>
                            {document.requestBatchId ? (
                              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200">
                                {shortenBatchLabel(document.requestBatchId)}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] leading-4 text-gray-500">
                            <p>
                              {document.studentAcceptanceStatus === "accepted"
                                ? `Accepted ${formatDateTime(document.acceptedAt, "recently")}`
                                : "Student has not accepted yet"}
                            </p>
                            <p>
                              {document.uploadedAt
                                ? `Uploaded ${formatDateTime(document.uploadedAt)}`
                                : "Not uploaded yet"}
                            </p>
                          </div>

                          {rowCorrectionSummary ? (
                            <p className="mt-2 line-clamp-2 rounded-xl bg-orange-50 px-2.5 py-2 text-[11px] leading-4 text-orange-800">
                              {rowCorrectionSummary}
                            </p>
                          ) : null}
                          {rowCorrectionItems.length ? (
                            <p className="mt-2 text-[11px] font-medium text-orange-700">
                              {rowCorrectionItems.length} correction point
                              {rowCorrectionItems.length === 1 ? "" : "s"} in detail view
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDocument(document)}
                              className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              View
                            </button>

                            {currentUpload?.fileUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    currentUpload.fileUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                                className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              >
                                Download
                              </button>
                            ) : null}

                            {document.status === "uploaded" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(document._id, "approved")}
                                  disabled={actionLoadingId === `${document._id}-approved`}
                                  className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                                >
                                  {actionLoadingId === `${document._id}-approved`
                                    ? "Approving..."
                                    : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(document)}
                                  disabled={actionLoadingId === `${document._id}-changes_requested`}
                                  className="rounded-xl bg-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:bg-orange-300"
                                >
                                  {actionLoadingId === `${document._id}-changes_requested`
                                    ? "Sending..."
                                    : "Request Changes"}
                                </button>
                              </>
                            ) : document.studentAcceptanceStatus !== "accepted" ? (
                              <span className="rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                                Waiting for student
                              </span>
                            ) : ["pending", "changes_requested", "rejected"].includes(
                                document.status
                              ) ? (
                              <span className="rounded-xl bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
                                Awaiting upload
                              </span>
                            ) : (
                              <span className="rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-500">
                                Complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        title="Document Detail"
        size="lg"
      >
        {selectedDocument ? (
          <div className="space-y-6">
            <div className="grid gap-4 rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Student
                </p>
                <p className="mt-2 font-semibold text-gray-900">
                  {selectedDocument.studentId?.name || "Student"}
                </p>
                <p className="mt-1 text-sm text-gray-500">{selectedDocument.studentId?.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Request
                </p>
                <p className="mt-2 font-semibold text-gray-900">{selectedDocument.documentName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={selectedDocument.status} />
                  <StatusBadge
                    status={
                      selectedDocument.studentAcceptanceStatus === "accepted"
                        ? "Accepted by Student"
                        : "Awaiting Acceptance"
                    }
                  />
                </div>
              </div>
            </div>

            {selectedDocumentCurrentUpload ? (
              <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <FileTypeIcon
                        kind={getFileKind(
                          selectedDocumentCurrentUpload.fileMimeType,
                          selectedDocumentCurrentUpload.fileName || selectedDocument.documentName
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Latest upload</p>
                      <p className="mt-2 break-all text-sm text-gray-600">
                        {selectedDocumentCurrentUpload.fileName || "Uploaded document"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Uploaded{" "}
                        {formatDateTime(selectedDocumentCurrentUpload.uploadedAt, "recently")}
                      </p>
                      {selectedDocumentCurrentUpload.reviewedByName ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Reviewed by {selectedDocumentCurrentUpload.reviewedByName}{" "}
                          {selectedDocumentCurrentUpload.reviewedAt
                            ? `on ${formatDateTime(selectedDocumentCurrentUpload.reviewedAt)}`
                            : ""}
                        </p>
                      ) : null}
                      {selectedDocumentCorrectionSummary ? (
                        <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm text-gray-700">
                          Review note: {selectedDocumentCorrectionSummary}
                        </p>
                      ) : null}
                      {selectedDocumentCorrectionItems.length ? (
                        <div className="mt-3 rounded-3xl border border-orange-100 bg-orange-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
                            Correction Checklist
                          </p>
                          <ul className="mt-3 space-y-2 text-sm text-orange-900">
                            {selectedDocumentCorrectionItems.map((item) => (
                              <li key={`${selectedDocument._id}-${item}`} className="flex gap-3">
                                <HiOutlineCheck className="mt-0.5 h-4 w-4 flex-none" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          selectedDocumentCurrentUpload.fileUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      <HiOutlineEye className="h-4 w-4" />
                      Open
                    </button>
                    <a
                      href={selectedDocumentCurrentUpload.fileUrl}
                      download={selectedDocumentCurrentUpload.fileName || "document"}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <HiOutlineArrowDownTray className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>

                {canPreviewInline(selectedDocumentCurrentUpload.fileMimeType) ? (
                  <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white">
                    {selectedDocumentCurrentUpload.fileMimeType?.startsWith("image/") ? (
                      <img
                        src={selectedDocumentCurrentUpload.fileUrl}
                        alt={
                          selectedDocumentCurrentUpload.fileName || selectedDocument.documentName
                        }
                        className="max-h-[32rem] w-full object-contain"
                      />
                    ) : (
                      <iframe
                        src={selectedDocumentCurrentUpload.fileUrl}
                        title={`${selectedDocument.documentName} preview`}
                        className="h-[32rem] w-full"
                      />
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
                No file has been uploaded for this request yet.
              </div>
            )}

            {selectedDocumentPreviousUploads.length ? (
              <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
                <h3 className="font-heading text-xl font-semibold text-gray-900">
                  Version history
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedDocumentPreviousUploads.length} previous upload
                  {selectedDocumentPreviousUploads.length > 1 ? "s" : ""}
                </p>
                <div className="mt-4 space-y-3">
                  {selectedDocumentPreviousUploads.map((upload, index) => (
                    <div
                      key={`${selectedDocument._id}-upload-history-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
                            <FileTypeIcon kind={getFileKind(upload.fileMimeType, upload.fileName)} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {upload.fileName ||
                                `Version ${selectedDocumentPreviousUploads.length - index}`}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              Uploaded {formatDateTime(upload.uploadedAt, "recently")}
                            </p>
                            {getCorrectionSummary(upload) ? (
                              <p className="mt-2 text-sm text-gray-600">
                                {getCorrectionSummary(upload)}
                              </p>
                            ) : null}
                            {getCorrectionItems(upload).length ? (
                              <ul className="mt-3 space-y-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
                                {getCorrectionItems(upload).map((item) => (
                                  <li
                                    key={`${selectedDocument._id}-${index}-${item}`}
                                    className="flex gap-3"
                                  >
                                    <HiOutlineCheck className="mt-0.5 h-4 w-4 flex-none" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 lg:items-end">
                          <StatusBadge status={upload.reviewStatus || "uploaded"} />
                          {upload.reviewedByName ? (
                            <p className="text-xs text-gray-500">
                              Reviewed by {upload.reviewedByName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(upload.fileUrl, "_blank", "noopener,noreferrer")
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          <HiOutlineEye className="h-4 w-4" />
                          Open
                        </button>
                        <a
                          href={upload.fileUrl}
                          download={upload.fileName || "document"}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <HiOutlineArrowDownTray className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedDocument.status === "uploaded" ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedDocument._id, "approved")}
                  disabled={actionLoadingId === `${selectedDocument._id}-approved`}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-300"
                >
                  {actionLoadingId === `${selectedDocument._id}-approved`
                    ? "Approving..."
                    : "Approve Upload"}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenRejectModal(selectedDocument)}
                  disabled={actionLoadingId === `${selectedDocument._id}-changes_requested`}
                  className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-orange-300"
                >
                  Request Changes
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(rejectingDocument)}
        onClose={() => {
          setRejectingDocument(null);
          setCorrectionSummary("");
          setCorrectionItems([""]);
        }}
        title="Request Document Changes"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-5">
          {rejectingDocument ? (
            <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                Reviewing
              </p>
              <p className="mt-2 font-semibold text-gray-900">{rejectingDocument.documentName}</p>
              <p className="mt-1 text-sm text-gray-500">
                {rejectingDocument.studentId?.name || "Student"} •{" "}
                {rejectingDocument.studentId?.email || "No email"}
              </p>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Short Note
            </label>
            <textarea
              rows="3"
              value={correctionSummary}
              onChange={(event) => setCorrectionSummary(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              placeholder="Optional context for the student, such as 'Please correct the items below and upload a revised file.'"
            />
            <p className="mt-2 text-sm text-gray-500">
              This note is optional. Use the checklist below for the exact corrections.
            </p>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-orange-100 bg-orange-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700">
                  Correction Checklist
                </label>
                <p className="mt-1 text-sm text-gray-600">
                  Add one correction point per line item so the student can fix the document clearly.
                </p>
              </div>
              <button
                type="button"
                onClick={addCorrectionItem}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-3.5 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Add Point
              </button>
            </div>

            <div className="space-y-3">
              {correctionItems.map((item, index) => (
                <div
                  key={`correction-item-${index}`}
                  className="rounded-3xl border border-orange-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                        Correction Point
                      </label>
                      <textarea
                        rows="3"
                        value={item}
                        onChange={(event) => updateCorrectionItem(index, event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                        placeholder="Example: The COA scan is cropped. Upload the full page with all four corners visible."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCorrectionItem(index)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <HiOutlineXMark className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoadingId === `${rejectingDocument?._id}-changes_requested`}
            className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-orange-300"
          >
            {actionLoadingId === `${rejectingDocument?._id}-changes_requested`
              ? "Sending..."
              : "Send Correction Request"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingCustomPresetDelete)}
        onClose={() => setPendingCustomPresetDelete("")}
        onConfirm={confirmDeleteCustomPreset}
        title="Delete Custom Tag"
        message={`This will remove "${pendingCustomPresetDelete}" from quick document types and from the current request if it is selected.`}
        confirmLabel="Delete Tag"
        cancelLabel="Keep Tag"
        tone="danger"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetRequestForm();
        }}
        title="Send Required Documents"
        size="lg"
      >
        <form onSubmit={handleSendRequiredDocuments} className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Student</label>
              <select
                value={requestForm.studentId}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    studentId: event.target.value,
                    visaApplicationId: "",
                    templateId: "",
                    documents: initialRequestForm.documents,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} • {student.email}
                  </option>
                ))}
              </select>
              {validationErrors.studentId ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.studentId}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Related Visa Application
              </label>
              <select
                value={requestForm.visaApplicationId}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    visaApplicationId: event.target.value,
                    templateId: "",
                    documents: initialRequestForm.documents,
                  }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">General request</option>
                {studentVisaOptions.map((visa) => (
                  <option key={visa._id} value={visa._id}>
                    {visa.country} • {visa.visaType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Checklist Template
            </label>
            <select
              value={requestForm.templateId}
              onChange={(event) => applyTemplate(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Build request manually</option>
              {matchingTemplates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name} • {template.country} • {template.visaType}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Select a template to auto-fill all required documents in one click.
            </p>
            {requestForm.studentId && !matchingTemplates.length ? (
              <p className="mt-2 text-sm text-amber-700">
                No matching templates found for the selected visa. You can still request documents
                manually.
              </p>
            ) : null}
            {requestForm.templateId ? (
              <p className="mt-2 text-sm text-blue-700">
                Template applied. {requestForm.documents.length} required document(s) are ready to
                send.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="sticky top-0 z-10 rounded-[1.75rem] border border-blue-100 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Ready To Send
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {requestForm.documents.filter((item) => normalizePresetName(item.documentName)).length}{" "}
                    document type
                    {requestForm.documents.filter((item) => normalizePresetName(item.documentName)).length === 1
                      ? ""
                      : "s"}{" "}
                    currently added for this request.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmittingRequest ? "Sending..." : "Send Required Documents"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-xl font-semibold text-gray-900">
                  Required documents
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Send one or more required documents to the selected student in one batch.
                </p>
              </div>
              <button
                type="button"
                onClick={addRequestedDocument}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                + Add Document
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-dashed border-blue-200 bg-blue-50/70 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Quick document types</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Search or tap a common requirement to add it instantly. Added document types show
                    a check mark so you know they are already included in this request.
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-600">
                    Custom document types you add here stay available on this browser.
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Custom tags show a remove icon so you can delete them later.
                  </p>
                </div>
                {selectedPresetLookup.size ? (
                  <button
                    type="button"
                    onClick={clearSelectedPresets}
                    className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Clear All Selected
                  </button>
                ) : null}
              </div>
              <div className="relative mt-4">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={(event) => setPresetSearch(event.target.value)}
                  placeholder="Search common document types"
                  className="w-full rounded-2xl border border-blue-200 bg-white px-11 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                <input
                  type="text"
                  value={customPresetInput}
                  onChange={(event) => setCustomPresetInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddCustomPreset();
                    }
                  }}
                  placeholder="Add your own document type, for example Visa Refusal Letter"
                  className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPreset}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 lg:min-w-[12rem]"
                >
                  <HiOutlinePlus className="h-4 w-4" />
                  Add Custom Type
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {filteredPresets.length ? (
                  filteredPresets.map((preset) => {
                    const isSelected = selectedPresetLookup.has(preset.toLowerCase());
                    const isCustomPreset = customPresetLookup.has(preset.toLowerCase());

                    return (
                      <div key={preset} className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleDocumentPreset(preset)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                          }`}
                        >
                          <span>{preset}</span>
                          {isSelected ? (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold text-white">
                              ✓
                            </span>
                          ) : null}
                        </button>

                        {isCustomPreset ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomPreset(preset)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                                : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                            }`}
                            title={`Delete custom tag ${preset}`}
                            aria-label={`Delete custom tag ${preset}`}
                          >
                            <HiOutlineXMark className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">
                    No common document types match your search.
                  </p>
                )}
              </div>
            </div>

            {requestForm.documents.map((item, index) => (
              <div
                key={`request-doc-${index}`}
                className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Document {index + 1}</p>
                  {requestForm.documents.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeRequestedDocument(index)}
                      className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={item.documentName}
                      onChange={(event) =>
                        updateRequestedDocument(index, "documentName", event.target.value)
                      }
                      placeholder="e.g. COA, Citizenship, Passport"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                    {validationErrors[`documentName-${index}`] ? (
                      <p className="mt-2 text-sm text-rose-600">
                        {validationErrors[`documentName-${index}`]}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Description <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows="3"
                      value={item.description}
                      onChange={(event) =>
                        updateRequestedDocument(index, "description", event.target.value)
                      }
                      placeholder="Optional note for the student, such as scan quality, page requirement, or translation details."
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmittingRequest}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSubmittingRequest ? "Sending..." : "Send Required Documents"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentRequests;
