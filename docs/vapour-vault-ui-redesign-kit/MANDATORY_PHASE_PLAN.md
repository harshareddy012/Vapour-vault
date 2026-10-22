# Mandatory UI Phase Plan

**Rule: every phase is implemented and reviewed separately. No phase may silently absorb another.** The exact eight app sections are mandatory even if their screens are built over multiple phases.

## Phase 0 — Read-only baseline and API audit (no edits)

Deliver: Git/worktree report, current frontend structure, route/navigation behavior, package scripts, every endpoint actually used, request/response contracts, current crypto-related frontend call sites, simulator behavior, data available for metrics/history, and risks. Compare the checked-out source to the known contract notes in `API_AND_INTEGRITY_GUARDRAILS.md`. The current repository source wins if anything differs. Stop for user approval.

**Exit gate:** User understands the current files and API limits. No files changed.

## Phase 1 — Design tokens and application shell

Implement only the shared visual foundation: CSS tokens, typography, page background, restrained borders, responsive layout primitives, persistent sidebar/top bar, and the eight mandatory navigation labels in order. Keep each section selectable, even if some are temporarily honest “Phase not implemented yet” content panels. Do not redesign section contents in this phase. Preserve the current auth gate and API behavior.

**Exit gate:** App boots, all eight sections are visible and selectable, no console/runtime errors, frontend build passes.

## Phase 2 — Login / Sign Up

Polish the existing sign-in/register form without changing endpoint payloads, password handling, JWT storage, or redirect/auth behavior. Add the punchline: **“Split the secret. Survive the outage. Verify every byte.”** Inline error/success states only. Keep the design technical, not a marketing landing page.

**Exit gate:** Existing registration and login both work with the same API; invalid credentials display readable inline errors.

## Phase 3 — Dashboard

System overview, recently performed operations, storage-cluster summary, and compact node-health view. Make the dashboard a real overview, not a separate source of fake data. The detailed resource graphs belong in Nodes; recent integrity results may link to Verification.

**Exit gate:** Every number and activity row is from current APIs or explicitly labeled client-observed session data. No invented resource values.

## Phase 4 — Upload, processing, and shard distribution

Create the upload section with file picker/drop target, filename/size, client-side source SHA-256, and the existing authenticated upload call. Show the phases: encryption, Shamir key splitting, data erasure coding/sharding, distribution, metadata result. Include the animated central-file-to-five-nodes diagram as a visualization of **confirmed response facts**, not guessed progress.

Before each node lights green, require actual evidence from the API response/event available to the frontend. If the API returns only aggregate counts, animate only a truthful aggregate/confirmed outcome; do not make up per-node acknowledgement events. A request can show an in-flight binary/ciphertext loader, but not fabricated per-stage percentages.

**Exit gate:** Upload still uses the existing API/payload. Confirmed `fileId`, threshold, share count, chunk count, and checksum fields are rendered only when actually returned.

## Phase 5 — Files

Real file listing, filename, byte size, MIME type/date where provided, fingerprint where available, and download/reconstruct action. Include loading, empty, error, and download states. Do not invent files or dates.

**Exit gate:** File list comes from the existing endpoint and normal download still returns original bytes.

## Phase 6 — Nodes and System Monitor

Five-node operations view: status, node name/host/port, shard/share allocation if returned, health changes, and resource graphs only if the API truly provides those measurements. Distinguish node liveness from CPU/RAM/disk telemetry. Add a compact network activity feed only from real backend events or clearly labeled frontend-observed requests.

Online nodes use a thin green outline; offline nodes use a red outline. On state transition, animate a brief blink/pulse, then settle to a static status. No infinite flashing.

**Exit gate:** Current statuses and toggles agree with the existing simulator API; unavailable telemetry is explicitly marked unavailable.

## Phase 7 — Recovery Lab (Failure Demonstration + Retrieval & Reconstruction)

Provide selectable test scenarios using the existing simulator routes. At minimum, represent the intended positive scenario (two nodes offline, recover if the existing implementation supports it) and negative scenario (three nodes offline, expect failure only if the configured threshold/behavior supports that conclusion). Do not promise expected outcomes as actual outcomes: show expected and observed separately. Use a binary/ciphertext/hex “boot sequence” loader, stage-by-stage result rows, and per-node evidence only when available.

Show “shards retrieved” and “key shares reconstructed” as separate metrics. Prefer a compact progress rail made from numbered phases and hexadecimal/binary stream, not a circle spinner. Respect cancellation/errors and restore the simulator only using supported API operations.

**Exit gate:** Scenario results reflect actual HTTP results and reconstruction outcomes. Failed scenarios do not show success styling.

## Phase 8 — Verification

Show original/uploaded file and downloaded/reconstructed file side by side. Compute SHA-256 from the original `File` bytes and downloaded `Blob` bytes using `crypto.subtle.digest('SHA-256', ...)`. Compare full normalized hashes. Use the trusted source hash from the existing upload response or available file record when appropriate. If the original hash is only in current browser memory, clearly communicate that scope; do not silently claim durable verification after reload. If no baseline hash exists, show “Not verified” and explain why.

Report: fileId, name/size (if available), algorithm, original hash, recovered hash, equality status, request/reconstruction headers that actually exist, and the actual recovery count/telemetry available. Provide copy controls for full hashes with a default truncated display. Make it clear that truncation is a display choice, not a cryptographic privacy boundary.

**Exit gate:** Green “Integrity verified” appears only on a real exact hash match. Mutated bytes must fail verification.

## Phase 9 — Analytics

Summaries/graphs based only on real data the current backend provides. If no historical metrics endpoint exists, use a clearly titled “This session” panel built from real client-observed actions/timestamps; do not pretend it is server-side historical analytics. Do not add a backend route.

**Exit gate:** Chart values have a real source and honest labels. No seeded fake time series.

## Phase 10 — Settings

Expose only settings the current frontend/backend genuinely supports, such as profile identity display and sign-out, and safe presentation preferences if useful. Do not present nonfunctional security configuration or fake password/2FA controls. Never expose secrets or tokens in the UI.

**Exit gate:** Settings are functional or explicitly marked unavailable; auth/session behavior remains intact.

## Phase acceptance checklist (every phase)

- [ ] User approved the phase plan before edits.
- [ ] Only the authorized phase and frontend files changed.
- [ ] No API contract or backend/crypto file changed.
- [ ] Existing flows still work.
- [ ] Build and available tests pass.
- [ ] `git diff --check` passes.
- [ ] No hardcoded fake data, fake events, or unsupported claims.
- [ ] Claude reports exact files changed and waits for the user before the next phase.
