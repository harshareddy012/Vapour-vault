/**
 * StorageProvider Interface
 * Abstraction for object storage / disk backends (MinIO, S3, LocalDisk).
 */
export interface StorageProvider {
  storeChunk(bucket: string, key: string, data: Buffer): Promise<string>;
  getChunk(bucket: string, key: string): Promise<Buffer>;
  deleteChunk(bucket: string, key: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
