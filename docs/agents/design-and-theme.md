# Design, Theme & Motion Specification (V2 — KPMG Currency Odyssey)

## Aesthetic Direction
- **Theme Mode:** Crisp Bright White Editorial Canvas (`#FFFFFF` / `#F4F6FA`) paired with KPMG's full vibrant official brand palette and bright daylight 3D studio currency plates.
- **Official KPMG Color Palette:**
  - Primary Canvas: `#FFFFFF` (Pure White)
  - Elevated Slide Surface: `#F4F6FA` (Ice Slate)
  - Structural Hairline Border: `#D8DFE9`
  - KPMG Deep Blue (Primary Anchor & Headlines): `#00338D`
  - Dark Navy (Primary Body Ink): `#0C233C`
  - Slate Ink (Secondary Copy): `#333940` / `#526075`
  - Cobalt Blue (Action & Interactive Accent): `#1E49E2`
  - Pacific Blue (Data Flow & Highlights): `#00B8F5` / `#ACEAFF`
  - KPMG Purple (Gradient Bridge Accent): `#7213EA`
  - Reconciled Emerald (Ledger `Δ 0.00` Verification): `#009A44`
  - Accent Magenta (Minimal micro-highlights): `#FD349C`

## Typography & Shape Lock
- **Fonts:** `Geist` (architectural display & UI) and `Geist_Mono` (chapter indices, currency telemetry, tabular figures) via `next/font/google`.
- **Tabular Numerals:** All Balance Sheet, Income Statement, Tax, and Cash Flow numbers enforce `tabular-nums`.
- **Shape Consistency Lock:** Hard-edged institutional precision (`rounded-sm` = `4px` or `rounded-none`) across buttons, cards, badges, inputs, modals, and drawers.
- **Icons:** `@phosphor-icons/react` exclusively (`weight="light"`).

## Circular Scroll & 3D Currency Choreography
- **Circular Infinite Scroll:** `Lenis` (`lerp: 0.075`, `smoothWheel: true`, `syncTouch: true`, `infinite: true` on `/`) synced to `gsap.ticker` and `ScrollTrigger.update`, paired with a seamless bottom Chapter 01 bookend mirror so scrolling past Chapter 05 glides smoothly back into Chapter 01.
- **Currency Stage:** Real-time Three.js / React Three Fiber unfolding banknote planes with custom GLSL curl & holographic ribbon shaders + optional 60fps `<canvas>` Google Flow frame-sequence playback (`public/flows/`).
- **Reduced Motion:** Wrap app in `<MotionConfig reducedMotion="user">` and fall back to crisp static editorial currency spreads when `prefers-reduced-motion: reduce` is active.
