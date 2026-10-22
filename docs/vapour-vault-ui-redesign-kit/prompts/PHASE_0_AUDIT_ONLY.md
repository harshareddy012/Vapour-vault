# Phase 0 Prompt — Audit Only, No Edits

Paste this to Claude Sonnet after it has read `CLAUDE_MASTER_PROMPT.md`.

> **Phase 0 only. READ-ONLY AUDIT. Do not modify any file.**
>
> Read root `CLAUDE.md` and all applicable repository agent instructions first. Inspect current `git status --short` and current branch, but do not run commands that change Git state. If the worktree is not clean, stop and report it. Do not stage, commit, checkout, stash, reset, clean, pull, or rebase.
>
> Inspect the current frontend and record: (1) app entry points and current navigation/auth gate, (2) exact files/components and CSS responsible for UI, (3) existing frontend dependencies and package scripts, (4) the existing Vite `/api` proxy target, (5) route contracts read-only from current backend source, (6) existing upload response fields, (7) existing download response headers, (8) whether original SHA-256 can be retrieved after upload/reload, (9) whether data-shard node mapping and per-node event telemetry are exposed, (10) which node RAM/CPU/disk metrics exist, (11) current simulator behavior, and (12) test/build commands.
>
> Compare your observations with `API_AND_INTEGRITY_GUARDRAILS.md`, but trust the current code if anything differs. Identify missing capabilities honestly. In particular, distinguish data shards from Shamir key shares and explain whether the UI can actually prove byte-for-byte equality and show per-node distribution using current data.
>
> Return a concise report with exact file paths, API calls/payloads/response fields, available metrics, risks, and a proposed phased file scope. Do not write code, create files, install dependencies, or edit docs. End by asking for explicit approval to begin Phase 1.
