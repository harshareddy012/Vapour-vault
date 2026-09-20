# CLAUDE.md

# Distributed File Storage System using Shamir Secret Sharing (DFS_SSS)

This document defines the architecture, coding standards, development workflow, and implementation constraints for this repository.

Everything in this document should be treated as the source of truth.

---

# 1. Project Goal

Build a secure distributed file storage system that demonstrates:

- Distributed systems concepts
- Fault tolerance
- Secure file encryption
- Secret sharing
- Modern backend architecture
- Production-quality code

This project is intended for learning and portfolio purposes while following real software engineering practices.

---

# 2. High-Level Architecture

Frontend
↓

Coordinator Service
↓

Storage Nodes
↓

Object Storage

↓

PostgreSQL (Metadata)

The coordinator is responsible for orchestration.

Storage nodes never communicate directly with each other.

The frontend never communicates directly with storage nodes.

---

# 3. Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Axios

## Backend

- Node.js
- Express
- TypeScript

## Database

- PostgreSQL
- Drizzle ORM

## Authentication

- JWT
- bcrypt

## Object Storage

- MinIO

## Logging

- Pino

## Package Manager

pnpm

---

# 4. Repository Structure

apps/

frontend/

coordinator/

storage-node/

packages/

shared-types/

config/

logger/

crypto-utils/

grpc-contracts/

storage-sdk/

docs/

infrastructure/

No additional top-level folders should be created unless necessary.

---

# 5. Development Philosophy

Prefer:

Small modules

Incremental implementation

Readable code

Composition over inheritance

Single Responsibility Principle

Avoid:

Large monolithic files

Premature optimization

Magic numbers

Deep nesting

Duplicated code

---

# 6. Architecture Rules

Frontend only communicates with Coordinator.

Coordinator orchestrates the system.

Storage Nodes only store and retrieve data.

Database stores metadata only.

Object storage stores encrypted payloads.

Never store uploaded files inside PostgreSQL.

---

# 7. Cryptography Rules

IMPORTANT:

Do NOT implement cryptographic algorithms manually.

Use battle-tested libraries whenever possible.

For Shamir Secret Sharing:

Use:

secrets.js-grempe

Wrap the library inside our own abstraction.

Expose ONLY:

splitSecret()

combineSecret()

The rest of the project must never directly call secrets.js.
## Library Policy

Whenever a mature, battle-tested library exists for a problem that is not the learning objective of this project, prefer using the library behind an abstraction rather than implementing the algorithm manually.

Examples:

- Shamir Secret Sharing → secrets.js-grempe
- Password Hashing → bcrypt
- JWT → jsonwebtoken
- Logging → Pino

The objective is to learn distributed systems architecture, not to reimplement well-established libraries.

---

# 8. Encryption Workflow

Upload

↓

Generate AES-256-GCM key

↓

Encrypt file

↓

Split AES key using Shamir Secret Sharing

↓

Store encrypted payload

↓

Distribute secret shares

Download

↓

Collect shares

↓

Reconstruct AES key

↓

Decrypt payload

Never split the encrypted file.

Only split the AES key.

---

# 9. Database Rules

Database stores:

Users

Storage Nodes

File Metadata

Never store binary files inside PostgreSQL.

---

# 10. Logging Rules

Never use:

console.log()

Use Pino logger everywhere.

Every log should contain useful structured information.

Prefer:

logger.info()

logger.warn()

logger.error()

---

# 11. Configuration Rules

Never hardcode:

Ports

URLs

Secrets

Passwords

API Keys

Everything should come from environment variables.

Configuration should be loaded through the config package.

---

# 12. Error Handling

Never silently ignore errors.

Always:

Return meaningful error messages.

Log failures.

Avoid empty catch blocks.

---

# 13. Coding Standards

Use TypeScript strict mode.

Prefer async/await.

Avoid callback-based APIs.

Keep functions small.

Use meaningful variable names.

No commented-out code.

No unused imports.

---

# 14. Dependency Rules

Prefer stable libraries.

Avoid unnecessary dependencies.

Before adding a dependency:

Check whether an existing package already solves the problem.

---

# 15. AI Development Workflow

Before implementing any feature:

Read:

CLAUDE.md

Relevant documentation in docs/

Understand current architecture.

Implement ONLY the requested module.

Do not continue to future modules unless explicitly instructed.

---

# 16. Implementation Rules

Never implement multiple roadmap phases at once.

Finish one module completely.

Explain:

New folders

New files

Dependencies added

Architectural decisions

Then stop.

---

# 17. Documentation

When implementing a module:

Keep documentation synchronized.

If architecture changes:

Update docs.

---

# 18. Git Workflow

Keep commits focused.

One feature per commit.

Use descriptive commit messages.

Do not mix unrelated changes.

---

# 19. Project Quality

Prioritize:

Correctness

Maintainability

Readability

Architecture

Over:

Fancy UI

Premature optimization

---

# 20. Success Criteria

Every feature should satisfy:

Readable code

Production-quality structure

Type safety

Proper logging

Proper error handling

Modular design

Minimal duplication

Documentation updated

---

# 21. Notes for Claude

Assume this repository is being developed by a student to learn distributed systems and backend engineering.

When implementing code:

Prefer teaching over hiding complexity.

Explain architectural decisions whenever introducing a new component.

Do not skip explanations.

If a better design exists, explain it before implementing.

Never rewrite the architecture unless explicitly instructed.