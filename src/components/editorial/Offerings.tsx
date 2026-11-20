import Image from "next/image";
import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

const FIELDS_OF_PLAY = [
  {
    id: "finance-operations",
    label: "Finance operations",
    image: "person-smiling.jpg",
    fields: [
      "Accounts Payable",
      "Reconciliation",
      "Order-to-Cash",
      "Import & Export Documentation",
      "Fixed Asset Accounting",
    ],
  },
  {
    id: "reporting-compliance",
    label: "Reporting & compliance",
    image: "multicolor-cubes-abstract-1.jpg",
    fields: [
      "MIS",
      "FSCP",
      "Audit",
      "GAAP Analysis",
      "Lease Accounting",
      "Tax",
    ],
  },
  {
    id: "insights-optimization",
    label: "Insights & optimization",
    image: "kpmg-us-ceo-outlook-2026.jpg",
    fields: [
      "Business Insights",
      "Capital Optimization",
      "Process Mining",
      "Competitor Tool Analysis",
    ],
  },
] as const;

type Solution = { title: string; href?: string };

const SOLUTIONS_BY_FIELD: Readonly<Record<string, readonly Solution[] | undefined>> = {
  "Accounts Payable": [
    { title: "Invoice Processing + Payments", href: "/offerings/invoice-processing-payments" },
    { title: "T&E workflow" },
    { title: "T&E policy checks + integration with travel portal" },
  ],
  Reconciliation: [
    { title: "Bank and Vendor Reconciliation" },
    { title: "Customer and Intercompany Reconciliation" },
    { title: "Marketplace" },
  ],
};

function FieldSolutions({ field, solutions }: { field: string; solutions: readonly Solution[] }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt [&::-webkit-details-marker]:hidden">
        {field}
        <CaretDown aria-hidden="true" size={16} weight="light" className="shrink-0 text-muted-ink group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-150" />
      </summary>
      <ul aria-label={`${field} offerings`} className="mb-3 ml-1 space-y-3 border-l border-border py-1 pl-3">
        {solutions.map(({ title, href }) => (
          <li key={title} className="text-sm leading-snug text-slate-ink">
            {href ? (
              <Link href={href} className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
                {title}
              </Link>
            ) : (
              title
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Offerings() {
  return (
    <section id="fields-of-play" aria-labelledby="fields-of-play-title" className="relative scroll-mt-18 px-5 py-16 sm:px-8 lg:py-24">
      <span id="our-offerings" aria-hidden="true" className="pointer-events-none absolute top-0 scroll-mt-18" />
      <div className="mx-auto max-w-[1336px]">
        <h2 id="fields-of-play-title" className="text-5xl leading-none text-kpmg-blue sm:text-6xl">Fields of Play</h2>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-slate-ink">
          Managed Services Finance &amp; Accounting
        </p>
        <div id="ms-fa-fields-of-play" className="mt-10 scroll-mt-24 sm:mt-14">
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {FIELDS_OF_PLAY.map(({ id, label, fields, image }) => (
              <div key={id} id={id} className="editorial-reveal editorial-offering scroll-mt-24">
                <div className="relative mb-4 aspect-[2/1] overflow-hidden bg-kpmg-navy">
                  <Image src={`/images/kpmg_brand_images/${image}`} alt="" fill sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 100vw" className="editorial-offering-image object-cover" />
                </div>
                <h3 className="text-sm font-semibold text-kpmg-navy">{label}</h3>
                <ul className="mt-2 divide-y divide-border">
                  {fields.map((field) => {
                    const solutions = SOLUTIONS_BY_FIELD[field];
                    return (
                      <li key={field} className="editorial-offering-field text-sm leading-snug text-slate-ink">
                        {solutions ? <FieldSolutions field={field} solutions={solutions} /> : (
                          <span className="block py-2.5">{field}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
