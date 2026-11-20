"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ChartBar, ClipboardText, TrendUp } from "@phosphor-icons/react";
import { HeroBackground } from "@/components/editorial/HeroBackground";
import { useAuth } from "@/context/AuthContext";

const FIELD_LINKS = [
  { label: "Finance operations", anchor: "finance-operations", Icon: ChartBar },
  { label: "Reporting & compliance", anchor: "reporting-compliance", Icon: ClipboardText },
  { label: "Insights & optimization", anchor: "insights-optimization", Icon: TrendUp },
];

export function HorizonChapter() {
  const router = useRouter();
  const { user, openLogin } = useAuth();

  const handleGatewayClick = () => {
    if (user) {
      router.push("/workflows");
      return;
    }
    openLogin();
  };

  return (
    <section id="chapter-horizon" className="pt-18">
      <div className="relative isolate grid overflow-hidden bg-[#001B44] lg:grid-cols-[1.06fr_1fr]">
        <HeroBackground />
        <div className="relative isolate flex min-h-[260px] items-end overflow-hidden bg-kpmg-navy px-5 py-8 sm:min-h-[350px] sm:px-10 sm:py-12 lg:min-h-[clamp(440px,35vw,570px)] lg:px-[clamp(2.75rem,5vw,6rem)] lg:pb-[clamp(3rem,6vw,6.5rem)]">
          <Image
            src="/images/kpmg_brand_images/young-people-discussing-something-in-meeting.jpg"
            alt="Colleagues discussing their work around a meeting table"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="advisory-hero-photo -z-20 object-cover object-[48%_45%]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-[#001B44] via-[#001B44]/35 to-transparent" />
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-white">KPMG CFO Advisory</p>
            <h1 className="max-w-[19ch] text-balance text-[clamp(2.6rem,5vw,5.25rem)] leading-[1.05] text-white">
              Managed Services Finance &amp; Accounting
            </h1>
          </div>
        </div>
        <div className="relative flex min-w-0 flex-col justify-center bg-[#001B44]/25 px-5 py-8 text-white sm:px-10 sm:py-12 lg:px-[clamp(2.75rem,5vw,6rem)]">
          <div className="grid max-w-lg gap-3 sm:grid-cols-[1.15fr_1fr]">
            <button
              type="button"
              onClick={handleGatewayClick}
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-sm bg-white px-3.5 py-3 text-sm font-semibold text-kpmg-blue hover:bg-ice focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
            >
              {user ? "Workflows Hub" : "Sign in to Workflows"}
              <ArrowRight size={18} weight="light" className="advisory-action-arrow shrink-0" aria-hidden="true" />
            </button>
            <a href="#fields-of-play" className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/70 px-3.5 py-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
              Fields of Play
            </a>
          </div>
          <nav aria-label="MS-F&A Fields of Play" className="mt-5 max-w-lg space-y-1 sm:mt-7">
            {FIELD_LINKS.map(({ label, anchor, Icon }) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="group flex min-h-11 items-center gap-3 rounded-sm py-2 text-base font-medium hover:text-ice hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
              >
                <Icon size={22} weight="light" className="advisory-action-arrow shrink-0 text-ice" aria-hidden="true" />
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
