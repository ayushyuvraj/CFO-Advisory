# Local Git Workflow

## Strict Scope
- Operate strictly inside `d:\Projects\CFO Advisory`.
- Never configure, fetch from, or push to any external remote unless explicitly instructed by the user.

## Milestone Commit Cadence
1. `chore: initialize local git, vendor skills, and modular agent playbooks`
2. `feat: scaffold Next.js 16 + Tailwind v4 + Motion + GSAP + Lenis foundation`
3. `feat: generate dark executive cinema visual assets`
4. `feat: implement KPMG CFO Advisory showcase sections and smooth scroll choreography`
5. `feat: implement login gateway and post-login Workflows Hub`
6. `fix: resolve QA and design review findings from multi-agent verification loop`

## Pre-Commit Rule
Before creating any code commit (Milestones 2–6), verify `npx tsc --noEmit` and `npm run build` succeed cleanly.
