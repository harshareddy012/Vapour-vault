# Distributed File System with Shamir's Secret Sharing (DFS_SSS)

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![pnpm Workspaces](https://img.shields.io/badge/pnpm-workspaces-orange.svg)](https://pnpm.io)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**DFS_SSS** is a zero-trust, fault-tolerant **Distributed File System** combining **AES-256-GCM symmetric encryption** with **Shamir's Secret Sharing (SSS)** over Finite Fields $GF(2^8)$.

```
                              +-----------------------+
                              |    React + Vite UI    |
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              |  Coordinator (Express)|
                              +-----------+-----------+
                                          |
                      +-------------------+-------------------+
                      | (SSS Split: K-of-N threshold shares)  |
                      v                   v                   v
              +---------------+   +---------------+   +---------------+
              | Storage Node 1|   | Storage Node 2|   | Storage Node N|
              +---------------+   +---------------+   +---------------+
```

---

## Key Features

- **AES-256-GCM Payload Protection**: File content is encrypted with a unique, randomly generated 256-bit symmetric key and IV.
- **Shamir's Secret Sharing ($K$-of-$N$)**: The master AES key is split into $N$ distinct shares using polynomial evaluation over $GF(2^8)$.
- **Zero-Knowledge Storage Nodes**: Storage nodes hold only encrypted chunks and secret shares. No single node has access to the encryption key or plain file content.
- **Modular Coordinator Microservice**: Divided cleanly into controllers, repositories, health monitors, and upload/distribution/reconstruction services.
- **Interactive Failure Simulator & Measurable Scenarios**:
  - Live ON/OFF node toggles in the React dashboard.
  - **Scenario 1** ($K=3, N=5$, 2 nodes down) $\to$ Recovery Successful.
  - **Scenario 2** ($K=3, N=5$, 3 nodes down) $\to$ Clean failure with `"Insufficient shares available"`.

---

## Monorepo Architecture

```
DFS_SSS/
├── apps/
│   ├── frontend/          # React + Vite Glassmorphism Dashboard
│   ├── coordinator/       # Express + TypeScript Modular Orchestrator
│   └── storage-node/      # Storage Node Daemon
├── packages/
│   ├── shared-types/      # Common TypeScript Interfaces
│   ├── config/            # Typed Configuration & Validation
│   ├── logger/            # Centralized Pino Logger
│   ├── crypto-utils/      # GF(2^8) SSS & AES-256-GCM Engine
│   ├── grpc-contracts/    # Protocol Buffers & gRPC Contracts
│   └── storage-sdk/       # StorageProvider & MinIO Interfaces
├── infrastructure/
│   ├── docker/            # Docker Compose multi-node specs
│   ├── postgres/          # Relational database migration scripts
│   └── minio/             # Object storage setup
└── docs/                  # Architecture & 10-Day Execution Roadmap
```

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 18.0.0`
- **pnpm**: `>= 8.0.0` (`npm install -g pnpm`)
- **Docker & Docker Compose** (Optional for containerized mode)

### Installation & Setup

1. **Install Monorepo Dependencies**:
   ```bash
   pnpm install
   ```

2. **Build All Workspace Packages**:
   ```bash
   pnpm build
   ```

3. **Start Core Cluster Services**:
   - Start Coordinator API Server (Port 4000):
     ```bash
     pnpm dev:coordinator
     ```
   - Start Storage Nodes (Port 5001 - 5005):
     ```bash
     pnpm dev:storage-node
     ```
   - Start Frontend Dashboard (Port 3000):
     ```bash
     pnpm dev:frontend
     ```

4. **Launch with Docker Compose** (Alternative):
   ```bash
   pnpm docker:up
   ```

---

## Verification & Automated Tests

Run unit tests across workspace packages to verify SSS $K$-of-$N$ secret recovery:

```bash
pnpm test
```

---

## Documentation

- **[Architecture Specification](file:///d:/academics_6th/Major_project_code_base/DFS_SSS/docs/ARCHITECTURE.md)**
- **[10-Day Implementation Roadmap](file:///d:/academics_6th/Major_project_code_base/DFS_SSS/docs/ROADMAP.md)**
