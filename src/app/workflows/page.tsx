"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Buildings,
  CheckCircle,
  Cpu,
  Database,
  LockKey,
  ShieldCheck,
  Sparkle,
  PlusCircle,
  ChartLineUp,
  SquaresFour,
  Prohibit,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { CONNECTED_PLATFORMS, type ConnectedPlatform } from "@/data/platforms";
import { AmbientLedgerGridCanvas } from "@/components/three/AmbientLedgerGridCanvas";
import { AddProductModal } from "@/components/workflows/AddProductModal";
import { AuditConsole } from "@/components/workflows/AuditConsole";
import { ClientAccessConsole } from "@/components/governance/ClientAccessConsole";
import { PreviewBanner } from "@/components/governance/PreviewBanner";
import { RegisteredProduct, TelemetryEvent, TelemetryMetrics } from "@/lib/telemetry/types";

function WorkflowsSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-28 pb-20 sm:px-6 lg:px-8">
      <div className="h-28 w-full animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]" />
      <div className="mt-8 grid grid-cols-1 gap-6">
        <div className="h-96 animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]" />
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { user, isLoading, openLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<"catalog" | "audit" | "governance">("catalog");
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
  const effectiveActiveTab: "catalog" | "audit" | "governance" =
    (isClientUser && activeTab === "governance") ||
    (isClientUser && !canViewAudit && activeTab === "audit")
      ? "catalog"
      : activeTab;

  // Fetch dynamic registered products
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
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
  };

  const fetchTelemetrySummary = async () => {
    try {
      const res = await fetch("/api/telemetry?limit=1", {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setTelemetrySummary({
          total: data.total || 0,
          latestEvent: data.events?.[0],
          metrics: data.metrics || null,
        });
      }
    } catch (err) {
      console.error("[Catalog] Error fetching telemetry summary:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function initHubData() {
      try {
        const [prodRes, telRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/telemetry?limit=1", {
            cache: "no-store",
            headers: { Pragma: "no-cache" },
          }),
        ]);
        if (!cancelled && prodRes.ok) {
          const data = await prodRes.json();
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
        if (!cancelled && telRes.ok) {
          const data = await telRes.json();
          setTelemetrySummary({
            total: data.total || 0,
            latestEvent: data.events?.[0],
            metrics: data.metrics || null,
          });
        }
      } catch (err) {
        console.error("[Catalog] Error loading initial data:", err);
      }
    }

    void initHubData();
    const interval = setInterval(() => {
      void fetchTelemetrySummary();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleProductCreated = () => {
    fetchProducts();
    fetchTelemetrySummary();
  };

  // Filter products according to client company entitlements and persona scope
  const visibleProducts = useMemo(() => {
    if (isKpmgAdmin) {
      return products;
    }
    const allowedIds = user?.allowedProductIds || [];
    return products.filter((p) => allowedIds.includes(p.id));
  }, [isKpmgAdmin, products, user?.allowedProductIds]);

  if (isLoading) {
    return <WorkflowsSkeleton />;
  }

  if (!user) {
    return (
      <section className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFC] px-4 pt-24 pb-16">
        <div className="w-full max-w-lg rounded-sm border border-[#D8DFE9] bg-white p-8 shadow-lg sm:p-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] text-[#00338D]">
            <LockKey size={20} weight="light" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#0C233C]">
            Protected Advisory Workspace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#4B5563]">
            Authenticate with your designated KPMG Lead or Client Persona credentials to access the
            CFO Advisory Connected Platforms and enterprise execution suites.
          </p>
          <button
            type="button"
            onClick={openLogin}
            className="mt-7 inline-flex items-center gap-2 rounded-sm bg-[#00338D] px-5 py-2.5 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
          >
            <span>Sign in to Workflows</span>
            <ArrowRight size={16} weight="light" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[100dvh] bg-[#F8FAFC] px-4 pt-28 pb-20 sm:px-6 lg:px-8">
      <AmbientLedgerGridCanvas />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        {/* KPMG Instant Preview Banner */}
        <PreviewBanner />

        {/* Executive Header Banner */}
        <div className="flex flex-col justify-between gap-6 rounded-sm border border-[#D8DFE9] bg-white/95 p-6 shadow-sm backdrop-blur-xl sm:p-8 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#009A44]/30 bg-[#009A44]/10 px-2.5 py-1 font-mono text-xs font-medium text-[#009A44]">
                <span className="h-2 w-2 rounded-full bg-[#009A44] animate-pulse" aria-hidden="true" />
                SYSTEM ONLINE · {telemetrySummary && telemetrySummary.total > 0 ? `${telemetrySummary.total} AUDIT RUN${telemetrySummary.total > 1 ? "S" : ""} CAPTURED` : "100% OPERATIONAL"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 px-2.5 py-1 font-mono text-xs font-medium text-[#00338D]">
                <ShieldCheck size={14} weight="bold" />
                {user.badge}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0C233C] sm:text-3xl">
              {isClientUser && user.companyName
                ? `${user.companyName}: Connected Platforms Hub`
                : "CFO Advisory: Connected Platforms Hub"}
            </h1>
            <p className="mt-1.5 text-sm text-[#4B5563]">
              Active session for{" "}
              <span className="font-semibold text-[#0C233C]">{user.name}</span> · {user.role}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isKpmgAdmin && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1E49E2]"
              >
                <PlusCircle size={16} weight="bold" />
                <span>Add Product</span>
              </button>
            )}

            <div className="rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-4 py-2 text-right">
              <p className="font-mono text-xs font-semibold text-[#00338D]">
                {visibleProducts.length} Entitled Platform{visibleProducts.length !== 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-[#4B5563]">
                {isKpmgAdmin ? "Full KPMG Admin Scope" : "Role-Scoped Access"}
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs: Catalog vs Audit vs Client Governance */}
        <div className="mt-8 flex items-center justify-between border-b border-[#D8DFE9] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-all ${
                effectiveActiveTab === "catalog"
                  ? "bg-[#00338D] text-white shadow-xs"
                  : "border border-[#D8DFE9] bg-white text-[#4B5563] hover:bg-[#F4F6FA]"
              }`}
            >
              <SquaresFour size={16} weight={effectiveActiveTab === "catalog" ? "bold" : "regular"} />
              <span>Solution Catalog ({visibleProducts.length})</span>
            </button>

            {canViewAudit && (
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-all ${
                  effectiveActiveTab === "audit"
                    ? "bg-[#00338D] text-white shadow-xs"
                    : "border border-[#D8DFE9] bg-white text-[#4B5563] hover:bg-[#F4F6FA]"
                }`}
              >
                <ChartLineUp size={16} weight={effectiveActiveTab === "audit" ? "bold" : "regular"} />
                <span>Live Audit & Telemetry</span>
                {telemetrySummary && telemetrySummary.total > 0 && (
                  <span className="rounded-full bg-[#009A44] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white leading-none">
                    {telemetrySummary.total}
                  </span>
                )}
                <span className="h-1.5 w-1.5 rounded-full bg-[#009A44] animate-pulse" />
              </button>
            )}

            {isKpmgAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("governance")}
                className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-all ${
                  effectiveActiveTab === "governance"
                    ? "bg-[#00338D] text-white shadow-xs"
                    : "border border-[#D8DFE9] bg-white text-[#4B5563] hover:bg-[#F4F6FA]"
                }`}
              >
                <Buildings size={16} weight={effectiveActiveTab === "governance" ? "bold" : "regular"} />
                <span>Client & Access Governance</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Solution Catalog View */}
        {effectiveActiveTab === "catalog" && (
          <div className="mt-6 grid grid-cols-1 gap-6">
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
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#009A44] animate-pulse" />
                        <span className="font-mono text-xs font-semibold text-[#009A44] uppercase tracking-wider">
                          Platform Live · Port {platform.portFrontend}
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
                            {canLaunchProducts ? "One-Click Access" : "Launch Restricted"}
                          </p>
                          <p className="text-xs text-[#4B5563]">
                            {canLaunchProducts
                              ? "Launches the live platform directly in a new browser tab with session handoff."
                              : "Your current persona does not have execution privileges to launch this platform."}
                          </p>
                        </div>

                        {canLaunchProducts ? (
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
                            <span>Launch Disabled by Role</span>
                          </button>
                        )}

                        {platform.portBackend && canLaunchProducts && (
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
        )}

        {/* Tab 2: Live Audit & Observability Console View */}
        {effectiveActiveTab === "audit" && canViewAudit && (
          <div className="mt-6">
            <AuditConsole />
          </div>
        )}

        {/* Tab 3: Client & Access Governance (KPMG Lead Exclusive) */}
        {effectiveActiveTab === "governance" && isKpmgAdmin && (
          <ClientAccessConsole availableProducts={products} />
        )}
      </div>

      {/* Add Product Modal (KPMG Lead Exclusive) */}
      {isKpmgAdmin && (
        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onProductCreated={handleProductCreated}
        />
      )}
    </section>
  );
}
