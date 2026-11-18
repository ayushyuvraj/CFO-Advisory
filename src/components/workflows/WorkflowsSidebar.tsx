"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Buildings,
  ChartLineUp,
  House,
  PresentationChart,
  PushPinSimple,
  SidebarSimple,
  SquaresFour,
  X,
} from "@phosphor-icons/react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { AccountMenu } from "@/components/layout/AccountMenu";

export type WorkflowsTabId = "catalog" | "audit" | "dashboards" | "governance";

interface WorkflowsSidebarProps {
  activeTab: WorkflowsTabId;
  onSelectTab: (tab: WorkflowsTabId) => void;
  productCount: number;
  canViewAudit: boolean;
  auditTotal: number;
  dashboardCount: number | null;
  isKpmgAdmin: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}

interface SidebarNavItem {
  id: WorkflowsTabId;
  label: string;
  badge?: number;
  isLive?: boolean;
}

const M3_EASE: [number, number, number, number] = [0.2, 0, 0, 1];
const DRAWER_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

function renderNavIcon(id: WorkflowsTabId, active: boolean) {
  const weight = active ? "fill" : "regular";
  switch (id) {
    case "catalog":
      return <SquaresFour size={20} weight={weight} />;
    case "audit":
      return <ChartLineUp size={20} weight={active ? "bold" : "regular"} />;
    case "dashboards":
      return <PresentationChart size={20} weight={weight} />;
    case "governance":
      return <Buildings size={20} weight={weight} />;
  }
}

