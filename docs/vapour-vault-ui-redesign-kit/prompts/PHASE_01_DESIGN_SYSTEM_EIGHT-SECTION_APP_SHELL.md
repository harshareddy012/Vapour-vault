# Phase 1 Prompt — Design System + Eight-Section App Shell

> **Work on Phase 1 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: UI_DESIGN_SYSTEM.md; MANDATORY_PHASE_PLAN.md Phase 1; SCREEN_BY_SCREEN_SPEC.md navigation rules.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the shared CSS tokens, typography, page frame, persistent navigation, and responsive shell. Make all eight authenticated navigation sections visible in the exact order from the master prompt. Preserve current auth gating and map existing working functionality into the shell without deleting handlers. Temporary panels are acceptable only for sections not yet implemented; do not replace existing functioning features with placeholders.
>
> Prohibited in this phase: Do not implement the contents of Dashboard/Upload/Files/Nodes/Recovery Lab/Verification/Analytics/Settings in this phase. Do not implement the login screen redesign yet.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
