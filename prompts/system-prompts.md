# System Prompts & LLM Agent Guidelines

This directory contains guidance prompts for AI agents extending the DFS_SSS monorepo.

## Code Conventions
- Monorepo package imports must use workspace syntax `@dfs-sss/<package-name>`.
- All crypto logic must reside strictly inside `packages/crypto-utils`.
- The `Coordinator` service must delegate business logic to its modular sub-services (`services/upload`, `services/encryption`, `services/distribution`, `services/reconstruction`, `services/health`).
- Avoid console.log; use `@dfs-sss/logger` Pino instance across all services.
