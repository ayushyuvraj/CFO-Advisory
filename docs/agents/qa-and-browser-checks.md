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
- [ ] **Login Modal:** Opens cleanly above Navbar (`createPortal` to `document.body`), auto-focuses `#auth-email` (never the `X` close button), resets credentials and errors on close, validates empty/invalid email & passcode with inline WCAG-compliant errors, and authenticates via KPMG Lead or Client Persona credentials.
- [ ] **Workflows Hub:** Renders loading skeleton smoothly, displays physically registered connected platforms, supports Solution Catalog, Live Audit & Telemetry, and Client & Access Governance (KPMG Lead only), and signs out cleanly back to `/`.
- [ ] **Zero Runtime Errors:** Zero uncaught page errors or console errors.

## 5. Mandatory Modal, Drawer, Focus-Trap & Polling Regression Gates (NEVER VIOLATE)
Every modal, drawer, and form dialog MUST pass ALL of these automated and manual gates before completion:
- [ ] **Never Put `onClose` in `useDialogFocusTrap` Effect Dependencies:** Store `onClose` in a `useRef` inside `useDialogFocusTrap.ts`. Parent re-renders or polling ticks MUST NEVER tear down and re-run focus traps or steal focus mid-typing.
- [ ] **Never Auto-Focus the `X` Close Button:** Initial focus MUST target `[data-autofocus]` or the first editable form input (`input`, `textarea`, `select`), and MUST skip `[data-dialog-close]`. Pressing `Space` or `Enter` after opening or while typing MUST NEVER accidentally dismiss a dialog.
- [ ] **Multi-Second Mid-Typing Survival Test:** Open every modal/drawer, type a multi-word string containing spaces, backspace, and symbols across **>= 5 seconds** (spanning multiple background polling cycles), and assert that `document.activeElement` stays inside the typed input and the modal remains open.
- [ ] **Portal Above Fixed Navbar:** All modals and drawers MUST render via `createPortal(..., document.body)` with `z-[90]+` (above Navbar `z-40`). Verify the top-right `X` and header action buttons are never obstructed by the Navbar (`elementFromPoint` check).
- [ ] **Nested Dialog Stack & Scroll Lock:** Use ref-counted body scroll lock + shared dialog stack so pressing `Escape` closes ONLY the topmost modal (e.g. `CreatePersonaModal` closes without dismissing `CompanyDetailDrawer`) and scrolling is isolated with `data-lenis-prevent*`.
- [ ] **No Unnecessary Polling Re-Renders:** Any polling `setInterval` MUST bail out of `setState` when data is unchanged, pause when `document.hidden` or unauthenticated, and avoid duplicate polling across sibling tabs.
- [ ] **Clean State Reset on Close/Reopen:** Closing and reopening any modal (Create Company, Edit Company, Create/Edit Persona, Add Product, Login) MUST start with clean state (no stale plaintext passcodes, stale validation errors, or stuck completion screens).
- [ ] **Keyboard-Accessible Switches & Controls:** Every On/Off toggle MUST be a real `<button type="button" role="switch" aria-checked={...}>` (never a `<div onClick>`). Every icon-only button MUST have an `aria-label`.
- [ ] **Real End-to-End Automated Browser Simulation:** Before declaring any interactive UI task complete, run a headless Chrome E2E simulation covering full keyboard entry, CRUD lifecycles, ON/OFF toggles, Preview Mode, real Client Login, live revocation/suspension, and clean restoration to an empty slate.
- [ ] **Type & Production Build Verification:** Whenever updating `/workflows`, auth, or governance code, verify `tsc --noEmit`, `eslint`, and `npm run build` succeed cleanly on `master`, and verify live HTTP response on Port 3000.
