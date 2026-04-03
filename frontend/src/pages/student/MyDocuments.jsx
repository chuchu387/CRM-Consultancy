import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePaperClip,
  HiOutlinePhoto,
} from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../../api/axios";
import FileUpload from "../../components/FileUpload";
import StatusBadge from "../../components/StatusBadge";
import useApi from "../../hooks/useApi";
import { formatDateTime } from "../../utils/date";

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

  if (kind === "pdf") {
    return <HiOutlineDocumentText className="h-5 w-5" />;
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

const MyDocuments = () => {
  const { data: documents, loading, error, refetch } = useApi("/documents/my");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [previewOpenId, setPreviewOpenId] = useState("");
  const [historyOpenId, setHistoryOpenId] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const summary = useMemo(
    () => ({
      awaitingAcceptance: documents.filter(
        (document) => document.studentAcceptanceStatus !== "accepted"
      ).length,
      readyForUpload: documents.filter(
        (document) =>
          document.studentAcceptanceStatus === "accepted" &&
          ["pending", "changes_requested", "rejected"].includes(document.status)
      ).length,
      approved: documents.filter((document) => document.status === "approved").length,
    }),
    [documents]
  );

  const requestGroups = useMemo(() => {
    const groups = documents.reduce((collection, document) => {
      const key = document.requestBatchId || `single-${document._id}`;

      if (!collection[key]) {
        collection[key] = {
          key,
          requestBatchId: document.requestBatchId || "",
          requestedBy: document.requestedBy?.name || "Consultancy",
          createdAt: document.createdAt,
          documents: [],
        };
      }

      collection[key].documents.push(document);

      if (new Date(document.createdAt || 0) < new Date(collection[key].createdAt || 0)) {
        collection[key].createdAt = document.createdAt;
      }

      return collection;
    }, {});

    return Object.values(groups)
      .map((group) => ({
        ...group,
        documents: [...group.documents].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [documents]);

  const handleAcceptRequest = async (documentId) => {
    setActionLoadingId(documentId);

    try {
      const response = await api.patch(`/documents/${documentId}/accept`);
      toast.success(response.data.message || "Document request accepted");
      refetch();
    } catch (acceptError) {
      toast.error(acceptError.response?.data?.message || "Unable to accept request");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleAcceptAll = async () => {
    const pendingDocuments = documents.filter(
      (document) => document.studentAcceptanceStatus !== "accepted"
    );

    if (!pendingDocuments.length) {
      return;
    }

    setActionLoadingId("accept-all");

    try {
      await Promise.all(
        pendingDocuments.map((document) => api.patch(`/documents/${document._id}/accept`))
      );
      toast.success("All new document requests accepted");
      refetch();
    } catch (acceptError) {
      toast.error(acceptError.response?.data?.message || "Unable to accept all requests");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleAcceptGroup = async (group) => {
    const pendingDocuments = group.documents.filter(
      (document) => document.studentAcceptanceStatus !== "accepted"
    );

    if (!pendingDocuments.length) {
      return;
    }

    setActionLoadingId(`accept-group-${group.key}`);

    try {
      await Promise.all(
        pendingDocuments.map((document) => api.patch(`/documents/${document._id}/accept`))
      );
      toast.success(
        group.requestBatchId
          ? `Accepted all required documents in ${group.requestBatchId}`
          : "Accepted required document request"
      );
      refetch();
    } catch (acceptError) {
      toast.error(acceptError.response?.data?.message || "Unable to accept this checklist");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleTogglePreview = (documentId) => {
    setHistoryOpenId("");
    setPreviewOpenId((current) => (current === documentId ? "" : documentId));
  };

  const handleToggleHistory = (documentId) => {
    setPreviewOpenId("");
    setHistoryOpenId((current) => (current === documentId ? "" : documentId));
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Upload Center
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              My documents
            </h2>
          </div>

          {summary.awaitingAcceptance ? (
            <button
              type="button"
              onClick={handleAcceptAll}
              disabled={actionLoadingId === "accept-all"}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
            >
              {actionLoadingId === "accept-all" ? "Accepting..." : "Accept All New Requests"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {[
          {
            label: "Awaiting Acceptance",
            value: summary.awaitingAcceptance,
            color: "bg-amber-50 text-amber-700",
          },
          {
            label: "Ready For Upload",
            value: summary.readyForUpload,
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Approved",
            value: summary.approved,
            color: "bg-emerald-50 text-emerald-700",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-[1rem] border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.color}`}>
              {item.label}
            </span>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 h-4 w-72 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : requestGroups.length ? (
          requestGroups.map((group) => {
            const pendingAcceptanceCount = group.documents.filter(
              (document) => document.studentAcceptanceStatus !== "accepted"
            ).length;
            const completedCount = group.documents.filter(
              (document) => document.status === "approved"
            ).length;

            return (
              <section key={group.key} className="space-y-3">
                <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                        {group.requestBatchId ? "Required Document Checklist" : "Requested Document"}
                      </p>
                      <h3 className="mt-1.5 font-heading text-lg font-semibold text-gray-900">
                        {group.requestBatchId || group.documents[0]?.documentName || "Document Request"}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Requested by {group.requestedBy} on {formatDateTime(group.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {group.documents.length} required document
                        {group.documents.length === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        {completedCount} approved
                      </span>
                      {pendingAcceptanceCount ? (
                        <button
                          type="button"
                          onClick={() => handleAcceptGroup(group)}
                          disabled={actionLoadingId === `accept-group-${group.key}`}
                          className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:bg-amber-300"
                        >
                          {actionLoadingId === `accept-group-${group.key}`
                            ? "Accepting..."
                            : group.documents.length > 1
                              ? "Accept Checklist"
                              : "Accept Request"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {group.documents.map((document) => {
                    const currentUpload = getCurrentUpload(document);
                    const previousUploads = getPreviousUploads(document);
                    const isPreviewOpen = previewOpenId === document._id;
                    const isHistoryOpen = historyOpenId === document._id;
                    const fileKind = getFileKind(
                      currentUpload?.fileMimeType || "",
                      currentUpload?.fileName || document.documentName
                    );
                    const currentCorrectionItems = getCorrectionItems(currentUpload || document);
                    const currentCorrectionSummary =
                      getCorrectionSummary(currentUpload || document) ||
                      getCorrectionSummary(document);

                    return (
                      <div
                        key={document._id}
                        className="rounded-[1.35rem] border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                              <FileTypeIcon kind={fileKind} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-heading text-base font-semibold text-gray-900">
                                {document.documentName}
                              </h3>
                              {document.description ? (
                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                  {document.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <StatusBadge status={document.status} compact />
                            <StatusBadge
                              compact
                              status={
                                document.studentAcceptanceStatus === "accepted"
                                  ? "Accepted by Student"
                                  : "Awaiting Acceptance"
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-3 space-y-3 rounded-[1.15rem] bg-gray-50 p-3">
                          {currentUpload ? (
                            <div className="rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                    Latest upload
                                  </p>
                                  <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                                    {currentUpload.fileName || "Uploaded document"}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    Uploaded {formatDateTime(currentUpload.uploadedAt, "recently")}
                                  </p>
                                  {currentCorrectionSummary ? (
                                    <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-700">
                                      Review note: {currentCorrectionSummary}
                                    </p>
                                  ) : null}
                                  {currentCorrectionItems.length ? (
                                    <div className="mt-2 rounded-2xl border border-orange-100 bg-orange-50 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
                                        Correction Checklist
                                      </p>
                                      <ul className="mt-2 space-y-1.5 text-xs text-orange-900">
                                        {currentCorrectionItems.map((item) => (
                                          <li
                                            key={`${document._id}-${item}`}
                                            className="flex gap-3"
                                          >
                                            <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 flex-none" />
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                </div>
                                <StatusBadge status={currentUpload.reviewStatus || "uploaded"} compact />
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {canPreviewInline(currentUpload.fileMimeType) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePreview(document._id)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                  >
                                    <HiOutlineEye className="h-4 w-4" />
                                    {isPreviewOpen ? "Hide Preview" : "Preview"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      currentUpload.fileUrl,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                >
                                  <HiOutlineEye className="h-4 w-4" />
                                  Open
                                </button>
                                <a
                                  href={currentUpload.fileUrl}
                                  download={currentUpload.fileName || "document"}
                                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <HiOutlineArrowDownTray className="h-4 w-4" />
                                  Download
                                </a>
                              </div>

                              {canPreviewInline(currentUpload.fileMimeType) ? (
                                isPreviewOpen ? (
                                  <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                                    {currentUpload.fileMimeType?.startsWith("image/") ? (
                                      <img
                                        src={currentUpload.fileUrl}
                                        alt={currentUpload.fileName || document.documentName}
                                        className="max-h-[28rem] w-full object-contain bg-white"
                                      />
                                    ) : (
                                      <iframe
                                        src={currentUpload.fileUrl}
                                        title={`${document.documentName} preview`}
                                        className="h-[30rem] w-full bg-white"
                                      />
                                    )}
                                  </div>
                                ) : null
                              ) : (
                                <div className="mt-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-2 font-semibold text-gray-700">
                                    <HiOutlinePhoto className="h-5 w-5 text-blue-600" />
                                    Inline preview is available for PDF and image uploads.
                                  </div>
                                  <p className="mt-2">
                                    This file type cannot be previewed inside the page. Use Open or
                                    Download to review it.
                                  </p>
                                </div>
                              )}

                              {previousUploads.length ? (
                                <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHistory(document._id)}
                                    className="flex w-full items-center justify-between gap-3 text-left"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">Version history</p>
                                      <p className="mt-1 text-xs text-gray-500">
                                        {previousUploads.length} previous upload
                                        {previousUploads.length > 1 ? "s" : ""}
                                      </p>
                                    </div>
                                    {isHistoryOpen ? (
                                      <HiOutlineChevronUp className="h-5 w-5 text-gray-500" />
                                    ) : (
                                      <HiOutlineChevronDown className="h-5 w-5 text-gray-500" />
                                    )}
                                  </button>

                                  {isHistoryOpen ? (
                                    <div className="mt-3 space-y-2">
                                      {previousUploads.map((upload, index) => (
                                        <div
                                          key={`${document._id}-history-${index}`}
                                          className="rounded-2xl border border-gray-200 bg-white p-3"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-semibold text-gray-900">
                                                {upload.fileName ||
                                                  `Version ${previousUploads.length - index}`}
                                              </p>
                                              <p className="mt-1 text-xs text-gray-500">
                                                Uploaded {formatDateTime(upload.uploadedAt, "recently")}
                                              </p>
                                              {getCorrectionSummary(upload) ? (
                                                <p className="mt-2 text-xs text-gray-600">
                                                  {getCorrectionSummary(upload)}
                                                </p>
                                              ) : null}
                                              {getCorrectionItems(upload).length ? (
                                                <ul className="mt-2 space-y-1.5 rounded-2xl bg-orange-50 px-3 py-2 text-xs text-orange-900">
                                                  {getCorrectionItems(upload).map((item) => (
                                                    <li
                                                      key={`${document._id}-${index}-${item}`}
                                                      className="flex gap-3"
                                                    >
                                                      <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 flex-none" />
                                                      <span>{item}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              ) : null}
                                            </div>
                                            <StatusBadge status={upload.reviewStatus || "uploaded"} compact />
                                          </div>
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                window.open(
                                                  upload.fileUrl,
                                                  "_blank",
                                                  "noopener,noreferrer"
                                                )
                                              }
                                              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                            >
                                              <HiOutlineEye className="h-4 w-4" />
                                              Open
                                            </button>
                                            <a
                                              href={upload.fileUrl}
                                              download={upload.fileName || "document"}
                                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                            >
                                              <HiOutlineArrowDownTray className="h-4 w-4" />
                                              Download
                                            </a>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {document.studentAcceptanceStatus !== "accepted" ? (
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                              <p className="font-semibold">Accept before uploading</p>
                              <p className="mt-1.5">
                                Accept this request to unlock the upload area for this document.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleAcceptRequest(document._id)}
                                disabled={actionLoadingId === document._id}
                                className="mt-3 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:bg-amber-300"
                              >
                                {actionLoadingId === document._id ? "Accepting..." : "Accept Request"}
                              </button>
                            </div>
                          ) : ["pending", "changes_requested", "rejected"].includes(document.status) ? (
                            <>
                              {document.status === "changes_requested" ? (
                                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-xs text-orange-800">
                                  <p className="font-semibold">Corrections requested</p>
                                  {currentCorrectionSummary ? (
                                    <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-orange-900">
                                      Admin message: {currentCorrectionSummary}
                                    </p>
                                  ) : null}
                                  {currentCorrectionItems.length ? (
                                    <div className="mt-2 rounded-xl bg-white/70 px-3 py-3 text-orange-900">
                                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                                        Please fix these points
                                      </p>
                                      <ul className="mt-2 space-y-1.5">
                                        {currentCorrectionItems.map((item) => (
                                          <li key={`${document._id}-fix-${item}`} className="flex gap-3">
                                            <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 flex-none" />
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}
                                  <p className="mt-2">
                                    Update the document based on the note above and upload it again.
                                  </p>
                                </div>
                              ) : document.status === "rejected" ? (
                                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">
                                  <p className="font-semibold">Upload needs to be replaced</p>
                                  {document.reviewNote ? (
                                    <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-rose-900">
                                      Rejection reason: {document.reviewNote}
                                    </p>
                                  ) : null}
                                  <p className="mt-2">
                                    The consultancy rejected the previous upload. Submit an updated
                                    file for this required document type below.
                                  </p>
                                </div>
                              ) : (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                                  <p className="font-semibold">Ready for upload</p>
                                  <p className="mt-1.5">
                                    Upload the file that matches this document type.
                                  </p>
                                </div>
                              )}
                              <FileUpload compact documentId={document._id} onSuccess={() => refetch()} />
                            </>
                          ) : null}

                          {document.studentAcceptanceStatus === "accepted" &&
                          document.status === "uploaded" ? (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                              <p className="font-semibold">Under review</p>
                              <p className="mt-1.5">
                                Your latest upload is waiting for review.
                              </p>
                            </div>
                          ) : null}

                          {document.studentAcceptanceStatus === "accepted" &&
                          document.status === "approved" ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
                              <HiOutlineCheckCircle className="h-6 w-6" />
                              <div>
                                <p className="font-semibold">Approved</p>
                                <p className="mt-1">Your upload has been approved.</p>
                                {currentCorrectionSummary ? (
                                  <p className="mt-2 text-emerald-900">
                                    Review note: {currentCorrectionSummary}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          {document.studentAcceptanceStatus === "accepted" &&
                          !["pending", "changes_requested", "rejected", "uploaded", "approved"].includes(
                            document.status
                          ) ? (
                            <FileUpload compact documentId={document._id} onSuccess={() => refetch()} />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineDocumentText className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No document requests yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Requested files from the consultancy will appear here when they are ready for upload.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDocuments;
