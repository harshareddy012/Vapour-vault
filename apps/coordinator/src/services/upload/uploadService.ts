import { randomUUID } from 'crypto';
import { FileRecord, UploadFileResponse } from '@dfs-sss/shared-types';
import { fileRepository } from '../../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('UploadService');

export class UploadService {
  async processUpload(
    filename: string,
    mimeType: string,
    fileBuffer: Buffer,
    ownerId: string
  ): Promise<UploadFileResponse> {
    const fileId = `file-${randomUUID()}`;

    logger.info({ fileId, filename, sizeBytes: fileBuffer.length, ownerId }, 'Processing file upload');

    const fileRecord: FileRecord = {
      fileId,
      filename,
      mimeType,
      sizeBytes: fileBuffer.length,
      status: 'UPLOADED',
      ownerId,
      createdAt: new Date().toISOString(),
    };

    fileRepository.saveFileRecord(fileRecord);

    logger.info({ fileId, filename, status: fileRecord.status }, 'File record persisted successfully');

    return {
      fileId,
      filename,
      message: 'File uploaded successfully.',
    };
  }
}

export const uploadService = new UploadService();
