import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiOutlineTrash,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../api/axios";
import ConfirmDialog from "../../components/ConfirmDialog";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import useApi from "../../hooks/useApi";
import usePagination from "../../hooks/usePagination";
import { formatDateTime } from "../../utils/date";

const initialForm = {
  name: "",
  country: "",
  visaType: "",
  documents: [{ documentName: "", description: "" }],
};

const Templates = () => {
  const navigate = useNavigate();
  const { data: templates, loading, error, refetch } = useApi("/templates");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState("");

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const safeTemplates = useMemo(
    () =>
      (Array.isArray(templates) ? templates : [])
        .filter((template) => template && typeof template === "object")
        .map((template) => ({
          ...template,
          name: template.name || "Untitled Template",
          country: template.country || "Not set",
          visaType: template.visaType || "Not set",
          documents: Array.isArray(template.documents)
            ? template.documents.filter((item) => item && typeof item === "object")
            : [],
        })),
    [templates]
  );

  const {
    currentPage,
    endItem,
    paginatedItems: paginatedTemplates,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem,
    totalItems,
    totalPages,
  } = usePagination(safeTemplates, { initialRowsPerPage: 6 });

  const resetForm = () => {
    setForm(initialForm);
    setEditingTemplate(null);
    setValidationErrors({});
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      country: template.country,
      visaType: template.visaType,
      documents: Array.isArray(template.documents) && template.documents.length
        ? template.documents.map((item) => ({
            documentName: item.documentName,
            description: item.description || "",
          }))
        : initialForm.documents,
    });
    setValidationErrors({});
    setIsModalOpen(true);
  };

  const updateDocument = (index, field, value) => {
    setForm((current) => ({
      ...current,
      documents: current.documents.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addDocumentRow = () => {
    setForm((current) => ({
      ...current,
      documents: [...current.documents, { documentName: "", description: "" }],
    }));
  };

  const removeDocumentRow = (index) => {
    setForm((current) => ({
      ...current,
      documents:
        current.documents.length === 1
          ? current.documents
          : current.documents.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Template name is required";
    if (!form.country.trim()) nextErrors.country = "Country is required";
    if (!form.visaType.trim()) nextErrors.visaType = "Visa type is required";
    form.documents.forEach((item, index) => {
      if (!item.documentName.trim()) {
        nextErrors[`document-${index}`] = "Document name is required";
      }
    });

    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        country: form.country.trim(),
        visaType: form.visaType.trim(),
        documents: form.documents.map((item) => ({
          documentName: item.documentName.trim(),
          description: item.description.trim(),
        })),
      };

      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate._id}`, payload);
        toast.success("Template updated");
      } else {
        await api.post("/templates", payload);
        toast.success("Template created");
      }

      await refetch();
      setIsModalOpen(false);
      resetForm();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Unable to save template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteTemplate) {
      return;
    }

    setDeleteLoadingId(pendingDeleteTemplate._id);

    try {
      await api.delete(`/templates/${pendingDeleteTemplate._id}`);
      toast.success("Template deleted");
      setPendingDeleteTemplate(null);
      await refetch();
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || "Unable to delete template");
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
              Reusable Checklists
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-gray-900">
              Document checklist templates
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + New Template
          </button>
        </div>
      </div>

      {!loading && safeTemplates.length ? (
        <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
          <Pagination
            compact
            currentPage={currentPage}
            endItem={endItem}
            itemLabel="templates"
            onPageChange={setCurrentPage}
            onRowsPerPageChange={setRowsPerPage}
            rowsPerPage={rowsPerPage}
            startItem={startItem}
            totalItems={totalItems}
            totalPages={totalPages}
            rowsPerPageLabel="Templates per page"
          />
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[1.1rem] border border-gray-200 bg-white p-3.5 shadow-sm">
              <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-3 w-52 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : safeTemplates.length ? (
          paginatedTemplates.map((template) => (
            <div key={template._id} className="rounded-[1.05rem] border border-gray-200 bg-white p-3.5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                    {template.country} • {template.visaType}
                  </p>
                  <h3 className="mt-1 font-heading text-sm font-semibold text-gray-900">
                    {template.name}
                  </h3>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {template.documents.length} document(s)
                </span>
              </div>

              <div className="mt-3">
                {template.documents.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {template.documents.map((item, index) => (
                      <span
                        key={`${template._id}-${index}`}
                        className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium leading-4 text-gray-700"
                        title={item.description ? `${item.documentName} - ${item.description}` : item.documentName}
                      >
                        {item.documentName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                    No document items were found in this template.
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Updated {formatDateTime(template.updatedAt)}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/consultancy/documents?templateId=${template._id}`)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                    title="Use Template"
                    aria-label="Use Template"
                  >
                    <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(template)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                    title="Edit Template"
                    aria-label="Edit Template"
                  >
                    <HiOutlinePencilSquare className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteTemplate(template)}
                    disabled={deleteLoadingId === template._id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-700 disabled:bg-rose-300"
                    title="Delete Template"
                    aria-label="Delete Template"
                  >
                    {deleteLoadingId === template._id ? (
                      <span className="text-[10px] font-semibold">...</span>
                    ) : (
                      <HiOutlineTrash className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white p-12 text-center md:col-span-2 xl:col-span-3 2xl:col-span-4">
            <div className="inline-flex rounded-3xl bg-blue-50 p-4 text-blue-600">
              <HiOutlineSparkles className="h-8 w-8" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
              No templates yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Create templates by country and visa type, then send required documents to students in
              one click.
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
        title={editingTemplate ? "Edit Template" : "Create Template"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Template Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.name ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.name}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(event) =>
                  setForm((current) => ({ ...current, country: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.country ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.country}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Visa Type</label>
              <input
                type="text"
                value={form.visaType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, visaType: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {validationErrors.visaType ? (
                <p className="mt-2 text-sm text-rose-600">{validationErrors.visaType}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-lg font-semibold text-gray-900">Documents</h3>
              <button
                type="button"
                onClick={addDocumentRow}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                + Add Document
              </button>
            </div>

            {form.documents.map((item, index) => (
              <div
                key={`template-document-${index}`}
                className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Document {index + 1}</p>
                  {form.documents.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeDocumentRow(index)}
                      className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={item.documentName}
                      onChange={(event) => updateDocument(index, "documentName", event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                    {validationErrors[`document-${index}`] ? (
                      <p className="mt-2 text-sm text-rose-600">
                        {validationErrors[`document-${index}`]}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Description <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows="2"
                      value={item.description}
                      onChange={(event) => updateDocument(index, "description", event.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          >
            {submitting ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteTemplate)}
        onClose={() => setPendingDeleteTemplate(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Delete "${pendingDeleteTemplate?.name || "this template"}"? Students and staff will no longer be able to reuse this checklist.`}
        confirmLabel="Delete Template"
        cancelLabel="Keep Template"
        tone="danger"
        isLoading={Boolean(
          pendingDeleteTemplate && deleteLoadingId === pendingDeleteTemplate._id
        )}
      />
    </div>
  );
};

export default Templates;
