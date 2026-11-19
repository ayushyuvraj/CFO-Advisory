"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwise,
  House,
  SignOut,
  SquaresFour,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface AccountMenuProps {
  placement?: "navbar" | "sidebar";
  expanded?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AccountMenu({
  placement = "navbar",
  expanded = false,
  onOpenChange,
}: AccountMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { user, isPreviewMode, exitPreview, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [sidebarAnchor, setSidebarAnchor] = useState<{
    left: number;
    bottom: number;
  } | null>(null);

  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const isWorkflowsRoute = pathname.startsWith("/workflows");
  const isSidebar = placement === "sidebar";

  const setOpenState = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChangeRef.current?.(nextOpen);
  }, []);

  const closeMenu = useCallback(
    (restoreFocus = false) => {
      setOpenState(false);
      if (restoreFocus) {
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    },
    [setOpenState]
  );

  const computeSidebarAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSidebarAnchor({
      left: Math.max(12, rect.left),
      bottom: Math.max(12, window.innerHeight - rect.top + 8),
    });
  }, []);

  // Keep portaled sidebar popover anchored on viewport resize
  useEffect(() => {
    if (!open || !isSidebar) return;
    const handleReposition = () => computeSidebarAnchor();
    window.addEventListener("resize", handleReposition);
    return () => window.removeEventListener("resize", handleReposition);
  }, [open, isSidebar, computeSidebarAnchor]);

  // Close on outside click, Escape, or Tab away
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const insideTrigger = containerRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setOpenState(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        return;
      }

      if (event.key === "Tab") {
        setOpenState(false);
        return;
      }

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
            []
        );
        if (items.length === 0) return;

        event.preventDefault();
        const currentIndex = items.findIndex(
          (el) => el === document.activeElement
        );

        let nextIndex = 0;
        if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = items.length - 1;
        } else if (event.key === "ArrowDown") {
          nextIndex =
            currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
        } else if (event.key === "ArrowUp") {
          nextIndex =
            currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        }
        items[nextIndex]?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeMenu, setOpenState]);

  if (!user) return null;

  const initials = getInitials(user.name);
  const roleSummary = user.companyName
    ? `${user.role} · ${user.companyName}`
    : user.role;

  const handleToggle = () => {
    if (!open && isSidebar) {
      computeSidebarAnchor();
    }
    setOpenState(!open);
  };

  const handleSignOut = () => {
    setOpenState(false);
    if (isWorkflowsRoute) {
      router.replace("/");
    }
    void signOut();
  };

  const handleExitPreview = () => {
    setOpenState(false);
    void exitPreview();
  };

  const menuContent = (
    <motion.div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label="Account options"
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              transform: isSidebar
                ? "scale(0.95) translateY(4px)"
                : "scale(0.95) translateY(-4px)",
            }
      }
      animate={
        prefersReducedMotion
          ? { opacity: 1 }
          : { opacity: 1, transform: "scale(1) translateY(0px)" }
      }
      exit={
        prefersReducedMotion
          ? { opacity: 0, transition: { duration: 0.11, ease: EASE_OUT } }
          : {
              opacity: 0,
              transform: isSidebar
                ? "scale(0.96) translateY(3px)"
                : "scale(0.96) translateY(-3px)",
              transition: { duration: 0.13, ease: EASE_OUT },
            }
      }
      transition={{ duration: 0.18, ease: EASE_OUT }}
      style={
        isSidebar && sidebarAnchor
          ? {
              transformOrigin: "bottom left",
              left: `${sidebarAnchor.left}px`,
              bottom: `${sidebarAnchor.bottom}px`,
            }
          : { transformOrigin: "top right" }
      }
      className={
        isSidebar
          ? "fixed z-[60] w-[240px] rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#0C233C] shadow-[0_18px_42px_-12px_rgba(12,35,60,0.2),0_2px_6px_-1px_rgba(12,35,60,0.06)]"
          : "absolute top-[calc(100%+10px)] right-0 z-50 w-[264px] rounded-sm border border-[#D8DFE9] bg-white p-1.5 text-[#0C233C] shadow-[0_18px_42px_-12px_rgba(12,35,60,0.18),0_2px_6px_-1px_rgba(12,35,60,0.06)]"
      }
    >
      {/* Identity Header */}
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[#0C233C]">
            {user.name}
          </p>
          {isPreviewMode && (
            <span className="shrink-0 rounded-xs bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
              Preview
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[#526075]">{user.email}</p>
        <p className="mt-1 truncate text-[11px] text-[#64748B]">{roleSummary}</p>
        {user.tenantType === "client" && user.permissions && (
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[10px]">
            <span
              className={`rounded-xs px-1.5 py-0.5 ${
                user.permissions.canLaunchProducts
                  ? "bg-[#009A44]/10 font-medium text-[#009A44]"
                  : "bg-[#F4F6FA] text-[#64748B]"
              }`}
            >
              Launch: {user.permissions.canLaunchProducts ? "ON" : "OFF"}
            </span>
            <span
              className={`rounded-xs px-1.5 py-0.5 ${
                user.permissions.canViewAudit
                  ? "bg-[#009A44]/10 font-medium text-[#009A44]"
                  : "bg-[#F4F6FA] text-[#64748B]"
              }`}
            >
              Audit: {user.permissions.canViewAudit ? "ON" : "OFF"}
            </span>
            <span
              className={`rounded-xs px-1.5 py-0.5 ${
                user.permissions.canManageDashboards
                  ? "bg-[#009A44]/10 font-medium text-[#009A44]"
                  : "bg-[#F4F6FA] text-[#64748B]"
              }`}
            >
              Studio: {user.permissions.canManageDashboards ? "Edit" : "View"}
            </span>
            <span
              className={`rounded-xs px-1.5 py-0.5 ${
                user.permissions.canExportData
                  ? "bg-[#009A44]/10 font-medium text-[#009A44]"
                  : "bg-[#F4F6FA] text-[#64748B]"
              }`}
            >
              Export: {user.permissions.canExportData ? "ON" : "OFF"}
            </span>
          </div>
        )}
      </div>

      <div className="my-1 h-px bg-[#E5EAF2]" role="separator" />

      {/* Workspace Navigation */}
      <div className="space-y-0.5">
        <Link
          href="/workflows"
          role="menuitem"
          onClick={() => setOpenState(false)}
          className={`flex w-full items-center justify-between rounded-xs px-2.5 py-2 text-[13px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.99] focus-visible:bg-[#F4F6FA] focus-visible:outline-none ${
            isWorkflowsRoute
              ? "bg-[#F4F6FA] text-[#00338D]"
              : "text-[#333940] hover:bg-[#F4F6FA] hover:text-[#0C233C]"
          }`}
        >
          <span className="inline-flex items-center gap-2.5">
            <SquaresFour size={16} weight="light" />
            <span>Workflows Hub</span>
          </span>
          {isWorkflowsRoute && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[#00338D]"
            />
          )}
        </Link>

        {isWorkflowsRoute && (
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpenState(false)}
            className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-[13px] font-medium text-[#333940] transition-[background-color,color,transform] duration-150 hover:bg-[#F4F6FA] hover:text-[#0C233C] active:scale-[0.99] focus-visible:bg-[#F4F6FA] focus-visible:outline-none"
          >
            <House size={16} weight="light" />
            <span>Home</span>
          </Link>
        )}

        {isPreviewMode && (
          <button
            type="button"
            role="menuitem"
            onClick={handleExitPreview}
            className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-[13px] font-medium text-amber-800 transition-[background-color,color,transform] duration-150 hover:bg-amber-50 active:scale-[0.99] focus-visible:bg-amber-50 focus-visible:outline-none"
          >
            <ArrowCounterClockwise size={16} weight="light" />
            <span>Exit preview</span>
          </button>
        )}
      </div>

      <div className="my-1 h-px bg-[#E5EAF2]" role="separator" />

      {/* Sign Out */}
      <button
        type="button"
        role="menuitem"
        onClick={handleSignOut}
        className="flex w-full items-center gap-2.5 rounded-xs px-2.5 py-2 text-left text-[13px] font-medium text-[#333940] transition-[background-color,color,transform] duration-150 hover:bg-[#FEF2F2] hover:text-[#B91C1C] active:scale-[0.99] focus-visible:bg-[#FEF2F2] focus-visible:text-[#B91C1C] focus-visible:outline-none"
      >
        <SignOut size={16} weight="light" />
        <span>Sign out</span>
      </button>
    </motion.div>
  );

  if (isSidebar) {
    return (
      <div ref={containerRef} className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`Account menu for ${user.name}`}
          className={`flex h-11 w-full items-center rounded-full p-0 text-left transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
            open ? "bg-[#E8EEF8]/90" : "hover:bg-[#E8EEF8]/75"
          }`}
        >
          {/* Fixed 44px left icon axis matching every sidebar item */}
          <span className="inline-flex h-11 w-[44px] shrink-0 items-center justify-center">
            <span
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold tracking-[0.04em] text-white select-none transition-[background-color,box-shadow] duration-150 ${
                open
                  ? "bg-[#1E49E2] ring-2 ring-[#1E49E2]/25 ring-offset-2 ring-offset-white"
                  : "bg-[#00338D]"
              }`}
            >
              <span aria-hidden="true">{initials}</span>
              {isPreviewMode && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                />
              )}
            </span>
          </span>

          {/* Identity label gliding in when sidebar expands */}
          <span
            className={`flex min-w-0 flex-1 flex-col pr-3.5 transition-[opacity,transform] ease-[cubic-bezier(0.2,0,0,1)] ${
              expanded
                ? "translate-x-0 opacity-100 duration-[180ms] delay-[55ms]"
                : "pointer-events-none -translate-x-1.5 opacity-0 duration-[90ms] delay-0"
            }`}
          >
            <span className="truncate whitespace-nowrap text-[13px] font-semibold leading-tight text-[#0C233C]">
              {user.name}
            </span>
            <span className="truncate whitespace-nowrap text-[11px] leading-tight text-[#526075]">
              {user.email}
            </span>
          </span>
        </button>

        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>{open && sidebarAnchor && menuContent}</AnimatePresence>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.name}`}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold tracking-[0.04em] text-white select-none transition-[background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          open
            ? "bg-[#1E49E2] ring-2 ring-[#1E49E2]/25 ring-offset-2 ring-offset-white"
            : "bg-[#00338D] hover:bg-[#1E49E2]"
        }`}
      >
        <span aria-hidden="true">{initials}</span>
        {isPreviewMode && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
          />
        )}
      </button>

      <AnimatePresence>{open && menuContent}</AnimatePresence>
    </div>
  );
}
