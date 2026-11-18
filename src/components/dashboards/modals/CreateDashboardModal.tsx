"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Buildings,
  CheckCircle,
  LockKey,
  PresentationChart,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CompanyProfile } from "@/lib/governance/types";
import { CreateDashboardInput, DashboardVisibility } from "@/lib/dashboards/types";

interface CreateDashboardModalProps {
  isOpen: boolean;
  isKpmgAdmin: boolean;
  companies: CompanyProfile[];
  onClose: () => void;
  onCreate: (input: CreateDashboardInput) => Promise<void>;
}

export function CreateDashboardModal(props: CreateDashboardModalProps) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return <CreateDashboardModalInner {...props} />;
}

function CreateDashboardModalInner({
  isOpen,
  isKpmgAdmin,
  companies,
  onClose,
  onCreate,
}: CreateDashboardModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<DashboardVisibility>(
    isKpmgAdmin ? "kpmg_only" : "company_internal"
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useDialogFocusTrap(isOpen, dialogRef, onClose);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please enter a dashboard title.");
      return;
    }
    if (
      isKpmgAdmin &&
      visibility === "specific_companies" &&
      selectedCompanies.length === 0
    ) {
      setError("Select at least one client company or change visibility scope.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onCreate({
        title: cleanTitle,
        description: description.trim(),
        visibility: isKpmgAdmin ? visibility : "company_internal",
        assignedCompanyIds:
          isKpmgAdmin && visibility === "specific_companies"
            ? selectedCompanies
            : [],
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create dashboard."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-dashboard-title"
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
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-2xl focus:outline-none"
        data-lenis-prevent="true"
        data-lenis-prevent-wheel="true"
        data-lenis-prevent-touch="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <PresentationChart size={20} weight="light" />
            </div>
            <div>
              <h2
                id="create-dashboard-title"
                className="text-base font-bold tracking-tight text-[#0C233C]"
              >
                New Blank Executive Dashboard
              </h2>
              <p className="text-xs text-[#526075]">
                Opens a blank 24-column drag-and-drop canvas connected to live data.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-sm p-1.5 text-[#526075] transition-colors hover:bg-[#E2E8F0] hover:text-[#0C233C]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 p-3 text-xs text-[#991B1B]"
            >
              <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="dashboard-title-input"
              className="block text-xs font-semibold text-[#0C233C]"
            >
              Dashboard Title *
            </label>
            <input
              id="dashboard-title-input"
              data-autofocus="true"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Executive AI Telemetry & Cost Control"
              maxLength={120}
              className="mt-1.5 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-sm text-[#0C233C] placeholder:text-[#94A3B8] focus:border-[#00338D] focus:outline-none focus:ring-1 focus:ring-[#00338D]"
            />
          </div>

          <div>
            <label
              htmlFor="dashboard-desc-input"
              className="block text-xs font-semibold text-[#0C233C]"
            >
              Executive Mandate / Notes
            </label>
            <textarea
              id="dashboard-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this dashboard tracks for leadership..."
              maxLength={500}
              className="mt-1.5 w-full rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-sm text-[#0C233C] placeholder:text-[#94A3B8] focus:border-[#00338D] focus:outline-none focus:ring-1 focus:ring-[#00338D]"
            />
          </div>

          {isKpmgAdmin && (
            <div className="space-y-2.5 pt-1">
              <p className="text-xs font-semibold text-[#0C233C]">
                Governance & Publishing Scope
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    id: "kpmg_only" as const,
                    label: "KPMG Internal",
                    desc: "Visible only to KPMG Leads",
                    icon: LockKey,
                  },
                  {
                    id: "specific_companies" as const,
                    label: "Select Clients",
                    desc: "Publish to chosen companies",
                    icon: Buildings,
                  },
                  {
                    id: "all_clients" as const,
                    label: "All Active Clients",
                    desc: "Published across all clients",
                    icon: UsersThree,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = visibility === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setVisibility(opt.id)}
                      className={`flex flex-col items-start rounded-sm border p-2.5 text-left transition-colors ${
                        active
                          ? "border-[#00338D] bg-[#00338D]/5"
                          : "border-[#D8DFE9] bg-white hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <Icon
                        size={16}
                        weight="light"
                        className={active ? "text-[#00338D]" : "text-[#526075]"}
                      />
                      <span className="mt-1 text-xs font-semibold text-[#0C233C]">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-[#526075]">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>

              {visibility === "specific_companies" && (
                <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3">
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]">
                    Assign Target Client Companies ({selectedCompanies.length} selected)
                  </p>
                  {companies.length === 0 ? (
                    <p className="text-xs text-[#64748B]">
                      No client companies onboarded yet in Client Governance.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-1.5 overflow-y-auto">
                      {companies.map((c) => {
                        const checked = selectedCompanies.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            onClick={() => toggleCompany(c.id)}
                            className={`flex w-full items-center justify-between rounded-sm border px-2.5 py-1.5 text-xs transition-colors ${
                              checked
                                ? "border-[#00338D] bg-white font-semibold text-[#00338D]"
                                : "border-[#D8DFE9] bg-white text-[#333940] hover:bg-[#F4F6FA]"
                            }`}
                          >
                            <span>
                              {c.name}{" "}
                              <span className="font-mono text-[10px] text-[#64748B]">
                                ({c.code})
                              </span>
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                                checked ? "text-[#009A44]" : "text-[#94A3B8]"
                              }`}
                            >
                              {checked && <CheckCircle size={13} weight="fill" />}
                              {checked ? "ON" : "OFF"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[#D8DFE9] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-semibold text-[#333940] hover:bg-[#F4F6FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-sm bg-[#00338D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E49E2] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Blank Canvas"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
