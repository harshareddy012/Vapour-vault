# Phase 8 Prompt — Verification / Integrity Proof

> **Work on Phase 8 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: SCREEN_BY_SCREEN_SPEC.md section 6; API_AND_INTEGRITY_GUARDRAILS.md; IMAGE_PROMPTS_PER_SCREEN.md prompt 9; reference-images/08-integrity-verification-reference.png.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the verification view comparing original uploaded bytes and actual downloaded/reconstructed bytes. Compute SHA-256 on both byte arrays using browser Web Crypto, normalize full digest strings and compare. Show clear PASS/MISMATCH/NOT VERIFIED states and a detailed evidence report based only on real values.
>
> Prohibited in this phase: Never mark success when the baseline digest is missing. Never compare only truncated display strings. Do not imply a matching hash proves exact node provenance unless the API exposes that evidence. No backend changes.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
