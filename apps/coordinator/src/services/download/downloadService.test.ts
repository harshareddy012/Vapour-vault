import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { FileController } from '../../controllers/fileController.js';
import { fileRepository, InMemoryFileRepository } from '../../repositories/fileRepository.js';
import { nodeRepository } from '../../repositories/nodeRepository.js';
import { fileOrchestrator } from '../orchestrator/fileOrchestrator.js';
import { DownloadService } from './downloadService.js';

let inMemoryRepo: InMemoryFileRepository;

beforeEach(() => {
  inMemoryRepo = new InMemoryFileRepository();
  fileRepository.setRepository(inMemoryRepo);
});

afterEach(() => {
  fileRepository.resetToDefault();
  vi.unstubAllGlobals();
  for (let index = 1; index <= 5; index++) {
    nodeRepository.setNodeSimulatedStatus(`node-${index}`, true);
  }
});

async function createStoredFile(ownerId = 'owner-1', disableNode1 = true) {
  const plaintext = Buffer.from([0, 1, 2, 127, 128, 255]);
  const stored = new Map<string, string>();
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input.toString());
    const port = Number(url.port);
    const nodeId = `node-${port - 5000}`;
    if (url.pathname === '/store' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { fileId: string; chunkId: string; data: string };
      stored.set(`${nodeId}/${body.fileId}/${body.chunkId}`, body.data);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const chunkId = url.searchParams.get('chunkId');
    const fileId = url.searchParams.get('fileId');
    const value = chunkId && fileId ? stored.get(`${nodeId}/${fileId}/${chunkId}`) : undefined;
    return value
      ? new Response(JSON.stringify({ data: value }), { status: 200 })
      : new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  }));

  if (disableNode1) {
    nodeRepository.setNodeSimulatedStatus('node-1', false);
  }
  const upload = await fileOrchestrator.handleUpload(
    'round-trip.bin',
    'application/octet-stream',
    plaintext,
    ownerId,
  );
  if (disableNode1) {
    nodeRepository.setNodeSimulatedStatus('node-1', true);
  }

  const fileId = upload.fileId;
  const metadata = (await fileRepository.getFile(fileId))!;
  return { fileId, plaintext, metadata, stored };
}

describe('DownloadService', () => {
  it('fails clearly when file metadata does not exist', async () => {
    await expect(new DownloadService().downloadFile('unknown-file')).rejects.toThrow('File metadata not found');
  });

  it('retrieves recorded placements and decrypts the original bytes', async () => {
    const { fileId, plaintext } = await createStoredFile();

    const result = await new DownloadService().downloadFile(fileId);

    expect(result.data).toEqual(plaintext);
    expect(result.filename).toBe('round-trip.bin');
    expect(result.sharesRetrieved).toBe(3);
    expect(result.shardsRetrieved).toBe(3);
  });

  it('fails authentication when the stored GCM tag is incorrect', async () => {
    const { fileId, metadata } = await createStoredFile();
    await fileRepository.saveFile({ ...metadata, authTag: '00'.repeat(16) });

    await expect(new DownloadService().downloadFile(fileId)).rejects.toThrow('Decryption failed');
  });

  it('rejects corrupted data shard before attempting decryption', async () => {
    const { fileId, stored } = await createStoredFile();
    // Corrupt one data shard on node-2
    stored.set(`node-2/${fileId}/shard-1`, Buffer.from('corrupted shard data').toString('base64'));

    // Other shards should still be retrieved or fail if fewer than K valid shards remain
    // If we take down node-4 and node-5, leaving only node-2 (corrupted) and node-3, recovery fails
    nodeRepository.setNodeSimulatedStatus('node-4', false);
    nodeRepository.setNodeSimulatedStatus('node-5', false);

    await expect(new DownloadService().downloadFile(fileId)).rejects.toThrow('Insufficient data shards');
  });

  it('fails clearly when fewer than the recorded threshold of shares are retrievable', async () => {
    const { fileId } = await createStoredFile();
    nodeRepository.setNodeSimulatedStatus('node-5', false);
    nodeRepository.setNodeSimulatedStatus('node-3', false);
    nodeRepository.setNodeSimulatedStatus('node-4', false);

    await expect(new DownloadService().downloadFile(fileId)).rejects.toThrow('Insufficient shares');
  });

  it('recovers successfully when any 2 of the 5 storage nodes are unavailable', async () => {
    // Upload with all 5 nodes available so each node receives exactly 1 shard and 1 share
    const { fileId, plaintext } = await createStoredFile('owner-1', false);

    // Disable any 2 storage nodes (e.g. node-2 and node-5)
    nodeRepository.setNodeSimulatedStatus('node-2', false);
    nodeRepository.setNodeSimulatedStatus('node-5', false);

    const result = await new DownloadService().downloadFile(fileId);
    expect(result.data).toEqual(plaintext);
    expect(result.sharesRetrieved).toBe(3);
    expect(result.shardsRetrieved).toBe(3);
  });
});

describe('FileController ownership checks', () => {
  it('does not download a file owned by another authenticated user', async () => {
    const { fileId } = await createStoredFile('owner-1');
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const fetchCallsBeforeDownload = vi.mocked(fetch).mock.calls.length;

    await new FileController().downloadFile(
      { params: { id: fileId }, user: { userId: 'owner-2', email: 'other@example.com' } } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: 'File not found.' });
    expect(fetch).toHaveBeenCalledTimes(fetchCallsBeforeDownload);
  });
});
