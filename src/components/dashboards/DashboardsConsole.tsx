"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  Buildings,
  Copy,
  Eye,
  LockKey,
  PencilSimple,
  PlusCircle,
  PresentationChart,
  ShareNetwork,
  Trash,
  UploadSimple,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { CompanyProfile } from "@/lib/governance/types";
import {
  CreateDashboardInput,
  DashboardDocument,
  DashboardVisibility,
  LiveDatasetsPayload,
} from "@/lib/dashboards/types";
import { DashboardStudio } from "./DashboardStudio";
import { CreateDashboardModal } from "./modals/CreateDashboardModal";
import { ShareDashboardModal } from "./modals/ShareDashboardModal";
import { ImportDashboardModal } from "./modals/ImportDashboardModal";
import { ConfirmActionModal } from "./modals/ConfirmActionModal";
import {
  UnifiedWorkflowsBar,
  FilterOptionItem,
  SortOptionItem,
} from "@/components/workflows/UnifiedWorkflowsBar";

const EMPTY_DATASETS: LiveDatasetsPayload = {
  datasets: {
    telemetry_events: [],
    registered_products: [],
    client_companies: [],
    client_personas: [],
    product_entitlements: [],
  },
  restrictedDatasets: {},
  fetchedAt: new Date().toISOString(),
};

interface DashboardsConsoleProps {
  onDashboardCountChange?: (count: number) => void;
}

