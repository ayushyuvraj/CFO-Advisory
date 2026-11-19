"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Cpu,
  Database,
  Eye,
  LockKey,
  Sparkle,
  Prohibit,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { SignInCard } from "@/components/auth/SignInCard";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
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

function isSafeClientLaunchUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "https:") return true;
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isValidPort(port: unknown): port is number {
  return typeof port === "number" && Number.isInteger(port) && port >= 1 && port <= 65535;
}

function WorkflowsSkeleton() {
  return (
    <div className="pt-[72px] pb-20">
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

  const handleProductCreated = useCallback(() => {
    void fetchProducts();
    void fetchTelemetrySummary();
  }, [fetchProducts, fetchTelemetrySummary]);

  // Filter products according to client company entitlements and persona scope
  const visibleProducts = useMemo(() => {
    if (isKpmgAdmin) {
      return products;
    }
    const allowedIds = user?.allowedProductIds || [];
    return products.filter((p) => allowedIds.includes(p.id));
  }, [isKpmgAdmin, products, user?.allowedProductIds]);

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
    <section className="relative min-h-[100dvh] bg-[#F8FAFC] pt-[72px] pb-20">
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
          <div className="mt-6 space-y-5">
            {isKpmgAdmin && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-[#526075]">
                  {visibleProducts.length} connected platform
                  {visibleProducts.length !== 1 ? "s" : ""}
                </p>
                <InteractiveHoverButton
                  text="Add Product"
                  onClick={() => setIsAddModalOpen(true)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
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
            ) : (
              visibleProducts.map((platform: ConnectedPlatform) => (
                <div
                  key={platform.id}
                  className="relative overflow-hidden rounded-sm border border-[#D8DFE9] bg-white shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-[#00338D] hover:shadow-md"
                >
                  <div className="border-b border-[#D8DFE9] bg-[#F8FAFC] px-6 py-4 sm:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex h-2.5 w-2.5 rounded-full ${platform.status === "active"
                              ? "bg-[#009A44] animate-pulse"
                              : "bg-amber-500"
                            }`}
                        />
                        <span
                          className={`font-mono text-xs font-semibold uppercase tracking-wider ${platform.status === "active"
                              ? "text-[#009A44]"
                              : "text-amber-700"
                            }`}
                        >
                          {platform.status === "active"
                            ? `Platform Live · Port ${platform.portFrontend}`
                            : `Maintenance · Port ${platform.portFrontend}`}
                        </span>
                        {platform.portBackend && (
                          <span className="rounded-sm border border-[#D8DFE9] bg-white px-2 py-0.5 font-mono text-[11px] text-[#4B5563]">
                            Backend :{platform.portBackend}
                          </span>
                        )}
                      </div>
                      <span className="rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-0.5 font-mono text-xs font-medium text-[#00338D]">
                        {platform.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-[#00338D]/10 text-[#00338D]">
                            <Cpu size={24} weight="bold" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold tracking-tight text-[#0C233C] sm:text-2xl">
                              {platform.title}
                            </h3>
                            <p className="font-mono text-xs text-[#1E49E2]">
                              System Identifier: {platform.id}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm leading-relaxed text-[#333940]">
                          {platform.description}
                        </p>

                        <div className="rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-4">
                          <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#0C233C] uppercase">
                            <Sparkle size={14} weight="bold" className="text-[#00338D]" />
                            Core Platform Capabilities
                          </h4>
                          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {platform.features.map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-[#333940]">
                                <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-[#009A44]" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 text-xs text-[#4B5563]">
                          <Database size={15} weight="bold" className="text-[#00338D]" />
                          <span className="font-medium text-[#0C233C]">Integrated Systems:</span>
                          <span className="font-mono">{platform.systemIntegration}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {platform.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-2.5 py-1 font-mono text-[11px] text-[#333940]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Live Telemetry Status Bar for Connected Platform */}
                        {canViewAudit &&
                          telemetrySummary &&
                          telemetrySummary.total > 0 &&
                          telemetrySummary.latestEvent && (
                            <div className="rounded-sm border border-[#009A44]/40 bg-[#009A44]/5 p-4 transition-colors hover:border-[#009A44]">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#009A44]/20 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" />
                                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#009A44]">
                                    Live Telemetry Lineage · {telemetrySummary.total} Run{telemetrySummary.total > 1 ? "s" : ""} Recorded
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("audit")}
                                  className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#00338D] hover:underline"
                                >
                                  <span>Open Live Audit Inspector →</span>
                                </button>
                              </div>
                              <div className="mt-2.5 grid grid-cols-2 gap-3 font-mono text-[11px] sm:grid-cols-4">
                                <div>
                                  <p className="text-[#4B5563]">Last Action</p>
                                  <p className="font-semibold text-[#0C233C] truncate">{telemetrySummary.latestEvent.action_name}</p>
                                </div>
                                <div>
                                  <p className="text-[#4B5563]">Active Model</p>
                                  <p className="font-semibold text-[#1E49E2]">{telemetrySummary.latestEvent.model_name}</p>
                                </div>
                                <div>
                                  <p className="text-[#4B5563]">Total Tokens</p>
                                  <p className="font-semibold text-[#0C233C]">{telemetrySummary.latestEvent.total_tokens?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[#4B5563]">Pipeline Latency</p>
                                  <p className="font-semibold text-[#009A44]">{telemetrySummary.latestEvent.duration_ms} ms</p>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* 1-Click Launch Action Column */}
                      <div className="flex w-full shrink-0 flex-col gap-3 rounded-sm border border-[#D8DFE9] bg-[#F8FAFC] p-6 lg:w-72">
                        <div className="space-y-1">
                          <p className="font-mono text-xs font-semibold text-[#0C233C] uppercase tracking-wider">
                            {isPreviewMode
                              ? "Preview Perspective"
                              : canLaunchProducts
                                ? "One-Click Access"
                                : "Launch Restricted"}
                          </p>
                          <p className="text-xs text-[#4B5563]">
                            {isPreviewMode
                              ? canLaunchProducts
                                ? "This persona is entitled to launch this platform (disabled during read-only preview)."
                                : "This persona does not have execution privileges to launch this platform."
                              : canLaunchProducts
                                ? "Opens the live connected platform directly in a new browser tab."
                                : "Your current persona does not have execution privileges to launch this platform."}
                          </p>
                        </div>

                        {isPreviewMode ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 px-4 py-3 text-xs font-semibold text-[#00338D] cursor-not-allowed"
                          >
                            <Eye size={16} weight="bold" />
                            <span>
                              {canLaunchProducts
                                ? "Launch Enabled (Preview Mode)"
                                : "Launch Disabled by Role"}
                            </span>
                          </button>
                        ) : canLaunchProducts && isSafeClientLaunchUrl(platform.launchUrl) ? (
                          <a
                            href={platform.launchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2"
                          >
                            <span>Launch Platform</span>
                            <ArrowSquareOut size={18} weight="bold" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#D8DFE9] bg-gray-100 px-4 py-3 text-xs font-semibold text-[#6B7280] cursor-not-allowed"
                          >
                            <Prohibit size={16} weight="bold" />
                            <span>
                              {canLaunchProducts
                                ? "Invalid Launch URL"
                                : "Launch Disabled by Role"}
                            </span>
                          </button>
                        )}

                        {isValidPort(platform.portBackend) && canLaunchProducts && !isPreviewMode && (
                          <a
                            href={`http://localhost:${platform.portBackend}/docs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-xs font-medium text-[#333940] transition-[border-color,color] duration-150 hover:border-[#00338D] hover:text-[#00338D]"
                          >
                            <span>Backend API Docs</span>
                            <ArrowSquareOut size={13} weight="light" />
                          </a>
                        )}

                        <div className="border-t border-[#D8DFE9] pt-3 text-center">
                          <p className="font-mono text-[11px] text-[#4B5563]">
                            Target: {platform.launchUrl}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        )}

        {/* Tab 2: Live Audit & Observability Console View */}
        {effectiveActiveTab === "audit" && canViewAudit && (
          <div className="mt-6">
            <AuditConsole availableProducts={visibleProducts} />
          </div>
        )}

        {/* Tab 3: Drag-and-Drop Executive Dashboards Studio & Viewer */}
        {effectiveActiveTab === "dashboards" && (
          <DashboardsConsole onDashboardCountChange={setDashboardCount} />
        )}

        {/* Tab 4: Client & Access Governance (KPMG Lead Exclusive) */}
        {effectiveActiveTab === "governance" && isKpmgAdmin && (
          <ClientAccessConsole availableProducts={products} />
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
