import fs from 'fs';
import path from 'path';
import { StorageProvider } from './storageProvider.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('LocalFileProvider');

/**
 * LocalFileProvider
 *
 * Stores chunks on the local filesystem at:
 *   <baseDir>/<bucket>/<key>.bin
 *
 * Implements the StorageProvider interface so it can be swapped for
 * MinIO or S3 in production without changing the layer above it.
 */
export class LocalFileProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor(storageDir: string = './storage') {
    this.baseDir = path.resolve(storageDir);
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  async storeChunk(bucket: string, key: string, data: Buffer): Promise<string> {
    const bucketDir = path.join(this.baseDir, bucket);
    fs.mkdirSync(bucketDir, { recursive: true });

    const filePath = path.join(bucketDir, `${key}.bin`);
    await fs.promises.writeFile(filePath, data);

    logger.debug({ bucket, key, bytes: data.length, path: filePath }, 'Chunk stored on disk');
    return filePath;
  }

  async getChunk(bucket: string, key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, bucket, `${key}.bin`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Chunk not found: ${filePath}`);
    }

    return fs.promises.readFile(filePath);
  }

  async deleteChunk(bucket: string, key: string): Promise<void> {
    const filePath = path.join(this.baseDir, bucket, `${key}.bin`);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.debug({ bucket, key, path: filePath }, 'Chunk deleted from disk');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.promises.access(this.baseDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
