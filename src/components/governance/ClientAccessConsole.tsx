"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Buildings,
  Cpu,
  MagnifyingGlass,
  PlusCircle,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  ClientGovernanceData,
  CompanyEntitlement,
  CompanyPersona,
  CompanyProfile,
} from "@/lib/governance/types";
import { ConnectedPlatform } from "@/data/platforms";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { CompanyDetailDrawer } from "./CompanyDetailDrawer";
import {
  UnifiedWorkflowsBar,
  FilterOptionItem,
  SortOptionItem,
} from "@/components/workflows/UnifiedWorkflowsBar";

interface ClientAccessConsoleProps {
  availableProducts: ConnectedPlatform[];
}

export function ClientAccessConsole({
  availableProducts,
}: ClientAccessConsoleProps) {
  const [viewMode, setViewMode] = useState<"by-company" | "by-product">(
    "by-company"
  );
  const [governanceData, setGovernanceData] = useState<ClientGovernanceData>({
    companies: [],
    entitlements: [],
    personas: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [governanceFilter, setGovernanceFilter] = useState<"all" | "active" | "suspended">("all");
  const [governanceSort, setGovernanceSort] = useState<"name-asc" | "name-desc">("name-asc");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const res = await fetch("/api/clients", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Unable to load client governance registry.");
        }
        const data = (await res.json()) as ClientGovernanceData;
        if (!cancelled) {
          setGovernanceData(data);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Failed to load governance data."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedCompanyId(null);
  }, []);

  const handleToggleEntitlement = useCallback(
    async (companyId: string, productId: string, enabled: boolean) => {
      const key = `${companyId}:${productId}`;
      setActionError(null);
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      try {
        const res = await fetch(`/api/clients/${companyId}/entitlements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, enabled }),
        });

        let payload: { entitlement?: CompanyEntitlement; error?: string } = {};
        try {
          payload = (await res.json()) as typeof payload;
        } catch {
          // non-JSON fallback
        }

        if (!res.ok || !payload.entitlement) {
          throw new Error(
            payload.error || "Failed to update product entitlement."
          );
        }

        const updatedEntitlement = payload.entitlement;
        setGovernanceData((prev) => {
          const filtered = prev.entitlements.filter(
            (e) => !(e.companyId === companyId && e.productId === productId)
          );
          return {
            ...prev,
            entitlements: [...filtered, updatedEntitlement],
          };
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to toggle entitlement.";
        setActionError(msg);
        throw err;
      } finally {
        setTogglingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    []
  );

  const handleCompanyCreated = useCallback((company: CompanyProfile) => {
    setGovernanceData((prev) => ({
      ...prev,
      companies: [...prev.companies, company],
    }));
    setSelectedCompanyId(company.id);
  }, []);

  const handleCompanyUpdated = useCallback((updated: CompanyProfile) => {
    setGovernanceData((prev) => ({
      ...prev,
      companies: prev.companies.map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
  }, []);

  const handleCompanyDeleted = useCallback((companyId: string) => {
    setGovernanceData((prev) => ({
      companies: prev.companies.filter((c) => c.id !== companyId),
      entitlements: prev.entitlements.filter((e) => e.companyId !== companyId),
      personas: prev.personas.filter((p) => p.companyId !== companyId),
    }));
    setSelectedCompanyId((prev) => (prev === companyId ? null : prev));
  }, []);

  const handlePersonaSaved = useCallback((persona: CompanyPersona) => {
    setGovernanceData((prev) => {
      const exists = prev.personas.some((p) => p.id === persona.id);
      if (exists) {
        return {
          ...prev,
          personas: prev.personas.map((p) =>
            p.id === persona.id ? persona : p
          ),
        };
      }
      return {
        ...prev,
        personas: [...prev.personas, persona],
      };
    });
  }, []);

  const handlePersonaDeleted = useCallback((personaId: string) => {
    setGovernanceData((prev) => ({
      ...prev,
      personas: prev.personas.filter((p) => p.id !== personaId),
    }));
  }, []);

  const selectedCompany =
    governanceData.companies.find((c) => c.id === selectedCompanyId) || null;

  const selectedCompanyEntitlements = selectedCompany
    ? governanceData.entitlements.filter(
        (e) => e.companyId === selectedCompany.id
      )
    : [];

  const selectedCompanyPersonas = selectedCompany
    ? governanceData.personas.filter((p) => p.companyId === selectedCompany.id)
    : [];

  const filteredCompanies = useMemo(() => {
    let list = governanceData.companies;
    if (governanceFilter !== "all") {
      list = list.filter((c) => c.status === governanceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.contactEmail.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (governanceSort === "name-asc") return a.name.localeCompare(b.name);
      if (governanceSort === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });
  }, [governanceData.companies, governanceFilter, searchQuery, governanceSort]);

  const registeredProductIds = useMemo(
    () => new Set(availableProducts.map((p) => p.id)),
    [availableProducts]
  );

  const activeCompanyIds = useMemo(
    () =>
      new Set(
        governanceData.companies
          .filter((c) => c.status === "active")
          .map((c) => c.id)
      ),
    [governanceData.companies]
  );

  const totalActiveEntitlements = governanceData.entitlements.filter(
    (e) =>
      e.enabled &&
      registeredProductIds.has(e.productId) &&
      activeCompanyIds.has(e.companyId)
  ).length;

  const handleDrawerToggleEntitlement = useCallback(
    (productId: string, enabled: boolean) => {
      if (!selectedCompanyId) return Promise.resolve();
      return handleToggleEntitlement(selectedCompanyId, productId, enabled);
    },
    [selectedCompanyId, handleToggleEntitlement]
  );

  return (
    <div className="space-y-4">
      {/* Unified Control Bar: Sits at identical Y = 112px as all Hub tabs */}
      <UnifiedWorkflowsBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search organizations, domains..."
        filterOptions={[
          { id: "all", label: "All Organizations" },
          { id: "active", label: "Active Clients Only" },
          { id: "suspended", label: "Suspended" },
        ]}
        activeFilter={governanceFilter}
        onFilterChange={(id) => setGovernanceFilter(id as "all" | "active" | "suspended")}
        filterLabel="Status"
        sortOptions={[
          { id: "name-asc", label: "Company Name (A → Z)" },
          { id: "name-desc", label: "Company Name (Z → A)" },
        ]}
        activeSort={governanceSort}
        onSortChange={(id) => setGovernanceSort(id as "name-asc" | "name-desc")}
        sortLabel="Sort"
        countLabel={`${filteredCompanies.length} ${filteredCompanies.length === 1 ? "organization" : "organizations"}`}
      >
        {/* View Switcher: By Company vs By Product */}
        <div
          role="tablist"
          aria-label="Governance view mode"
          className="inline-flex h-[30px] items-center rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-0.5 text-xs box-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "by-company"}
            onClick={() => setViewMode("by-company")}
            className={`inline-flex h-[24px] items-center gap-1.5 rounded-xs px-2.5 py-0 text-xs font-semibold transition-all box-border ${
              viewMode === "by-company"
                ? "bg-white text-[#00338D] shadow-xs"
                : "text-[#4B5563] hover:text-[#0C233C]"
            }`}
          >
            <Buildings size={14} weight="bold" />
            <span>Companies ({governanceData.companies.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "by-product"}
            onClick={() => setViewMode("by-product")}
            className={`inline-flex h-[24px] items-center gap-1.5 rounded-xs px-2.5 py-0 text-xs font-semibold transition-all box-border ${
              viewMode === "by-product"
                ? "bg-white text-[#00338D] shadow-xs"
                : "text-[#4B5563] hover:text-[#0C233C]"
            }`}
          >
            <Cpu size={14} weight="bold" />
            <span>Products ({availableProducts.length})</span>
          </button>
        </div>

        {/* Primary CTA: Onboard Company */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-sm bg-[#00338D] px-3.5 py-0 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1E49E2] box-border"
        >
          <PlusCircle size={15} weight="bold" />
          <span>Add Organization</span>
        </button>
      </UnifiedWorkflowsBar>

      {/* Inline Action Error Alert */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 px-4 py-3 text-xs font-medium text-[#B91C1C]"
        >
          <div className="flex items-center gap-2">
            <WarningCircle size={16} weight="bold" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-sm border border-[#D8DFE9] bg-white" />
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-sm border border-[#B91C1C]/30 bg-white px-6 py-12 text-center shadow-xs"
        >
          <WarningCircle size={28} className="mx-auto text-[#B91C1C]" />
          <h3 className="mt-3 text-base font-bold text-[#0C233C]">
            Unable to Load Governance Registry
          </h3>
          <p className="mt-1 text-xs text-[#4B5563]">{loadError}</p>
        </div>
      ) : viewMode === "by-company" ? (
        governanceData.companies.length === 0 ? (
          <div className="rounded-sm border border-dashed border-[#D8DFE9] bg-white px-6 py-16 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
              <Buildings size={24} weight="bold" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#0C233C]">
              No Client Companies Onboarded Yet
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#4B5563]">
              Start by creating your first client company profile. Once onboarded, you can grant or revoke access to registered platforms with 1-click toggles and configure custom personas.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-sm bg-[#00338D] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E49E2]"
            >
              <PlusCircle size={16} weight="bold" />
              <span>Create First Company Profile</span>
            </button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="rounded-sm border border-dashed border-[#D8DFE9] bg-white px-6 py-12 text-center shadow-xs">
            <p className="text-sm font-semibold text-[#0C233C]">
              No companies match &quot;{searchQuery}&quot;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3.5 py-1.5 text-xs font-semibold text-[#00338D] hover:bg-[#F4F6FA]"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredCompanies.map((company) => {
              const enabledCount = governanceData.entitlements.filter(
                (e) =>
                  e.companyId === company.id &&
                  e.enabled &&
                  registeredProductIds.has(e.productId)
              ).length;
              const personaCount = governanceData.personas.filter(
                (p) => p.companyId === company.id
              ).length;

              return (
                <div
                  key={company.id}
                  className="flex flex-col justify-between rounded-sm border border-[#D8DFE9] bg-white p-5 shadow-xs transition-all hover:border-[#00338D] hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
                          <Buildings size={20} weight="bold" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-[#0C233C]">
                              {company.name}
                            </h3>
                            <span className="rounded-xs border border-[#D8DFE9] bg-[#F8FAFC] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#00338D]">
                              {company.code}
                            </span>
                          </div>
                          <p className="text-xs text-[#4B5563]">
                            {company.contactEmail}
                          </p>
                        </div>
                      </div>
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

                    {company.notes && (
                      <p className="mt-3 text-xs text-[#4B5563] line-clamp-2">
                        {company.notes}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-3 text-xs">
                      <div>
                        <span className="text-[11px] text-[#4B5563]">
                          Product Entitlements
                        </span>
                        <p className="font-mono font-bold text-[#0C233C]">
                          {enabledCount} / {availableProducts.length} Active
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] text-[#4B5563]">
                          Assigned Personas
                        </span>
                        <p className="font-mono font-bold text-[#0C233C]">
                          {personaCount} Persona{personaCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end border-t border-[#D8DFE9] pt-3.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyId(company.id)}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E49E2]"
                    >
                      <SlidersHorizontal size={14} weight="bold" />
                      <span>Manage Access & Personas</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* VIEW 2: BY PRODUCT (Direct 1-Click Company Matrix) */
        <div className="space-y-5">
          {availableProducts.map((platform) => {
            const entitledCompaniesCount = governanceData.entitlements.filter(
              (e) =>
                e.productId === platform.id &&
                e.enabled &&
                activeCompanyIds.has(e.companyId)
            ).length;

            return (
              <div
                key={platform.id}
                className="overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#00338D] text-white">
                      <Cpu size={20} weight="bold" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0C233C]">
                        {platform.title}
                      </h3>
                      <p className="font-mono text-xs text-[#4B5563]">
                        ID: {platform.id} · Frontend Port {platform.portFrontend}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-sm border border-[#D8DFE9] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#00338D]">
                    {entitledCompaniesCount} of {activeCompanyIds.size} Active
                    Companies Entitled
                  </div>
                </div>

                <div className="p-6">
                  {governanceData.companies.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-[#D8DFE9] bg-[#F8FAFC] p-6 text-center">
                      <p className="text-xs font-medium text-[#4B5563]">
                        No client companies exist yet. Create a company profile first to toggle access to this platform.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {governanceData.companies.map((company) => {
                        const isEnabled = governanceData.entitlements.some(
                          (e) =>
                            e.companyId === company.id &&
                            e.productId === platform.id &&
                            e.enabled
                        );
                        const isToggling = togglingKeys.has(
                          `${company.id}:${platform.id}`
                        );

                        return (
                          <div
                            key={company.id}
                            className={`flex items-center justify-between rounded-sm border p-3.5 transition-all ${
                              company.status === "suspended"
                                ? "border-[#B91C1C]/30 bg-[#B91C1C]/5"
                                : isEnabled
                                ? "border-[#009A44]/40 bg-[#009A44]/5"
                                : "border-[#D8DFE9] bg-white"
                            }`}
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-[#0C233C]">
                                  {company.name}
                                </span>
                                <span className="font-mono text-[10px] text-[#4B5563]">
                                  ({company.code})
                                </span>
                                {company.status === "suspended" && (
                                  <span className="rounded-xs bg-[#B91C1C]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#B91C1C] uppercase">
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#4B5563]">
                                {company.contactEmail}
                              </p>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              aria-label={`Toggle ${platform.title} for ${company.name}`}
                              disabled={isToggling}
                              onClick={() =>
                                void handleToggleEntitlement(
                                  company.id,
                                  platform.id,
                                  !isEnabled
                                ).catch(() => {})
                              }
                              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 ${
                                isEnabled
                                  ? "bg-[#009A44] text-white shadow-xs hover:bg-[#007A34]"
                                  : "border border-[#D8DFE9] bg-white text-[#4B5563] hover:border-[#00338D] hover:text-[#00338D]"
                              }`}
                            >
                              {isEnabled ? (
                                <>
                                  <ToggleRight size={17} weight="fill" />
                                  <span>ON</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft size={17} weight="regular" />
                                  <span>OFF</span>
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
            );
          })}
        </div>
      )}

      {/* Modals & Drawers */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onCompanySaved={handleCompanyCreated}
      />

      <CompanyDetailDrawer
        isOpen={Boolean(selectedCompany)}
        onClose={handleCloseDrawer}
        company={selectedCompany}
        entitlements={selectedCompanyEntitlements}
        personas={selectedCompanyPersonas}
        availableProducts={availableProducts}
        onToggleEntitlement={handleDrawerToggleEntitlement}
        onPersonaSaved={handlePersonaSaved}
        onPersonaDeleted={handlePersonaDeleted}
        onCompanyUpdated={handleCompanyUpdated}
        onCompanyDeleted={handleCompanyDeleted}
      />
    </div>
  );
}
