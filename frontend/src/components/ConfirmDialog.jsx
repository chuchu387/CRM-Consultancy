import { HiOutlineExclamationTriangle } from "react-icons/hi2";

import Modal from "./Modal";

const toneConfig = {
  danger: {
    badge: "bg-rose-100 text-rose-700",
    button: "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300",
  },
  warning: {
    badge: "bg-amber-100 text-amber-700",
    button: "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300",
  },
  primary: {
    badge: "bg-blue-100 text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300",
  },
};

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isLoading = false,
}) => {
  const palette = toneConfig[tone] || toneConfig.danger;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" zIndexClass="z-[70]">
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-[1.75rem] border border-gray-100 bg-gray-50 p-5">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${palette.badge}`}
          >
            <HiOutlineExclamationTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm leading-7 text-gray-600">{message}</p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${palette.button}`}
          >
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
