import { randomUUID } from 'crypto';
import { FileMetadata, UploadFileResponse } from '@dfs-sss/shared-types';
import { encryptionService } from '../encryption/encryptionService.js';
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

    return {
      fileId,
      filename,
      message: 'File uploaded and encrypted with AES-256-GCM. Key splitting and distribution pending.',
    };
  }
}

export const uploadService = new UploadService();

