"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Buildings,
  Cpu,
  GridFour,
  List,
  PlusCircle,
  SlidersHorizontal,
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
import { ProductAccessDrawer } from "./ProductAccessDrawer";
import { CompanyTableView } from "./CompanyTableView";
import { ProductGovernanceTableView } from "./ProductGovernanceTableView";
import { UnifiedHubCard } from "@/components/workflows/UnifiedHubCard";
import { useWorkflowsNav } from "@/context/WorkflowsNavContext";
import {
  UnifiedWorkflowsBar,
  FilterCategoryGroup,
} from "@/components/workflows/UnifiedWorkflowsBar";

interface ClientAccessConsoleProps {
  availableProducts: ConnectedPlatform[];
}

export function ClientAccessConsole({
  availableProducts,
}: ClientAccessConsoleProps) {
  const { viewMode, setViewMode } = useWorkflowsNav();
  const [governanceScope, setGovernanceScope] = useState<"by-company" | "by-product">(
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
  const [productAccessFilter, setProductAccessFilter] = useState("all");
  const [governanceSort, setGovernanceSort] = useState<"name-asc" | "name-desc">("name-asc");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
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

  const handleOpenCompanyDrawer = useCallback((companyId: string) => {
    setSelectedCompanyId(companyId);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("companyId", companyId);
        window.history.replaceState(null, "", url.toString());
        window.dispatchEvent(new Event("kpmg-nav-change"));
      } catch {
        // Non-fatal
      }
    }
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedCompanyId(null);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("companyId");
        window.history.replaceState(null, "", url.toString());
        window.dispatchEvent(new Event("kpmg-nav-change"));
      } catch {
        // Non-fatal
      }
    }
  }, []);

  // Deep-link & state restoration: sync selectedCompanyId from URL search params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlCompanyId = params.get("companyId");
        if (urlCompanyId) {
          setSelectedCompanyId(urlCompanyId);
        } else {
          setSelectedCompanyId(null);
        }
      } catch {
        // Non-fatal
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("kpmg-nav-change", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("kpmg-nav-change", syncFromUrl);
    };
  }, []);

  // Validate selectedCompanyId against loaded companies
  useEffect(() => {
    if (!isLoading && selectedCompanyId && governanceData.companies.length > 0) {
      const exists = governanceData.companies.some((c) => c.id === selectedCompanyId);
      if (!exists) {
        setTimeout(() => {
          setSelectedCompanyId(null);
        }, 0);
        if (typeof window !== "undefined") {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("companyId");
            window.history.replaceState(null, "", url.toString());
            window.dispatchEvent(new Event("kpmg-nav-change"));
          } catch {
            // Non-fatal
          }
        }
      }
    }
  }, [isLoading, selectedCompanyId, governanceData.companies]);

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
  }, []);

  const handleCompanyUpdated = useCallback((company: CompanyProfile) => {
    setGovernanceData((prev) => ({
      ...prev,
      companies: prev.companies.map((c) => (c.id === company.id ? company : c)),
    }));
  }, []);

  const handleCompanyDeleted = useCallback((companyId: string) => {
    setGovernanceData((prev) => ({
      ...prev,
      companies: prev.companies.filter((c) => c.id !== companyId),
      entitlements: prev.entitlements.filter((e) => e.companyId !== companyId),
      personas: prev.personas.filter((p) => p.companyId !== companyId),
    }));
    setSelectedCompanyId(null);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("companyId");
        window.history.replaceState(null, "", url.toString());
        window.dispatchEvent(new Event("kpmg-nav-change"));
      } catch {
        // Non-fatal
      }
    }
  }, []);

  const handlePersonaSaved = useCallback((persona: CompanyPersona) => {
    setGovernanceData((prev) => {
      const exists = prev.personas.some((p) => p.id === persona.id);
      return {
        ...prev,
        personas: exists
          ? prev.personas.map((p) => (p.id === persona.id ? persona : p))
          : [...prev.personas, persona],
      };
    });
  }, []);

  const handlePersonaDeleted = useCallback((personaId: string) => {
    setGovernanceData((prev) => ({
      ...prev,
      personas: prev.personas.filter((p) => p.id !== personaId),
    }));
  }, []);

  // Filtered companies based on search, filter and sort
  const filteredCompanies = useMemo(() => {
    return governanceData.companies
      .filter((company) => {
        if (governanceFilter !== "all" && company.status !== governanceFilter) {
          return false;
        }
        if (productAccessFilter !== "all") {
          const hasEntitlement = governanceData.entitlements.some(
            (e) =>
              e.companyId === company.id &&
              e.productId === productAccessFilter &&
              e.enabled
          );
          if (!hasEntitlement) return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          company.name.toLowerCase().includes(q) ||
          company.code.toLowerCase().includes(q) ||
          company.contactEmail.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (governanceSort === "name-asc") {
          return a.name.localeCompare(b.name);
        }
        return b.name.localeCompare(a.name);
      });
  }, [
    governanceData.companies,
    governanceData.entitlements,
    governanceFilter,
    productAccessFilter,
    governanceSort,
    searchQuery,
  ]);

  const filteredProducts = useMemo(() => {
    return availableProducts.filter((p) => {
      if (productAccessFilter !== "all" && p.id !== productAccessFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description ? p.description.toLowerCase().includes(q) : false) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [availableProducts, productAccessFilter, searchQuery]);

  const governanceFilterGroups = useMemo<FilterCategoryGroup[]>(() => {
    return [
      {
        id: "status",
        label: "Status",
        options: [
          { id: "all", label: "All Organizations" },
          { id: "active", label: "Active Clients Only" },
          { id: "suspended", label: "Suspended" },
        ],
        activeValue: governanceFilter,
        onChange: (id) => setGovernanceFilter(id as "all" | "active" | "suspended"),
        defaultId: "all",
      },
      {
        id: "product-access",
        label: "Product Access",
        icon: <Cpu size={13} weight="bold" />,
        options: [
          { id: "all", label: "All Products" },
          ...availableProducts.map((p) => ({ id: p.id, label: p.title })),
        ],
        activeValue: productAccessFilter,
        onChange: setProductAccessFilter,
        defaultId: "all",
        searchable: true,
      },
    ];
  }, [governanceFilter, productAccessFilter, availableProducts]);

  const selectedCompany = useMemo(
    () =>
      governanceData.companies.find((c) => c.id === selectedCompanyId) || null,
    [governanceData.companies, selectedCompanyId]
  );

  const selectedProductForDrawer = useMemo(
    () => availableProducts.find((p) => p.id === selectedProductId) || null,
    [availableProducts, selectedProductId]
  );

  const selectedCompanyEntitlements = useMemo(
    () =>
      governanceData.entitlements.filter(
        (e) => e.companyId === selectedCompanyId
      ),
    [governanceData.entitlements, selectedCompanyId]
  );

  const selectedCompanyPersonas = useMemo(
    () =>
      governanceData.personas.filter((p) => p.companyId === selectedCompanyId),
    [governanceData.personas, selectedCompanyId]
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
        filterGroups={governanceFilterGroups}
        filterLabel="Filter"
        sortOptions={[
          { id: "name-asc", label: "Company Name (A → Z)" },
          { id: "name-desc", label: "Company Name (Z → A)" },
        ]}
        activeSort={governanceSort}
        onSortChange={(id) => setGovernanceSort(id as "name-asc" | "name-desc")}
        sortLabel="Sort"
        countLabel={
          governanceScope === "by-company"
            ? `${filteredCompanies.length} ${filteredCompanies.length === 1 ? "organization" : "organizations"}`
            : `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`
        }
      >
        {/* View Switcher: Grid vs Table */}
        <div className="flex h-[30px] items-center rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-0.5 box-border">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Grid view"
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            className={`flex h-[24px] w-[26px] items-center justify-center rounded-xs transition-colors duration-100 ${
              viewMode === "grid"
                ? "bg-white text-[#0C233C] shadow-xs font-bold"
                : "text-[#526075] hover:text-[#0C233C]"
            }`}
          >
            <GridFour size={15} weight={viewMode === "grid" ? "bold" : "regular"} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            title="Table view"
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
            className={`flex h-[24px] w-[26px] items-center justify-center rounded-xs transition-colors duration-100 ${
              viewMode === "table"
                ? "bg-white text-[#0C233C] shadow-xs font-bold"
                : "text-[#526075] hover:text-[#0C233C]"
            }`}
          >
            <List size={15} weight={viewMode === "table" ? "bold" : "regular"} />
          </button>
        </div>

        {/* Subview Scope Switcher: Companies vs Products */}
        <div
          role="tablist"
          aria-label="Governance scope"
          className="inline-flex h-[30px] items-center rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-0.5 text-xs box-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={governanceScope === "by-company"}
            onClick={() => setGovernanceScope("by-company")}
            className={`inline-flex h-[24px] items-center gap-1.5 rounded-xs px-2.5 py-0 text-xs font-semibold transition-all box-border ${
              governanceScope === "by-company"
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
            aria-selected={governanceScope === "by-product"}
            onClick={() => setGovernanceScope("by-product")}
            className={`inline-flex h-[24px] items-center gap-1.5 rounded-xs px-2.5 py-0 text-xs font-semibold transition-all box-border ${
              governanceScope === "by-product"
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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      >
        {isLoading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((k) => (
            <div
              key={k}
              className="h-44 animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]"
            />
          ))}
        </div>
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
      ) : governanceScope === "by-company" ? (
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
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCompanies.map((company) => {
              const isOperational = company.status === "active";
              const registeredProductIds = new Set(availableProducts.map((p) => p.id));
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
                <UnifiedHubCard
                  key={company.id}
                  dataCardId={company.id}
                  icon={<Buildings size={19} weight="bold" />}
                  badge={
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 font-mono text-[11px] font-semibold transition-all duration-200 ${
                        isOperational
                          ? "bg-[#009A44]/10 text-[#009A44]"
                          : "bg-red-500/10 text-red-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isOperational ? "bg-[#009A44] animate-pulse" : "bg-red-600"
                        }`}
                      />
                      {isOperational ? "Active" : "Suspended"}
                    </span>
                  }
                  title={company.name}
                  subtitle={company.code}
                  onTitleClick={() => handleOpenCompanyDrawer(company.id)}
                  onClick={() => handleOpenCompanyDrawer(company.id)}
                  meta={
                    <div className="flex items-center gap-2 font-mono text-[11px] text-[#526075]">
                      <span title="Active Entitlements">
                        {enabledCount} / {availableProducts.length} Active
                      </span>
                      <span className="text-[#D8DFE9]">•</span>
                      <span title="Configured Personas">
                        {personaCount} {personaCount === 1 ? "Persona" : "Personas"}
                      </span>
                    </div>
                  }
                  actions={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCompanyDrawer(company.id);
                      }}
                      title={`Manage access and personas for ${company.name}`}
                      aria-label={`Manage access for ${company.name}`}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded-sm bg-[#00338D] text-white shadow-xs transition-all duration-150 hover:bg-[#1E49E2] hover:scale-110 hover:shadow-md active:scale-[0.92]"
                    >
                      <SlidersHorizontal size={16} weight="bold" />
                    </button>
                  }
                />
              );
            })}
          </div>
        ) : (
          <CompanyTableView
            companies={filteredCompanies}
            entitlements={governanceData.entitlements}
            personas={governanceData.personas}
            availableProducts={availableProducts}
            onManage={(id) => handleOpenCompanyDrawer(id)}
          />
        )
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-sm border border-dashed border-[#D8DFE9] bg-white px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-[#0C233C]">
            No products match the selected criteria
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setProductAccessFilter("all");
            }}
            className="mt-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3.5 py-1.5 text-xs font-semibold text-[#00338D] hover:bg-[#F4F6FA]"
          >
            Reset Product Filter & Search
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* VIEW 2: BY PRODUCT (Unified 4-Card Grid) */
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((platform) => {
            const entitledCompaniesCount = governanceData.entitlements.filter(
              (e) =>
                e.productId === platform.id &&
                e.enabled &&
                activeCompanyIds.has(e.companyId)
            ).length;

            return (
              <UnifiedHubCard
                key={platform.id}
                dataCardId={platform.id}
                icon={<Cpu size={19} weight="bold" />}
                badge={
                  <span className="inline-flex items-center gap-1.5 rounded-xs px-2 py-0.5 font-mono text-[11px] font-semibold bg-[#009A44]/10 text-[#009A44]">
                    <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" />
                    Operational
                  </span>
                }
                title={platform.title}
                subtitle={platform.id}
                onTitleClick={() => setSelectedProductId(platform.id)}
                onClick={() => setSelectedProductId(platform.id)}
                meta={
                  <span className="font-mono text-[11px] text-[#526075]" title="Entitled Organizations">
                    {entitledCompaniesCount} of {activeCompanyIds.size} Active
                  </span>
                }
                actions={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductId(platform.id);
                    }}
                    title={`Manage client entitlements for ${platform.title}`}
                    aria-label={`Manage client entitlements for ${platform.title}`}
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-sm bg-[#00338D] text-white shadow-xs transition-all duration-150 hover:bg-[#1E49E2] hover:scale-110 hover:shadow-md active:scale-[0.92]"
                  >
                    <SlidersHorizontal size={16} weight="bold" />
                  </button>
                }
              />
            );
          })}
        </div>
      ) : (
        /* VIEW 2: BY PRODUCT (Standardized Table View) */
        <ProductGovernanceTableView
          products={filteredProducts}
          companies={governanceData.companies}
          entitlements={governanceData.entitlements}
          onManage={(id) => setSelectedProductId(id)}
        />
      )}
      </motion.div>

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

      <ProductAccessDrawer
        isOpen={Boolean(selectedProductForDrawer)}
        onClose={() => setSelectedProductId(null)}
        platform={selectedProductForDrawer}
        companies={governanceData.companies}
        entitlements={governanceData.entitlements}
        togglingKeys={togglingKeys}
        onToggleEntitlement={handleToggleEntitlement}
      />
    </div>
  );
}
