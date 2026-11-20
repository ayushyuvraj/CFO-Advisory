import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import { AdvisoryFooter } from "@/components/layout/AdvisoryFooter";
import { EditorialReveal } from "@/components/editorial/EditorialReveal";
import { ImpactMetrics } from "@/components/editorial/ImpactMetrics";
import { PlatformStrengths } from "@/components/editorial/PlatformStrengths";
import { Offerings } from "@/components/editorial/Offerings";
import { LocationsMap } from "@/components/editorial/LocationsMap";
import { GatewayChapter } from "@/components/odyssey/GatewayChapter";
import { HorizonChapter } from "@/components/odyssey/HorizonChapter";

export const metadata: Metadata = {
  title: "MS-F&A | KPMG CFO Advisory",
  description: "Explore Managed Services Finance & Accounting (MS-F&A) within KPMG CFO Advisory, and sign in to the Workflows Hub.",
};

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: "300",
  display: "swap",
  variable: "--font-advisory-display",
});

export default function HomePage() {
  return (
    <div className={`${displayFont.variable} advisory-home`}>
      <HorizonChapter />
      <EditorialReveal>
        <Offerings />
        <PlatformStrengths />
        <ImpactMetrics metrics={[]} />
        <section className="editorial-reveal px-5 py-10 sm:px-8">
          <div className="mx-auto max-w-[1336px]">
            <h2 className="text-2xl font-semibold tracking-tight text-kpmg-blue">Leadership</h2>
            <p className="mt-2 text-muted-ink">Under construction. Verified leadership profiles are unavailable.</p>
          </div>
        </section>
        <LocationsMap cities={[]} />
        <GatewayChapter />
      </EditorialReveal>
      <AdvisoryFooter />
    </div>
  );
}
