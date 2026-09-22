import { randomUUID } from 'crypto';
import { UploadFileResponse } from '@dfs-sss/shared-types';
import { uploadService } from '../upload/uploadService.js';
import { encryptionService } from '../encryption/encryptionService.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('FileOrchestrator');

/**
 * FileOrchestrator owns the upload pipeline and coordinates services
 * that each have a single responsibility:
 *
 *   1. UploadService   → create and persist the FileRecord
 *   2. EncryptionService → AES-256-GCM encrypt the file buffer
 *
 * Future pipeline stages (SSS key splitting, distribution to storage
 * nodes) will be added here as separate steps — NOT inside the
 * individual services.
 */
export class FileOrchestrator {
  /**
   * Full upload pipeline:
   *   generate fileId → persist FileRecord → encrypt payload → respond
   *
   * The encrypted payload and keyHex are currently held in memory only.
   * Persistence of the encrypted blob and SSS key splitting belong to
   * subsequent tickets and are intentionally absent.
   */
  async handleUpload(
    filename: string,
    mimeType: string,
    fileBuffer: Buffer,
    ownerId: string,
  ): Promise<UploadFileResponse> {
    const fileId = `file-${randomUUID()}`;

    logger.info(
      { fileId, filename, sizeBytes: fileBuffer.length, ownerId },
      'Upload pipeline started',
    );

    // ── Step 1: Persist FileRecord (status: UPLOADED) ──────────────
    const fileRecord = uploadService.createFileRecord(
      fileId,
      filename,
      mimeType,
      fileBuffer.length,
      ownerId,
    );

    // ── Step 2: AES-256-GCM encryption ─────────────────────────────
    // encryptionResult.keyHex is temporary in-memory key material.
    // It must NEVER be persisted, logged, or returned via HTTP.
    const encryptionResult = encryptionService.encrypt(fileBuffer);

    logger.info(
      {
        fileId,
        ivLengthHex: encryptionResult.iv.length,
        authTagLengthHex: encryptionResult.authTag.length,
        ciphertextSizeBytes: encryptionResult.encryptedPayload.length,
      },
      'Encryption complete — encrypted payload held in memory',
    );

    // ── Future steps (not yet implemented) ──────────────────────────
    // Step 3: SSS key splitting   → splitSecret(keyHex, k, n)
    // Step 4: Distribution        → distribute shares + encrypted payload to storage nodes

    logger.info({ fileId, filename }, 'Upload pipeline finished');

    return {
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      message: 'File uploaded and encrypted with AES-256-GCM. Key splitting and distribution pending.',
    };
  }
}

export const fileOrchestrator = new FileOrchestrator();