function MobileSidebarDrawer({
  items,
  activeTab,
  onSelectTab,
  onClose,
}: {
  items: SidebarNavItem[];
  activeTab: WorkflowsTabId;
  onSelectTab: (tab: WorkflowsTabId) => void;
  onClose: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(true, drawerRef, onClose);

  return (
    <div
      className="fixed inset-0 z-[90] flex lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Workflows navigation"
      data-lenis-prevent="true"
      data-lenis-prevent-wheel="true"
      data-lenis-prevent-touch="true"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: M3_EASE }}
        onClick={onClose}
        className="fixed inset-0 bg-[#0C233C]/35 backdrop-blur-[3px]"
        aria-hidden="true"
      />

      <motion.aside
        ref={drawerRef}
        tabIndex={-1}
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { transform: "translateX(-100%)" }
        }
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : { transform: "translateX(0%)" }
        }
        exit={
          prefersReducedMotion
            ? { opacity: 0 }
            : { transform: "translateX(-100%)" }
        }
        transition={{ duration: 0.28, ease: DRAWER_EASE }}
        className="relative z-10 flex h-full w-[280px] max-w-[82vw] flex-col justify-between border-r border-[#D8DFE9] bg-white px-3 py-4 text-[#0C233C] shadow-2xl focus:outline-none"
      >
        <div>
          <div className="flex items-center justify-between px-2 pb-3">
            <span className="text-xs font-semibold tracking-tight text-[#526075]">
              Workspace
            </span>
            <button
              type="button"
              data-dialog-close="true"
              onClick={onClose}
              aria-label="Close workspace navigation"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#526075] transition-[background-color,color,transform] duration-150 hover:bg-[#F4F6FA] hover:text-[#0C233C] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
            >
              <X size={18} weight="light" />
            </button>
          </div>

          <nav
            role="tablist"
            aria-orientation="vertical"
            aria-label="Workflows Hub views"
            className="mt-1 space-y-1"
          >
            {items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-autofocus={isActive ? "true" : undefined}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`flex h-11 w-full items-center justify-between rounded-full px-3.5 text-[13px] transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                    isActive
                      ? "bg-[#00338D]/10 font-semibold text-[#00338D]"
                      : "font-medium text-[#333940] hover:bg-[#F4F6FA] hover:text-[#0C233C]"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    {renderNavIcon(item.id, isActive)}
                    <span>{item.label}</span>
                  </span>
                  {item.isLive ? (
                    <span className="inline-flex items-center gap-1.5">
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="rounded-full bg-[#009A44] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                          {item.badge}
                        </span>
                      )}
                      <span className="h-1.5 w-1.5 rounded-full bg-[#009A44] animate-pulse" />
                    </span>
                  ) : typeof item.badge === "number" && item.badge > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none ${
                        isActive
                          ? "bg-[#00338D]/15 text-[#00338D]"
                          : "bg-[#E8EEF8] text-[#475569]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[#E5EAF2] pt-3">
          <Link
            href="/"
            onClick={onClose}
            className="flex h-11 w-full items-center gap-3 rounded-full px-3.5 text-[13px] font-medium text-[#475569] transition-[background-color,color,transform] duration-150 hover:bg-[#F4F6FA] hover:text-[#0C233C] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
          >
            <House size={20} weight="regular" />
            <span>Home</span>
          </Link>
        </div>
      </motion.aside>
    </div>
  );
}

export function WorkflowsSidebar({
  activeTab,
  onSelectTab,
  productCount,
  canViewAudit,
  auditTotal,
  dashboardCount,
  isKpmgAdmin,
  pinned,
  onTogglePin,
}: WorkflowsSidebarProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const tablistRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  const clearHoverTimers = useCallback(() => {
    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimers, [clearHoverTimers]);

  const items = useMemo<SidebarNavItem[]>(() => {
    const list: SidebarNavItem[] = [
      {
        id: "catalog",
        label: "Solution Catalog",
        badge: productCount,
      },
    ];
    if (canViewAudit) {
      list.push({
        id: "audit",
        label: "Live Audit & Telemetry",
        badge: auditTotal > 0 ? auditTotal : undefined,
        isLive: true,
      });
    }
    list.push({
      id: "dashboards",
      label: "Dashboards",
      badge:
        dashboardCount !== null && dashboardCount > 0
          ? dashboardCount
          : undefined,
    });
    if (isKpmgAdmin) {
      list.push({
        id: "governance",
        label: "Client & Access Governance",
      });
    }
    return list;
  }, [productCount, canViewAudit, auditTotal, dashboardCount, isKpmgAdmin]);

  const isExpanded = pinned || hovered || focusWithin || accountMenuOpen;
  const activeItem = items.find((item) => item.id === activeTab) ?? items[0];

  const handlePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    clearHoverTimers();
    enterTimerRef.current = window.setTimeout(() => {
      setHovered(true);
    }, 60);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    clearHoverTimers();
    leaveTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      setFocusWithin(false);
    }, 140);
  };

  const handleTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    const buttons = Array.from(
      tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ??
        []
    );
    if (buttons.length === 0) return;

    event.preventDefault();
    const currentIndex = buttons.findIndex(
      (btn) => btn === document.activeElement
    );
    let nextIndex = 0;
    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else if (event.key === "ArrowDown") {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
    }
    buttons[nextIndex]?.focus();
  };

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <>
      {/* Desktop Gemini-Inspired Hover-Expand Navigation Rail */}
      <aside
        aria-label="Workflows Hub sidebar"
        data-expanded={isExpanded ? "true" : "false"}
        data-pinned={pinned ? "true" : "false"}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.matches(":focus-visible")
          ) {
            setFocusWithin(true);
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocusWithin(false);
          }
        }}
        className={`fixed top-[72px] bottom-0 left-0 z-30 hidden flex-col justify-between overflow-hidden border-r border-[#D8DFE9] py-4 backdrop-blur-md transition-[width,background-color,box-shadow] ease-[cubic-bezier(0.2,0,0,1)] lg:flex ${
          isExpanded
            ? pinned
              ? "w-[264px] bg-white duration-[260ms]"
              : "w-[264px] bg-white/[0.98] shadow-[16px_0_40px_-14px_rgba(12,35,60,0.14),2px_0_8px_-2px_rgba(12,35,60,0.05)] duration-[260ms]"
            : "w-[68px] bg-[#F4F6FA]/95 duration-[200ms]"
        }`}
      >
        <div className="flex flex-col px-3">
          {/* Top Rail Toggle & Quiet Workspace Header */}
          <div className="mb-4 flex h-11 items-center">
            <button
              type="button"
              onClick={onTogglePin}
              aria-pressed={pinned}
              aria-label={pinned ? "Collapse sidebar" : "Pin sidebar open"}
              title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
              className={`inline-flex h-11 w-[44px] shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                pinned
                  ? "bg-[#00338D]/10 text-[#00338D]"
                  : "text-[#475569] hover:bg-[#E8EEF8]/80 hover:text-[#0C233C]"
              }`}
            >
              {pinned ? (
                <PushPinSimple size={19} weight="fill" />
              ) : (
                <SidebarSimple size={20} weight="regular" />
              )}
            </button>

            <span
              aria-hidden={!isExpanded}
              className={`ml-2 truncate whitespace-nowrap text-xs font-semibold tracking-tight text-[#526075] transition-[opacity,transform] ease-[cubic-bezier(0.2,0,0,1)] ${
                isExpanded
                  ? "translate-x-0 opacity-100 duration-[180ms] delay-[30ms]"
                  : "pointer-events-none -translate-x-1.5 opacity-0 duration-[90ms] delay-0"
              }`}
            >
              Workspace
            </span>
          </div>

          {/* Primary Workspace Destinations */}
          <div
            ref={tablistRef}
            role="tablist"
            aria-orientation="vertical"
            aria-label="Workflows Hub views"
            onKeyDown={handleTabListKeyDown}
            className="space-y-1.5"
          >
            {items.map((item, idx) => {
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative">
                  {isActive && (
                    <motion.span
                      layoutId="workflows-sidebar-active-pill"
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.01 }
                          : { type: "spring", stiffness: 460, damping: 36 }
                      }
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full bg-[#00338D]/10"
                    />
                  )}

                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={item.label}
                    onClick={() => onSelectTab(item.id)}
                    className={`group relative z-10 flex h-11 w-full items-center rounded-full p-0 text-left transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                      isActive
                        ? "font-semibold text-[#00338D]"
                        : "font-medium text-[#475569] hover:bg-[#E8EEF8]/75 hover:text-[#0C233C]"
                    }`}
                  >
                    {/* Fixed 44px left icon axis - zero horizontal shift on expand */}
                    <span className="relative inline-flex h-11 w-[44px] shrink-0 items-center justify-center">
                      {renderNavIcon(item.id, isActive)}

                      {/* Collapsed live pulse indicator on Audit icon */}
                      {item.isLive && (
                        <span
                          aria-hidden="true"
                          className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#009A44] ring-2 ring-[#F4F6FA] transition-opacity duration-150 ${
                            isExpanded ? "opacity-0" : "opacity-100"
                          }`}
                        />
                      )}
                    </span>

                    {/* Label & Badge gliding in with subtle M3 stagger */}
                    <span
                      style={{
                        transitionDelay: isExpanded
                          ? `${25 + idx * 24}ms`
                          : "0ms",
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-between gap-2 pr-3.5 transition-[opacity,transform] ease-[cubic-bezier(0.2,0,0,1)] ${
                        isExpanded
                          ? "translate-x-0 opacity-100 duration-[180ms]"
                          : "pointer-events-none -translate-x-1.5 opacity-0 duration-[90ms]"
                      }`}
                    >
                      <span className="truncate whitespace-nowrap text-[13px]">
                        {item.label}
                      </span>

                      {item.isLive ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5">
                          {typeof item.badge === "number" && item.badge > 0 && (
                            <span className="rounded-full bg-[#009A44] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                              {item.badge}
                            </span>
                          )}
                          <span className="h-1.5 w-1.5 rounded-full bg-[#009A44] animate-pulse" />
                        </span>
                      ) : typeof item.badge === "number" && item.badge > 0 ? (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none ${
                            isActive
                              ? "bg-[#00338D]/15 text-[#00338D]"
                              : "bg-[#E8EEF8] text-[#475569]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Account Avatar Anchor (Workflows Hub, Home, Sign out) */}
        <div className="px-3">
          <div className="mb-3 h-px bg-[#D8DFE9]/80" aria-hidden="true" />
          <AccountMenu
            placement="sidebar"
            expanded={isExpanded}
            onOpenChange={setAccountMenuOpen}
          />
        </div>
      </aside>

      {/* Mobile & Tablet Compact View Trigger (< lg) */}
      <div className="mt-5 flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-label="Open workspace navigation"
          className="inline-flex items-center gap-2.5 rounded-full border border-[#D8DFE9] bg-white px-3.5 py-2 text-xs font-semibold text-[#0C233C] shadow-xs transition-[border-color,background-color,transform] duration-150 hover:border-[#00338D] hover:bg-[#F4F6FA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
        >
          <SidebarSimple size={17} weight="regular" className="text-[#00338D]" />
          <span>{activeItem?.label}</span>
          {activeItem?.isLive && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#009A44] animate-pulse" />
          )}
        </button>
      </div>

      {/* Portaled Mobile Slide-Over Drawer */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <MobileSidebarDrawer
                items={items}
                activeTab={activeTab}
                onSelectTab={onSelectTab}
                onClose={handleCloseMobile}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
