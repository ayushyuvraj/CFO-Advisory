"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export type WorkflowsTabId = "catalog" | "audit" | "dashboards" | "governance";
export type WorkflowsViewMode = "grid" | "table";

export interface TabBadges {
  catalogCount?: number;
  auditTotal?: number;
  dashboardCount?: number | null;
}

interface WorkflowsNavContextValue {
  activeTab: WorkflowsTabId;
  setActiveTab: (tab: WorkflowsTabId, extraParams?: Record<string, string | null | undefined>) => void;
  badges: TabBadges;
  setBadges: React.Dispatch<React.SetStateAction<TabBadges>>;
  viewMode: WorkflowsViewMode;
  setViewMode: (mode: WorkflowsViewMode) => void;
}

const VALID_TABS: readonly WorkflowsTabId[] = [
  "catalog",
  "audit",
  "dashboards",
  "governance",
];

const WorkflowsNavContext = createContext<WorkflowsNavContextValue | null>(null);

function parseTabFromUrl(): WorkflowsTabId | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && VALID_TABS.includes(tabParam as WorkflowsTabId)) {
      return tabParam as WorkflowsTabId;
    }
  } catch {
    // Non-fatal URL parsing failure
  }
  return null;
}

export function WorkflowsNavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeTab, setActiveTabState] = useState<WorkflowsTabId>(() => {
    return parseTabFromUrl() || "catalog";
  });
  const [badges, setBadges] = useState<TabBadges>({});
  const [viewMode, setViewMode] = useState<WorkflowsViewMode>("grid");

  // Handle browser back/forward buttons and programmatic nav events
  useEffect(() => {
    const handlePopState = () => {
      if (pathname.startsWith("/workflows")) {
        const fromUrl = parseTabFromUrl();
        setActiveTabState(fromUrl || "catalog");
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("kpmg-nav-change", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("kpmg-nav-change", handlePopState);
    };
  }, [pathname]);

  const setActiveTab = useCallback(
    (tab: WorkflowsTabId, extraParams?: Record<string, string | null | undefined>) => {
      setActiveTabState(tab);
      if (typeof window !== "undefined" && pathname.startsWith("/workflows")) {
        try {
          const currentUrl = new URL(window.location.href);
          if (tab === "catalog") {
            currentUrl.searchParams.delete("tab");
          } else {
            currentUrl.searchParams.set("tab", tab);
          }
          if (extraParams) {
            for (const [key, val] of Object.entries(extraParams)) {
              if (val === null || val === undefined) {
                currentUrl.searchParams.delete(key);
              } else {
                currentUrl.searchParams.set(key, val);
              }
            }
          }
          window.history.replaceState(null, "", currentUrl.toString());
          window.dispatchEvent(new Event("kpmg-nav-change"));
        } catch {
          // Non-fatal history push failure
        }
      }
    },
    [pathname]
  );

  return (
    <WorkflowsNavContext.Provider
      value={{
        activeTab,
        setActiveTab,
        badges,
        setBadges,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </WorkflowsNavContext.Provider>
  );
}

export function useWorkflowsNav() {
  const ctx = useContext(WorkflowsNavContext);
  if (!ctx) {
    throw new Error(
      "useWorkflowsNav must be used within a WorkflowsNavProvider"
    );
  }
  return ctx;
}
