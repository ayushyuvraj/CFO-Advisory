# Design, Theme & Motion Specification

## Aesthetic Direction
- **Theme Lock:** Dark Executive Cinema across every route and section (`/` and `/workflows`). Zero mid-page light-mode inversions.
- **Color Palette (Single Accent Lock):**
  - Base Canvas: `#030816` (Midnight Abyss)
  - Elevated Surface: `#07112B` (Cobalt Slate)
  - Card / Panel Surface: `#0B1736`
  - Hairline Border: `#162447` / `rgba(255, 255, 255, 0.08)`
  - Primary Accent: `#1E6BFF` (KPMG Electric Cobalt) and `#00338D` (KPMG Institutional Blue)
  - Primary Text: `#F4F7FB` (Platinum White)
  - Secondary Text: `#CBD5E1` (Cool Slate)
  - Muted Metadata: `#7E91B3` (Steel Slate, keeping >= 4.5:1 on `#030816`)
- **Forbidden Visuals:** Zero purple/magenta gradients, zero neon outer box-shadow glows on cards, zero floating emoji badges, zero `<div>`-based fake dashboard screenshots.

## Typography & Shape Lock
- **Fonts:** `Geist` (display & UI) and `Geist_Mono` (indices, workflow IDs, timestamps) via `next/font/google`.
- **Italic Descender Rule:** Any italic display word with descenders uses `leading-[1.1]` minimum + `pb-1`.
- **Shape Consistency Lock:** Sharp institutional precision (`rounded-sm` = `4px`) across all buttons, cards, badges, inputs, modals, and drawers.
- **Icons:** `@phosphor-icons/react` exclusively (`weight="light"`).

## Motion & Smooth Scroll Standards (Emil Kowalski + GSAP + Lenis)
- **Smooth Scroll:** `Lenis` (`lerp: 0.08`, `smoothWheel: true`) synced to `gsap.ticker` and `ScrollTrigger.update`.
- **Easing Curves:** Enter transitions use crisp exponential ease-out (`cubic-bezier(0.22, 1, 0.36, 1)`); micro-interactions use spring physics (`stiffness: 260, damping: 28`). Never use `ease-in` on UI entrances. Never use `transition: all`.
- **Tactile Press:** Interactive buttons apply `active:scale-[0.98]` and crisp focus-visible cobalt rings.
- **Pinned Scroll Choreography:**
  - `PracticeStickyStack`: Canonical GSAP `StickyStack` (`start: "top top"`, `pin: true`, `pinSpacing: false`, outgoing card scales to `0.92` and `opacity: 0.55`).
  - `WorkflowHorizontalPan`: Canonical GSAP `HorizontalPan` (`start: "top top"`, `pin: true`, `scrub: 1`, `invalidateOnRefresh: true`).
- **Reduced Motion:** Wrap app in `<MotionConfig reducedMotion="user">` and guard all GSAP/Lenis setup behind `!window.matchMedia("(prefers-reduced-motion: reduce)").matches`.

## Layout Discipline
- **Navbar:** Single-line desktop header `h-[72px]`, frosted dark cobalt glass with 1px inner edge (`border-white/10`) and solid fallback.
- **Eyebrow Budget:** Maximum 3 uppercase tracked micro-labels across the entire 7-section landing page (Hero, Sticky-Stack, Horizontal-Pan). Other sections lead directly with their headline.
- **Bento Grid:** Exact 5 cells (`2 + 3`) with visual diversity (generated imagery, cobalt radial field, interactive node preview, hairline metric tiles).
