# Screen-by-Screen UI Specification

The **eight main app destinations are mandatory** and must appear in the persistent authenticated navigation in this exact order. Login is pre-auth. The additional process mockups are subviews/states inside the named destinations, not extra main-nav items.

## 0. Login / Sign Up (pre-authentication)

**Purpose:** Safely let users sign in or create an account using the existing API.

**Content:** Vapour Vault wordmark, short purpose, email and password fields, Sign In / Create Account switch, primary action, inline error, disabled/loading state, and the punch line: **“Split the secret. Survive the outage. Verify every byte.”** Optional quiet footer links only if real routes exist; do not invent privacy/terms pages.

**Behavior:** Preserve current register/login URLs, exact payloads, token storage, and auth transition. No new auth provider, new endpoint, password storage change, or session rewrite.

**Reference:** `reference-images/01-login-signup-reference.png`.

## Mandatory section 1. Dashboard

**Purpose:** Fast operational overview of the actual vault and cluster.

**Required layout:** Header with current user and system state; compact System Overview with counts; Storage Nodes mini-matrix; Recent Activity; recent files/recovery/verification summary if data exists. The node indicators should look dense and engineered, not like three marketing KPI cards. Resource usage can be linked to Nodes.

**Display only available data:** Number of registered/healthy nodes, file count, recent operation records, recovery threshold/configuration, checksum status, and total size only if provided/derived safely. If a stat is missing, show an explicit unavailable state or omit it. Do not print “99.99% integrity” unless mathematically calculated from a defined and available population.

**Reference:** `reference-images/02-dashboard-reference.png`.

## Mandatory section 2. Upload

**Purpose:** Select a file, calculate its local reference hash, upload with existing authentication, and present the confirmed cryptographic/distribution result.

**Idle state:** Drop/select zone, file name/type/size after selection, source SHA-256 fingerprint, and the fixed scheme actually used by the backend (currently expected to be K=3/N=5 only if confirmed by the checked-out code). Avoid misleading sliders for values the backend ignores.

**Processing state:** Stages for AES-256-GCM encryption, Shamir key splitting, data erasure coding, distribution, and metadata response. Use binary/ciphertext output with clear stage states. The backend does not necessarily stream per-stage progress. If the request is a single synchronous request, say “Coordinator processing request” and do not fake per-stage percentages or timed checkmarks. On response, derive the result from fields actually returned.

**Shard Distribution view inside Upload:** Central encrypted file object, five node destinations, dotted lines animated toward nodes, each node changing from neutral to green only when distribution is confirmed by actual data. Show shard/share mapping only if the API response exposes it. Show algorithm and a display-truncated checksum/fingerprint. Full hash can be revealed/copied. Truncation is for display/readability, not a security boundary.

**Reference:** `reference-images/03-upload-reference.png`, `reference-images/04-encryption-process-reference.png`, `reference-images/05-shard-distribution-reference.png`.

## Mandatory section 3. Files

**Purpose:** Browse stored files and reconstruct/download them.

**Content:** Real file table with file name, size, MIME type, uploaded timestamp, ID or checksum fingerprint if available, status if real, and Download/Reconstruct action. Include inline result/error; no alerts. Make it clear when metadata is absent. Include search/filter only if it can be implemented without changing backend behavior, for example client-side filtering of already fetched records.

**Behavior:** Use the existing files-list and download APIs and preserve the file bytes. Show actual response errors. Do not fake files/date/status.

**Image prompt:** See the Files prompt in `IMAGE_PROMPTS_PER_SCREEN.md`.

## Mandatory section 4. Nodes

**Purpose:** Operational inventory and available telemetry for the five storage nodes.

**Required per-node facts where available:** Node ID/name, online/offline/unknown, host/address and port, storage/shard allocation, RAM, disk/storage used/capacity, CPU, network I/O, and last health update. Use small task-manager-style sparklines/graphs only for real samples or measured values supplied by the API. If memory/CPU/bytes are not exposed, show “Telemetry unavailable from current API”; never insert sample-looking values.

**Visual state:** Thin green outline for online, red outline for offline/error. Brief transition blink when an API-confirmed online state changes. No infinite animation. Explicitly distinguish health status from resource telemetry.

