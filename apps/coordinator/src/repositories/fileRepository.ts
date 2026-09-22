import { FileRecord, FileMetadata, EncryptedChunkMeta, ShareMetadata } from '@dfs-sss/shared-types';

export class FileRepository {
  private fileRecords: Map<string, FileRecord> = new Map();
  private files: Map<string, FileMetadata> = new Map();
  private chunks: Map<string, EncryptedChunkMeta[]> = new Map(); // fileId -> chunks
  private shares: Map<string, ShareMetadata[]> = new Map(); // fileId -> shares

  saveFileRecord(fileRecord: FileRecord): void {
    this.fileRecords.set(fileRecord.fileId, fileRecord);
  }

  getFileRecord(fileId: string): FileRecord | undefined {
    return this.fileRecords.get(fileId);
  }

  getAllFileRecords(): FileRecord[] {
    return Array.from(this.fileRecords.values());
  }

  saveFile(file: FileMetadata): void {
    this.files.set(file.id, file);
  }

  getFile(id: string): FileMetadata | undefined {
    return this.files.get(id);
  }

  getAllFiles(): FileMetadata[] {
    return Array.from(this.files.values());
  }

  saveChunks(fileId: string, chunks: EncryptedChunkMeta[]): void {
    this.chunks.set(fileId, chunks);
  }

  getChunks(fileId: string): EncryptedChunkMeta[] {
    return this.chunks.get(fileId) || [];
  }

  saveShares(fileId: string, shares: ShareMetadata[]): void {
    this.shares.set(fileId, shares);
  }

  getShares(fileId: string): ShareMetadata[] {
    return this.shares.get(fileId) || [];
  }
}

export const fileRepository = new FileRepository();
