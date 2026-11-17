"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Buildings, Check, EnvelopeSimple, IdentificationBadge, X } from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CompanyProfile } from "@/lib/governance/types";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (company: CompanyProfile) => void;
}

export function CreateCompanyModal({
  isOpen,
  onClose,
  onCompanyCreated,
}: CreateCompanyModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useDialogFocusTrap(isOpen, panelRef, onClose);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === slugify(name)) {
      setCode(slugify(val));
    }
  };

  const slugify = (text: string) => {
    return text
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Company name is required.");
      return;
    }

    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      setErrorMessage("A valid primary contact email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          contactEmail: contactEmail.trim(),
          status,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create company profile.");
      }

      onCompanyCreated(data.company);
      // Reset form
      setName("");
      setCode("");
      setContactEmail("");
      setNotes("");
      setStatus("active");
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
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-company-modal-title"
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? undefined
                : { opacity: 0, scale: 0.97, y: 6 }
            }
            className="relative z-10 w-full max-w-lg rounded-sm border border-[#D8DFE9] bg-white p-6 shadow-2xl text-[#0C233C] sm:p-7"
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
                    Onboard Client Company
                  </h3>
                  <p className="text-xs text-[#4B5563]">
                    Create a client profile to manage system access and personas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-1.5 text-[#333940] hover:text-[#00338D]"
              >
                <X size={18} weight="light" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {errorMessage && (
                <div className="rounded-sm border border-[#B91C1C]/20 bg-[#B91C1C]/5 p-3 text-xs font-medium text-[#B91C1C]">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0C233C]">
                  Company Name <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Apex Global Logistics Ltd"
                  className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0C233C]">
                    Client Code / Identifier
                  </label>
                  <div className="relative">
                    <IdentificationBadge
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                    />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. APEX-LOG"
                      className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2 pr-3 pl-9 font-mono text-xs text-[#0C233C] uppercase focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0C233C]">
                    Initial Status
                  </label>
                  <select
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
                <label className="text-xs font-semibold text-[#0C233C]">
                  Primary Contact Email <span className="text-[#B91C1C]">*</span>
                </label>
                <div className="relative">
                  <EnvelopeSimple
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                  />
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="cfo-office@apex-logistics.com"
                    className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2 pr-3 pl-9 text-sm text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0C233C]">
                  Engagement Notes (Optional)
                </label>
                <textarea
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
                  onClick={onClose}
                  className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-medium text-[#4B5563] hover:bg-[#F4F6FA]"
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
                    {isSubmitting ? "Creating Profile..." : "Create Company Profile"}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
