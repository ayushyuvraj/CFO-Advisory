const STRENGTHS = [
  {
    title: "AI-assisted invoice processing",
    description: "The registered Accounts Payable workflow uses Gemini to extract invoice details. Three-way matching compares invoices with purchase orders and goods receipts so teams can review discrepancies.",
  },
  {
    title: "Audit visibility",
    description: "Authorized users can review recorded workflow activity and audit events from connected products in the Workflows Hub.",
  },
  {
    title: "Engagement-based access",
    description: "KPMG leads manage client access to connected products. Client users see the products and dashboard capabilities assigned to their engagement.",
  },
] as const;

export function PlatformStrengths() {
  return (
    <section id="platform-strengths" aria-labelledby="platform-strengths-title" className="scroll-mt-18 bg-[#001B44] px-5 py-14 text-white sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1336px]">
        <h2 id="platform-strengths-title" className="text-4xl leading-none sm:text-5xl">Platform strengths</h2>
        <dl className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_1fr_1fr] lg:gap-10">
          {STRENGTHS.map(({ title, description }) => (
            <div key={title} className="editorial-reveal editorial-strength relative border-t border-ice/35 pt-4">
              <dt className="text-base font-semibold text-ice">{title}</dt>
              <dd className="mt-2 max-w-[50ch] text-sm leading-relaxed text-white/90">{description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
