"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  Cpu,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  FileArrowDown,
  Gauge,
  LockKey,
  ShieldCheck,
  User,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { CompanyPersona, PersonaPermissions } from "@/lib/governance/types";
import { ConnectedPlatform } from "@/data/platforms";

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  existingPersona?: CompanyPersona | null;
  availableProducts: ConnectedPlatform[];
  companyEntitledProductIds: string[];
  onPersonaSaved: (persona: CompanyPersona) => void;
}

export function CreatePersonaModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  existingPersona,
  availableProducts,
  companyEntitledProductIds,
  onPersonaSaved,
}: CreatePersonaModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState(existingPersona?.name || "");
  const [roleTitle, setRoleTitle] = useState(existingPersona?.roleTitle || "");
  const [email, setEmail] = useState(existingPersona?.email || "");
  const [passcode, setPasscode] = useState(existingPersona?.passcode || "");
  const [showPassword, setShowPassword] = useState(false);
  const [productAccessMode, setProductAccessMode] = useState<"all" | "custom">(
    existingPersona?.productAccessMode || "all"
  );
  const [allowedProductIds, setAllowedProductIds] = useState<string[]>(
    existingPersona ? existingPersona.allowedProductIds || [] : companyEntitledProductIds
  );
  const [permissions, setPermissions] = useState<PersonaPermissions>(
    existingPersona?.permissions || {
      canLaunchProducts: true,
      canViewAudit: true,
      canManageDashboards: false,
      canExportData: false,
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useDialogFocusTrap(isOpen, panelRef, onClose);

  const toggleProductSelection = (productId: string) => {
    setAllowedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handlePermissionToggle = (key: keyof PersonaPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Persona name is required.");
      return;
    }
    if (!roleTitle.trim()) {
      setErrorMessage("Role title is required (e.g. Finance Manager, Client Admin).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("A valid email address is required.");
      return;
    }
    if (!passcode.trim() || passcode.trim().length < 4) {
      setErrorMessage("Passcode must be at least 4 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = existingPersona
        ? `/api/clients/${companyId}/personas/${existingPersona.id}`
        : `/api/clients/${companyId}/personas`;
      const method = existingPersona ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          roleTitle: roleTitle.trim(),
          email: email.trim(),
          passcode: passcode.trim(),
          productAccessMode,
          allowedProductIds:
            productAccessMode === "all" ? companyEntitledProductIds : allowedProductIds,
          permissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save persona.");
      }

      onPersonaSaved(data.persona);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save persona."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="persona-modal-title"
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
            className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-sm border border-[#D8DFE9] bg-white p-6 shadow-2xl text-[#0C233C] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#D8DFE9] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
                  <User size={22} weight="bold" />
                </div>
                <div>
                  <h3
                    id="persona-modal-title"
                    className="text-lg font-semibold tracking-tight text-[#0C233C]"
                  >
                    {existingPersona ? "Edit Client Persona" : "Create Client Persona"}
                  </h3>
                  <p className="text-xs text-[#4B5563]">
                    Configuring access for{" "}
                    <span className="font-semibold text-[#00338D]">
                      {companyName}
                    </span>
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

              {/* Persona Name & Role Title */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0C233C]">
                    Persona / User Name <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rachel Hayes"
                    className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0C233C]">
                    Role Title <span className="text-[#B91C1C]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Finance Manager / Client Admin"
                    className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                  />
                </div>
              </div>

              {/* Credentials: Email and Passcode */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0C233C]">
                    Login Email <span className="text-[#B91C1C]">*</span>
                  </label>
                  <div className="relative">
                    <EnvelopeSimple
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rachel.hayes@apex.com"
                      className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2 pr-3 pl-9 text-xs text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0C233C]">
                    Session Passcode <span className="text-[#B91C1C]">*</span>
                  </label>
                  <div className="relative">
                    <LockKey
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#4B5563]"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Set access passcode"
                      className="w-full rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] py-2 pr-9 pl-9 text-xs text-[#0C233C] focus:border-[#1E49E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E49E2]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6B7280] hover:text-[#0C233C]"
                    >
                      {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Access Scope */}
              <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#0C233C] uppercase tracking-wide">
                      Product Entitlement Scope
                    </h4>
                    <p className="text-[11px] text-[#4B5563]">
                      Control which company-enabled platforms this persona can see.
                    </p>
                  </div>
                  <div className="flex rounded-xs border border-[#D8DFE9] bg-white p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setProductAccessMode("all")}
                      className={`px-2.5 py-1 font-semibold rounded-xs transition-colors ${
                        productAccessMode === "all"
                          ? "bg-[#00338D] text-white"
                          : "text-[#4B5563] hover:text-[#0C233C]"
                      }`}
                    >
                      All Enabled
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductAccessMode("custom")}
                      className={`px-2.5 py-1 font-semibold rounded-xs transition-colors ${
                        productAccessMode === "custom"
                          ? "bg-[#00338D] text-white"
                          : "text-[#4B5563] hover:text-[#0C233C]"
                      }`}
                    >
                      Custom Subset
                    </button>
                  </div>
                </div>

                {productAccessMode === "custom" && (
                  <div className="mt-2 space-y-2 border-t border-[#D8DFE9] pt-2.5">
                    {availableProducts.map((prod) => {
                      const isCompanyEntitled = companyEntitledProductIds.includes(
                        prod.id
                      );
                      const isSelected = allowedProductIds.includes(prod.id);

                      return (
                        <label
                          key={prod.id}
                          className={`flex items-center justify-between rounded-sm border p-2.5 text-xs transition-colors ${
                            !isCompanyEntitled
                              ? "opacity-50 border-[#D8DFE9] bg-gray-50 cursor-not-allowed"
                              : isSelected
                              ? "border-[#00338D] bg-white font-semibold text-[#00338D]"
                              : "border-[#D8DFE9] bg-white text-[#4B5563] hover:bg-[#F4F6FA] cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={!isCompanyEntitled}
                              checked={isSelected}
                              onChange={() => toggleProductSelection(prod.id)}
                              className="rounded border-[#D8DFE9] text-[#00338D] focus:ring-[#1E49E2]"
                            />
                            <span>{prod.title}</span>
                          </div>
                          {!isCompanyEntitled && (
                            <span className="font-mono text-[10px] text-[#B91C1C]">
                              Disabled for Company
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Granular Permission On/Off Toggles */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#0C233C] uppercase tracking-wide">
                  Persona Feature Toggles (On / Off)
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {/* Toggle 1: Launch Products */}
                  <div
                    onClick={() => handlePermissionToggle("canLaunchProducts")}
                    className={`flex items-center justify-between rounded-sm border p-3 cursor-pointer transition-colors ${
                      permissions.canLaunchProducts
                        ? "border-[#00338D] bg-[#00338D]/5"
                        : "border-[#D8DFE9] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xs ${
                          permissions.canLaunchProducts
                            ? "bg-[#00338D] text-white"
                            : "bg-[#F4F6FA] text-[#4B5563]"
                        }`}
                      >
                        <Cpu size={16} weight="bold" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0C233C]">
                          Launch Products
                        </p>
                        <p className="text-[10px] text-[#4B5563]">
                          Execute live platforms
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        permissions.canLaunchProducts
                          ? "text-[#009A44]"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {permissions.canLaunchProducts ? "ON" : "OFF"}
                    </span>
                  </div>

                  {/* Toggle 2: View Audit & Telemetry */}
                  <div
                    onClick={() => handlePermissionToggle("canViewAudit")}
                    className={`flex items-center justify-between rounded-sm border p-3 cursor-pointer transition-colors ${
                      permissions.canViewAudit
                        ? "border-[#00338D] bg-[#00338D]/5"
                        : "border-[#D8DFE9] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xs ${
                          permissions.canViewAudit
                            ? "bg-[#00338D] text-white"
                            : "bg-[#F4F6FA] text-[#4B5563]"
                        }`}
                      >
                        <ShieldCheck size={16} weight="bold" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0C233C]">
                          Audit Telemetry
                        </p>
                        <p className="text-[10px] text-[#4B5563]">
                          View audit line logs
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        permissions.canViewAudit
                          ? "text-[#009A44]"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {permissions.canViewAudit ? "ON" : "OFF"}
                    </span>
                  </div>

                  {/* Toggle 3: Manage Dashboards */}
                  <div
                    onClick={() => handlePermissionToggle("canManageDashboards")}
                    className={`flex items-center justify-between rounded-sm border p-3 cursor-pointer transition-colors ${
                      permissions.canManageDashboards
                        ? "border-[#00338D] bg-[#00338D]/5"
                        : "border-[#D8DFE9] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xs ${
                          permissions.canManageDashboards
                            ? "bg-[#00338D] text-white"
                            : "bg-[#F4F6FA] text-[#4B5563]"
                        }`}
                      >
                        <Gauge size={16} weight="bold" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0C233C]">
                          Dashboards
                        </p>
                        <p className="text-[10px] text-[#4B5563]">
                          Configure layout filters
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        permissions.canManageDashboards
                          ? "text-[#009A44]"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {permissions.canManageDashboards ? "ON" : "OFF"}
                    </span>
                  </div>

                  {/* Toggle 4: Export Data */}
                  <div
                    onClick={() => handlePermissionToggle("canExportData")}
                    className={`flex items-center justify-between rounded-sm border p-3 cursor-pointer transition-colors ${
                      permissions.canExportData
                        ? "border-[#00338D] bg-[#00338D]/5"
                        : "border-[#D8DFE9] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xs ${
                          permissions.canExportData
                            ? "bg-[#00338D] text-white"
                            : "bg-[#F4F6FA] text-[#4B5563]"
                        }`}
                      >
                        <FileArrowDown size={16} weight="bold" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0C233C]">
                          Data Export
                        </p>
                        <p className="text-[10px] text-[#4B5563]">
                          Download reports
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-bold ${
                        permissions.canExportData
                          ? "text-[#009A44]"
                          : "text-[#6B7280]"
                      }`}
                    >
                      {permissions.canExportData ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
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
                    {isSubmitting
                      ? "Saving Persona..."
                      : existingPersona
                      ? "Update Persona"
                      : "Create Persona"}
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
