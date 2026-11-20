"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkflowsNavbar } from "@/components/layout/WorkflowsNavbar";
import { useEffect, useRef, useState } from "react";
import { List, SignOut, SquaresFour, UserCircle, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { KpmgLogo } from "@/components/brand/KpmgLogo";

const NAV_LINKS = [
  { label: "Horizon", href: "/#chapter-horizon" },
  { label: "Fields of Play", href: "/#fields-of-play" },
  { label: "Platform strengths", href: "/#platform-strengths" },
  { label: "Workflows", href: "/#chapter-gateway" },
];

function useHomepageNavigation(isHome: boolean) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeHref, setActiveHref] = useState(NAV_LINKS[0].href);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const chapters = NAV_LINKS.map(({ href }) => ({
      href,
      element: document.getElementById(href.slice(2)),
    }));
    let frame = 0;

    function update() {
      frame = 0;
      const top = window.scrollY;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, top / range)) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      setScrolled(top > 12);

      let current = NAV_LINKS[0].href;
      for (const { href, element } of chapters) {
        if (element && element.getBoundingClientRect().top <= 90) current = href;
      }
      setActiveHref(current);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    const size = new ResizeObserver(schedule);
    size.observe(document.body);
    document.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      document.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [isHome]);

  return { activeHref: isHome ? activeHref : null, scrolled: isHome && scrolled, progressRef };
}

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

  if (pathname.startsWith("/workflows")) {
    return <WorkflowsNavbar landingLinks={NAV_LINKS} />;
  }

  return <EditorialNavbar isHome={pathname === "/"} />;
}

function EditorialNavbar({ isHome }: { isHome: boolean }) {
  const { user, openLogin, signOut, isLoginOpen } = useAuth();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeHref, scrolled, progressRef } = useHomepageNavigation(isHome);

  const handleSignOut = () => {
    setMobileOpen(false);
    signOut();
  };

  return (
    <header className={`fixed inset-x-0 top-[var(--login-viewport-top,0px)] z-40 h-18 border-b border-border ${scrolled && !mobileOpen && !isLoginOpen ? "bg-white/80 backdrop-blur-md" : "bg-white"}`}>
      {isHome && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5">
          <div ref={progressRef} style={{ transform: "scaleX(0)" }} className="h-full w-full origin-left bg-linear-to-r from-[#00338D] via-[#0091DA] to-[#483698]" />
        </div>
      )}
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
          className="hidden items-center gap-4 lg:flex xl:gap-7"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activeHref === item.href ? "location" : undefined}
              className="editorial-nav-link whitespace-nowrap rounded-sm text-sm font-medium text-[#333940] duration-150 hover:text-[#00338D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
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
              {!isHome && (
                <Link
                  href="/workflows"
                  className="inline-flex items-center gap-1.5 rounded-sm bg-[#00338D] px-3.5 py-2 text-sm font-medium whitespace-nowrap text-white duration-150 hover:bg-[#1E49E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
                >
                  <SquaresFour size={16} weight="light" />
                  <span>Workflows Hub</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#D8DFE9] bg-white px-3 py-2 text-sm font-medium text-[#333940] whitespace-nowrap duration-150 hover:border-[#00338D] hover:text-[#00338D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
              >
                <SignOut size={16} weight="light" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              className="rounded-sm bg-[#00338D] px-4 py-2 text-sm font-medium text-white whitespace-nowrap duration-150 hover:bg-[#1E49E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Sign in to Workflows
            </button>
          )}
        </div>

        <button
          type="button"
          ref={menuButtonRef}
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex items-center justify-center rounded-sm border border-[#D8DFE9] bg-[#F4F6FA] p-2 text-[#0C233C] duration-150 hover:border-[#00338D] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E49E2]"
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
                aria-current={activeHref === item.href ? "location" : undefined}
                onClick={() => setMobileOpen(false)}
                className="rounded-sm px-2 py-1.5 text-sm aria-[current=location]:bg-surface aria-[current=location]:text-kpmg-blue font-medium text-[#333940] duration-150 hover:bg-[#F4F6FA] hover:text-[#00338D]"
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
                {!isHome && (
                  <Link
                    href="/workflows"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white duration-150 hover:bg-[#1E49E2]"
                  >
                    <SquaresFour size={16} weight="light" />
                    <span>Workflows Hub</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#D8DFE9] bg-white px-4 py-2.5 text-sm font-medium text-[#333940] duration-150 hover:text-[#00338D]"
                >
                  <SignOut size={16} weight="light" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  menuButtonRef.current?.focus();
                  setMobileOpen(false);
                  openLogin();
                }}
                className="w-full rounded-sm bg-[#00338D] px-4 py-2.5 text-sm font-medium text-white duration-150 hover:bg-[#1E49E2]"
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
