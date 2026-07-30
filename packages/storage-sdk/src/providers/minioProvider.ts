import fs from 'fs';
import path from 'path';
import { StorageProvider } from './storageProvider.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('MinIOProvider');

export class MinIOProvider implements StorageProvider {
  private baseDir: string;

  constructor(storageDir: string = './storage_data') {
    this.baseDir = path.resolve(storageDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async storeChunk(bucket: string, key: string, data: Buffer): Promise<string> {
    const bucketPath = path.join(this.baseDir, bucket);
    if (!fs.existsSync(bucketPath)) {
      fs.mkdirSync(bucketPath, { recursive: true });
    }
    const filePath = path.join(bucketPath, key);
    await fs.promises.writeFile(filePath, data);
    logger.debug({ bucket, key, bytes: data.length }, 'Stored chunk successfully');
    return filePath;
  }

  async getChunk(bucket: string, key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, bucket, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Chunk ${key} not found in bucket ${bucket}`);
    }
    return await fs.promises.readFile(filePath);
  }

  async deleteChunk(bucket: string, key: string): Promise<void> {
    const filePath = path.join(this.baseDir, bucket, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
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
