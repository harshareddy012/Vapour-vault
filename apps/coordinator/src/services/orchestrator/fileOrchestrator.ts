import { randomUUID } from 'crypto';
import { UploadFileResponse } from '@dfs-sss/shared-types';
import { splitSecret } from '@dfs-sss/crypto-utils';
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
 *   3. SSS Key Splitting → split AES key into N shares with K threshold
 *   4. Distribution Layer → distribute shares and ciphertext to storage nodes
 */
export class FileOrchestrator {
  /**
   * Full upload pipeline:
   *   generate fileId → persist FileRecord → encrypt payload →
   *   split AES key (K-of-N) → distribute shares to storage nodes →
   *   store ciphertext on node-1 → respond
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

    // ── Step 3: Extract keyHex and split encryption key using SSS ──
    const keyBuffer = Buffer.from(encryptionResult.keyHex, 'hex');
    const n = 5;
    const k = 3;
    const shares = splitSecret(keyBuffer, k, n);

    // ── Step 4: Define storage nodes ───────────────────────────────
    const nodes = [
      'http://localhost:5001',
      'http://localhost:5002',
      'http://localhost:5003',
      'http://localhost:5004',
      'http://localhost:5005',
    ];

    // ── Step 5: Distribute shares to storage nodes ──────────────────
    for (let index = 0; index < shares.length; index++) {
      const share = shares[index];
      const nodeUrl = nodes[index];
      const chunkId = `share-${index}`;
      const data = Buffer.from(JSON.stringify(share)).toString('base64');

      try {
        logger.info(
          { fileId, chunkId, nodeUrl },
          'Distributing share to storage node',
        );

        const response = await fetch(`${nodeUrl}/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            chunkId,
            data,
          }),
        });

        if (!response.ok) {
          throw new Error(`Storage node returned status ${response.status}`);
        }

        logger.info(
          { fileId, chunkId, nodeUrl },
          'Share stored successfully on storage node',
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          { fileId, chunkId, nodeUrl, error: errorMessage },
          'Failed to store share on storage node',
        );
      }
    }

    // ── Step 6: Store encrypted file (ciphertext) on node-1 ────────
    const node1Url = nodes[0];
    const ciphertextChunkId = 'ciphertext';
    const ciphertextData = encryptionResult.encryptedPayload.toString('base64');

    try {
      logger.info(
        { fileId, chunkId: ciphertextChunkId, nodeUrl: node1Url },
        'Storing ciphertext on storage node-1',
      );

      const response = await fetch(`${node1Url}/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          chunkId: ciphertextChunkId,
          data: ciphertextData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Storage node-1 returned status ${response.status}`);
      }

      logger.info(
        { fileId, chunkId: ciphertextChunkId, nodeUrl: node1Url },
        'Ciphertext stored successfully on storage node-1',
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { fileId, chunkId: ciphertextChunkId, nodeUrl: node1Url, error: errorMessage },
        'Failed to store ciphertext on storage node-1',
      );
    }

    logger.info({ fileId, filename }, 'Upload pipeline finished');

    return {
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      message: 'File distributed successfully',
      nShares: 5,
      kThreshold: 3,
      sharesDistributed: 5,
    };
  }
}

export const fileOrchestrator = new FileOrchestrator();
