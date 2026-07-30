# 10-Day Implementation & Execution Roadmap - DFS_SSS

This document outlines the day-by-day implementation schedule for building the **Distributed File System with Shamir's Secret Sharing (DFS_SSS)**.

---

## Day 1: Workspace & Infrastructure Setup
- **Objectives**: Initialize monorepo, pnpm workspace settings, Docker Compose configuration, PostgreSQL schema.
- **Modules**: `root`, `infrastructure/docker`, `infrastructure/postgres`, `packages/config`.
- **Deliverables**: Monorepo skeleton, Docker Compose configuration running Postgres, initialized SQL migration files.
- **Acceptance Criteria**: `pnpm install` succeeds across all packages; PostgreSQL starts and creates tables without error.

---

## Day 2: Authentication & User Management
- **Objectives**: User schema creation, password hashing (bcrypt), JWT authentication middleware, login/register endpoints.
- **Modules**: `apps/coordinator/src/routes`, `middleware`, `repositories`, `controllers`.
- **Deliverables**: Secured auth endpoints with HTTP test cases.
- **Acceptance Criteria**: Protected endpoints return `401 Unauthorized` without a valid JWT token.

---

## Day 3: File Upload Orchestration
- **Objectives**: File upload controller handling streaming uploads, file size limits, and DB record persistence.
- **Modules**: `apps/coordinator/src/services/upload`, `controllers`.
- **Deliverables**: File upload REST API storing file metadata in the `Files` PostgreSQL table.
- **Acceptance Criteria**: Database logs uploaded file record with accurate size and MIME type.

---

## Day 4: AES-256-GCM Encryption Engine
- **Objectives**: Implement modular symmetric encryption with authentication tag validation.
- **Modules**: `packages/crypto-utils/src/aes`, `random`.
- **Deliverables**: `encrypt.ts` and `decrypt.ts` modules with comprehensive unit tests.
- **Acceptance Criteria**: Unit tests pass with 100% byte-for-byte payload recovery after encryption/decryption.

---

## Day 5: Shamir's Secret Sharing Scheme Engine
- **Objectives**: Finite field $GF(2^8)$ math, polynomial evaluation, and Lagrange Interpolation for secret reconstruction.
- **Modules**: `packages/crypto-utils/src/sss`.
- **Deliverables**: `split.ts` and `combine.ts` modules with unit test coverage.
- **Acceptance Criteria**: Any $K$ shares successfully recover the AES key; fewer than $K$ shares fail to reconstruct.

---

## Day 6: Share & Chunk Distribution Service
- **Objectives**: Orchestrate distribution of encrypted file payload chunks and AES key shares across storage nodes.
- **Modules**: `apps/coordinator/src/services/distribution`, `packages/storage-sdk`.
- **Deliverables**: Distribution service routing shares to designated storage providers.
- **Acceptance Criteria**: Uploading a file splits the AES key into $N$ distinct secret shares distributed to $N$ target storage nodes.

---

## Day 7: File Download & Reconstruction Service
- **Objectives**: Query $K$ healthy nodes, retrieve key shares, reconstruct AES key, and stream decrypted file payload.
- **Modules**: `apps/coordinator/src/services/reconstruction`.
- **Deliverables**: File download REST API endpoint.
- **Acceptance Criteria**: Reconstructed file SHA-256 checksum matches the original uploaded file SHA-256 hash.

---

## Day 8: Storage Node Daemon & gRPC Integration
- **Objectives**: Lightweight Node service daemon with storage drivers and gRPC communication contracts.
- **Modules**: `apps/storage-node`, `packages/grpc-contracts`.
- **Deliverables**: Storage Node microservice holding payload chunks and shares.
- **Acceptance Criteria**: Storage nodes process store/retrieve chunk requests via REST and gRPC.

---

## Day 9: Node Health Subsystem & Failure Recovery
- **Objectives**: Heartbeat monitor, dynamic node registry, round-robin scheduler, and failure simulation endpoints.
- **Modules**: `apps/coordinator/src/services/health`, `frontend/simulator`.
- **Deliverables**: Background health monitor evicting dead nodes and updating system state.
- **Acceptance Criteria**: System automatically bypasses offline nodes during download/reconstruction.

---

## Day 10: Frontend UI Polish, Testing & Final Demo
- **Objectives**: Modern visual dashboard, interactive node ON/OFF failure toggles, end-to-end testing, architecture documentation.
- **Modules**: `apps/frontend`, `docs/ARCHITECTURE.md`, `README.md`.
- **Deliverables**: Interactive React UI supporting upload, node toggle simulator, and file reconstruction.
- **Acceptance Criteria**: Measurable Scenario 1 (2 nodes down $\to$ Success) and Scenario 2 (3 nodes down $\to$ Insufficient shares failure) succeed in E2E tests.
