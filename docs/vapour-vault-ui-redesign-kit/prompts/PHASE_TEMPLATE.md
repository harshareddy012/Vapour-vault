# Prompt Template — One UI Phase at a Time

Before using this template, replace `<PHASE_NUMBER_AND_NAME>` with exactly one phase from `MANDATORY_PHASE_PLAN.md`.

> Work on **<PHASE_NUMBER_AND_NAME> only**. All previous phases must remain stable. Read root `CLAUDE.md`, agent instructions, `CLAUDE_MASTER_PROMPT.md`, and the relevant UI kit sections. Check `git status --short`; if dirty, stop before editing. Do not perform destructive Git operations.
>
> First, before editing, report: objective; exact files to be touched (all under `apps/frontend/**`); existing handlers/hooks/API calls reused; expected visual result; functionality to preserve; regression risks; exact build/test scripts found in `apps/frontend/package.json`. Wait for my explicit approval.
>
> After approval, implement only this phase. Reuse existing APIs and code paths. Do not introduce placeholder backend routes or invented data. Do not change crypto, server code, endpoint contracts, auth/session storage, dependencies, or files outside `apps/frontend/**`. Honor `UI_DESIGN_SYSTEM.md` and the matching section of `SCREEN_BY_SCREEN_SPEC.md`. Use `IMAGE_PROMPTS_PER_SCREEN.md` and the matching numbered reference crop for visual alignment.
>
> When the phase is implemented, stop. Run the confirmed frontend checks and `git diff --check`. Report exact files changed, commands/results, what you verified manually, anything unavailable from the current API, and remaining limitations. Do not begin the next phase. Wait for review.
