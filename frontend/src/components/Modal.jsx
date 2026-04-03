import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { HiXMark } from "react-icons/hi2";

const Modal = ({ isOpen, onClose, title, children, size = "md", zIndexClass = "z-50" }) => {
  const sizeClasses = useMemo(
    () => ({
      sm: "max-w-md",
      md: "max-w-xl",
      lg: "max-w-3xl",
    }),
    []
  );

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center overflow-y-auto bg-slate-950/45 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-5 md:left-56`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`relative flex max-h-[min(92vh,calc(100dvh-1.5rem))] w-full ${sizeClasses[size]} animate-[fadeIn_0.2s_ease-out] flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:rounded-[2rem]`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100/90 px-5 py-4 sm:px-6 sm:py-5">
          <h3 className="font-heading text-xl font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
