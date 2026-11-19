"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { useWorkflowsNav, type WorkflowsTabId } from "@/context/WorkflowsNavContext";
import { KpmgLogo } from "@/components/brand/KpmgLogo";
import { AccountMenu } from "@/components/layout/AccountMenu";

const NAV_LINKS = [
  { label: "Horizon", href: "/#chapter-horizon" },
  { label: "₹ INR", href: "/#chapter-inr" },
  { label: "$ USD", href: "/#chapter-usd" },
  { label: "€ / £ Ledger", href: "/#chapter-eur" },
  { label: "Gateway", href: "/#chapter-gateway" },
];

interface WorkflowsNavItem {
  id: WorkflowsTabId;
  label: string;
}

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, openLogin } = useAuth();
  const { activeTab, setActiveTab } = useWorkflowsNav();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLandingRoute = pathname === "/";
  const isWorkflowsRoute = pathname.startsWith("/workflows");
  const isAuthedWorkflows = isWorkflowsRoute && Boolean(user);
  const showLandingLinks = isLandingRoute || (!user && !isLoading);

  const isKpmgAdmin = Boolean(user && (!user.tenantType || user.tenantType === "kpmg"));
  const canViewAudit = isKpmgAdmin || Boolean(user?.permissions?.canViewAudit);

  const workflowsTabs: WorkflowsNavItem[] = [
    {
      id: "catalog",
      label: "Catalog",
    },
    ...(canViewAudit
      ? [
          {
            id: "audit" as WorkflowsTabId,
            label: "Audit",
          },
        ]
      : []),
    {
      id: "dashboards",
      label: "Dashboards",
    },
    ...(isKpmgAdmin
      ? [
          {
            id: "governance" as WorkflowsTabId,
            label: "Governance",
          },
        ]
      : []),
  ];

  const handleSignInClick = () => {
    setMobileOpen(false);
    if (isWorkflowsRoute && !user) {
      const inlineInput =
        document.getElementById("auth-email") ||
        document.getElementById("auth-passcode");
      if (inlineInput instanceof HTMLInputElement) {
        inlineInput.focus();
        return;
      }
    }
    openLogin();
  };

  return (
    <header className="frosted-header fixed top-0 left-0 right-0 z-40 h-[76px] border-b border-[#D8DFE9] bg-white/95 backdrop-blur-[8px]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 xl:px-[85px]">
        {/* Left Group: Logo (x=85px) + Navigation (x=215px, gap=48px from logo) */}
        <div className="flex h-full items-center gap-[48px]">
          <Link
            href="/"
            aria-label="KPMG CFO Advisory Home"
            className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            onClick={() => setMobileOpen(false)}
          >
            <KpmgLogo className="h-[32px] w-[82px] shrink-0" />
          </Link>

          {/* Workspace Tabs (on /workflows when authenticated): Pure words, exact KPMG typography & spacing */}
          {isAuthedWorkflows && (
            <nav
              aria-label="Workflows Hub Navigation"
              role="tablist"
              className="hidden h-full items-center gap-[32px] lg:flex"
            >
              {workflowsTabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex h-[76px] items-center text-[16px] leading-[18px] tracking-[0.44px] whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                      isActive
                        ? "font-semibold text-[#00338D]"
                        : "font-normal text-[#0C233C] hover:text-[#00338D]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeWorkflowsTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00338D]"
                        aria-hidden="true"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 38,
                          mass: 0.6,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Landing Chapter Links (on / or unauthenticated): Seamless identical starting position and font */}
          {showLandingLinks && !isAuthedWorkflows && (
            <nav
              aria-label="Primary Navigation"
              className="hidden h-full items-center gap-[32px] lg:flex"
            >
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-[76px] items-center whitespace-nowrap text-[16px] font-normal leading-[18px] tracking-[0.44px] text-[#0C233C] transition-colors duration-150 hover:text-[#00338D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right Utility: Account Menu & Mobile Toggle (aligned to right edge 85px) */}
        <div className="flex items-center gap-3">
          {user ? (
            <AccountMenu placement="navbar" />
          ) : (
            <button
              type="button"
              onClick={handleSignInClick}
              className="hidden rounded-sm bg-[#00338D] px-4 py-2 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Sign in to Workflows
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="inline-flex items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-2 text-[#0C233C] transition-[border-color,transform] duration-150 hover:border-[#00338D] active:scale-[0.98] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
          >
            {mobileOpen ? <X size={20} weight="light" /> : <List size={20} weight="light" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-[#D8DFE9] bg-white px-4 py-5 shadow-lg lg:hidden">
          {isAuthedWorkflows && (
            <nav
              aria-label="Mobile Workflows Navigation"
              role="tablist"
              className="flex flex-col gap-1 pb-2"
            >
              {workflowsTabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center rounded-sm px-3 py-2.5 text-base font-normal transition-colors duration-150 ${
                      isActive
                        ? "bg-[#00338D]/10 font-semibold text-[#00338D]"
                        : "text-[#0C233C] hover:bg-[#F4F6FA] hover:text-[#00338D]"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {showLandingLinks && !isAuthedWorkflows && (
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-sm px-2 py-1.5 text-base font-normal text-[#0C233C] transition-colors duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {!user && (
            <div
              className={`flex flex-col gap-2.5 ${
                showLandingLinks ? "mt-4 border-t border-[#D8DFE9] pt-4" : ""
              }`}
            >
              <button
                type="button"
                onClick={handleSignInClick}
                className="w-full rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98]"
              >
                Sign in to Workflows
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
