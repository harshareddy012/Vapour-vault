# Phase 3 Prompt — Dashboard

> **Work on Phase 3 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: SCREEN_BY_SCREEN_SPEC.md section 1; UI_DESIGN_SYSTEM.md; IMAGE_PROMPTS_PER_SCREEN.md prompt 2; reference-images/02-dashboard-reference.png.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the dashboard summary using live available API data: system overview, node health summary, recent activity, and recent file/recovery/verification snippets where the existing frontend receives such data. Keep it dense and technical; avoid generic three-card marketing layouts.
>
> Prohibited in this phase: No invented RAM/CPU/disk values, uptime percentages, file counts, activity rows, timestamps, or integrity-rate claims. Unavailable fields must be omitted or explicitly marked unavailable.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
