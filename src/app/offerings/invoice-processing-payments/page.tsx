import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bank, ChartBar, Check, ClockCountdown, CreditCard,
  EnvelopeSimple, FileText, GitMerge, ListChecks, Scan, ShieldCheck, WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { AdvisoryFooter } from "@/components/layout/AdvisoryFooter";

export const metadata: Metadata = {
  title: "Autonomous Accounts Payable Intelligence | KPMG MS-F&A",
  description: "Executive overview of the MS-F&A invoice-to-pay platform, from invoice intake through payment release.",
};

const CONTACT_EMAIL = "xyz_cfo_advisory_ms_fa@xyz.com";
const BENEFITS = [
  "Faster processing", "Reduced manual effort", "Greater compliance",
  "Lower cycle times", "Better cash flow visibility",
] as const;
const FLOW = ["Invoice", "Validate", "Match", "Approve", "Pay"] as const;
const KPIS = [
  { title: "Touchless processing rate", Icon: ListChecks },
  { title: "Average invoice processing time", Icon: ClockCountdown },
  { title: "Extraction accuracy", Icon: Scan },
  { title: "Reduction in manual effort", Icon: ChartBar },
] as const;
const STEPS = [
  { title: "Invoice intake", detail: "Supplier invoice capture", Icon: EnvelopeSimple },
  { title: "AI extraction", detail: "GST, vendor, and line-item data", Icon: Scan },
  { title: "Validation", detail: "Review extracted invoice and GST details", Icon: ListChecks },
  { title: "Three-way match", detail: "Invoice, purchase order, and goods receipt", Icon: GitMerge },
  { title: "Exception handling", detail: "Review and resolve matching discrepancies", Icon: WarningCircle },
  { title: "Approvals", detail: "Route by delegated authority", Icon: ShieldCheck },
  { title: "Payment release", detail: "Release approved payments", Icon: CreditCard },
] as const;
const IMPACT = [
  "Straight-through processing", "Cycle time reduction", "Productivity improvement",
  "Audit traceability", "GST compliance coverage",
] as const;
const CAPABILITIES = [
  ["Supplier invoice intake", "Document data extraction", "GST and vendor data capture"],
  ["Purchase order matching", "Goods receipt matching", "Exception resolution"],
  ["Delegated approval routing", "Payment release", "Audit trail and GST context"],
] as const;
const INTEGRATIONS = [
  "SAP S/4HANA", "Zoho Books", "Banking platforms",
] as const;

const panel = "rounded-xl border border-border bg-white p-5 shadow-[0_4px_16px_rgba(12,35,60,0.05)] sm:p-6";
const sectionHeading = "text-lg font-semibold tracking-tight text-kpmg-navy sm:text-xl";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A6ED1]";

