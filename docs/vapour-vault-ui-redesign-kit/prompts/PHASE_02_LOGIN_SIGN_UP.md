# Phase 2 Prompt — Login / Sign Up

> **Work on Phase 2 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: UI_DESIGN_SYSTEM.md; SCREEN_BY_SCREEN_SPEC.md section 0; IMAGE_PROMPTS_PER_SCREEN.md prompt 1; reference-images/01-login-signup-reference.png.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Polish the existing sign-in and registration screen, including email/password inputs, Sign In / Create Account switching, inline error handling, loading/disabled state, product mark, and the exact punchline “Split the secret. Survive the outage. Verify every byte.” Preserve existing endpoint calls, payloads, auth token storage, and successful auth transition.
>
> Prohibited in this phase: No API/auth logic refactor. Do not invent password reset, terms, privacy, MFA, or external auth features.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
