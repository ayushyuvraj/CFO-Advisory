"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { LockKey } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { SignInCard } from "@/components/auth/SignInCard";
import { CONNECTED_PLATFORMS, type ConnectedPlatform } from "@/data/platforms";
import { AmbientLedgerGridCanvas } from "@/components/three/AmbientLedgerGridCanvas";
import { AddProductModal } from "@/components/workflows/AddProductModal";
import { AuditConsole } from "@/components/workflows/AuditConsole";
import {
  useWorkflowsNav,
  type WorkflowsTabId,
} from "@/context/WorkflowsNavContext";
import { ClientAccessConsole } from "@/components/governance/ClientAccessConsole";
import { PreviewBanner } from "@/components/governance/PreviewBanner";
import { DashboardsConsole } from "@/components/dashboards/DashboardsConsole";
import { RegisteredProduct, TelemetryEvent, TelemetryMetrics } from "@/lib/telemetry/types";
import {
  CatalogControlBar,
  StatusFilterOption,
  SortOption,
} from "@/components/workflows/catalog/CatalogControlBar";
import {
  CompactProductCard,
  ProductHealthProbe,
} from "@/components/workflows/catalog/CompactProductCard";
import { ProductTableView } from "@/components/workflows/catalog/ProductTableView";
import { ProductDetailsDrawer } from "@/components/workflows/catalog/ProductDetailsDrawer";

