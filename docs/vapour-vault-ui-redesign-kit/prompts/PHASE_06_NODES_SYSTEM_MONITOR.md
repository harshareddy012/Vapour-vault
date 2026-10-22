# Phase 6 Prompt — Nodes + System Monitor

> **Work on Phase 6 only. Do not start any later phase.**
>
> Before editing, read the repository-root `CLAUDE.md`, all applicable agent rules, `CLAUDE_MASTER_PROMPT.md`, `MANDATORY_PHASE_PLAN.md`, and the relevant documents: SCREEN_BY_SCREEN_SPEC.md section 4; API_AND_INTEGRITY_GUARDRAILS.md; IMAGE_PROMPTS_PER_SCREEN.md prompt 6; reference-images/09-nodes-system-monitor-reference.png.
>
> Check `git status --short` and current branch without changing Git state. If the working tree is dirty, stop and report it. Do not run destructive Git operations.
>
> **First reply with a plan and make no edits yet.** List the exact `apps/frontend/**` files to change, existing functions/hooks/API calls to reuse, API data required, regression risks, and the exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, objective: Implement the Nodes page with actual node status/identity/address/port and any genuine shard/share mapping or telemetry available. Add CPU/RAM/disk/network graphs only if the current API supplies real measurement samples. Display an honest unavailable state otherwise. Build a network activity table from actual API events or measured client requests, clearly labeled by source.
>
> Prohibited in this phase: No fake utilization percentages, IPs, shard mappings, bytes, timings, events, or historical series. Do not add backend endpoints. Node online/offline styling must reflect actual API state.
>
> Additional rules: no dependency/package changes; no backend/server/package/crypto/database/API edits; no fabricated metric/event/hash claims; maintain the exact eight-section navigation labels and order; handle loading/error/empty states; respect reduced-motion preferences; do not use a circular spinner. Do not remove or rewrite unrelated code.
>
> After implementation, run the current frontend checks and `git diff --check`, inspect the full diff, and report exact changed files and results. Then stop and wait for review. Do not proceed to the next phase.
