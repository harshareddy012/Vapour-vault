import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { calculateSHA256 } from '@dfs-sss/crypto-utils';
import { fileRepository } from '../../repositories/fileRepository.js';
import { nodeRepository } from '../../repositories/nodeRepository.js';
import { fileOrchestrator } from '../orchestrator/fileOrchestrator.js';
import { DownloadService } from './downloadService.js';
import { FileController } from '../../controllers/fileController.js';
import { LocalFileProvider } from '@dfs-sss/storage-sdk';

const BASE_TEST_DIR = path.resolve('./test-cluster-live');
const servers: http.Server[] = [];

/**
 * Creates and starts a real HTTP storage node process for integration testing.
 */
function startLiveStorageNode(port: number, nodeName: string, storageDir: string): Promise<http.Server> {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100mb' }));

  const provider = new LocalFileProvider(storageDir);

  app.get('/health', async (_req, res) => {
    const healthy = await provider.healthCheck();
    res.json({ nodeName, status: healthy ? 'ACTIVE' : 'INACTIVE', port, isHealthy: healthy });
  });

  app.post('/store', async (req, res) => {
    const { fileId, chunkId, data } = req.body as { fileId?: string; chunkId?: string; data?: string };
    if (!fileId || !chunkId || !data) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }
    try {
      const buffer = Buffer.from(data, 'base64');
      await provider.storeChunk(fileId, chunkId, buffer);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/retrieve', async (req, res) => {
    const { fileId, chunkId } = req.query as { fileId?: string; chunkId?: string };
    if (!fileId || !chunkId) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }
    try {
      const buffer = await provider.getChunk(fileId, chunkId);
      res.json({ data: buffer.toString('base64') });
    } catch (err: unknown) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

beforeAll(async () => {
  // Ensure DrizzleFileRepository connects to Neon PostgreSQL
  fileRepository.resetToDefault();

  // Create clean isolated test cluster directories
  fs.mkdirSync(BASE_TEST_DIR, { recursive: true });

  for (let i = 1; i <= 5; i++) {
    const nodeDir = path.join(BASE_TEST_DIR, `node-${i}`);
    fs.mkdirSync(nodeDir, { recursive: true });
    const server = await startLiveStorageNode(5000 + i, `node-${i}`, nodeDir);
    servers.push(server);
  }
}, 30000);

afterAll(async () => {
  for (const s of servers) {
    s.close();
  }
  // Clean up test directories
  try {
    fs.rmSync(BASE_TEST_DIR, { recursive: true, force: true });
  } catch {}
});

beforeEach(() => {
  for (let i = 1; i <= 5; i++) {
    nodeRepository.setNodeSimulatedStatus(`node-${i}`, true);
  }
});

describe('Live Distributed Data Layer & 3-of-5 Fault-Tolerant Integration', () => {
  const originalPlaintext = crypto.randomBytes(8192); // 8 KB binary test file
  const originalChecksum = calculateSHA256(originalPlaintext);
  const ownerAlice = `owner-alice-${Date.now()}`;
  let liveFileId = '';

  it('uploads, erasure-encodes ciphertext, splits key, and distributes to 5 live storage nodes', async () => {
    const uploadRes = await fileOrchestrator.handleUpload(
      'dataset-8kb.bin',
      'application/octet-stream',
      originalPlaintext,
      ownerAlice,
    );

    expect(uploadRes.fileId).toBeDefined();
    expect(uploadRes.sharesDistributed).toBe(5);
    expect(uploadRes.chunksDistributed).toBe(5);
    expect(uploadRes.checksumSha256).toBe(originalChecksum);
    liveFileId = uploadRes.fileId;

    // Verify metadata persisted in Neon PostgreSQL
    const dbFile = await fileRepository.getFile(liveFileId);
    expect(dbFile).toBeDefined();
    expect(dbFile?.filename).toBe('dataset-8kb.bin');
    expect(dbFile?.sizeBytes).toBe(originalPlaintext.length);
    expect(dbFile?.cipherSizeBytes).toBeGreaterThan(0);
    expect(dbFile?.checksumSha256).toBe(originalChecksum);
    expect(dbFile?.ownerId).toBe(ownerAlice);

    const dbChunks = await fileRepository.getChunks(liveFileId);
    expect(dbChunks).toHaveLength(5);

    const dbShares = await fileRepository.getShares(liveFileId);
    expect(dbShares).toHaveLength(5);

    // Verify physical isolation: each node directory holds ONLY its assigned shard & share
    for (let i = 1; i <= 5; i++) {
      const nodeDir = path.join(BASE_TEST_DIR, `node-${i}`, liveFileId);
      expect(fs.existsSync(nodeDir)).toBe(true);

      const shardFile = path.join(nodeDir, `shard-${i}.bin`);
      const shareFile = path.join(nodeDir, `share-${i}.bin`);
      expect(fs.existsSync(shardFile)).toBe(true);
      expect(fs.existsSync(shareFile)).toBe(true);

      // Verify node does NOT hold other nodes' shards
      for (let j = 1; j <= 5; j++) {
        if (i !== j) {
          expect(fs.existsSync(path.join(nodeDir, `shard-${j}.bin`))).toBe(false);
          expect(fs.existsSync(path.join(nodeDir, `share-${j}.bin`))).toBe(false);
        }
      }
    }
  }, 30000);

  it('survives coordinator restart: reconstructs and decrypts with fresh service instance reading from PostgreSQL', async () => {
    // Fresh service instance with zero prior in-memory state
    const freshCoordinator = new DownloadService();
    const result = await freshCoordinator.downloadFile(liveFileId);

    expect(result.data).toEqual(originalPlaintext);
    expect(result.data.length).toBe(originalPlaintext.length);
    expect(calculateSHA256(result.data)).toBe(originalChecksum);
    expect(result.sharesRetrieved).toBe(3);
    expect(result.shardsRetrieved).toBe(3);
  }, 20000);

  it('successfully recovers and decrypts the file for ALL 10 possible combinations of 3 surviving nodes', async () => {
    // Generate all 10 combinations of 3 choose 5
    const allCombinations: [number, number, number][] = [];
    for (let a = 1; a <= 5; a++) {
      for (let b = a + 1; b <= 5; b++) {
        for (let c = b + 1; c <= 5; c++) {
          allCombinations.push([a, b, c]);
        }
      }
    }
    expect(allCombinations).toHaveLength(10);

    const downloadService = new DownloadService();

    for (const [n1, n2, n3] of allCombinations) {
      // Set only the 3 designated surviving nodes online; take other 2 offline
      for (let i = 1; i <= 5; i++) {
        const isSurviving = i === n1 || i === n2 || i === n3;
        nodeRepository.setNodeSimulatedStatus(`node-${i}`, isSurviving);
      }

      const result = await downloadService.downloadFile(liveFileId);
      expect(result.data).toEqual(originalPlaintext);
      expect(calculateSHA256(result.data)).toBe(originalChecksum);
      expect(result.sharesRetrieved).toBe(3);
      expect(result.shardsRetrieved).toBe(3);
    }
  }, 40000);

  it('rejects download when fewer than 3 nodes are available (e.g. 3 nodes offline)', async () => {
    // Only node-1 and node-2 remain (3 nodes offline: 3, 4, 5)
    nodeRepository.setNodeSimulatedStatus('node-3', false);
    nodeRepository.setNodeSimulatedStatus('node-4', false);
    nodeRepository.setNodeSimulatedStatus('node-5', false);

    const downloadService = new DownloadService();
    await expect(downloadService.downloadFile(liveFileId)).rejects.toThrow('Insufficient');
  });

  it('detects and rejects corrupted data shard with checksum mismatch', async () => {
    // Corrupt shard on node-3 directly on disk
    const shardPath = path.join(BASE_TEST_DIR, 'node-3', liveFileId, 'shard-3.bin');
    const originalShardBytes = fs.readFileSync(shardPath);
    const corruptedShardBytes = Buffer.from(originalShardBytes);
    corruptedShardBytes[0] ^= 0xff; // Flip bits
    fs.writeFileSync(shardPath, corruptedShardBytes);

    try {
      // Surviving nodes: node-3 (corrupted), node-4, node-5. Only 2 valid shards remain!
      nodeRepository.setNodeSimulatedStatus('node-1', false);
      nodeRepository.setNodeSimulatedStatus('node-2', false);

      const downloadService = new DownloadService();
      await expect(downloadService.downloadFile(liveFileId)).rejects.toThrow('Insufficient data shards');
    } finally {
      // Restore valid shard
      fs.writeFileSync(shardPath, originalShardBytes);
    }
  });

  it('fails decryption when AES-GCM authentication tag is corrupted in database', async () => {
    const meta = await fileRepository.getFile(liveFileId);
    expect(meta).toBeDefined();

    // Tamper with auth tag in DB
    const originalTag = meta!.authTag;
    await fileRepository.saveFile({ ...meta!, authTag: '00'.repeat(16) });

    try {
      const downloadService = new DownloadService();
      await expect(downloadService.downloadFile(liveFileId)).rejects.toThrow('Decryption failed');
    } finally {
      // Restore valid tag
      await fileRepository.saveFile({ ...meta!, authTag: originalTag });
    }
  });

  it('enforces ownership: unauthorized user cannot download file', async () => {
    const res = {
      status: (code: number) => ({
        json: (data: any) => ({ code, data }),
      }),
    };

    const controller = new FileController();
    let statusCode = 0;
    let jsonBody: any = null;

    const mockRes = {
      status: (c: number) => {
        statusCode = c;
        return {
          json: (d: any) => { jsonBody = d; },
        };
      },
    };

    await controller.downloadFile(
      { params: { id: liveFileId }, user: { userId: 'unauthorized-bob' } } as any,
      mockRes as any,
    );

    expect(statusCode).toBe(404);
    expect(jsonBody).toEqual({ error: 'File not found.' });
  });

  it('fails upload cleanly if fewer than K nodes are available during distribution', async () => {
    // Disable 3 nodes so only 2 nodes are healthy
    nodeRepository.setNodeSimulatedStatus('node-1', false);
    nodeRepository.setNodeSimulatedStatus('node-2', false);
    nodeRepository.setNodeSimulatedStatus('node-3', false);

    await expect(
      fileOrchestrator.handleUpload('doomed.bin', 'text/plain', Buffer.from('hello'), ownerAlice),
    ).rejects.toThrow('Insufficient healthy nodes');
  });
});
