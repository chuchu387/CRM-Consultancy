import { useCallback, useMemo, useRef, useState } from "react";
import { HiOutlineArrowUpTray, HiOutlinePaperClip } from "react-icons/hi2";
import { toast } from "react-toastify";

import api from "../api/axios";

const FileUpload = ({ compact = false, documentId, onSuccess }) => {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const allowedTypes = useMemo(
    () =>
      new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]),
    []
  );

  const validateFile = useCallback(
    (file) => {
      if (!file) {
        return "Please choose a file to upload";
      }

      if (!allowedTypes.has(file.type)) {
        return "Only PDF, JPG, JPEG, PNG, and DOCX files are allowed";
      }

      if (file.size > 10 * 1024 * 1024) {
        return "File size must not exceed 10MB";
      }

      return "";
    },
    [allowedTypes]
  );

  const setFileFromInput = useCallback(
    (file) => {
      const validationMessage = validateFile(file);

      if (validationMessage) {
        setSelectedFile(null);
        setError(validationMessage);
        return;
      }

      setSelectedFile(file);
      setError("");
      setProgress(0);
    },
    [validateFile]
  );

  const handleUpload = async () => {
    const validationMessage = validateFile(selectedFile);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await api.post(`/documents/${documentId}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (event) => {
          if (!event.total) {
            return;
          }

          setProgress(Math.round((event.loaded * 100) / event.total));
        },
      });

      toast.success(response.data.message || "Document uploaded successfully");
      setSelectedFile(null);
      setProgress(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onSuccess?.(response.data.data);
    } catch (err) {
      const message = err.response?.data?.message || "Upload failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`border border-dashed border-blue-200 bg-blue-50/60 ${
        compact ? "rounded-2xl p-3" : "rounded-3xl p-4"
      }`}
    >
      <button
        type="button"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          setFileFromInput(event.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full flex-col items-center justify-center border px-4 text-center transition ${
          compact ? "rounded-2xl py-4" : "rounded-3xl py-8"
        } ${
          isDragging
            ? "border-blue-400 bg-white"
            : "border-blue-100 bg-white/80 hover:border-blue-300 hover:bg-white"
        }`}
      >
        <HiOutlineArrowUpTray className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-blue-600`} />
        <p className={`font-semibold text-gray-900 ${compact ? "mt-2 text-sm" : "mt-3"}`}>
          {compact ? "Drop or choose a file" : "Drag a file here or click to browse"}
        </p>
        <p className={`text-gray-500 ${compact ? "mt-1 text-xs" : "mt-1 text-sm"}`}>
          PDF, JPG, PNG, DOCX up to 10MB
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        className="hidden"
        onChange={(event) => setFileFromInput(event.target.files?.[0])}
      />

      {selectedFile ? (
        <div className={`mt-3 rounded-2xl border border-blue-100 bg-white ${compact ? "p-3" : "p-4"}`}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-2 text-blue-700">
              <HiOutlinePaperClip className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          {progress > 0 ? (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-blue-100">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-blue-700">{progress}% uploaded</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className={`inline-flex items-center rounded-2xl bg-blue-600 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 ${
              compact ? "mt-3 px-3 py-2 text-xs" : "mt-4 px-4 py-2.5 text-sm"
            }`}
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  );
};

export default FileUpload;
