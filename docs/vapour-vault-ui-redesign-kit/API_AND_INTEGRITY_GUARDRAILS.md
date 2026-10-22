# Backend Preservation and Integrity Proof Rules

## Highest-priority boundary

The task is UI polish only. Read backend code to understand it, but do not edit it. No API changes, schema/migration changes, cryptographic changes, new dependencies, or changes to server/storage-node behavior. Do not alter AES-256-GCM, Shamir Secret Sharing, or erasure coding. The current checked-out code is ground truth.

## Previously captured API notes: verify against current source before use

A frontend audit from the pre-polish baseline recorded these contracts. They are useful clues, not permission to assume the current implementation still matches:

| Method | Path | Auth | Previously observed purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ email, password }` -> token/user identity |
| POST | `/api/auth/login` | Public | `{ email, password }` -> token/user identity |
| GET | `/api/nodes` | Check current code | Node inventory and health counts |
| GET | `/api/simulator/state` | Check current code | Current node simulation state |
| POST | `/api/simulator/toggle/:nodeId` | Check current code | Toggle a simulated node state |
| GET | `/api/files` | Bearer token | File records and count |
| GET | `/api/files/:id` | Bearer token | Single file record |
| POST | `/api/files/upload` | Bearer token | Multipart file upload, field `file` |
| GET | `/api/files/:id/download` | Bearer token | Binary download/reconstruction |

The earlier audit recorded download headers `X-Reconstruction-Shares` and `X-Reconstruction-Time-Ms`, and an upload response with fields such as `fileId`, `filename`, `kThreshold`, `nShares`, `sharesDistributed`, `chunksDistributed`, and `checksumSha256`. Verify exact property names and route behavior from the checked-out source. Do not add missing endpoints. If values or headers differ, the code wins and the UI/report must say so.

## The file-equality proof

The UI must be able to make a defensible comparison of the source bytes selected before upload and the bytes returned by a reconstruction download.

1. On original file selection, compute SHA-256 with the browser's Web Crypto API. This runs in the browser and does not modify server cryptography.
2. Preserve the source digest associated with the returned `fileId` in frontend state. If persistence across refresh is needed, first check whether the current file record provides a trusted checksum. If not, a carefully scoped browser-side record may be considered, but disclose its local/session scope and do not imply that it is server-authoritative.
3. On download, read the actual returned Blob/ArrayBuffer and compute SHA-256 again.
4. Compare the complete normalized hexadecimal strings, not their truncated visual labels.
5. Display exact evidence. Matching hashes support that the downloaded bytes equal the bytes hashed as the original baseline. Do not imply this alone proves which physical node supplied each byte; that requires separate node/shard evidence.
6. If the baseline is missing, do not manufacture it from the downloaded file itself. Show `NOT VERIFIED`.
7. If a mismatch occurs, show both computed hashes and `MISMATCH`; don't force the download to appear successful.
8. Keep integrity checks independent of decorative loader animation. Loader bytes and displayed hash evidence must never share one fabricated value.

## Distinguish cryptographic and data evidence

- **AES-256-GCM** encrypts/authenticates file content.
- **Shamir key shares** reconstruct the encryption key under its K-of-N threshold.
- **Erasure-coded data shards** reconstruct encrypted file data under the code's shard threshold.
- A reconstruction share count is not automatically a count of data shards. Use the actual backend's meaning for each returned field.
- If the current API returns only `X-Reconstruction-Shares`, label that value as the API defines it; do not relabel it “data shards” unless code proves that meaning.
- Don't state “recovered from nodes 1, 2, 3” unless the API or actual operation telemetry identifies those nodes.

## Metrics and network activity

- Never fabricate RAM, CPU, disk, network bytes, shard placement, per-node timings, historical trends, or activity.
- If current API exposes node status but not utilization, show online/offline plus an honest “CPU/RAM telemetry not provided by current API” message. Do not make up numbers to match the mockup.
- If the current backend has no server event stream, show the actual frontend-observed HTTP request and elapsed time, labeled as client-observed. Don't call it an authoritative internal node-transfer log.
- It is acceptable to show the endpoint, method, start/end time measured by the browser, status code, and total request duration if those were actually observed.
- Don't use static green success indicators for operations that have not returned successfully.

## Simulator and test flow

- Use only existing documented simulator routes and inspect their implementation before choosing button behavior.
- Sequence async state changes with `await`; do not use unawaited `forEach(async ...)` flows.
- Show expected result and observed result separately. A test case label is not the proof of its outcome.
- Ensure restore-all uses a supported route/operation and reports partial errors.
- Do not launch shell processes, stop real nodes, run destructive commands, or mutate deployment settings from the browser unless there is an explicit existing safe API for that behavior.

## Error handling

Inline messages only, no `alert()`. Handle network refusal, 401/expired token, failed upload, failed reconstruction, missing headers, missing original digest, hash mismatch, and unavailable metrics distinctly. Do not swallow errors and then return a success state.
