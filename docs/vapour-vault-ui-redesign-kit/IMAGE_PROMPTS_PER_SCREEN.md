# Standalone Image Prompts for Vapour Vault Screens

Use one prompt at a time to make a **standalone 16:10 or 16:9 reference image**. Attach the corresponding crop from `reference-images/` when one exists. These are mockup-generation prompts, not permission to invent functionality in code. Image text may be approximate; the written requirements and current API are authoritative.

## Shared style suffix for every prompt

> High-fidelity desktop web application UI for Vapour Vault, a distributed encrypted file-storage security console. Near-black graphite background (#050806), dark green-black panels, restrained bright-green (#39e58b) primary actions and confirmed healthy states, thin green-gray borders, small 3–6px corners, no drop shadows, no glassmorphism, no purple, no rainbow colors. IBM Plex Mono-like technical headings and values paired with IBM Plex Sans-like readable interface text. Fine terminal typography, sparse 0/1 binary streams and hexadecimal/ciphertext fragments used as purposeful status visuals, not wallpaper. Dense, well-aligned operational UI, realistic readable hierarchy, believable engineering product, responsive desktop layout. No emojis, no Lucide icon set, no generic 3-card marketing row, no giant rounded bento cards, no fake testimonials, no decorative-only fake terminal, no circular spinner, no fake charts, no pastel palette, no harsh gradients, no radial orbs, no dot-grid background. Use thin line icons or minimal inline geometric marks only. Do not put impossible tiny gibberish everywhere; prioritize readability. Any illustrative sample values in the image are placeholders and must never be hard-coded into the real app.

## 1. Login / Sign Up

> Create a standalone desktop login/sign-up screen for “Vapour Vault”. On the left: a compact geometric vault/cube mark, product name, concise technical subheading, sparse vertical binary stream and wireframe data-shard motif. Include the punchline exactly: “Split the secret. Survive the outage. Verify every byte.” On the right: a sharply aligned sign-in panel with email, password, Sign In, Create Account toggle, and an inline error message state shown as a small variant. Use black/green engineering-console styling, no hero illustration that overwhelms the form, no generic startup marketing claims. Keep the authentication UI centered and credible. Use the shared style suffix.

Reference: `reference-images/01-login-signup-reference.png`.

## 2. Dashboard

> Create a desktop dashboard screen for the authenticated Vapour Vault app. A persistent left sidebar lists exactly: Dashboard, Upload, Files, Nodes, Recovery Lab, Verification, Analytics, Settings, in that order; Dashboard is active. In the main area show a compact System Overview (node count/health, files stored, recovery configuration only if available), a substantial Storage Nodes matrix with node ID, online/offline state, host/port, and RAM/disk/CPU only when telemetry is supplied, plus a Recent Activity table with action, file, time, and result. Make node telemetry feel robust and technical. Avoid a generic row of three marketing cards: use a compact stats strip/table and operational matrix. Use exact green/black style. Do not rely on fake percentage claims or fabricated data.

Reference: `reference-images/02-dashboard-reference.png`.

## 3. Upload File + Processing

> Create a standalone Upload section in Vapour Vault with the persistent eight-item sidebar; Upload is active. Show a clear file drop/select zone, selected filename/byte size/type, source SHA-256 fingerprint with truncated display and copy/reveal affordance, and one primary action “Encrypt & Distribute”. Below/next to it show a purposeful terminal-like process panel with steps for AES-256-GCM encryption, Shamir key splitting, erasure-coded data shards, distribution, and final metadata result. Stage rows use neutral/pending, in-progress, confirmed-success, and failure states. The in-flight loader must use rolling binary 0/1, SHA-like hex, or ciphertext lines and a linear/segmented progress bar, never a circular spinner. Show no fabricated progress percentages; the mockup should make it easy to replace the state with a real API result. Use the shared style suffix.

Reference: `reference-images/03-upload-reference.png` and `reference-images/04-encryption-process-reference.png`.

## 4. Shard Distribution (Upload subview)

> Create a high-fidelity, standalone shard distribution screen for Vapour Vault. A central encrypted-file block connects to five storage node panels with thin dotted paths. Animate conceptually from the file outward; each path reaches a node and that node changes from neutral gray outline to green only after confirmed success. Each node shows its actual shard/share label only when known, plus bytes written and duration only if returned by telemetry. A lower technical-details strip shows algorithm/configuration and a truncated SHA-256 fingerprint (prefix/ellipsis/suffix with reveal/copy; truncation is for display, not real cryptographic privacy). Offline/failed destinations have red outlines. Include concise real-process logs instead of decorative invented events. Do not imply that a UI animation proves a transfer. Use the shared style suffix.

Reference: `reference-images/05-shard-distribution-reference.png`.

## 5. Files

> Create a standalone Files section inside Vapour Vault with the fixed eight-item sidebar and Files active. Main content is a compact, precise file vault table, not a card gallery. Columns: filename/type, size, uploaded time, ID or SHA-256 fingerprint when available, real status, and Download/Reconstruct action. Include clear searching/filtering controls only if useful; an explicit empty state and inline download/recovery errors; one selected-file details pane with hash, size, and last real operation. Do not invent file rows or dates. Use black/green operations-console styling, thin borders, small corners, readable mono metadata. Use the shared style suffix.

No dedicated current crop; use the full storyboard plus Dashboard/Verification references.

## 6. Nodes & System Monitor

> Create an intensive storage-node monitoring screen for Vapour Vault. Persistent eight-item sidebar, Nodes active. Show a dense five-node list/matrix with each node's name/ID, host/IP and port if available, green thin outline for online, red thin outline for offline, current shard/share allocation if supplied, and utilization strips/graphs for CPU, RAM, disk, and network only where actual telemetry exists. If unavailable, the interface should explicitly show “Telemetry unavailable” rather than sample-looking fake values. Add a Network Activity feed with real timestamp, request/action, source/destination when exposed, shard identifier and bytes/time when exposed, and outcome. Give active node transitions a brief state-change blink then settle. Avoid perpetual glow. Use terminal-like timestamps without invented log lines. Use shared style suffix.

Reference: `reference-images/09-nodes-system-monitor-reference.png`.

## 7. Recovery Lab — Failure Demonstration

> Create a standalone Recovery Lab for testing the fault tolerance of a five-node encrypted storage system. Sidebar item Recovery Lab active. Provide an “All Nodes Online” baseline, “2 Nodes Offline” recovery scenario, “3 Nodes Offline” negative scenario, random-failure control only if supported, selected-file control, per-node online/offline toggles, and a distinct Run Test action. Show current nodes online in green outlines and offline nodes red. A compact health graph can be present only if based on real time-series events; otherwise use an honest current state and event timeline. Distinguish expected outcome from actual observed outcome. Include an output panel showing actual HTTP outcome, recovery threshold evidence and elapsed time if available. Use practical controls, no fake green success. Use the shared style suffix.

Reference: `reference-images/06-recovery-lab-reference.png`.

## 8. Retrieval & Reconstruction (Recovery Lab subview)

> Create a technical Retrieval & Reconstruction screen for Vapour Vault. Four or five clearly numbered stages, according to the existing backend's real order: retrieve available data shards, reconstruct encrypted data, retrieve/reconstruct Shamir key shares, AES-GCM decrypt, and verify output. A compact Linux boot-sequence feeling with real-looking-but-clearly illustrative binary and ciphertext status rows; the loader is rolling hexadecimal/binary text plus a horizontal segmented bar, never a circle. On the right list the actual known shards and nodes with states. Clearly separate “data shards” and “key shares”. Show collected counts and timing only from confirmed API responses/headers. End with success or failure states only after the backend returns. Use the shared style suffix.

Reference: `reference-images/07-retrieval-reconstruction-reference.png`.

## 9. Integrity Verification (Proof)

> Create a standalone Verification page for Vapour Vault with the persistent sidebar, Verification active. Show two side-by-side evidence panels: Original/Uploaded File and Downloaded/Reconstructed File. Each includes filename and exact byte count where known plus SHA-256 value shown in a readable truncated format with reveal/copy. Put a comparison indicator between them. Below, show a prominent result strip: “HASHES MATCH — FILE BYTES IDENTICAL” in green only when the complete computed digests match; mismatch in red; unavailable baseline in amber “NOT VERIFIED”. Add a detailed report with both full digests, algorithm, file ID, comparison outcome, actual recovered-share metadata, timings and node/shard evidence only when supplied by the system. Make it feel like a forensic evidence report, not a gamified success card. Use the shared style suffix.

Reference: `reference-images/08-integrity-verification-reference.png`.

## 10. Analytics

> Create an Analytics page for Vapour Vault, same fixed sidebar with Analytics active. Present clear, restrained line/bar charts for real upload/download counts, failures, actual recovery duration, integrity outcomes, and node availability where data exists. Every chart has a clear label, time window, units and data source. If only current-browser actions exist, frame the content as “This Session” and use only measured client-observed requests. When historical data is not available, show a useful empty/disabled explanation instead of seeded chart values. Keep a dense technical dashboard with thin axes/grid lines, green for normal operation and red for failures. No rainbow charts, gradients, 3-card marketing layout, or fake 99.99% claims. Use the shared style suffix.

No dedicated current crop; use Dashboard and Nodes references for visual consistency.

## 11. Settings

> Create a restrained Settings screen for Vapour Vault with Settings active in the persistent eight-item sidebar. Show the current signed-in identity, session actions such as sign out if supported, and a small Interface Preferences area for safe local preferences such as compact/comfortable density or reduced motion if implemented. Security settings like password reset, MFA, API key management, retention, or cryptographic parameters appear only if a real existing supported flow exists; otherwise do not design fake controls. Never display tokens, passwords, AES keys, or Shamir shares. Avoid toggles that do nothing. Use the same black/green console style.

No dedicated current crop; use Login and Dashboard references.

## Negative prompt / guardrails

> Do not redesign as a generic SaaS admin template. No purple-and-black, harsh gradients, glass cards, large pill corners, heavy drop shadows, pure white background, emojis, Lucide icon set, Inter/Geist/Space Grotesk, dot-grid/radial-orb background, three feature cards in a row, fake user testimonials, fake terminal logs, fake network activity, fake CPU/RAM/disk metrics, fake historical charts, fake checksum match, circular spinner, irrelevant animated arrows, or placeholder data hard-coded into the app. Keep all eight navigation items visible in authenticated screens.