export default function InvoiceProcessingPaymentsPage() {
  return (
    <div className="bg-[#f6f8fa] pt-18 text-kpmg-navy">
      <div className="mx-auto max-w-[1520px] space-y-5 px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
        <Link href="/#finance-operations" className={`inline-flex min-h-8 items-center gap-2 rounded-sm text-sm font-medium text-[#0A6ED1] hover:underline ${focus}`}>
          <ArrowLeft size={16} weight="light" aria-hidden="true" />
          Back to Fields of Play
        </Link>

        <section aria-labelledby="invoice-title" className={`grid items-center gap-6 ${panel} lg:grid-cols-[1.25fr_1fr] lg:gap-8 lg:p-8`}>
          <div>
            <h1 id="invoice-title" className="max-w-[24ch] text-balance text-3xl leading-[1.09] font-semibold tracking-[-.035em] text-kpmg-navy sm:text-4xl xl:text-[44px]">
              Autonomous Accounts Payable Intelligence
            </h1>
            <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-muted-ink sm:text-base">
              Transform invoice-to-pay operations through AI-driven document understanding, automated 3-way matching, exception management and payment orchestration.
            </p>
            <ul aria-label="Business objectives" className="mt-5 grid gap-x-5 gap-y-2.5 text-sm font-medium text-kpmg-navy sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2">
                  <Check size={16} weight="light" aria-hidden="true" className="shrink-0 text-[#0A6ED1]" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <figure className="rounded-lg border border-[#d6e6f7] bg-[#eff6ff] p-4 sm:p-5">
            <div className="flex flex-col items-center gap-3">
              <div aria-hidden="true" className="relative grid size-18 place-items-center rounded-lg border border-[#c6ddf4] bg-white text-[#0A6ED1] shadow-sm">
                <FileText size={34} weight="light" />
                <span className="absolute -right-2 -bottom-1 rounded-sm bg-[#0A6ED1] px-1.5 py-0.5 text-[10px] font-semibold text-white">AI</span>
              </div>
              <figcaption className="text-center text-lg font-semibold tracking-tight text-kpmg-blue">From Invoices to Impact</figcaption>
            </div>
            <ol aria-label="Invoice to payment flow" className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-xs font-medium text-kpmg-blue sm:gap-x-2 sm:text-sm">
              {FLOW.map((stage, index) => (
                <li key={stage} className="inline-flex items-center gap-1.5 sm:gap-2">
                  <span>{stage}</span>
                  {index < FLOW.length - 1 && <ArrowRight size={13} weight="light" aria-hidden="true" />}
                </li>
              ))}
            </ol>
          </figure>
        </section>

        <section aria-labelledby="invoice-kpis">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
            <h2 id="invoice-kpis" className={sectionHeading}>Performance indicators</h2>
            <p className="text-xs text-muted-ink">Verified results are not yet available.</p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KPIS.map(({ title, Icon }) => (
              <div key={title} className="rounded-lg border border-border bg-white px-4 py-3 shadow-[0_3px_12px_rgba(12,35,60,0.04)]">
                <dt className="flex items-start gap-2 text-sm font-medium text-kpmg-navy">
                  <Icon size={19} weight="light" aria-hidden="true" className="mt-0.5 shrink-0 text-[#0A6ED1]" />
                  {title}
                </dt>
                <dd className="mt-2 pl-7 text-sm text-muted-ink">Awaiting verified results</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <section aria-labelledby="invoice-overview" className={panel}>
            <h2 id="invoice-overview" className={sectionHeading}>Invoice-to-Pay Process</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-ink">
              End-to-end automation from invoice intake to payment release.
            </p>
            <ol className="mt-5 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7" role="list">
              {STEPS.map(({ title, detail, Icon }, index) => (
                <li key={title} className="relative min-w-0 rounded-md border border-border bg-surface p-3 xl:px-2.5">
                  <div className="flex items-center gap-2 text-[#0A6ED1]">
                    <Icon size={22} weight="light" aria-hidden="true" />
                    <span className="text-xs font-medium tabular-nums">{index + 1}</span>
                  </div>
                  <h3 className="mt-2 text-sm leading-snug font-semibold text-kpmg-navy">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-ink">{detail}</p>
                  {index < STEPS.length - 1 && (
                    <ArrowRight size={12} weight="light" aria-hidden="true" className="absolute top-4 -right-2.5 z-10 hidden bg-white text-[#0A6ED1] xl:block" />
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="invoice-impact" className={panel}>
            <h2 id="invoice-impact" className={sectionHeading}>Business Impact</h2>
            <ul className="mt-3 divide-y divide-border">
              {IMPACT.map((measure) => (
                <li key={measure} className="flex items-center gap-2 py-2.5 text-sm text-kpmg-navy">
                  <ChartBar size={17} weight="light" aria-hidden="true" className="shrink-0 text-[#0A6ED1]" />
                  {measure}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-muted-ink">Outcome measures for the invoice-to-pay workflow.</p>
          </section>
        </div>

        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <section aria-labelledby="invoice-capabilities" className={panel}>
            <h2 id="invoice-capabilities" className={sectionHeading}>Key Business Capabilities</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {CAPABILITIES.map((group) => (
                <ul key={group[0]} className="space-y-2.5 text-sm leading-snug text-slate-ink">
                  {group.map((capability) => (
                    <li key={capability} className="flex items-start gap-2">
                      <Check size={16} weight="light" aria-hidden="true" className="mt-0.5 shrink-0 text-[#0A6ED1]" />
                      {capability}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>

          <section aria-labelledby="invoice-integrations" className={panel}>
            <h2 id="invoice-integrations" className={sectionHeading}>Enterprise Integrations</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
              {INTEGRATIONS.map((name) => (
                <li key={name} className="flex items-center gap-2 rounded-md border border-border bg-surface p-2.5">
                  <Bank size={16} weight="light" aria-hidden="true" className="shrink-0 text-[#0A6ED1]" />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="invoice-launch" className="relative isolate overflow-hidden rounded-xl bg-[#001B44] p-5 text-white shadow-sm sm:p-6">
            <Image
              src="/images/kpmg_brand_images/calculations_cq5dam-web-1120-684.webp"
              alt=""
              fill
              sizes="(min-width: 1280px) 380px, 100vw"
              className="-z-20 object-cover opacity-30"
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#001B44] via-[#001B44]/88 to-[#001B44]/50" />
            <h2 id="invoice-launch" className="max-w-[20ch] text-xl leading-snug font-semibold tracking-tight">Smarter Payables. Stronger Tomorrow.</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/90">Drive efficiency. Ensure compliance. Unlock greater value.</p>
            <Link href="/workflows" className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0A6ED1] px-3 py-2 text-sm font-semibold text-white hover:bg-kpmg-blue ${focus}`}>
              Launch Platform
              <ArrowRight size={16} weight="light" aria-hidden="true" />
            </Link>
            <p className="mt-2 text-xs text-white/85">Continue to Workflows Hub to launch.</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 inline-flex items-start gap-1.5 rounded-sm text-xs text-white/90 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
              <EnvelopeSimple size={16} weight="light" aria-hidden="true" className="shrink-0" />
              <span className="[overflow-wrap:anywhere]">{CONTACT_EMAIL}</span>
            </a>
          </section>
        </div>
      </div>
      <AdvisoryFooter />
    </div>
  );
}
