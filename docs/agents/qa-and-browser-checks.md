# QA & Browser Verification Checklist

Every Browser QA + Output Alignment Review pass must verify all gates below:

## 1. Visual & Layout Integrity
- [ ] **Hero Viewport Fit:** Headline, subtext, primary/secondary CTAs, and hero visual fit cleanly above the fold at `1440x900` with zero clipping.
- [ ] **Navbar Single Line:** Header height `<= 72px`, zero wrapped nav items on desktop (`1024px+` and `1440px`).
- [ ] **No Horizontal Overflow:** `document.documentElement.scrollWidth <= window.innerWidth` at both `1440x900` and `390x844`.
- [ ] **Real Images Loaded:** All `<img>` / `next/image` assets return `complete && naturalWidth > 0`. Zero broken paths.
- [ ] **Shape & Color Consistency:** Single accent (`#1E6BFF` / `#00338D`), uniform `rounded-sm` (`4px`) corners, zero purple gradients, zero light-mode section inversions.

## 2. Copy & Anti-Slop Audit
- [ ] **Zero Em-Dashes (`—`):** Search rendered text and codebase for `—` (`\u2014`); count must be `0`.
- [ ] **Single CTA Intent:** Authentication buttons consistently say `Sign in to Workflows`.
- [ ] **Eyebrow Restraint:** At most 3 uppercase tracked micro-labels across the landing page.
- [ ] **Zero Emojis & Zero Hand-Rolled Icon SVGs:** Only `@phosphor-icons/react` icons used.

## 3. Smooth Scroll & Animation Check
- [ ] **GSAP Sticky-Stack:** Cards pin cleanly at viewport top and scale/dim smoothly as the next card enters.
- [ ] **GSAP Horizontal-Pan:** Section pins cleanly and scrubs smoothly across all 4 Workflow Sync stages without jumping or clipping on desktop, and collapses cleanly on mobile.
- [ ] **Emil Kowalski Micro-Physics:** Tactile press (`scale-[0.98]`), crisp `ease-out` curves, zero layout-thrashing width/height animations, zero `window.addEventListener('scroll')`.

## 4. Functional Auth & Workflows Hub (`/workflows`)
- [ ] **Login Modal:** Opens cleanly, traps/focuses properly, validates empty/invalid email & passcode with inline WCAG-compliant errors, and authenticates via KPMG SSO, Email+Passcode, and Client Token.
- [ ] **Workflows Hub:** Renders loading skeleton smoothly, displays 6 KPMG CFO Advisory workflows, supports search + pillar filter tabs + empty state, opens the Workflow Execution & Lineage Drawer, and signs out cleanly back to `/`.
- [ ] **Zero Runtime Errors:** Zero uncaught page errors or console errors.
