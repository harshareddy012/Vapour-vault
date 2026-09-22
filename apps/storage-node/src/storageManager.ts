import path from 'path';
import { LocalFileProvider } from '@dfs-sss/storage-sdk';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('StorageManager');

/**
 * StorageManager
 *
 * Single-responsibility wrapper over LocalFileProvider.
 * Handles the fileId/chunkId → disk path mapping and logs
 * every operation with structured metadata for observability.
 *
 * Storage layout on disk:
 *   <storageDir>/<fileId>/<chunkId>.bin
 */
export class StorageManager {
  private readonly provider: LocalFileProvider;
  private readonly nodeName: string;
  private readonly storageDir: string;

  constructor(nodeName: string, storageDir: string) {
    this.nodeName = nodeName;
    this.storageDir = path.resolve(storageDir);
    this.provider = new LocalFileProvider(this.storageDir);
  }

  /**
   * Persist a raw binary chunk to disk.
   * Returns the absolute path where the data was written.
   */
  async saveChunk(fileId: string, chunkId: string, data: Buffer): Promise<{ path: string }> {
    const savedPath = await this.provider.storeChunk(fileId, chunkId, data);

    logger.info(
      { node: this.nodeName, fileId, chunkId, storagePath: savedPath, bytes: data.length },
      'Chunk saved to disk',
    );

    return { path: savedPath };
  }

  /**
   * Read a previously stored chunk from disk.
   */
  async readChunk(fileId: string, chunkId: string): Promise<Buffer> {
    const data = await this.provider.getChunk(fileId, chunkId);

    logger.info(
      { node: this.nodeName, fileId, chunkId, bytes: data.length },
      'Chunk read from disk',
    );

    return data;
  }

  /**
   * Verify the storage directory is writable.
   */
  async isHealthy(): Promise<boolean> {
    return this.provider.healthCheck();
  }
}