**Live Network Activity subpanel:** Real timestamps, source/target, action, shard/chunk ID, bytes, duration, and outcome only if captured by the existing API or measured by an actual frontend request. If the frontend only knows a single aggregate upload/download request, show that aggregate request and do not pretend it knows the internal node-to-node distribution path.

**Reference:** `reference-images/09-nodes-system-monitor-reference.png`.

## Mandatory section 5. Recovery Lab

**Purpose:** Demonstrate the project's fault-tolerance behavior with actual simulator and recovery responses.

**Controls:** All nodes online baseline, two nodes offline test, three nodes offline negative test, and restore all nodes. Only expose controls supported by current APIs. Use existing simulator routes, not direct process-killing from the browser.

**Results:** Show Expected separately from Observed. Display which nodes are marked offline, whether the reconstruction request actually succeeded, response/error details, available reconstruction share counts and durations, and what evidence is available. When the configured threshold is three, the UI may describe the conceptual expectations as 2-node outage should remain recoverable / 3-node outage may cross the threshold, but actual outcome must come from the request and code's real behavior.

**Graphs:** Node health over time only if there are actual samples. Otherwise show the current-state timeline and a clear “historical telemetry unavailable” label.

**Reference:** `reference-images/06-recovery-lab-reference.png`.

## Mandatory section 6. Verification

**Purpose:** Provide the most important proof: the downloaded/reconstructed file has exactly the same bytes as the original selected file.

**Comparison:** Original/uploaded file vs downloaded/reconstructed file. Show file name/size and SHA-256 hash on both sides, an explicit equality result, and detailed report. The full hash values must be compared programmatically. Display may truncate them visually with a reveal/copy control.

**Computation:** Use Web Crypto SHA-256 on `await file.arrayBuffer()` for the selected source and on the downloaded Blob's `arrayBuffer()`. Normalize digest formatting to lowercase hex and compare complete digests. Use a baseline from the actual upload response/file record or a client-calculated source digest preserved for that file. Do not label display truncation as privacy protection.

**Success criterion:** Show `INTEGRITY VERIFIED` only if the original baseline digest exists, the recovered bytes are available, and their complete SHA-256 digests match. Show `MISMATCH` on a difference, `NOT VERIFIED` if the baseline is missing, and `ERROR` if download/reconstruction failed. Never default to success.

**Detailed report fields:** file ID, original/recovered names and byte lengths, algorithm, full original/recovered SHA-256 values behind reveal/copy affordances, exact match outcome, actual reconstruction headers/timing, and actual node/shard evidence where exposed. Separate `data shards reconstructed` from `Shamir key shares used`.

**Reference:** `reference-images/08-integrity-verification-reference.png`.

## Mandatory section 7. Analytics

**Purpose:** Summarize system use without manufacturing observability.

**Possible metrics if real:** uploads succeeded/failed, bytes handled, download/reconstruction durations, integrity-pass/fail counts, current/historical node availability, and node events. Label the time window and the data source.

**If no analytics/history API exists:** Build a compact “This browser session” view only from actual client-observed operations (request completion time, status, selected file sizes) and make the scope explicit. Do not seed charts with random data, fake old timestamps, or assume data persisted server-side. No backend endpoint additions.

**Image prompt:** See Analytics prompt in `IMAGE_PROMPTS_PER_SCREEN.md`.

## Mandatory section 8. Settings

**Purpose:** Show real account/session and interface preferences without inventing security controls.

**May include:** Signed-in email/identity, sign out, and harmless local presentation preferences if valuable. Only show password change, MFA, API keys, retention controls, server config, or cryptographic settings if a real supported flow already exists. Never display JWTs, passwords, secrets, raw key material, or Shamir shares.

**Image prompt:** See Settings prompt in `IMAGE_PROMPTS_PER_SCREEN.md`.

## Secondary screen state: Retrieval & Reconstruction (inside Recovery Lab)

Use a four-stage or five-stage progress rail: collect data shards, reconstruct ciphertext, collect/reconstruct key shares, decrypt AES-GCM, verify output. Follow actual backend sequence; do not invent backend order or per-node fetch records. Use a Linux/boot-sequence feeling via binary/hex lines and stateful rows, not a circular loading icon. The display must distinguish a data shard from a key share. The terminal should show real client-observed request start/end plus server-supplied details, not synthetic node logs.

**Reference:** `reference-images/07-retrieval-reconstruction-reference.png`.
