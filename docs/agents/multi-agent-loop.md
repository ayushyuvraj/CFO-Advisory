# Multi-Agent Loop Engineering Protocol

Every major feature or visual pass MUST be executed through distinct specialized agent roles in a closed feedback loop until zero defects remain.

## Agent Roster & Responsibilities

1. **Asset Producer (`image-generator` subagent)**
   - Generates high-resolution, cohesive dark-cobalt architectural imagery under `public/images/` matching `docs/agents/design-and-theme.md`.
   - Never delivers purple/magenta AI cliché visuals or text-garbled diagrams.

2. **Coder Agent (`coder` / implementation subagent)**
   - Reads `docs/agents/vision-and-content.md` and `docs/agents/design-and-theme.md`.
   - Implements clean Next.js App Router, TypeScript, Tailwind v4, Motion, GSAP, and Lenis components.
   - Runs `npx tsc --noEmit`, `npm run lint`, and `npm run build` before handing off to QA.

3. **Browser Check QA Agent (`browser` subagent)**
   - Navigates the running local server at `http://localhost:3000` and `http://localhost:3000/workflows`.
   - Tests Desktop (`1440x900`) and Mobile (`390x844`).
   - Exercises smooth scrolling, GSAP sticky-stack, horizontal-pan, all 3 Login Modal methods (including invalid form validation), and `/workflows` search, filter, drawer, and sign-out.
   - Reports exact console errors, layout clipping, overflow, and captures screenshots.

4. **Output Alignment Reviewer Agent (`reviewer` subagent)**
   - Inspects the Browser QA screenshots and source code against:
     - `docs/agents/qa-and-browser-checks.md`
     - `.agents/skills/unslop/SKILL.md`
     - `.agents/skills/impeccable/SKILL.md`
     - `.agents/skills/emil-design-eng/SKILL.md`
     - `.agents/skills/design-taste-frontend/SKILL.md`
   - Outputs an explicit PASS / FAIL defect list with exact file paths and visual observations.

## Loop Engineering Execution Cycle
```
[Coder Builds / Fixes] -> [tsc + lint + build] -> [Browser QA Inspects Live App] -> [Reviewer Audits Screenshots & Code]
        ^                                                                                       |
        |___________________________ If FAIL: Concrete Defect List _____________________________|
                                     If PASS: Commit Local Git Checkpoint
```
Never declare completion until the Reviewer Agent issues a clean PASS after the final edit.
