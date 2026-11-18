"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Buildings,
  CheckCircle,
  LockKey,
  ShareNetwork,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CompanyProfile } from "@/lib/governance/types";
import { DashboardDocument, DashboardVisibility } from "@/lib/dashboards/types";

interface ShareDashboardModalProps {
  isOpen: boolean;
  dashboard: DashboardDocument | null;
  companies: CompanyProfile[];
  onClose: () => void;
  onSaveSharing: (
    dashboardId: string,
    visibility: DashboardVisibility,
    assignedCompanyIds: string[]
  ) => Promise<void>;
}

export function ShareDashboardModal(props: ShareDashboardModalProps) {
  if (!props.isOpen || !props.dashboard || typeof document === "undefined") {
    return null;
  }
  return (
    <ShareDashboardModalInner
      key={props.dashboard.id}
      isOpen={props.isOpen}
      dashboard={props.dashboard}
      companies={props.companies}
      onClose={props.onClose}
      onSaveSharing={props.onSaveSharing}
    />
  );
}

function ShareDashboardModalInner({
  isOpen,
  dashboard,
  companies,
  onClose,
  onSaveSharing,
}: Omit<ShareDashboardModalProps, "dashboard"> & {
  dashboard: DashboardDocument;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<DashboardVisibility>(
    dashboard.visibility
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    dashboard.assignedCompanyIds || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDialogFocusTrap(isOpen, dialogRef, onClose);

  const toggleCompany = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (visibility === "specific_companies" && selectedIds.length === 0) {
      setError("Select at least one client company or switch visibility scope.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSaveSharing(
        dashboard.id,
        visibility,
        visibility === "specific_companies" ? selectedIds : []
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update publishing scope."
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dashboard-title"
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
        className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-2xl focus:outline-none"
        data-lenis-prevent="true"
        data-lenis-prevent-wheel="true"
        data-lenis-prevent-touch="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <ShareNetwork size={20} weight="light" />
            </div>
            <div>
              <h2
                id="share-dashboard-title"
                className="text-base font-bold tracking-tight text-[#0C233C]"
              >
                Publish & Multi-Tenant Sharing
              </h2>
              <p className="truncate text-xs text-[#526075]">{dashboard.title}</p>
            </div>
          </div>
          <button
            type="button"
            data-dialog-close="true"
            onClick={onClose}
            aria-label="Close sharing dialog"
            className="rounded-sm p-1.5 text-[#526075] hover:bg-[#E2E8F0] hover:text-[#0C233C]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 p-3 text-xs text-[#991B1B]"
            >
              <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            {[
              {
                id: "kpmg_only" as const,
                label: "KPMG Internal Only",
                desc: "Restricted exclusively to KPMG Advisory Lead sessions.",
                icon: LockKey,
              },
              {
                id: "specific_companies" as const,
                label: "Publish to Specific Client Companies",
                desc: "Client personas in selected organizations gain interactive viewer access (scoped to their entitled data).",
                icon: Buildings,
              },
              {
                id: "all_clients" as const,
                label: "Publish to All Active Clients",
                desc: "All active onboarded client companies can view & filter this dashboard using their own scoped data.",
                icon: UsersThree,
              },
            ].map((opt, idx) => {
              const Icon = opt.icon;
              const active = visibility === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  data-autofocus={idx === 0 ? "true" : undefined}
                  onClick={() => setVisibility(opt.id)}
                  className={`flex w-full items-start gap-3 rounded-sm border p-3 text-left transition-colors ${
                    active
                      ? "border-[#00338D] bg-[#00338D]/5"
                      : "border-[#D8DFE9] bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Icon
                    size={18}
                    weight="light"
                    className={`mt-0.5 shrink-0 ${
                      active ? "text-[#00338D]" : "text-[#526075]"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0C233C]">{opt.label}</p>
                    <p className="mt-0.5 text-[11px] text-[#526075]">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {visibility === "specific_companies" && (
            <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3.5">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#526075]">
                Target Client Organizations ({selectedIds.length} active)
              </p>
              {companies.length === 0 ? (
                <p className="text-xs text-[#64748B]">
                  No client companies available. Onboard a company in Client & Access Governance first.
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {companies.map((c) => {
                    const checked = selectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => toggleCompany(c.id)}
                        className={`flex w-full items-center justify-between rounded-sm border px-3 py-2 text-xs transition-colors ${
                          checked
                            ? "border-[#00338D] bg-white font-semibold text-[#00338D]"
                            : "border-[#D8DFE9] bg-white text-[#333940] hover:bg-[#F4F6FA]"
                        }`}
                      >
                        <div className="text-left">
                          <span>{c.name}</span>
                          <span className="ml-2 font-mono text-[10px] text-[#64748B]">
                            {c.code} · {c.status}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold ${
                            checked
                              ? "bg-[#009A44]/10 text-[#009A44]"
                              : "bg-[#F4F6FA] text-[#64748B]"
                          }`}
                        >
                          {checked && <CheckCircle size={12} weight="fill" />}
                          {checked ? "PUBLISHED" : "OFF"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#D8DFE9] bg-[#F8FAFC] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[#D8DFE9] bg-white px-4 py-2 text-xs font-semibold text-[#333940] hover:bg-[#F4F6FA]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-sm bg-[#00338D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E49E2] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Publishing Scope"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
