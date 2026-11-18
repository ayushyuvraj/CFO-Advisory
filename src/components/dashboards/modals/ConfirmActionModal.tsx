"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { WarningCircle, X } from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  secondaryLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}

export function ConfirmActionModal(props: ConfirmActionModalProps) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <ConfirmActionModalInner {...props} />;
}

function ConfirmActionModalInner({
  isOpen,
  title,
  description,
  confirmLabel,
  secondaryLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onSecondary,
  onClose,
}: ConfirmActionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(isOpen, dialogRef, onClose);

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-xs"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-2xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#D8DFE9] bg-[#F8FAFC] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${
                tone === "danger"
                  ? "bg-[#B91C1C]/10 text-[#B91C1C]"
                  : "bg-[#00338D]/10 text-[#00338D]"
              }`}
            >
              <WarningCircle size={18} weight="bold" />
            </div>
            <h2
              id="confirm-action-title"
              className="text-sm font-bold text-[#0C233C]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            onClick={onClose}
            aria-label="Close confirmation dialog"
            className="rounded-sm p-1 text-[#526075] hover:bg-[#E2E8F0] hover:text-[#0C233C]"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5 py-4 text-xs leading-relaxed text-[#333940]">
          {description}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#D8DFE9] bg-[#F8FAFC] px-5 py-3">
          <button
            type="button"
            data-autofocus="true"
            onClick={onClose}
            disabled={busy}
            className="rounded-sm border border-[#D8DFE9] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#333940] hover:bg-[#F4F6FA] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              disabled={busy}
              className="rounded-sm border border-[#B91C1C]/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#B91C1C]/5 disabled:opacity-50"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
              tone === "danger"
                ? "bg-[#B91C1C] hover:bg-[#991B1B]"
                : "bg-[#00338D] hover:bg-[#1E49E2]"
            }`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
