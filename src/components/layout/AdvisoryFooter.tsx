import { KpmgLogo } from "@/components/brand/KpmgLogo";

const FOOTER_LINKS = [
  { label: "Legal", href: "https://kpmg.com/in/en/misc/legal.html" },
  { label: "Privacy", href: "https://kpmg.com/in/en/misc/privacy.html" },
  { label: "Contact KPMG in India", href: "https://kpmg.com/in/en/misc/generic-contact-page.html" },
];

export function AdvisoryFooter() {
  return (
    <footer role="contentinfo" aria-label="KPMG CFO Advisory" className="bg-[#001B44] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-[1336px]">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <KpmgLogo color="#FFFFFF" />
            <span className="text-sm font-medium">CFO Advisory</span>
          </div>
          <nav aria-label="KPMG footer links" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {FOOTER_LINKS.map(({ label, href }) => (
              <a key={href} href={href} className="inline-flex min-h-8 items-center rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                {label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-5 border-t border-white/25 pt-4 text-sm leading-relaxed text-white/80">
          KPMG member firms are independent legal entities affiliated with KPMG International Limited. Client services are provided by the member firms.
        </p>
      </div>
    </footer>
  );
}
