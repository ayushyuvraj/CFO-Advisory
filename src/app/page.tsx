import { TacticalBootLoader } from "@/components/hud/TacticalBootLoader";
import { WayfindingBar } from "@/components/hud/WayfindingBar";
import { EurLedgerTallyChapter } from "@/components/odyssey/EurLedgerTallyChapter";
import { GatewayChapter } from "@/components/odyssey/GatewayChapter";
import { HorizonChapter } from "@/components/odyssey/HorizonChapter";
import { InrTransformationChapter } from "@/components/odyssey/InrTransformationChapter";
import { UsdTreasuryChapter } from "@/components/odyssey/UsdTreasuryChapter";
import { CurrencyOdysseyCanvas } from "@/components/three/CurrencyOdysseyCanvas";

export default function HomePage() {
  return (
    <div className="relative min-h-[100dvh] bg-white text-[#0C233C]">
      <TacticalBootLoader />
      <CurrencyOdysseyCanvas />

      <div className="relative z-10 pb-20">
        <HorizonChapter />
        <InrTransformationChapter />
        <UsdTreasuryChapter />
        <EurLedgerTallyChapter />
        <GatewayChapter />
        <HorizonChapter isMirror />
      </div>

      <WayfindingBar />
    </div>
  );
}
