import express, { Request, Response } from 'express';
import cors from 'cors';
import { StorageManager } from './storageManager.js';
import { createServiceLogger } from '@dfs-sss/logger';

// ---------------------------------------------------------------------------
// Configuration — all values come from environment variables (never hardcoded)
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT ?? '5001', 10);
const NODE_NAME = process.env.NODE_NAME ?? `node-${PORT}`;
const STORAGE_DIR = process.env.STORAGE_DIR ?? `./storage`;

const logger = createServiceLogger(NODE_NAME);
const storageManager = new StorageManager(NODE_NAME, STORAGE_DIR);

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// ---------------------------------------------------------------------------
// GET /health
// Simple liveness probe — no business logic, just confirms the node is up.
// ---------------------------------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  const healthy = await storageManager.isHealthy();
  res.json({
    nodeName: NODE_NAME,
    status: healthy ? 'ACTIVE' : 'INACTIVE',
    port: PORT,
    storageDir: STORAGE_DIR,
    isHealthy: healthy,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /store
//
// Body:
//   { fileId: string, chunkId: string, data: string (base64) }
//
// Stores:
//   <STORAGE_DIR>/<fileId>/<chunkId>.bin
//
// Response:
//   { success: true }
// ---------------------------------------------------------------------------
app.post('/store', async (req: Request, res: Response) => {
  const { fileId, chunkId, data } = req.body as {
    fileId?: string;
    chunkId?: string;
    data?: string;
  };

  if (!fileId || !chunkId || !data) {
    res.status(400).json({ error: 'fileId, chunkId, and data (base64) are required.' });
    return;
  }

  try {
    const buffer = Buffer.from(data, 'base64');
    const { path: storagePath } = await storageManager.saveChunk(fileId, chunkId, buffer);

    logger.info(
      { node: NODE_NAME, fileId, chunkId, storagePath },
      'Chunk stored successfully via POST /store',
    );

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ node: NODE_NAME, fileId, chunkId, error: message }, 'Failed to store chunk');
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  logger.info(
    { node: NODE_NAME, port: PORT, storageDir: STORAGE_DIR },
    'Storage node operational',
  );
});
