import { EquilibriumWorldCanvas } from "@/components/three/EquilibriumWorldCanvas";
import { TacticalBootLoader } from "@/components/hud/TacticalBootLoader";
import { TacticalHudOverlay } from "@/components/hud/TacticalHudOverlay";
import { HeroCinema } from "@/components/landing/HeroCinema";
import { MandateScrollReveal } from "@/components/landing/MandateScrollReveal";
import { PracticeStickyStack } from "@/components/landing/PracticeStickyStack";
import { EquilibriumLedgerStage } from "@/components/landing/EquilibriumLedgerStage";
import { WorkflowHorizontalPan } from "@/components/landing/WorkflowHorizontalPan";
import { CapabilitiesBento } from "@/components/landing/CapabilitiesBento";
import { LeadershipPerspectives } from "@/components/landing/LeadershipPerspectives";
import { PortalGatewayFooter } from "@/components/landing/PortalGatewayFooter";

export default function HomePage() {
  return (
    <div className="relative min-h-[100dvh]">
      <TacticalBootLoader />
      <EquilibriumWorldCanvas />
      <TacticalHudOverlay />

      <HeroCinema />
      <MandateScrollReveal />
      <PracticeStickyStack />
      <EquilibriumLedgerStage />
      <WorkflowHorizontalPan />
      <CapabilitiesBento />
      <LeadershipPerspectives />
      <PortalGatewayFooter />
    </div>
  );
}
