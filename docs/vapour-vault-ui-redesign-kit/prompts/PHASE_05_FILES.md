# Phase 5 Prompt — Files

> **Work on Phase 5 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: SCREEN_BY_SCREEN_SPEC.md section 3; API_AND_INTEGRITY_GUARDRAILS.md; IMAGE_PROMPTS_PER_SCREEN.md prompt 5.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the real file list and file actions using existing frontend calls. Display available filename, size, MIME type, upload time, ID/checksum, status, and download/reconstruct action. Add real loading/empty/error states and inline operation results. Client-side filtering of already-fetched records is acceptable if safe.
>
> Prohibited in this phase: Do not seed sample file rows, fake dates, or change database/file APIs. Preserve returned bytes and auth headers.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
