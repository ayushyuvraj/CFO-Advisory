# KPMG CFO Advisory — Agent Operating Contract

This repository houses the **KPMG CFO Advisory** executive showcase and post-login **Workflows Hub** built in Next.js (App Router), TypeScript, Tailwind CSS v4, Motion, GSAP ScrollTrigger, and Lenis.

## Non-Negotiable Boundaries
- **Workspace Scope:** All installs, edits, Git commands, and builds stay strictly inside `d:\Projects\CFO Advisory`. Never edit, delete, or push anything outside this folder.
- **Zero Simulation Invariant (Strict Rule):** Under no circumstances may any simulation, mock product, simulated workflow, synthetic seed event, or fake demo button be added to any part of the platform, database, catalog, or UI. Only physically existing and deployed projects (such as Product 1: AI Invoice Processing) may exist in registries, workflows, and catalogs. If a feature, product, or page does not physically exist, return an explicit 404 error or a clear "Under Construction / Not Deployed" state. Before concluding or declaring completion on any task, the agent MUST audit and verify that zero simulations exist anywhere in the code or data.
- **Vendor Skills Are Read-Only:** `.agents/skills/` contains external design/QA skill packs (`emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `impeccable`, `ui-ux-pro-max`, `unslop`, `design-taste-frontend`). Never edit files inside `.agents/skills/`.
- **Anti-Context-Rot Rule:** Do NOT load every doc blindly. Read ONLY the modular `.md` playbook(s) mapped to your current task below.

## Task-to-Playbook Routing Table

| If your task involves... | Read this file first |
| :--- | :--- |
| Domain copy, KPMG pillars, workflows data, brand voice | `docs/agents/vision-and-content.md` |
| Colors, typography, layout rhythm, animation curves, anti-slop rules | `docs/agents/design-and-theme.md` |
| Coordinating Coder, Browser QA, and Reviewer agents in a loop | `docs/agents/multi-agent-loop.md` |
| Checking live screenshots, DOM, login flows, and quality gates | `docs/agents/qa-and-browser-checks.md` |
| Local Git branches, staging, and milestone commits | `docs/agents/git-workflow.md` |

## Active Skills Priority
- **UI & Craft:** `.agents/skills/design-taste-frontend/SKILL.md`, `.agents/skills/impeccable/SKILL.md`, `.agents/skills/unslop/SKILL.md`
- **Motion & Micro-Interactions:** `.agents/skills/emil-design-eng/SKILL.md`, `.agents/skills/animate/SKILL.md`, `.agents/skills/review-animations/SKILL.md`
- **UX Heuristics:** `.agents/skills/ui-ux-pro-max/SKILL.md`
