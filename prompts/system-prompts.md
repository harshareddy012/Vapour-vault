# System Prompts & LLM Agent Guidelines

This directory contains guidance prompts for AI agents extending the DFS_SSS monorepo.

## Code Conventions
- Monorepo package imports must use workspace syntax `@dfs-sss/<package-name>`.
- All crypto logic must reside strictly inside `packages/crypto-utils`.
- The `Coordinator` service must delegate business logic to its modular sub-services (`services/upload`, `services/encryption`, `services/distribution`, `services/reconstruction`, `services/health`).
- Avoid console.log; use `@dfs-sss/logger` Pino instance across all services.



## File Orchestrator guidelines

You are working inside an existing TypeScript monorepo for a distributed file system.

Before starting:
- Read Claude.md and strictly follow architecture rules
- Do NOT modify unrelated files
- Do NOT refactor existing working code
- Do NOT change service boundaries
- Only modify FileOrchestrator
- Preserve current upload, auth, DB, and storage-node behavior

---

CURRENT SYSTEM STATE:

- Auth (JWT) is working
- File upload is working
- AES-256-GCM encryption is implemented
- FileOrchestrator exists but only handles upload + encryption
- Storage nodes are implemented and running on ports 5001–5005
- Each storage node exposes:
  POST /store { fileId, chunkId, data (base64) }

- Shamir Secret Sharing utilities already exist in:
  packages/crypto-utils/src/sss/

---

TASK: IMPLEMENT DISTRIBUTION LAYER

Modify ONLY FileOrchestrator to extend the upload pipeline.

---

REQUIRED FLOW:

1. After encryption:
   - Extract keyHex from encryption result
   - Convert keyHex → Buffer

2. Split encryption key using existing SSS utility:
   - n = 5 shares
   - k = 3 threshold

3. Define storage nodes:

   const nodes = [
     'http://localhost:5001',
     'http://localhost:5002',
     'http://localhost:5003',
     'http://localhost:5004',
     'http://localhost:5005'
   ];

4. Distribute shares:

   For each share:
   - Send POST request to node /store
   - Body:
     {
       fileId,
       chunkId: `share-${index}`,
       data: base64 encoded share
     }

5. Store encrypted file:

   - Send ciphertext to node-1
   - chunkId = "ciphertext"
   - data = base64(ciphertext)

6. Logging:

   - Log fileId, chunkId, and node URL
   - Use existing logger (no console.log)

7. Error handling:

   - If a node fails, log error
   - Do NOT crash the system
   - Continue distributing remaining shares

8. Response update:

   Return:
   {
     fileId,
     filename,
     message: "File distributed successfully",
     nShares: 5,
     kThreshold: 3,
     sharesDistributed: 5
   }

---

STRICT CONSTRAINTS:

- DO NOT modify UploadService
- DO NOT modify storage-node code
- DO NOT modify repository layer
- DO NOT introduce new architecture
- DO NOT refactor existing code
- Only extend FileOrchestrator

---

OUTPUT REQUIRED:

- Only the updated FileOrchestrator code
- No explanations
