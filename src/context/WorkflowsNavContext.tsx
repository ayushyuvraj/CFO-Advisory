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

export interface TabBadges {
  catalogCount?: number;
  auditTotal?: number;
  dashboardCount?: number | null;
}

interface WorkflowsNavContextValue {
  activeTab: WorkflowsTabId;
  setActiveTab: (tab: WorkflowsTabId) => void;
  badges: TabBadges;
  setBadges: React.Dispatch<React.SetStateAction<TabBadges>>;
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

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (pathname.startsWith("/workflows")) {
        const fromUrl = parseTabFromUrl();
        setActiveTabState(fromUrl || "catalog");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname]);

  const setActiveTab = useCallback(
    (tab: WorkflowsTabId) => {
      setActiveTabState(tab);
      if (typeof window !== "undefined" && pathname.startsWith("/workflows")) {
        try {
          const currentUrl = new URL(window.location.href);
          if (tab === "catalog") {
            currentUrl.searchParams.delete("tab");
          } else {
            currentUrl.searchParams.set("tab", tab);
          }
          window.history.replaceState(null, "", currentUrl.toString());
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
