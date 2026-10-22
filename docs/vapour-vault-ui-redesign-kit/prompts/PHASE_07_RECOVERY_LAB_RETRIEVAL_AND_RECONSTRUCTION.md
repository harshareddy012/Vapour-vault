# Phase 7 Prompt — Recovery Lab + Retrieval & Reconstruction

> **Work on Phase 7 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: SCREEN_BY_SCREEN_SPEC.md section 5 and secondary screen state; API_AND_INTEGRITY_GUARDRAILS.md; IMAGE_PROMPTS_PER_SCREEN.md prompts 7 and 8; reference-images/06-recovery-lab-reference.png and 07-retrieval-reconstruction-reference.png.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the Recovery Lab page using only existing simulator and download/reconstruction operations. Provide baseline, two-node-offline and three-node-offline scenarios if current APIs support them, with expected and observed outcomes clearly separated. Display actual failures/success, actual reconstruction details, and a binary/hex stage UI. Separate data shard facts from Shamir key-share facts.
>
> Prohibited in this phase: No fake success, fake internal server logs, guessed node-to-shard mapping, fake per-stage telemetry, or browser process killing. Await all async simulator calls and handle partial errors.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
