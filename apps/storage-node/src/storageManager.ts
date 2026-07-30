import path from 'path';
import { MinIOProvider } from '@dfs-sss/storage-sdk';
import { calculateSHA256 } from '@dfs-sss/crypto-utils';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('StorageManager');

export class StorageManager {
  private provider: MinIOProvider;
  private nodeName: string;

  constructor(nodeName: string, storageDir: string) {
    this.nodeName = nodeName;
    this.provider = new MinIOProvider(storageDir);
  }

  async saveChunk(fileId: string, chunkKey: string, data: Buffer): Promise<{ checksum: string; path: string }> {
    const checksum = calculateSHA256(data);
    const savedPath = await this.provider.storeChunk(fileId, chunkKey, data);
    logger.info({ node: this.nodeName, fileId, chunkKey, checksum }, 'Chunk saved successfully');
    return { checksum, path: savedPath };
  }

  async readChunk(fileId: string, chunkKey: string): Promise<Buffer> {
    const data = await this.provider.getChunk(fileId, chunkKey);
    logger.info({ node: this.nodeName, fileId, chunkKey, bytes: data.length }, 'Chunk read successfully');
    return data;
  }

  async isHealthy(): Promise<boolean> {
    return await this.provider.healthCheck();
  }
}
