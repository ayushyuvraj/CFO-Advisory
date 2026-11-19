"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Buildings,
  ClockCountdown,
  Coins,
  Cpu,
  Eye,
  Gauge,
  PencilSimple,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Trash,
  User,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  CompanyEntitlement,
  CompanyPersona,
  CompanyProfile,
} from "@/lib/governance/types";
import { QuotaCheckResult } from "@/lib/governance/quotaEngine";
import { ConnectedPlatform } from "@/data/platforms";
import { useAuth } from "@/context/AuthContext";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CreatePersonaModal } from "./CreatePersonaModal";
import { CreateCompanyModal } from "./CreateCompanyModal";

interface CompanyDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile | null;
  entitlements: CompanyEntitlement[];
  personas: CompanyPersona[];
  availableProducts: ConnectedPlatform[];
  onToggleEntitlement: (productId: string, enabled: boolean) => Promise<void>;
  onPersonaSaved: (persona: CompanyPersona) => void;
  onPersonaDeleted: (personaId: string) => void;
  onCompanyUpdated: (company: CompanyProfile) => void;
  onCompanyDeleted: (companyId: string) => void;
}

function formatSeconds(sec?: number): string {
  if (sec === undefined || sec <= 0) return "Imminent";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

function DrawerInner({
  company,
  entitlements,
  personas,
  availableProducts,
  onClose,
  onToggleEntitlement,
  onPersonaSaved,
  onPersonaDeleted,
  onCompanyUpdated,
  onCompanyDeleted,
}: Omit<CompanyDetailDrawerProps, "isOpen" | "company"> & {
  company: CompanyProfile;
}) {
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const { startPreviewAs } = useAuth();

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CompanyPersona | null>(
    null
  );
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [togglingProducts, setTogglingProducts] = useState<Set<string>>(
    () => new Set()
  );
  const [confirmDeleteCompany, setConfirmDeleteCompany] = useState(false);
  const [confirmDeletePersonaId, setConfirmDeletePersonaId] = useState<
    string | null
  >(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [deletingPersonaId, setDeletingPersonaId] = useState<string | null>(
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaCheckResult | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadQuota() {
      setIsLoadingQuota(true);
      try {
        const res = await fetch(
          `/api/governance/quota/status?companyId=${company.id}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          if (active && json.quota) {
            setQuotaStatus(json.quota);
          }
        }
      } catch {
        // non-fatal
      } finally {
        if (active) setIsLoadingQuota(false);
      }
    }
    void loadQuota();
    return () => {
      active = false;
    };
  }, [company.id, company.spendLimit]);

  const handleCloseDrawer = useCallback(() => {
    if (!isDeletingCompany) {
      onClose();
    }
  }, [isDeletingCompany, onClose]);

  useDialogFocusTrap(
    !isPersonaModalOpen && !isEditCompanyOpen,
    drawerRef,
    handleCloseDrawer
  );

  const handleOpenAddPersona = () => {
    setActionError(null);
    setEditingPersona(null);
    setIsPersonaModalOpen(true);
  };

  const handleOpenEditPersona = (persona: CompanyPersona) => {
    setActionError(null);
    setEditingPersona(persona);
    setIsPersonaModalOpen(true);
  };

  const handleClosePersonaModal = useCallback(() => {
    setIsPersonaModalOpen(false);
    setEditingPersona(null);
  }, []);

  const handleCloseEditCompany = useCallback(() => {
    setIsEditCompanyOpen(false);
  }, []);

  const handleDeletePersona = async (personaId: string) => {
    setActionError(null);
    setDeletingPersonaId(personaId);
    try {
      const res = await fetch(
        `/api/clients/${company.id}/personas/${personaId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        let msg = "Failed to delete persona.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      setConfirmDeletePersonaId(null);
      onPersonaDeleted(personaId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete persona."
      );
    } finally {
      setDeletingPersonaId(null);
    }
  };

  const handleDeleteCompany = async () => {
    setActionError(null);
    setIsDeletingCompany(true);
    try {
      const res = await fetch(`/api/clients/${company.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let msg = "Failed to delete company.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      onCompanyDeleted(company.id);
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete company."
      );
    } finally {
      setIsDeletingCompany(false);
      setConfirmDeleteCompany(false);
    }
  };

  const handleToggleProduct = async (
    productId: string,
    currentEnabled: boolean
  ) => {
    setActionError(null);
    setTogglingProducts((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
    try {
      await onToggleEntitlement(productId, !currentEnabled);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to toggle product access."
      );
    } finally {
      setTogglingProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const registeredIds = new Set(availableProducts.map((p) => p.id));
  const companyEntitledProductIds = entitlements
    .filter((e) => e.enabled && registeredIds.has(e.productId))
    .map((e) => e.productId);

  const handlePreviewAsPersona = async (persona: CompanyPersona) => {
    setActionError(null);
    const allowed =
      company.status !== "active"
        ? []
        : persona.productAccessMode === "all"
        ? companyEntitledProductIds
        : companyEntitledProductIds.filter((pid) =>
            persona.allowedProductIds.includes(pid)
          );

    // Save preview return origin state so exitPreview returns directly to this company drawer
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "kpmg_preview_origin",
          JSON.stringify({
            tab: "governance",
            companyId: company.id,
            companyName: company.name,
            personaId: persona.id,
            timestamp: Date.now(),
          })
        );
      } catch {
        // Non-fatal storage failure
      }
    }

    try {
      await startPreviewAs(company, persona, allowed);
      onClose();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to start live preview."
      );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex justify-end"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-drawer-title"
        data-lenis-prevent="true"
        data-lenis-prevent-wheel="true"
        data-lenis-prevent-touch="true"
      >
        {/* Backdrop */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          onClick={handleCloseDrawer}
          className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Slide-out Drawer */}
        <motion.div
          ref={drawerRef}
          tabIndex={-1}
          initial={prefersReducedMotion ? false : { x: "100%" }}
          animate={{ x: 0 }}
          exit={prefersReducedMotion ? undefined : { x: "100%" }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onWheel={(e) => e.stopPropagation()}
          className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
                <Buildings size={22} weight="bold" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="company-drawer-title"
                    className="text-base font-bold text-[#0C233C] truncate"
                  >
                    {company.name}
                  </h2>
                  <span className="rounded-xs border border-[#D8DFE9] bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-[#00338D]">
                    {company.code}
                  </span>
                  <span
                    className={`rounded-xs px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      company.status === "active"
                        ? "bg-[#009A44]/10 text-[#009A44]"
                        : "bg-[#B91C1C]/10 text-[#B91C1C]"
                    }`}
                  >
                    {company.status}
                  </span>
                </div>
                <p className="text-xs text-[#4B5563] truncate">
                  Primary Contact: {company.contactEmail}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditCompanyOpen(true)}
                aria-label={`Edit ${company.name}`}
                title="Edit Company Profile"
                className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs font-medium text-[#333940] hover:border-[#00338D] hover:text-[#00338D]"
              >
                <PencilSimple size={14} weight="bold" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteCompany((prev) => !prev)}
                disabled={isDeletingCompany}
                aria-label={`Delete ${company.name}`}
                title="Delete Company Profile"
                className="rounded-sm border border-[#D8DFE9] bg-white p-2 text-[#B91C1C] hover:bg-[#B91C1C]/10 hover:border-[#B91C1C]"
              >
                <Trash size={16} />
              </button>
              <button
                type="button"
                data-dialog-close="true"
                onClick={handleCloseDrawer}
                aria-label="Close company management drawer"
                className="rounded-sm border border-[#D8DFE9] bg-white p-2 text-[#333940] hover:text-[#00338D]"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Inline Delete Company Confirmation Bar */}
          {confirmDeleteCompany && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#B91C1C]/30 bg-[#B91C1C]/5 px-6 py-3 text-xs"
            >
              <p className="font-medium text-[#B91C1C]">
                Permanently delete <strong>{company.name}</strong> and revoke all entitlements and personas?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCompany(false)}
                  className="rounded-sm border border-[#D8DFE9] bg-white px-3 py-1 text-xs font-medium text-[#4B5563] hover:bg-[#F4F6FA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingCompany}
                  onClick={handleDeleteCompany}
                  className="rounded-sm bg-[#B91C1C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#991B1B] disabled:opacity-60"
                >
                  {isDeletingCompany ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
            {actionError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-2 rounded-sm border border-[#B91C1C]/20 bg-[#B91C1C]/5 p-3 text-xs font-medium text-[#B91C1C]"
              >
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {company.status === "suspended" && (
              <div className="flex items-start gap-2.5 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 p-3.5 text-xs text-[#991B1B]">
                <WarningCircle size={18} weight="bold" className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Company Account Suspended</p>
                  <p className="mt-0.5">
                    All client logins and active platform access for {company.name} are halted until you change status back to Active via Edit.
                  </p>
                </div>
              </div>
            )}

            {/* AI Spend & Quota Governance Section */}
            <div className="rounded-sm border border-[#D8DFE9] bg-gradient-to-br from-[#F8FAFC] to-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xs bg-[#00338D]/10 text-[#00338D]">
                    <Coins size={18} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0C233C]">
                      AI Spend & Budget Envelope
                    </h3>
                    <p className="text-[11px] text-[#526075]">
                      {company.spendLimit?.enabled
                        ? `Hierarchical spend ceiling governed on a ${company.spendLimit.period} cadence.`
                        : "No spend limit enforced. Organization consumes from unlimited pool."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-xs px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      company.spendLimit?.enabled
                        ? "border border-[#009A44]/30 bg-[#009A44]/10 text-[#009A44]"
                        : "border border-[#D8DFE9] bg-white text-[#526075]"
                    }`}
                  >
                    {company.spendLimit?.enabled
                      ? company.spendLimit.period.replace("_", " ")
                      : "Uncapped"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditCompanyOpen(true)}
                    className="rounded-xs border border-[#D8DFE9] bg-white px-2 py-1 text-[11px] font-medium text-[#00338D] hover:border-[#00338D] hover:bg-[#F4F6FA]"
                  >
                    Configure
                  </button>
                </div>
              </div>

              {company.spendLimit?.enabled ? (
                <div className="mt-3.5 space-y-2 border-t border-[#E2E8F0] pt-3">
                  <div className="flex items-baseline justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#0C233C]">
                        ${quotaStatus ? quotaStatus.companySpendUsd.toFixed(2) : "0.00"}
                      </span>
                      <span className="text-[#526075]">
                        {" "}
                        / ${company.spendLimit.amountUsd.toFixed(2)} Consumed
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[#526075]">
                        ${quotaStatus?.companyRemainingUsd !== null && quotaStatus?.companyRemainingUsd !== undefined
                          ? quotaStatus.companyRemainingUsd.toFixed(2)
                          : company.spendLimit.amountUsd.toFixed(2)}{" "}
                        remaining
                      </span>
                      <span
                        className={`font-bold ${
                          (quotaStatus?.companySpendPct ?? 0) >= 90
                            ? "text-[#B91C1C]"
                            : (quotaStatus?.companySpendPct ?? 0) >= 70
                            ? "text-[#D97706]"
                            : "text-[#009A44]"
                        }`}
                      >
                        ({quotaStatus?.companySpendPct ?? 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        (quotaStatus?.companySpendPct ?? 0) >= 90
                          ? "bg-[#B91C1C]"
                          : (quotaStatus?.companySpendPct ?? 0) >= 70
                          ? "bg-[#D97706]"
                          : "bg-gradient-to-r from-[#009A44] to-[#00338D]"
                      }`}
                      style={{
                        width: `${Math.min(100, quotaStatus?.companySpendPct ?? 0)}%`,
                      }}
                    />
                  </div>

                  {/* Reset Cadence Indicator */}
                  <div className="flex items-center justify-between text-[11px] text-[#526075] pt-0.5">
                    <div className="flex items-center gap-1">
                      <ClockCountdown size={13} className="text-[#00338D]" />
                      <span>
                        Reset in:{" "}
                        <strong className="text-[#0C233C]">
                          {formatSeconds(quotaStatus?.secondsUntilReset)}
                        </strong>
                      </span>
                    </div>
                    <span className="font-mono text-[10px]">
                      {quotaStatus?.periodLabel || "Period active"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 flex items-center justify-between rounded-xs bg-[#F1F5F9] px-3 py-2 text-[11px] text-[#526075]">
                  <span>Unlimited consumption allowed across all satellite products.</span>
                  <span className="font-mono text-[10px] font-semibold text-[#00338D]">
                    Active Pool: ∞
                  </span>
                </div>
              )}
            </div>

            <hr className="border-[#D8DFE9]" />

            {/* Product Access Toggles Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0C233C]">
                    Product Entitlements (Simple On / Off)
                  </h3>
                  <p className="text-[11px] text-[#4B5563]">
                    Toggle access on or off to instantly make products available to this company.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-[#00338D]">
                  {companyEntitledProductIds.length} of{" "}
                  {availableProducts.length} Enabled
                </span>
              </div>

              <div className="space-y-3">
                {availableProducts.map((platform) => {
                  const isEnabled = companyEntitledProductIds.includes(
                    platform.id
                  );
                  const isToggling = togglingProducts.has(platform.id);

                  return (
                    <div
                      key={platform.id}
                      className={`flex flex-col gap-3 rounded-sm border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                        isEnabled
                          ? "border-[#00338D]/40 bg-[#00338D]/5 shadow-xs"
                          : "border-[#D8DFE9] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
                            isEnabled
                              ? "bg-[#00338D] text-white"
                              : "bg-[#F4F6FA] text-[#4B5563]"
                          }`}
                        >
                          <Cpu size={20} weight="bold" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-[#0C233C]">
                              {platform.title}
                            </h4>
                            <span className="font-mono text-[10px] text-[#4B5563]">
                              Port {platform.portFrontend}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#4B5563] line-clamp-2">
                            {platform.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          aria-label={`Toggle ${platform.title} access for ${company.name}`}
                          disabled={isToggling}
                          onClick={() =>
                            handleToggleProduct(platform.id, isEnabled)
                          }
                          className={`inline-flex items-center gap-2 rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 ${
                            isEnabled
                              ? "bg-[#009A44] text-white shadow-xs hover:bg-[#007A34]"
                              : "border border-[#D8DFE9] bg-white text-[#4B5563] hover:border-[#00338D] hover:text-[#00338D]"
                          }`}
                        >
                          {isEnabled ? (
                            <>
                              <ToggleRight size={18} weight="fill" />
                              <span>ACCESS GRANTED</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={18} weight="regular" />
                              <span>REVOKED (OFF)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-[#D8DFE9]" />

            {/* Personas & Roles Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0C233C]">
                    Company Personas ({personas.length})
                  </h3>
                  <p className="text-[11px] text-[#4B5563]">
                    Roles created for this client with custom permissions and product scopes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddPersona}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E49E2]"
                >
                  <PlusCircle size={15} weight="bold" />
                  <span>Add Persona</span>
                </button>
              </div>

              {personas.length === 0 ? (
                <div className="rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-8 text-center">
                  <User size={28} className="mx-auto text-[#4B5563]" />
                  <p className="mt-2 text-xs font-semibold text-[#0C233C]">
                    No Personas Created Yet
                  </p>
                  <p className="mt-1 text-[11px] text-[#4B5563]">
                    Create personas like Finance Manager or Client Admin to give users specific credentials.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddPersona}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E49E2]"
                  >
                    <PlusCircle size={14} weight="bold" />
                    <span>Create First Persona</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {personas.map((persona) => {
                    const effectiveCustomCount = companyEntitledProductIds.filter(
                      (pid) => (persona.allowedProductIds || []).includes(pid)
                    ).length;

                    return (
                      <div
                        key={persona.id}
                        className="rounded-sm border border-[#D8DFE9] bg-white p-4 shadow-xs hover:border-[#00338D] transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#0C233C]">
                                {persona.name}
                              </span>
                              <span className="rounded-xs border border-[#1E49E2]/30 bg-[#1E49E2]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#00338D]">
                                {persona.roleTitle}
                              </span>
                            </div>
                            <p className="text-xs text-[#4B5563]">
                              Email:{" "}
                              <span className="font-mono text-[#0C233C]">
                                {persona.email}
                              </span>{" "}
                              · Passcode:{" "}
                              <span className="font-mono text-[#4B5563]">
                                ••••••••
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePreviewAsPersona(persona)}
                              title="View Portal As This Persona (KPMG Instant Preview)"
                              className="inline-flex items-center gap-1 rounded-sm border border-[#00338D] bg-white px-2.5 py-1 text-xs font-semibold text-[#00338D] hover:bg-[#00338D] hover:text-white transition-colors"
                            >
                              <Eye size={14} weight="bold" />
                              <span>Preview As</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditPersona(persona)}
                              aria-label={`Edit persona ${persona.name}`}
                              title="Edit Persona"
                              className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#4B5563] hover:text-[#00338D]"
                            >
                              <PencilSimple size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeletePersonaId((prev) =>
                                  prev === persona.id ? null : persona.id
                                )
                              }
                              aria-label={`Delete persona ${persona.name}`}
                              title="Delete Persona"
                              className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#B91C1C] hover:bg-[#B91C1C]/10"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>

                        {confirmDeletePersonaId === persona.id && (
                          <div
                            role="alert"
                            className="mt-3 flex items-center justify-between gap-2 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-[#B91C1C]">
                              Revoke and delete {persona.name}?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeletePersonaId(null)}
                                className="rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5563]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={deletingPersonaId === persona.id}
                                onClick={() => handleDeletePersona(persona.id)}
                                className="rounded-sm bg-[#B91C1C] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#991B1B] disabled:opacity-60"
                              >
                                {deletingPersonaId === persona.id
                                  ? "Deleting..."
                                  : "Confirm Delete"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Permission Toggles Active Badges */}
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#D8DFE9] pt-2.5 text-[10px] font-mono">
                          <span
                            className={`rounded-xs px-2 py-0.5 ${
                              persona.permissions.canLaunchProducts
                                ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                : "bg-gray-100 text-[#6B7280] line-through"
                            }`}
                          >
                            Catalog:{" "}
                            {persona.permissions.canLaunchProducts ? "ON" : "OFF"}
                          </span>
                          <span
                            className={`rounded-xs px-2 py-0.5 ${
                              persona.permissions.canViewAudit
                                ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                : "bg-gray-100 text-[#6B7280] line-through"
                            }`}
                          >
                            Audit:{" "}
                            {persona.permissions.canViewAudit ? "ON" : "OFF"}
                          </span>
                          <span
                            className={`rounded-xs px-2 py-0.5 ${
                              persona.permissions.canManageDashboards
                                ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                : "bg-gray-100 text-[#6B7280] line-through"
                            }`}
                          >
                            Dashboards:{" "}
                            {persona.permissions.canManageDashboards
                              ? "ON"
                              : "OFF"}
                          </span>
                          <span className="rounded-xs bg-[#F4F6FA] px-2 py-0.5 text-[#4B5563]">
                            Scope:{" "}
                            {!persona.permissions.canLaunchProducts
                              ? "Catalog Disabled"
                              : persona.productAccessMode === "all"
                              ? `All Company Products (${companyEntitledProductIds.length})`
                              : `${effectiveCustomCount} Active Product${
                                  effectiveCustomCount !== 1 ? "s" : ""
                                }`}
                          </span>
                        </div>

                        {/* Persona Spend Consumption & Cap */}
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1F5F9] pt-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Coins size={13} className="text-[#00338D]" />
                            <span className="text-[#526075]">Cycle Spend:</span>
                            <span className="font-mono font-bold text-[#0C233C]">
                              ${(quotaStatus?.spendByPersona?.[persona.id] || 0).toFixed(2)}
                            </span>
                            <span className="text-[#9CA3AF]">/</span>
                            <span className="font-mono text-[#526075]">
                              {persona.spendLimitUsd !== null && persona.spendLimitUsd !== undefined
                                ? `$${persona.spendLimitUsd.toFixed(2)} cap`
                                : "Company pool"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPersona(persona)}
                            className="text-[11px] font-medium text-[#00338D] hover:underline"
                          >
                            Adjust Cap
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <CreatePersonaModal
        isOpen={isPersonaModalOpen}
        onClose={handleClosePersonaModal}
        companyId={company.id}
        companyName={company.name}
        existingPersona={editingPersona}
        availableProducts={availableProducts}
        companyEntitledProductIds={companyEntitledProductIds}
        onPersonaSaved={(p) => {
          onPersonaSaved(p);
          handleClosePersonaModal();
        }}
      />

      <CreateCompanyModal
        isOpen={isEditCompanyOpen}
        onClose={handleCloseEditCompany}
        existingCompany={company}
        onCompanySaved={(updated) => {
          onCompanyUpdated(updated);
          handleCloseEditCompany();
        }}
      />
    </>
  );
}

export function CompanyDetailDrawer(props: CompanyDetailDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {props.isOpen && props.company && (
        <DrawerInner
          key={props.company.id}
          company={props.company}
          entitlements={props.entitlements}
          personas={props.personas}
          availableProducts={props.availableProducts}
          onClose={props.onClose}
          onToggleEntitlement={props.onToggleEntitlement}
          onPersonaSaved={props.onPersonaSaved}
          onPersonaDeleted={props.onPersonaDeleted}
          onCompanyUpdated={props.onCompanyUpdated}
          onCompanyDeleted={props.onCompanyDeleted}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
