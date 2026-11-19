"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import {
  Buildings,
  Cpu,
  ToggleLeft,
  ToggleRight,
  X,
} from "@phosphor-icons/react";
import { ConnectedPlatform } from "@/data/platforms";
import {
  CompanyEntitlement,
  CompanyProfile,
} from "@/lib/governance/types";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

interface ProductAccessDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  platform: ConnectedPlatform | null;
  companies: CompanyProfile[];
  entitlements: CompanyEntitlement[];
  togglingKeys: Set<string>;
  onToggleEntitlement: (companyId: string, productId: string, enabled: boolean) => Promise<void>;
}

export function ProductAccessDrawer({
  isOpen,
  onClose,
  platform,
  companies,
  entitlements,
  togglingKeys,
  onToggleEntitlement,
}: ProductAccessDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(
    Boolean(isOpen && platform),
    drawerRef,
    onClose
  );

  if (!isOpen || !platform) return null;

  const entitledCompanyIds = new Set(
    entitlements
      .filter((e) => e.productId === platform.id && e.enabled)
      .map((e) => e.companyId)
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-product-governance-title"
      className="fixed inset-0 z-[90] flex justify-end"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-[#0C233C]/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Drawer Surface */}
      <div
        ref={drawerRef}
        data-lenis-prevent
        className="relative z-10 flex h-full w-full max-w-[540px] flex-col border-l border-[#D8DFE9] bg-white shadow-2xl transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#00338D] text-white">
              <Cpu size={20} weight="bold" />
            </div>
            <div>
              <h2
                id="drawer-product-governance-title"
                className="font-sans text-base font-bold text-[#0C233C]"
              >
                {platform.title}
              </h2>
              <p className="font-mono text-xs text-[#526075]">
                {entitledCompanyIds.size} of {companies.length} Organizations Entitled
              </p>
            </div>
          </div>

          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            aria-label="Close product governance drawer"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-[#526075] transition-colors hover:bg-[#F1F5F9] hover:text-[#0C233C]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4 text-xs text-[#526075]">
            <p className="font-medium text-[#0C233C]">Multi-Tenant Access Policy</p>
            <p className="mt-1">
              Toggle company access to this physical platform in real time. Enabled client organizations will instantly see this product in their Workflows catalog.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#526075]">
              Client Organizations ({companies.length})
            </h3>

            {companies.length === 0 ? (
              <div className="rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-8 text-center text-xs text-[#526075]">
                No client companies onboarded yet.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9] rounded-sm border border-[#D8DFE9] bg-white">
                {companies.map((company) => {
                  const isEntitled = entitledCompanyIds.has(company.id);
                  const isToggling = togglingKeys.has(`${company.id}:${platform.id}`);

                  return (
                    <div
                      key={company.id}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#F8FAFC]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#F4F6FA] text-[#00338D]">
                          <Buildings size={16} weight="bold" />
                        </div>
                        <div>
                          <p className="font-sans text-xs font-semibold text-[#0C233C]">
                            {company.name}
                          </p>
                          <p className="font-mono text-[10px] text-[#64748B]">
                            {company.code} · {company.status === "active" ? "Active" : "Suspended"}
                          </p>
                        </div>
                      </div>

                      {/* Accessible Switch Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEntitled}
                        disabled={isToggling}
                        onClick={() => void onToggleEntitlement(company.id, platform.id, !isEntitled)}
                        aria-label={`Toggle ${platform.title} access for ${company.name}`}
                        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold transition-all ${
                          isEntitled
                            ? "bg-[#009A44]/10 text-[#009A44] hover:bg-[#009A44]/20"
                            : "bg-[#F4F6FA] text-[#526075] hover:bg-[#D8DFE9]"
                        } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {isEntitled ? (
                          <>
                            <ToggleRight size={20} weight="fill" className="text-[#009A44]" />
                            <span>Entitled</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={20} weight="regular" className="text-[#94A3B8]" />
                            <span>Revoked</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