export function DashboardsConsole({
  onDashboardCountChange,
}: DashboardsConsoleProps) {
  const { user, isPreviewMode } = useAuth();
  const isKpmgAdmin = Boolean(user && (!user.tenantType || user.tenantType === "kpmg"));
  const canManage =
    !isPreviewMode &&
    (isKpmgAdmin || Boolean(user?.permissions?.canManageDashboards));
  const canExport = isKpmgAdmin || Boolean(user?.permissions?.canExportData);

  const [dashboards, setDashboards] = useState<DashboardDocument[]>([]);
  const [datasetsPayload, setDatasetsPayload] =
    useState<LiveDatasetsPayload>(EMPTY_DATASETS);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine" | "shared">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title-asc" | "title-desc" | "recent">("title-asc");

  const [openDashboardId, setOpenDashboardId] = useState<string | null>(null);
  const [openInPresent, setOpenInPresent] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sharingTarget, setSharingTarget] = useState<DashboardDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Track dataset content fingerprint so unchanged polling ticks never trigger full-canvas re-renders
  const datasetFingerprintRef = useRef<string>("");

  const fetchDashboards = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/dashboards", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to load dashboards.");
      }
      const data = await res.json();
      const list = (data.dashboards || []) as DashboardDocument[];
      setDashboards(list);
      onDashboardCountChange?.(list.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboards.");
    }
  }, [user, onDashboardCountChange]);

  const fetchDatasets = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/dashboards/datasets", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as LiveDatasetsPayload;
        const fp = JSON.stringify({
          datasets: data.datasets,
          restrictedDatasets: data.restrictedDatasets,
        });
        if (fp !== datasetFingerprintRef.current) {
          datasetFingerprintRef.current = fp;
          setDatasetsPayload(data);
        }
      }
    } catch (err) {
      console.error("[Dashboards] Error fetching live datasets:", err);
    }
  }, [user]);

  const fetchCompanies = useCallback(async () => {
    if (!isKpmgAdmin || isPreviewMode) {
      setCompanies([]);
      return;
    }
    try {
      const res = await fetch("/api/clients", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies((data.companies || []) as CompanyProfile[]);
      }
    } catch {
      // Non-blocking for gallery
    }
  }, [isKpmgAdmin, isPreviewMode]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    datasetFingerprintRef.current = "";
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchDashboards(), fetchDatasets(), fetchCompanies()]);
      if (active) setLoading(false);
    };
    void loadAll();
    return () => {
      active = false;
    };
  }, [user, isPreviewMode, fetchDashboards, fetchDatasets, fetchCompanies]);

  const canEditDoc = useCallback(
    (doc: DashboardDocument): boolean => {
      if (isPreviewMode) return false;
      if (isKpmgAdmin) return true;
      if (!user?.permissions?.canManageDashboards) return false;
      return doc.ownerType === "client" && doc.ownerCompanyId === user.companyId;
    },
    [isPreviewMode, isKpmgAdmin, user]
  );

  const activeDashboard = useMemo(
    () => dashboards.find((d) => d.id === openDashboardId) || null,
    [dashboards, openDashboardId]
  );

  const filteredDashboards = useMemo(() => {
    let result = dashboards;
    if (scopeFilter === "mine") {
      result = isKpmgAdmin
        ? dashboards.filter((d) => d.ownerType === "kpmg")
        : dashboards.filter(
            (d) => d.ownerType === "client" && d.ownerCompanyId === user?.companyId
          );
    } else if (scopeFilter === "shared") {
      result = isKpmgAdmin
        ? dashboards.filter(
            (d) =>
              d.visibility === "specific_companies" || d.visibility === "all_clients"
          )
        : dashboards.filter((d) => d.ownerType === "kpmg");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "title-asc") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "title-desc") {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === "recent") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return 0;
    });

    return result;
  }, [dashboards, scopeFilter, searchQuery, sortBy, isKpmgAdmin, user?.companyId]);

  const handleCreate = async (input: CreateDashboardInput) => {
    const res = await fetch("/api/dashboards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to create dashboard.");
    }
    const created = data.dashboard as DashboardDocument;
    setDashboards((prev) => {
      const next = [created, ...prev];
      onDashboardCountChange?.(next.length);
      return next;
    });
    setOpenInPresent(false);
    setOpenDashboardId(created.id);
  };

  const handleSaveDashboard = async (
    next: DashboardDocument
  ): Promise<DashboardDocument> => {
    const res = await fetch(`/api/dashboards/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        title: next.title,
        description: next.description,
        pages: next.pages,
        refreshIntervalSec: next.refreshIntervalSec,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to save dashboard.");
    }
    const saved = data.dashboard as DashboardDocument;
    setDashboards((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
    return saved;
  };

  const handleSaveSharing = async (
    dashboardId: string,
    visibility: DashboardVisibility,
    assignedCompanyIds: string[]
  ) => {
    const res = await fetch(`/api/dashboards/${dashboardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ visibility, assignedCompanyIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to update sharing settings.");
    }
    const saved = data.dashboard as DashboardDocument;
    setDashboards((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
  };

  const handleDuplicate = async (dashboardId: string) => {
    try {
      const res = await fetch(`/api/dashboards/${dashboardId}/duplicate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to duplicate dashboard.");
        return;
      }
      if (data.dashboard) {
        const clone = data.dashboard as DashboardDocument;
        setDashboards((prev) => {
          const next = [clone, ...prev];
          onDashboardCountChange?.(next.length);
          return next;
        });
        setError(null);
      }
    } catch {
      setError("Failed to duplicate dashboard.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboards/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete dashboard.");
      } else {
        setDashboards((prev) => {
          const next = prev.filter((d) => d.id !== deleteTarget.id);
          onDashboardCountChange?.(next.length);
          return next;
        });
        if (openDashboardId === deleteTarget.id) {
          setOpenDashboardId(null);
        }
        setError(null);
      }
    } catch {
      setError("Failed to delete dashboard.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const renderVisibilityBadge = (doc: DashboardDocument) => {
    if (doc.ownerType === "client") {
      return (
        <span className="inline-flex items-center gap-1 rounded-sm border border-[#1E49E2]/30 bg-[#1E49E2]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#00338D]">
          <Buildings size={11} weight="bold" />
          {doc.ownerCompanyName || "Company Workspace"}
        </span>
      );
    }
    if (doc.visibility === "all_clients") {
      return (
        <span className="inline-flex items-center gap-1 rounded-sm border border-[#009A44]/30 bg-[#009A44]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#009A44]">
          <UsersThree size={11} weight="bold" />
          All Active Clients
        </span>
      );
    }
    if (doc.visibility === "specific_companies") {
      return (
        <span className="inline-flex items-center gap-1 rounded-sm border border-[#009A44]/30 bg-[#009A44]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#009A44]">
          <Buildings size={11} weight="bold" />
          Published ({doc.assignedCompanyIds.length} Client
          {doc.assignedCompanyIds.length !== 1 ? "s" : ""})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#526075]">
        <LockKey size={11} weight="bold" />
        KPMG Internal
      </span>
    );
  };

  if (activeDashboard) {
    return (
      <>
        <DashboardStudio
          key={`${activeDashboard.id}:${isPreviewMode ? "preview" : "live"}:${user?.id ?? ""}`}
          dashboard={activeDashboard}
          datasetsPayload={datasetsPayload}
          canEdit={canEditDoc(activeDashboard)}
          canExport={canExport}
          isKpmgAdmin={isKpmgAdmin}
          isPreviewMode={isPreviewMode}
          initialPresent={openInPresent}
          onBackToGallery={() => {
            setOpenDashboardId(null);
            setOpenInPresent(false);
          }}
          onRefreshDatasets={fetchDatasets}
          onSaveDashboard={handleSaveDashboard}
          onOpenShare={(d) => setSharingTarget(d)}
        />
        <ShareDashboardModal
          isOpen={Boolean(sharingTarget)}
          dashboard={sharingTarget}
          companies={companies}
          onClose={() => setSharingTarget(null)}
          onSaveSharing={handleSaveSharing}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Unified Search, Filter & Sort Bar: Sits at identical Y = 112px as all Hub tabs */}
      <UnifiedWorkflowsBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search executive dashboards..."
        filterOptions={[
          { id: "all", label: "All Dashboards" },
          { id: "mine", label: isKpmgAdmin ? "KPMG Authored" : "Company Workspace" },
          { id: "shared", label: isKpmgAdmin ? "Published to Clients" : "Published by KPMG" },
        ]}
        activeFilter={scopeFilter}
        onFilterChange={(id) => setScopeFilter(id as "all" | "mine" | "shared")}
        filterLabel="Scope"
        sortOptions={[
          { id: "title-asc", label: "Title (A → Z)" },
          { id: "title-desc", label: "Title (Z → A)" },
          { id: "recent", label: "Recently Updated" },
        ]}
        activeSort={sortBy}
        onSortChange={(id) => setSortBy(id as "title-asc" | "title-desc" | "recent")}
        sortLabel="Sort"
        countLabel={`${filteredDashboards.length} ${filteredDashboards.length === 1 ? "dashboard" : "dashboards"}`}
      >
        <button
          type="button"
          onClick={() => {
            void fetchDashboards();
            void fetchDatasets();
          }}
          aria-label="Refresh dashboards list"
          className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#333940] transition-colors hover:bg-[#F8FAFC]"
        >
          <ArrowClockwise size={14} weight="bold" />
          <span>Refresh</span>
        </button>

        {canManage && (
          <>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#00338D] transition-colors hover:bg-[#F4F6FA]"
              title="Import JSON template"
            >
              <UploadSimple size={14} weight="bold" />
              <span>Import JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1E49E2]"
            >
              <PlusCircle size={15} weight="bold" />
              <span>New Dashboard</span>
            </button>
          </>
        )}
      </UnifiedWorkflowsBar>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-sm border border-[#B91C1C]/30 bg-[#B91C1C]/5 p-3.5 text-xs text-[#991B1B]"
        >
          <WarningCircle size={16} weight="bold" />
          <span>{error}</span>
        </div>
      )}

      {/* Dashboards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-44 animate-pulse rounded-sm border border-[#D8DFE9] bg-[#F4F6FA]"
            />
          ))}
        </div>
      ) : filteredDashboards.length === 0 ? (
        <div className="rounded-sm border border-[#D8DFE9] bg-white px-6 py-16 text-center shadow-2xs">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-sm bg-[#F4F6FA] text-[#00338D]">
            <PresentationChart size={26} weight="light" />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#0C233C]">
            No Dashboards Available Yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-[#526075]">
            {canManage
              ? "Click New Blank Dashboard to launch the 24-column drag-and-drop studio and build executive charts, KPI boxes, pivot matrices, and slicers over your live data."
              : "No executive dashboards have been published to your organization yet. Contact your KPMG CFO Advisory Lead."}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E49E2]"
            >
              <PlusCircle size={15} weight="bold" />
              <span>Create First Blank Dashboard</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDashboards.map((doc) => {
            const editable = canEditDoc(doc);
            const totalWidgets = doc.pages.reduce(
              (acc, p) => acc + p.widgets.length,
              0
            );
            return (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-sm border border-[#D8DFE9] bg-white p-5 shadow-2xs transition-[border-color,box-shadow] hover:border-[#00338D] hover:shadow-md"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {renderVisibilityBadge(doc)}
                    <span className="font-mono text-[10px] text-[#64748B] tabular-nums">
                      {doc.pages.length} pg · {totalWidgets} visual
                      {totalWidgets !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold tracking-tight text-[#0C233C]">
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[#526075]">
                      {doc.description}
                    </p>
                  )}

                  <p className="mt-3 font-mono text-[10px] text-[#64748B]">
                    Owner: {doc.ownerName} · Updated{" "}
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenInPresent(false);
                        setOpenDashboardId(doc.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-sm bg-[#00338D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E49E2]"
                    >
                      {editable ? (
                        <PencilSimple size={13} weight="bold" />
                      ) : (
                        <Eye size={13} weight="bold" />
                      )}
                      <span>{editable ? "Open Studio" : "Open Viewer"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenInPresent(true);
                        setOpenDashboardId(doc.id);
                      }}
                      aria-label={`Present ${doc.title}`}
                      title="Present full-screen"
                      className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#00338D] hover:border-[#00338D] hover:bg-[#F4F6FA]"
                    >
                      <PresentationChart size={14} weight="light" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {isKpmgAdmin && !isPreviewMode && doc.ownerType === "kpmg" && (
                      <button
                        type="button"
                        onClick={() => setSharingTarget(doc)}
                        aria-label={`Publish ${doc.title}`}
                        title="Publish & multi-tenant sharing"
                        className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#526075] hover:border-[#00338D] hover:text-[#00338D]"
                      >
                        <ShareNetwork size={14} weight="light" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => void handleDuplicate(doc.id)}
                        aria-label={`Duplicate ${doc.title}`}
                        title="Duplicate dashboard"
                        className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#526075] hover:border-[#00338D] hover:text-[#00338D]"
                      >
                        <Copy size={14} weight="light" />
                      </button>
                    )}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(doc)}
                        aria-label={`Delete ${doc.title}`}
                        title="Delete dashboard"
                        className="rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#526075] hover:border-[#B91C1C] hover:text-[#B91C1C]"
                      >
                        <Trash size={14} weight="light" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateDashboardModal
        isOpen={isCreateOpen}
        isKpmgAdmin={isKpmgAdmin}
        companies={companies}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreate}
      />

      <ImportDashboardModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleCreate}
      />

      <ShareDashboardModal
        isOpen={Boolean(sharingTarget)}
        dashboard={sharingTarget}
        companies={companies}
        onClose={() => setSharingTarget(null)}
        onSaveSharing={handleSaveSharing}
      />

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Executive Dashboard"
        description={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}" (${deleteTarget.pages.length} page${deleteTarget.pages.length !== 1 ? "s" : ""}, ${deleteTarget.pages.reduce((a, p) => a + p.widgets.length, 0)} visual${deleteTarget.pages.reduce((a, p) => a + p.widgets.length, 0) !== 1 ? "s" : ""})? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete Dashboard"
        tone="danger"
        busy={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
