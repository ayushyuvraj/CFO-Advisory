"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { KpmgLogo } from "@/components/brand/KpmgLogo";
import { AccountMenu } from "@/components/layout/AccountMenu";

const NAV_LINKS = [
  { label: "Horizon", href: "/#chapter-horizon" },
  { label: "₹ INR", href: "/#chapter-inr" },
  { label: "$ USD", href: "/#chapter-usd" },
  { label: "€ / £ Ledger", href: "/#chapter-eur" },
  { label: "Gateway", href: "/#chapter-gateway" },
];

function KpmgWordmark() {
  return (
    <span className="inline-flex items-center gap-3.5">
      <KpmgLogo className="h-[30px] w-auto shrink-0" />
      <span className="h-6 w-px bg-[#D8DFE9]" aria-hidden="true" />
      <span className="text-sm font-medium tracking-tight text-[#0C233C] whitespace-nowrap">
        CFO Advisory
      </span>
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, openLogin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLandingRoute = pathname === "/";
  const isWorkflowsRoute = pathname.startsWith("/workflows");
  const showSectionLinks = isLandingRoute || (!user && !isLoading);
  const showMobileMenuButton = showSectionLinks || !user;

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
    <header className="frosted-header fixed top-0 left-0 right-0 z-40 h-[72px] border-b border-[#D8DFE9]">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="KPMG CFO Advisory Home"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={() => setMobileOpen(false)}
        >
          <KpmgWordmark />
        </Link>

        {showSectionLinks && (
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-sm text-sm font-medium text-[#333940] transition-colors duration-150 hover:text-[#00338D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          {user ? (
            <div className={isWorkflowsRoute ? "lg:hidden" : undefined}>
              <AccountMenu />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignInClick}
              className="hidden rounded-sm bg-[#00338D] px-4 py-2 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Sign in to Workflows
            </button>
          )}

          {showMobileMenuButton && (
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              className="inline-flex items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-2 text-[#0C233C] transition-[border-color,transform] duration-150 hover:border-[#00338D] active:scale-[0.98] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
            >
              {mobileOpen ? <X size={20} weight="light" /> : <List size={20} weight="light" />}
            </button>
          )}
        </div>
      </div>

      {mobileOpen && showMobileMenuButton && (
        <div className="border-b border-[#D8DFE9] bg-white px-4 py-5 shadow-lg lg:hidden">
          {showSectionLinks && (
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-sm px-2 py-1.5 text-sm font-medium text-[#333940] transition-colors duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {!user && (
            <div
              className={`flex flex-col gap-2.5 ${
                showSectionLinks ? "mt-4 border-t border-[#D8DFE9] pt-4" : ""
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
