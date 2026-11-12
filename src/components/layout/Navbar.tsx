"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { List, SignOut, SquaresFour, UserCircle, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { label: "Practice", href: "/#practice" },
  { label: "Orchestration", href: "/#orchestration" },
  { label: "Capabilities", href: "/#capabilities" },
  { label: "Perspectives", href: "/#perspectives" },
];

function KpmgWordmark() {
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        width="68"
        height="26"
        viewBox="0 0 68 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="0.5" y="0.5" width="12" height="10" stroke="#1E6BFF" strokeWidth="1" />
        <rect x="14.5" y="0.5" width="12" height="10" stroke="#1E6BFF" strokeWidth="1" />
        <rect x="28.5" y="0.5" width="12" height="10" stroke="#1E6BFF" strokeWidth="1" />
        <rect x="42.5" y="0.5" width="12" height="10" stroke="#1E6BFF" strokeWidth="1" />
        <text
          x="0"
          y="23"
          fill="#F4F7FB"
          fontSize="13"
          fontWeight="700"
          letterSpacing="1.8"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          KPMG
        </text>
      </svg>
      <span className="h-5 w-px bg-[#162447]" aria-hidden="true" />
      <span className="text-sm font-medium tracking-tight text-[#CBD5E1] whitespace-nowrap">
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
    <header className="frosted-header fixed top-0 left-0 right-0 z-40 h-[72px] border-b border-white/10">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="KPMG CFO Advisory Home"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
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
              className="whitespace-nowrap rounded-sm text-sm font-medium text-[#CBD5E1] transition-colors duration-150 hover:text-[#F4F7FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-sm border border-[#162447] bg-[#07112B] px-3 py-1.5 text-xs text-[#CBD5E1] xl:inline-flex">
                <UserCircle size={16} weight="light" className="text-[#1E6BFF]" />
                <span className="font-medium text-[#F4F7FB] whitespace-nowrap">
                  {user.name}
                </span>
              </div>
              <Link
                href="/workflows"
                className={`inline-flex items-center gap-1.5 rounded-sm px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] ${
                  isWorkflowsRoute
                    ? "border border-[#1E6BFF]/50 bg-[#1E6BFF]/15 text-[#F4F7FB]"
                    : "bg-[#1E6BFF] text-white hover:bg-[#1557D6]"
                }`}
              >
                <SquaresFour size={16} weight="light" />
                <span>Workflows Hub</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#162447] bg-[#0B1736] px-3 py-2 text-sm font-medium text-[#CBD5E1] whitespace-nowrap transition-[border-color,color,transform] duration-150 hover:border-white/20 hover:text-[#F4F7FB] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
              >
                <SignOut size={16} weight="light" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="rounded-sm bg-[#1E6BFF] px-4 py-2 text-sm font-medium text-white whitespace-nowrap transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030816]"
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
          className="inline-flex items-center justify-center rounded-sm border border-[#162447] bg-[#07112B] p-2 text-[#F4F7FB] transition-[border-color,transform] duration-150 hover:border-white/20 active:scale-[0.98] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
        >
          {mobileOpen ? <X size={20} weight="light" /> : <List size={20} weight="light" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-b border-[#162447] bg-[#030816] px-4 py-5 lg:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-sm px-2 py-1.5 text-sm font-medium text-[#CBD5E1] transition-colors duration-150 hover:bg-[#07112B] hover:text-[#F4F7FB]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-2.5 border-t border-[#162447] pt-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 rounded-sm border border-[#162447] bg-[#07112B] px-3 py-2 text-xs text-[#CBD5E1]">
                  <UserCircle size={16} weight="light" className="text-[#1E6BFF]" />
                  <span className="font-medium text-[#F4F7FB]">{user.name}</span>
                  <span className="text-[#7E91B3]">{user.badge}</span>
                </div>
                <Link
                  href="/workflows"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#1E6BFF] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98]"
                >
                  <SquaresFour size={16} weight="light" />
                  <span>Workflows Hub</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#162447] bg-[#0B1736] px-4 py-2.5 text-sm font-medium text-[#CBD5E1] transition-[color,transform] duration-150 hover:text-[#F4F7FB] active:scale-[0.98]"
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
                className="w-full rounded-sm bg-[#1E6BFF] px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-[#1557D6] active:scale-[0.98]"
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
