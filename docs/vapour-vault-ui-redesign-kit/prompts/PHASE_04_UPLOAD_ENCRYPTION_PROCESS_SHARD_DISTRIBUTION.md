# Phase 4 Prompt — Upload + Encryption Process + Shard Distribution

> **Work on Phase 4 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: SCREEN_BY_SCREEN_SPEC.md section 2; API_AND_INTEGRITY_GUARDRAILS.md; IMAGE_PROMPTS_PER_SCREEN.md prompts 3 and 4; reference-images/03-upload-reference.png, 04-encryption-process-reference.png, and 05-shard-distribution-reference.png.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the Upload section and in-flow processing/distribution visualization using the existing upload handler and API contract. Show file selection, actual file metadata, client-computed original SHA-256, processing states, the existing encrypted/shard/share pipeline, and central-file-to-five-nodes diagram. Animate a node to confirmed green only when response data proves success.
>
> Prohibited in this phase: Do not implement fake streaming progress, fake per-node acknowledgements, invented placement/bytes/timings, or K/N controls the backend ignores. Do not change encryption, SSS, erasure coding, APIs, or server code.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