function WorkflowsSkeleton() {
  return (
    <div className="pt-[76px] pb-20">
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]" />
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const {
    user,
    isLoading,
    isPreviewMode,
    sessionNotice,
    clearSessionNotice,
  } = useAuth();
  const { activeTab, setActiveTab, setBadges } = useWorkflowsNav();
  const [dashboardCount, setDashboardCount] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState<ConnectedPlatform[]>(CONNECTED_PLATFORMS);
  const [telemetrySummary, setTelemetrySummary] = useState<{
    total: number;
    latestEvent?: TelemetryEvent;
    metrics?: TelemetryMetrics;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [inspectedProduct, setInspectedProduct] = useState<ConnectedPlatform | null>(null);
  const [probes, setProbes] = useState<Record<string, ProductHealthProbe>>({});

  const isKpmgAdmin = Boolean(user && (!user.tenantType || user.tenantType === "kpmg"));
  const isClientUser = Boolean(user && user.tenantType === "client");
  const canViewAudit = isKpmgAdmin || Boolean(user?.permissions?.canViewAudit);
  const canLaunchProducts = isKpmgAdmin || Boolean(user?.permissions?.canLaunchProducts);

  // Derive effective tab cleanly based on current role permissions
  const effectiveActiveTab: WorkflowsTabId =
    (isClientUser && activeTab === "governance") ||
      (isClientUser && !canViewAudit && activeTab === "audit")
      ? "catalog"
      : activeTab;

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          const mapped: ConnectedPlatform[] = data.products.map((p: RegisteredProduct) => ({
            id: p.id,
            title: p.name,
            shortName: p.shortName,
            category: p.pillar,
            description: p.description,
            launchUrl: p.launchUrl,
            portFrontend: p.portFrontend || 5173,
            portBackend: p.portBackend,
            status: p.status === "active" ? "active" : "maintenance",
            tags: p.tags,
            features: p.features,
            systemIntegration: p.systemIntegration,
          }));
          setProducts(mapped);
        }
      }
    } catch (err) {
      console.error("[Catalog] Error fetching products:", err);
    }
  }, []);

  const fetchProbes = useCallback(async () => {
    try {
      const res = await fetch("/api/products/probe", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.probes) {
          setProbes(data.probes);
        }
      }
    } catch (err) {
      console.error("[Catalog] Error probing health:", err);
    }
  }, []);

  const fetchTelemetrySummary = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/telemetry?limit=1", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const nextTotal = data.total || 0;
        const nextLatest = data.events?.[0] as TelemetryEvent | undefined;
        const nextMetrics = (data.metrics || null) as TelemetryMetrics | undefined;

        // Bail out when unchanged so polling never triggers useless full-page re-renders
        setTelemetrySummary((prev) => {
          if (
            prev &&
            prev.total === nextTotal &&
            prev.latestEvent?.id === nextLatest?.id
          ) {
            return prev;
          }
          return {
            total: nextTotal,
            latestEvent: nextLatest,
            metrics: nextMetrics,
          };
        });
      }
    } catch (err) {
      console.error("[Catalog] Error fetching telemetry summary:", err);
    }
  }, []);

  // Load products once signed in or when perspective changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadProductsOnce() {
      try {
        const res = await fetch("/api/products", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data.products && data.products.length > 0) {
            const mapped: ConnectedPlatform[] = data.products.map((p: RegisteredProduct) => ({
              id: p.id,
              title: p.name,
              shortName: p.shortName,
              category: p.pillar,
              description: p.description,
              launchUrl: p.launchUrl,
              portFrontend: p.portFrontend || 5173,
              portBackend: p.portBackend,
              status: p.status === "active" ? "active" : "maintenance",
              tags: p.tags,
              features: p.features,
              systemIntegration: p.systemIntegration,
            }));
            setProducts(mapped);
          }
        }
      } catch (err) {
        console.error("[Catalog] Error loading products:", err);
      }
    }
    void loadProductsOnce();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Hydrate dashboard count whenever active actor or Preview Mode changes
  useEffect(() => {
    let cancelled = false;
    const resetTimer = setTimeout(() => {
      if (!cancelled) setDashboardCount(null);
    }, 0);

    if (!user) {
      return () => {
        cancelled = true;
        clearTimeout(resetTimer);
      };
    }

    async function loadDashboardCount() {
      try {
        const res = await fetch("/api/dashboards", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { dashboards?: unknown[] };
          if (Array.isArray(data.dashboards)) {
            setDashboardCount(data.dashboards.length);
          }
        }
      } catch {
        // Non-fatal badge hydration failure
      }
    }

    void loadDashboardCount();
    return () => {
      cancelled = true;
      clearTimeout(resetTimer);
    };
  }, [user, user?.id, user?.companyId, user?.personaId, isPreviewMode]);

  // Poll telemetry summary ONLY when signed in, allowed to view audit, and on the Catalog tab
  const shouldPollSummary = Boolean(
    user && canViewAudit && effectiveActiveTab === "catalog"
  );

  useEffect(() => {
    if (!user || !canViewAudit) {
      const clearTimer = setTimeout(() => setTelemetrySummary(null), 0);
      return () => clearTimeout(clearTimer);
    }
    if (!shouldPollSummary) return;
    const initialTimer = setTimeout(() => {
      void fetchTelemetrySummary();
    }, 0);
    const interval = setInterval(() => {
      void fetchTelemetrySummary();
    }, 5000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [user, canViewAudit, shouldPollSummary, fetchTelemetrySummary]);

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  // Poll live health probes every 8s when user is active
  useEffect(() => {
    if (!user) return;
    void fetchProbes();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchProbes();
    }, 8000);
    return () => clearInterval(interval);
  }, [user, fetchProbes]);

  const handleProductCreated = useCallback(() => {
    void fetchProducts();
    void fetchProbes();
    void fetchTelemetrySummary();
  }, [fetchProducts, fetchProbes, fetchTelemetrySummary]);

  // Filter products according to client company entitlements and persona scope
  const visibleProducts = useMemo(() => {
    if (isKpmgAdmin) {
      return products;
    }
    const allowedIds = user?.allowedProductIds || [];
    return products.filter((p) => allowedIds.includes(p.id));
  }, [isKpmgAdmin, products, user?.allowedProductIds]);

  // Client-side search, dynamic health status filtering, and sorting
  const filteredProducts = useMemo(() => {
    let result = visibleProducts.filter((p) => {
      // Dynamic Health & DB Status filter
      if (statusFilter !== "all") {
        const probeStatus = probes[p.id]?.status ?? (p.status === "active" ? "operational" : "maintenance");
        if (statusFilter === "active" && probeStatus !== "operational") {
          return false;
        }
        if (statusFilter === "maintenance" && probeStatus !== "maintenance") {
          return false;
        }
        if (statusFilter === "offline" && probeStatus !== "offline") {
          return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.systemIntegration.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "name-desc") {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === "status") {
        const statusA = probes[a.id]?.status ?? (a.status === "active" ? "operational" : "maintenance");
        const statusB = probes[b.id]?.status ?? (b.status === "active" ? "operational" : "maintenance");
        const order: Record<string, number> = { operational: 0, active: 0, maintenance: 1, offline: 2 };
        return (order[statusA] ?? 3) - (order[statusB] ?? 3);
      }
      return 0;
    });

    return result;
  }, [visibleProducts, statusFilter, searchQuery, sortBy, probes]);

  // Synchronize badge metrics with top navigation header
  useEffect(() => {
    setBadges({
      catalogCount: visibleProducts.length,
      auditTotal: telemetrySummary?.total,
      dashboardCount: dashboardCount,
    });
  }, [visibleProducts.length, telemetrySummary?.total, dashboardCount, setBadges]);

  // Auto-correct active tab if restricted under current persona/tenant
  useEffect(() => {
    if (effectiveActiveTab !== activeTab) {
      setActiveTab(effectiveActiveTab);
    }
  }, [effectiveActiveTab, activeTab, setActiveTab]);

  if (isLoading) {
    return <WorkflowsSkeleton />;
  }

  if (!user) {
    return (
      <section className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFC] px-4 pt-24 pb-16">
        <SignInCard
          variant="page"
          sessionNotice={sessionNotice}
          onDismissNotice={clearSessionNotice}
        />
      </section>
    );
  }

  return (
    <section className="relative min-h-[100dvh] bg-[#F8FAFC] pt-[76px] pb-20">
      <AmbientLedgerGridCanvas />

      <div className="relative z-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h1 className="sr-only">
            {isClientUser && user.companyName
              ? `${user.companyName} Workflows Hub`
              : "KPMG CFO Advisory Workflows Hub"}
          </h1>

          {/* KPMG Instant Preview Banner */}
          {isPreviewMode && (
            <div className="mt-6">
              <PreviewBanner />
            </div>
          )}

            {/* Tab 1: Solution Catalog View */}
          {effectiveActiveTab === "catalog" && (
            <div className="mt-6 space-y-4">
              {/* Scalable Catalog Control Bar */}
              <CatalogControlBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                filteredCount={filteredProducts.length}
                totalCount={visibleProducts.length}
                isKpmgAdmin={isKpmgAdmin}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {visibleProducts.length === 0 ? (
                <div className="rounded-sm border border-[#D8DFE9] bg-white px-6 py-16 text-center shadow-sm">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#F4F6FA] text-[#4B5563]">
                    <LockKey size={24} weight="bold" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#0C233C]">
                    No Platforms Currently Assigned
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-[#4B5563]">
                    {isClientUser
                      ? `Your organization (${user.companyName || "Client"}) does not currently have active access to any platforms under your persona (${user.role}). Contact your KPMG CFO Advisory Lead to enable system access.`
                      : "No physical platforms are currently registered in the catalog."}
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-sm border border-[#D8DFE9] bg-white px-6 py-12 text-center shadow-xs">
                  <p className="font-mono text-xs text-[#526075]">
                    No platforms match your filter criteria ({statusFilter !== "all" ? `Status: ${statusFilter}` : ""}{searchQuery ? `, Search: "${searchQuery}"` : ""}).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                    }}
                    className="mt-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] px-3 py-1.5 font-mono text-xs font-semibold text-[#00338D] transition-colors hover:border-[#00338D] hover:bg-white"
                  >
                    Reset Filter & Search
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((platform: ConnectedPlatform) => (
                    <CompactProductCard
                      key={platform.id}
                      platform={platform}
                      probe={probes[platform.id]}
                      canLaunchProducts={canLaunchProducts}
                      isPreviewMode={isPreviewMode}
                      onInspect={(p) => setInspectedProduct(p)}
                    />
                  ))}
                </div>
              ) : (
                <ProductTableView
                  products={filteredProducts}
                  probes={probes}
                  canLaunchProducts={canLaunchProducts}
                  isPreviewMode={isPreviewMode}
                  onInspect={(p) => setInspectedProduct(p)}
                />
              )}
              </motion.div>

              {/* Slide-over Progressive Disclosure Inspector Drawer */}
              <ProductDetailsDrawer
                platform={inspectedProduct}
                probe={inspectedProduct ? probes[inspectedProduct.id] : undefined}
                isOpen={Boolean(inspectedProduct)}
                onClose={() => setInspectedProduct(null)}
                telemetrySummary={telemetrySummary}
                canLaunchProducts={canLaunchProducts}
                isPreviewMode={isPreviewMode}
                canViewAudit={canViewAudit}
                onOpenAuditTab={() => setActiveTab("audit")}
              />
            </div>
          )}

        {/* Tab 2: Live Audit & Observability Console View */}
        {effectiveActiveTab === "audit" && canViewAudit && (
          <div className="mt-6 space-y-4">
            <AuditConsole availableProducts={visibleProducts} />
          </div>
        )}

        {/* Tab 3: Drag-and-Drop Executive Dashboards Studio & Viewer */}
        {effectiveActiveTab === "dashboards" && (
          <div className="mt-6 space-y-4">
            <DashboardsConsole onDashboardCountChange={setDashboardCount} />
          </div>
        )}

        {/* Tab 4: Client & Access Governance (KPMG Lead Exclusive) */}
        {effectiveActiveTab === "governance" && isKpmgAdmin && (
          <div className="mt-6 space-y-4">
            <ClientAccessConsole availableProducts={products} />
          </div>
        )}
        </div>
      </div>

      {/* Add Product Modal (KPMG Lead Exclusive) */}
      {isKpmgAdmin && (
        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onProductCreated={handleProductCreated}
        />
      )}
    </section>
  );
}
