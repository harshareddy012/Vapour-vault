# Vapour Vault UI Redesign Kit

## Start here

This kit is for a **frontend-only, phased redesign** of Vapour Vault. The uploaded green-on-black storyboard is the visual anchor. The target is a restrained black/green security workstation with binary/ciphertext motion, purposeful terminal output, dense operational data, and an explicit proof of file integrity.

### Files in this kit

- `CLAUDE_MASTER_PROMPT.md` — paste this to Claude Sonnet first.
- `MANDATORY_PHASE_PLAN.md` — the non-negotiable phase order and exit gates.
- `UI_DESIGN_SYSTEM.md` — exact visual rules and the “anti-vibecoded” guardrails.
- `SCREEN_BY_SCREEN_SPEC.md` — required content and behavior for every section.
- `API_AND_INTEGRITY_GUARDRAILS.md` — backend boundary, evidence labels, checksums, metrics, and honest fallback behavior.
- `IMAGE_PROMPTS_PER_SCREEN.md` — separate prompt for each individual screen/component concept.
- `reference-images/` — the original storyboard plus nine focused crops from it.
- `prompts/PHASE_0_AUDIT_ONLY.md` — first prompt to use after opening the repository.
- `prompts/PHASE_TEMPLATE.md` — repeatable prompt template for each later phase.

## Suggested usage sequence

1. Open the **existing stable repository** in Antigravity/Claude Sonnet. Do not start a new app or move files.
2. Confirm the Git working tree is clean and create your own UI branch before any coding-agent edits. Do this yourself, not via an agent's destructive command.
3. Give Claude `CLAUDE_MASTER_PROMPT.md` and ask it to read `CLAUDE.md` and the repository's applicable agent instructions.
4. Run only `prompts/PHASE_0_AUDIT_ONLY.md`. It is an audit-only phase: no code changes.
5. Review its report. Approve Phase 1 explicitly. Do not let Claude execute multiple phases at once.
6. At every phase boundary, review the diff, run the frontend build/test commands confirmed from `apps/frontend/package.json`, verify the current app still works, and make your own Git checkpoint before proceeding.

## Mandatory navigation

The authenticated app must contain these **eight visible, persistent navigation sections** in this order:

1. Dashboard
2. Upload
3. Files
4. Nodes
5. Recovery Lab
6. Verification
7. Analytics
8. Settings

Login / Sign Up is the pre-authentication screen, not a ninth authenticated navigation section. Shard Distribution is an important step/view inside Upload. Retrieval & Reconstruction is a view/state within Recovery Lab, and its integrity proof is surfaced in Verification.

## Important truth rule

The mockups are visual references, not proof that those sample numbers exist in the running system. No hard-coded metrics, node telemetry, fake network events, fake reconstruction timings, or fabricated successful hashes. If the current backend does not expose a piece of information, show “Not available from current API” or an equivalent honest empty state; do not add backend endpoints as a workaround.
