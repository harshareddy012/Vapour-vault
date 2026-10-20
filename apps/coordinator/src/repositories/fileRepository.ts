import { eq, asc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { files, encryptedChunks, secretShares } from '../db/schema.js';
import {
  FileRecord,
  FileMetadata,
  EncryptedChunkMeta,
  ShareMetadata,
  FileStatus,
} from '@dfs-sss/shared-types';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('FileRepository');

export interface IFileRepository {
  saveFileRecord(fileRecord: FileRecord): Promise<void>;
  getFileRecord(fileId: string): Promise<FileRecord | undefined>;
  getAllFileRecords(): Promise<FileRecord[]>;
  saveFile(file: FileMetadata): Promise<void>;
  getFile(id: string): Promise<FileMetadata | undefined>;
  getAllFiles(): Promise<FileMetadata[]>;
  saveChunks(fileId: string, chunks: EncryptedChunkMeta[]): Promise<void>;
  getChunks(fileId: string): Promise<EncryptedChunkMeta[]>;
  saveShares(fileId: string, shares: ShareMetadata[]): Promise<void>;
  getShares(fileId: string): Promise<ShareMetadata[]>;
}

export class DrizzleFileRepository implements IFileRepository {
  async saveFileRecord(fileRecord: FileRecord): Promise<void> {
    logger.debug({ fileId: fileRecord.fileId }, 'Saving file record to database');
    await db
      .insert(files)
      .values({
        id: fileRecord.fileId,
        filename: fileRecord.filename,
        mimeType: fileRecord.mimeType,
        sizeBytes: fileRecord.sizeBytes,
        cipherSizeBytes: 0,
        encryptionAlgo: 'AES-256-GCM',
        authTag: '',
        iv: '',
        kThreshold: 3,
        nShares: 5,
        checksumSha256: '',
        ownerId: fileRecord.ownerId,
        status: fileRecord.status,
        createdAt: new Date(fileRecord.createdAt),
      })
      .onConflictDoUpdate({
        target: files.id,
        set: {
          filename: fileRecord.filename,
          mimeType: fileRecord.mimeType,
          sizeBytes: fileRecord.sizeBytes,
          status: fileRecord.status,
          ownerId: fileRecord.ownerId,
        },
      });
  }

  async getFileRecord(fileId: string): Promise<FileRecord | undefined> {
    const rows = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      fileId: r.id,
      filename: r.filename,
      mimeType: r.mimeType,
      sizeBytes: Number(r.sizeBytes),
      status: r.status as FileStatus,
      ownerId: r.ownerId,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async getAllFileRecords(): Promise<FileRecord[]> {
    const rows = await db.select().from(files);
    return rows.map((r) => ({
      fileId: r.id,
      filename: r.filename,
      mimeType: r.mimeType,
      sizeBytes: Number(r.sizeBytes),
      status: r.status as FileStatus,
      ownerId: r.ownerId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async saveFile(file: FileMetadata): Promise<void> {
    logger.debug({ fileId: file.id }, 'Persisting full file metadata to database');
    await db
      .insert(files)
      .values({
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        cipherSizeBytes: file.cipherSizeBytes ?? 0,
        encryptionAlgo: file.encryptionAlgo || 'AES-256-GCM',
        authTag: file.authTag,
        iv: file.iv,
        kThreshold: file.kThreshold ?? 3,
        nShares: file.nShares ?? 5,
        checksumSha256: file.checksumSha256 || '',
        ownerId: file.ownerId || '',
        status: (file.status as FileStatus) || 'DISTRIBUTED',
        createdAt: file.createdAt ? new Date(file.createdAt) : new Date(),
      })
      .onConflictDoUpdate({
        target: files.id,
        set: {
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          cipherSizeBytes: file.cipherSizeBytes ?? 0,
          encryptionAlgo: file.encryptionAlgo || 'AES-256-GCM',
          authTag: file.authTag,
          iv: file.iv,
          kThreshold: file.kThreshold ?? 3,
          nShares: file.nShares ?? 5,
          checksumSha256: file.checksumSha256 || '',
          ownerId: file.ownerId || '',
          status: (file.status as FileStatus) || 'DISTRIBUTED',
        },
      });
  }

  async getFile(id: string): Promise<FileMetadata | undefined> {
    const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return {
      id: r.id,
      filename: r.filename,
      mimeType: r.mimeType,
      sizeBytes: Number(r.sizeBytes),
      cipherSizeBytes: Number(r.cipherSizeBytes),
      encryptionAlgo: r.encryptionAlgo,
      authTag: r.authTag,
      iv: r.iv,
      createdAt: r.createdAt.toISOString(),
      kThreshold: r.kThreshold,
      nShares: r.nShares,
      checksumSha256: r.checksumSha256,
      ownerId: r.ownerId,
      status: r.status as FileStatus,
    };
  }

  async getAllFiles(): Promise<FileMetadata[]> {
    const rows = await db.select().from(files);
    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      mimeType: r.mimeType,
      sizeBytes: Number(r.sizeBytes),
      cipherSizeBytes: Number(r.cipherSizeBytes),
      encryptionAlgo: r.encryptionAlgo,
      authTag: r.authTag,
      iv: r.iv,
      createdAt: r.createdAt.toISOString(),
      kThreshold: r.kThreshold,
      nShares: r.nShares,
      checksumSha256: r.checksumSha256,
      ownerId: r.ownerId,
      status: r.status as FileStatus,
    }));
  }

  async saveChunks(fileId: string, chunks: EncryptedChunkMeta[]): Promise<void> {
    logger.debug({ fileId, count: chunks.length }, 'Persisting chunk placement metadata to database');
    await db.delete(encryptedChunks).where(eq(encryptedChunks.fileId, fileId));
    if (chunks.length > 0) {
      await db.insert(encryptedChunks).values(
        chunks.map((c) => ({
          id: c.id,
          fileId: c.fileId,
          chunkIndex: c.chunkIndex,
          storageNodeId: c.storageNodeId,
          storageKey: c.storageKey,
          checksumSha256: c.checksumSha256,
          sizeBytes: c.sizeBytes,
          createdAt: new Date(),
        })),
      );
    }
  }

  async getChunks(fileId: string): Promise<EncryptedChunkMeta[]> {
    const rows = await db
      .select()
      .from(encryptedChunks)
      .where(eq(encryptedChunks.fileId, fileId))
      .orderBy(asc(encryptedChunks.chunkIndex));

    return rows.map((r) => ({
      id: r.id,
      fileId: r.fileId,
      chunkIndex: r.chunkIndex,
      storageNodeId: r.storageNodeId,
      storageKey: r.storageKey,
      checksumSha256: r.checksumSha256,
      sizeBytes: Number(r.sizeBytes),
    }));
  }

  async saveShares(fileId: string, shares: ShareMetadata[]): Promise<void> {
    logger.debug({ fileId, count: shares.length }, 'Persisting share placement metadata to database');
    await db.delete(secretShares).where(eq(secretShares.fileId, fileId));
    if (shares.length > 0) {
      await db.insert(secretShares).values(
        shares.map((s) => ({
          id: s.id,
          fileId: s.fileId,
          shareIndex: s.shareIndex,
          storageNodeId: s.storageNodeId,
          checksumSha256: s.checksumSha256,
          createdAt: new Date(),
        })),
      );
    }
  }

  async getShares(fileId: string): Promise<ShareMetadata[]> {
    const rows = await db
      .select()
      .from(secretShares)
      .where(eq(secretShares.fileId, fileId))
      .orderBy(asc(secretShares.shareIndex));

    return rows.map((r) => ({
      id: r.id,
      fileId: r.fileId,
      shareIndex: r.shareIndex,
      storageNodeId: r.storageNodeId,
      checksumSha256: r.checksumSha256,
    }));
  }
}

/**
 * In-memory repository implementation used exclusively for isolated unit testing
 * without requiring an active database connection.
 */
export class InMemoryFileRepository implements IFileRepository {
  private fileRecords: Map<string, FileRecord> = new Map();
  private files: Map<string, FileMetadata> = new Map();
  private chunks: Map<string, EncryptedChunkMeta[]> = new Map();
  private shares: Map<string, ShareMetadata[]> = new Map();

  async saveFileRecord(fileRecord: FileRecord): Promise<void> {
    this.fileRecords.set(fileRecord.fileId, fileRecord);
  }

  async getFileRecord(fileId: string): Promise<FileRecord | undefined> {
    return this.fileRecords.get(fileId);
  }

  async getAllFileRecords(): Promise<FileRecord[]> {
    return Array.from(this.fileRecords.values());
  }

  async saveFile(file: FileMetadata): Promise<void> {
    this.files.set(file.id, file);
  }

  async getFile(id: string): Promise<FileMetadata | undefined> {
    return this.files.get(id);
  }

  async getAllFiles(): Promise<FileMetadata[]> {
    return Array.from(this.files.values());
  }

  async saveChunks(fileId: string, chunks: EncryptedChunkMeta[]): Promise<void> {
    this.chunks.set(fileId, chunks);
  }

  async getChunks(fileId: string): Promise<EncryptedChunkMeta[]> {
    return this.chunks.get(fileId) || [];
  }

  async saveShares(fileId: string, shares: ShareMetadata[]): Promise<void> {
    this.shares.set(fileId, shares);
  }

  async getShares(fileId: string): Promise<ShareMetadata[]> {
    return this.shares.get(fileId) || [];
  }

  clear(): void {
    this.fileRecords.clear();
    this.files.clear();
    this.chunks.clear();
    this.shares.clear();
  }
}

/**
 * FileRepository Proxy delegating to Drizzle in production,
 * with ability to swap implementation in unit test suites.
 */
class FileRepositoryManager implements IFileRepository {
  private activeRepo: IFileRepository = new DrizzleFileRepository();

  setRepository(repo: IFileRepository): void {
    this.activeRepo = repo;
  }

  resetToDefault(): void {
    this.activeRepo = new DrizzleFileRepository();
  }

  saveFileRecord(fileRecord: FileRecord): Promise<void> {
    return this.activeRepo.saveFileRecord(fileRecord);
  }

  getFileRecord(fileId: string): Promise<FileRecord | undefined> {
    return this.activeRepo.getFileRecord(fileId);
  }

  getAllFileRecords(): Promise<FileRecord[]> {
    return this.activeRepo.getAllFileRecords();
  }

  saveFile(file: FileMetadata): Promise<void> {
    return this.activeRepo.saveFile(file);
  }

  getFile(id: string): Promise<FileMetadata | undefined> {
    return this.activeRepo.getFile(id);
  }

  getAllFiles(): Promise<FileMetadata[]> {
    return this.activeRepo.getAllFiles();
  }

  saveChunks(fileId: string, chunks: EncryptedChunkMeta[]): Promise<void> {
    return this.activeRepo.saveChunks(fileId, chunks);
  }

  getChunks(fileId: string): Promise<EncryptedChunkMeta[]> {
    return this.activeRepo.getChunks(fileId);
  }

  saveShares(fileId: string, shares: ShareMetadata[]): Promise<void> {
    return this.activeRepo.saveShares(fileId, shares);
  }

  getShares(fileId: string): Promise<ShareMetadata[]> {
    return this.activeRepo.getShares(fileId);
  }
}

export const fileRepository = new FileRepositoryManager();
