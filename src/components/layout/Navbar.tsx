"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { List, SignOut, SquaresFour, UserCircle, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { KpmgLogo } from "@/components/brand/KpmgLogo";

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
  const router = useRouter();
  const { user, openLogin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isWorkflowsRoute = pathname.startsWith("/workflows");

  const handleSignOut = () => {
    setMobileOpen(false);
    if (isWorkflowsRoute) {
      router.replace("/");
    }
    signOut();
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

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-3 py-1.5 text-xs text-[#333940] xl:inline-flex">
                <UserCircle size={16} weight="light" className="text-[#00338D]" />
                <span className="font-medium text-[#0C233C] whitespace-nowrap">
                  {user.name}
                </span>
              </div>
              <Link
                href="/workflows"
                className={`inline-flex items-center gap-1.5 rounded-sm px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] ${
                  isWorkflowsRoute
                    ? "border border-[#00338D]/30 bg-[#00338D]/10 text-[#00338D]"
                    : "bg-[#00338D] text-white hover:bg-[#1E49E2]"
                }`}
              >
                <SquaresFour size={16} weight="light" />
                <span>Workflows Hub</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-sm font-medium text-[#333940] whitespace-nowrap transition-[border-color,color,transform] duration-150 hover:border-[#00338D] hover:text-[#00338D] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
              >
                <SignOut size={16} weight="light" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="rounded-sm bg-[#00338D] px-4 py-2 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Sign in to Workflows
            </button>
          )}
        </div>

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

      {mobileOpen && (
        <div className="border-b border-[#D8DFE9] bg-white px-4 py-5 shadow-lg lg:hidden">
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

          <div className="mt-4 flex flex-col gap-2.5 border-t border-[#D8DFE9] pt-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] px-3 py-2 text-xs text-[#333940]">
                  <UserCircle size={16} weight="light" className="text-[#00338D]" />
                  <span className="font-medium text-[#0C233C]">{user.name}</span>
                  <span className="text-[#4B5563]">{user.badge}</span>
                </div>
                <Link
                  href="/workflows"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98]"
                >
                  <SquaresFour size={16} weight="light" />
                  <span>Workflows Hub</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#D8DFE9] bg-white px-4 py-2.5 text-sm font-medium text-[#333940] transition-[color,transform] duration-150 hover:text-[#00338D] active:scale-[0.98]"
                >
                  <SignOut size={16} weight="light" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openLogin();
                }}
                className="w-full rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1E49E2] active:scale-[0.98]"
              >
                Sign in to Workflows
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
