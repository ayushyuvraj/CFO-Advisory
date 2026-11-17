"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Buildings,
  Cpu,
  Eye,
  PencilSimple,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Trash,
  User,
  X,
} from "@phosphor-icons/react";
import {
  CompanyEntitlement,
  CompanyPersona,
  CompanyProfile,
} from "@/lib/governance/types";
import { ConnectedPlatform } from "@/data/platforms";
import { useAuth } from "@/context/AuthContext";
import { CreatePersonaModal } from "./CreatePersonaModal";

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
  onCompanyDeleted: (companyId: string) => void;
}

export function CompanyDetailDrawer({
  isOpen,
  onClose,
  company,
  entitlements,
  personas,
  availableProducts,
  onToggleEntitlement,
  onPersonaSaved,
  onPersonaDeleted,
  onCompanyDeleted,
}: CompanyDetailDrawerProps) {
  const prefersReducedMotion = useReducedMotion();
  const { startPreviewAs } = useAuth();

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CompanyPersona | null>(null);
  const [isTogglingProduct, setIsTogglingProduct] = useState<string | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);

  if (!company) return null;

  const handleOpenAddPersona = () => {
    setEditingPersona(null);
    setIsPersonaModalOpen(true);
  };

  const handleOpenEditPersona = (persona: CompanyPersona) => {
    setEditingPersona(persona);
    setIsPersonaModalOpen(true);
  };

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm("Are you sure you want to delete and revoke this persona?")) {
      return;
    }
    try {
      const res = await fetch(
        `/api/clients/${company.id}/personas/${personaId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        onPersonaDeleted(personaId);
      }
    } catch (err) {
      console.error("Failed to delete persona:", err);
    }
  };

  const handleDeleteCompany = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${company.name}? This will revoke all product access and delete all personas.`
      )
    ) {
      return;
    }

    setIsDeletingCompany(true);
    try {
      const res = await fetch(`/api/clients/${company.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onCompanyDeleted(company.id);
        onClose();
      }
    } catch (err) {
      console.error("Failed to delete company:", err);
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const handleToggleProduct = async (productId: string, currentEnabled: boolean) => {
    setIsTogglingProduct(productId);
    try {
      await onToggleEntitlement(productId, !currentEnabled);
    } finally {
      setIsTogglingProduct(null);
    }
  };

  const companyEntitledProductIds = entitlements
    .filter((e) => e.enabled)
    .map((e) => e.productId);

  const handlePreviewAsPersona = (persona: CompanyPersona) => {
    const allowed =
      persona.productAccessMode === "all"
        ? companyEntitledProductIds
        : companyEntitledProductIds.filter((pid) =>
            persona.allowedProductIds.includes(pid)
          );

    startPreviewAs(company, persona, allowed);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 flex justify-end"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-[#0C233C]/45 backdrop-blur-sm"
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={prefersReducedMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={prefersReducedMotion ? undefined : { x: "100%" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
                    <Buildings size={22} weight="bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#0C233C]">
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
                    <p className="text-xs text-[#4B5563]">
                      Primary Contact: {company.contactEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteCompany}
                    disabled={isDeletingCompany}
                    title="Delete Company Profile"
                    className="rounded-sm border border-[#D8DFE9] bg-white p-2 text-[#B91C1C] hover:bg-[#B91C1C]/10 hover:border-[#B91C1C]"
                  >
                    <Trash size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-sm border border-[#D8DFE9] bg-white p-2 text-[#333940] hover:text-[#00338D]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                      {companyEntitledProductIds.length} of {availableProducts.length} Enabled
                    </span>
                  </div>

                  <div className="space-y-3">
                    {availableProducts.map((platform) => {
                      const isEnabled = companyEntitledProductIds.includes(
                        platform.id
                      );
                      const isToggling = isTogglingProduct === platform.id;

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
                              disabled={isToggling}
                              onClick={() =>
                                handleToggleProduct(platform.id, isEnabled)
                              }
                              className={`inline-flex items-center gap-2 rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-all ${
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
                      {personas.map((persona) => (
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
                              {/* Preview As Persona Button */}
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
                                title="Edit Persona"
                                className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#4B5563] hover:text-[#00338D]"
                              >
                                <PencilSimple size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePersona(persona.id)}
                                title="Delete Persona"
                                className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#B91C1C] hover:bg-[#B91C1C]/10"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Permission Toggles Active Badges */}
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#D8DFE9] pt-2.5 text-[10px] font-mono">
                            <span
                              className={`rounded-xs px-2 py-0.5 ${
                                persona.permissions.canLaunchProducts
                                  ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                  : "bg-gray-100 text-[#6B7280] line-through"
                              }`}
                            >
                              Launch: {persona.permissions.canLaunchProducts ? "ON" : "OFF"}
                            </span>
                            <span
                              className={`rounded-xs px-2 py-0.5 ${
                                persona.permissions.canViewAudit
                                  ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                  : "bg-gray-100 text-[#6B7280] line-through"
                              }`}
                            >
                              Audit: {persona.permissions.canViewAudit ? "ON" : "OFF"}
                            </span>
                            <span
                              className={`rounded-xs px-2 py-0.5 ${
                                persona.permissions.canManageDashboards
                                  ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                  : "bg-gray-100 text-[#6B7280] line-through"
                              }`}
                            >
                              Dashboards: {persona.permissions.canManageDashboards ? "ON" : "OFF"}
                            </span>
                            <span
                              className={`rounded-xs px-2 py-0.5 ${
                                persona.permissions.canExportData
                                  ? "bg-[#009A44]/10 text-[#009A44] font-semibold"
                                  : "bg-gray-100 text-[#6B7280] line-through"
                              }`}
                            >
                              Export: {persona.permissions.canExportData ? "ON" : "OFF"}
                            </span>
                            <span className="rounded-xs bg-[#F4F6FA] px-2 py-0.5 text-[#4B5563]">
                              Scope:{" "}
                              {persona.productAccessMode === "all"
                                ? "All Company Products"
                                : `${persona.allowedProductIds?.length || 0} Products`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreatePersonaModal
        key={editingPersona ? editingPersona.id : isPersonaModalOpen ? "new-persona-open" : "closed"}
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        companyId={company.id}
        companyName={company.name}
        existingPersona={editingPersona}
        availableProducts={availableProducts}
        companyEntitledProductIds={companyEntitledProductIds}
        onPersonaSaved={(p) => {
          onPersonaSaved(p);
          setIsPersonaModalOpen(false);
        }}
      />
    </>
  );
}
