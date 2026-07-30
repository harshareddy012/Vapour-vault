import express from 'express';
import cors from 'cors';
import path from 'path';
import { StorageManager } from './storageManager.js';
import { createServiceLogger } from '@dfs-sss/logger';

const PORT = parseInt(process.env.PORT || '5001', 10);
const NODE_NAME = process.env.NODE_NAME || `node-${PORT}`;
const STORAGE_DIR = process.env.STORAGE_DIR || `./storage_node_data/${NODE_NAME}`;

const logger = createServiceLogger(NODE_NAME);
const storageManager = new StorageManager(NODE_NAME, STORAGE_DIR);

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Health Check Endpoint
app.get('/health', async (req, res) => {
  const healthy = await storageManager.isHealthy();
  res.json({
    nodeName: NODE_NAME,
    status: healthy ? 'ACTIVE' : 'INACTIVE',
    port: PORT,
    isHealthy: healthy,
    timestamp: new Date().toISOString(),
  });
});

// Store Chunk or Share Endpoint
app.post('/chunks/store', async (req, res) => {
  try {
    const { fileId, chunkKey, dataBase64 } = req.body;
    if (!fileId || !chunkKey || !dataBase64) {
      return res.status(400).json({ error: 'fileId, chunkKey, and dataBase64 are required.' });
    }
    const data = Buffer.from(dataBase64, 'base64');
    const result = await storageManager.saveChunk(fileId, chunkKey, data);
    res.json({ success: true, nodeName: NODE_NAME, ...result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to store chunk');
    res.status(500).json({ error: error.message });
  }
});

// Retrieve Chunk or Share Endpoint
app.get('/chunks/retrieve/:fileId/:chunkKey', async (req, res) => {
  try {
    const { fileId, chunkKey } = req.params;
    const data = await storageManager.readChunk(fileId, chunkKey);
    res.json({
      success: true,
      nodeName: NODE_NAME,
      fileId,
      chunkKey,
      dataBase64: data.toString('base64'),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to retrieve chunk');
    res.status(404).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  logger.info({ node: NODE_NAME, port: PORT, storageDir: STORAGE_DIR }, 'Storage node operational');
});
