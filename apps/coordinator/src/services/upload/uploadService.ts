import { randomUUID } from 'crypto';
import { FileRecord } from '@dfs-sss/shared-types';
import { fileRepository } from '../../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('UploadService');

export class UploadService {
  /**
   * Creates and persists a FileRecord with status 'UPLOADED'.
   *
   * This is the ONLY responsibility of UploadService — no encryption,
   * no distribution, no SSS. Those belong to the orchestrator and
   * subsequent pipeline stages respectively.
   */
  createFileRecord(
    fileId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    ownerId: string,
  ): FileRecord {
    const fileRecord: FileRecord = {
      fileId,
      filename,
      mimeType,
      sizeBytes,
      status: 'UPLOADED',
      ownerId,
      createdAt: new Date().toISOString(),
    };

    fileRepository.saveFileRecord(fileRecord);

    logger.info(
      { fileId, filename, status: fileRecord.status },
      'File record persisted successfully',
    );

    return fileRecord;
  }
}

export const uploadService = new UploadService();
