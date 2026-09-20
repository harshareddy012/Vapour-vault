import { randomUUID } from 'crypto';
<<<<<<< HEAD
import { FileRecord, UploadFileResponse } from '@dfs-sss/shared-types';
=======
import { FileMetadata, UploadFileResponse } from '@dfs-sss/shared-types';
import { encryptionService } from '../encryption/encryptionService.js';
>>>>>>> be934f08dd1a02cc75e815a189f58e8d87ee49af
import { fileRepository } from '../../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('UploadService');

export class UploadService {
  /**
   * Receives a raw file buffer, encrypts it with AES-256-GCM, persists the
   * file metadata (iv, authTag, encryptionAlgo), and returns a minimal
   * response with only the information that genuinely exists at this stage.
   *
   * SSS key splitting, node selection, and distribution are handled by
   * subsequent pipeline tickets and are intentionally absent here.
   */
  async processUpload(
    filename: string,
    mimeType: string,
    fileBuffer: Buffer,
<<<<<<< HEAD
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
=======
  ): Promise<UploadFileResponse> {
    const fileId = `file-${randomUUID()}`;

    logger.info({ fileId, filename, sizeBytes: fileBuffer.length }, 'Processing file upload');

    // Step 1: AES-256-GCM encryption — pure symmetric encryption, no SSS.
    // encryptionResult.keyHex is temporary in-memory material. It is used
    // only to derive iv/authTag for the metadata record and is never
    // persisted, logged, or included in the HTTP response.
    const encryptionResult = encryptionService.encrypt(fileBuffer);

    logger.info({ fileId }, 'Encryption complete — storing file metadata');

    // Step 2: Persist file metadata.
    // kThreshold, nShares, checksumSha256 are intentionally omitted: they
    // belong to the SSS and integrity tickets respectively. Optional fields
    // are not fabricated with placeholder values.
    const fileMeta: FileMetadata = {
      id:              fileId,
      filename,
      mimeType,
      sizeBytes:       fileBuffer.length,
      encryptionAlgo:  'AES-256-GCM',
      authTag:         encryptionResult.authTag,
      iv:              encryptionResult.iv,
      createdAt:       new Date().toISOString(),
    };

    fileRepository.saveFile(fileMeta);

    logger.info({ fileId, filename }, 'File record saved');
>>>>>>> be934f08dd1a02cc75e815a189f58e8d87ee49af

    return {
      fileId,
      filename,
<<<<<<< HEAD
      message: 'File uploaded successfully.',
=======
      message: 'File uploaded and encrypted with AES-256-GCM. Key splitting and distribution pending.',
>>>>>>> be934f08dd1a02cc75e815a189f58e8d87ee49af
    };
  }
}

export const uploadService = new UploadService();

