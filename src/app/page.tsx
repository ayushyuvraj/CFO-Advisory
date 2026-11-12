import { HeroCinema } from "@/components/landing/HeroCinema";
import { MandateScrollReveal } from "@/components/landing/MandateScrollReveal";
import { PracticeStickyStack } from "@/components/landing/PracticeStickyStack";
import { WorkflowHorizontalPan } from "@/components/landing/WorkflowHorizontalPan";
import { CapabilitiesBento } from "@/components/landing/CapabilitiesBento";
import { LeadershipPerspectives } from "@/components/landing/LeadershipPerspectives";
import { PortalGatewayFooter } from "@/components/landing/PortalGatewayFooter";

export default function HomePage() {
  return (
    <>
      <HeroCinema />
      <MandateScrollReveal />
      <PracticeStickyStack />
      <WorkflowHorizontalPan />
      <CapabilitiesBento />
      <LeadershipPerspectives />
      <PortalGatewayFooter />
    </>
  );
}
