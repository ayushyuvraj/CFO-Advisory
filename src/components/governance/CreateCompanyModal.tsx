"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Buildings,
  Check,
  EnvelopeSimple,
  IdentificationBadge,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CompanyProfile } from "@/lib/governance/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCompany?: CompanyProfile | null;
  onCompanySaved: (company: CompanyProfile) => void;
}

function slugifyCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);
}

async function safeParseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function CompanyModalContent({
  onClose,
  existingCompany,
  onCompanySaved,
}: {
  onClose: () => void;
  existingCompany?: CompanyProfile | null;
  onCompanySaved: (company: CompanyProfile) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState(existingCompany?.name || "");
  const [code, setCode] = useState(existingCompany?.code || "");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(
    Boolean(existingCompany)
  );
  const [contactEmail, setContactEmail] = useState(
    existingCompany?.contactEmail || ""
  );
  const [notes, setNotes] = useState(existingCompany?.notes || "");
  const [status, setStatus] = useState<"active" | "suspended">(
    existingCompany?.status || "active"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSafeClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  useDialogFocusTrap(true, panelRef, handleSafeClose);

  const handleNameChange = (val: string) => {
    setName(val);
    if (errorMessage) setErrorMessage(null);
    if (!codeManuallyEdited) {
      setCode(slugifyCode(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Company name is required.");
      return;
    }

    if (!EMAIL_REGEX.test(contactEmail.trim())) {
      setErrorMessage("A valid primary contact email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = existingCompany
        ? `/api/clients/${existingCompany.id}`
        : "/api/clients";
      const method = existingCompany ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || slugifyCode(name.trim()),
          contactEmail: contactEmail.trim(),
          status,
          notes: notes.trim(),
        }),
      });

      const data = await safeParseJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : existingCompany
            ? "Failed to update company profile."
            : "Failed to create company profile."
        );
      }

      onCompanySaved(data.company as CompanyProfile);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-company-modal-title"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        onClick={handleSafeClose}
        className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
        aria-hidden="true"
      />

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={
          prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }
        }
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={
          prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97, y: 6 }
        }
        onWheel={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain rounded-sm border border-[#D8DFE9] bg-white p-6 shadow-2xl text-[#0C233C] focus:outline-none sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <Buildings size={22} weight="bold" />
            </div>
            <div>
              <h3
                id="create-company-modal-title"
                className="text-lg font-semibold tracking-tight text-[#0C233C]"
              >
                {existingCompany
                  ? "Edit Client Company Profile"
                  : "Onboard Client Company"}
              </h3>
              <p className="text-xs text-[#4B5563]">
                {existingCompany
                  ? "Update client organization details or suspend portal access."
                  : "Create a client profile to manage system access and personas."}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            disabled={isSubmitting}
            onClick={handleSafeClose}
            aria-label="Close company modal"
            className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1.5 text-[#333940] hover:text-[#00338D] disabled:opacity-50"
          >
            <X size={18} weight="light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {errorMessage && (
            <div
              role="alert"
              className="rounded-sm border border-[#B91C1C]/20 bg-[#B91C1C]/5 p-3 text-xs font-medium text-[#B91C1C]"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="company-name-input"
              className="text-xs font-semibold text-[#0C233C]"
            >
              Company Name <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="company-name-input"
              data-autofocus="true"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Apex Global Logistics Ltd"
              className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="company-code-input"
                className="text-xs font-semibold text-[#0C233C]"
              >
                Client Code / Identifier
              </label>
              <div className="relative">
                <IdentificationBadge
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                />
                <input
                  id="company-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCodeManuallyEdited(true);
                    setCode(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. APEX-LOG"
                  className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2 pr-3 pl-9 font-mono text-xs text-[#0C233C] uppercase focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="company-status-select"
                className="text-xs font-semibold text-[#0C233C]"
              >
                Account Status
              </label>
              <select
                id="company-status-select"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "suspended")
                }
                className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none"
              >
                <option value="active">Active (Entitled)</option>
                <option value="suspended">Suspended (Access Halted)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="company-email-input"
              className="text-xs font-semibold text-[#0C233C]"
            >
              Primary Contact Email <span className="text-[#B91C1C]">*</span>
            </label>
            <div className="relative">
              <EnvelopeSimple
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
              />
              <input
                id="company-email-input"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="cfo-office@apex-logistics.com"
                className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2 pr-3 pl-9 text-sm text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="company-notes-input"
              className="text-xs font-semibold text-[#0C233C]"
            >
              Engagement Notes (Optional)
            </label>
            <textarea
              id="company-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Q4 Advisory Engagement. Contract tier: Sovereign Enterprise."
              className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-2.5 text-xs text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSafeClose}
              className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-medium text-[#4B5563] hover:bg-[#F4F6FA] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E49E2] disabled:opacity-60"
            >
              <Check size={14} weight="bold" />
              <span>
                {isSubmitting
                  ? existingCompany
                    ? "Saving Changes..."
                    : "Creating Profile..."
                  : existingCompany
                  ? "Save Company Changes"
                  : "Create Company Profile"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function CreateCompanyModal({
  isOpen,
  onClose,
  existingCompany,
  onCompanySaved,
}: CreateCompanyModalProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <CompanyModalContent
          key={existingCompany ? `${existingCompany.id}-${existingCompany.updatedAt}` : "new-company"}
          onClose={onClose}
          existingCompany={existingCompany}
          onCompanySaved={onCompanySaved}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
