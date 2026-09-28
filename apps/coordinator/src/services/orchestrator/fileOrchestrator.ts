import { randomUUID } from 'crypto';
import { UploadFileResponse } from '@dfs-sss/shared-types';
import { uploadService } from '../upload/uploadService.js';
import { encryptionService } from '../encryption/encryptionService.js';
import { distributionService } from '../distribution/distributionService.js';
import { nodeRepository } from '../../repositories/nodeRepository.js';
import { fileRepository } from '../../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('FileOrchestrator');

const K_THRESHOLD = 3;
const N_SHARES = 5;

/**
 * FileOrchestrator owns the upload pipeline and coordinates services
 * that each have a single responsibility:
 *
 *   1. UploadService      → create and persist the FileRecord
 *   2. EncryptionService  → AES-256-GCM encrypt + SSS key split (K-of-N)
 *   3. DistributionService → send encrypted payload + shares to storage nodes
 */
export class FileOrchestrator {
  /**
   * Full upload pipeline:
   *   generate fileId
   *   → persist FileRecord
   *   → AES-256-GCM encrypt + SSS split key (K-of-N)
   *   → distribute encrypted payload + shares to storage nodes
   *   → persist chunk/share metadata
   *   → return success response
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

    // ── Step 2: AES-256-GCM encryption + SSS key split ─────────────
    // keyShares are temporary in-memory key material derived from the AES key.
    // The raw AES key is NEVER persisted, logged, or returned via HTTP.
    const encryptionResult = encryptionService.processUploadEncryption(
      fileBuffer,
      K_THRESHOLD,
      N_SHARES,
    );

    logger.info(
      {
        fileId,
        nShares: encryptionResult.keyShares.length,
        kThreshold: K_THRESHOLD,
        ciphertextSizeBytes: encryptionResult.encryptedPayload.length,
      },
      'Encryption and SSS key split complete',
    );

    // ── Step 3: Distribute encrypted payload + shares to storage nodes ──
    const healthyNodes = nodeRepository.getHealthyNodes();
    if (healthyNodes.length < K_THRESHOLD) {
      throw new Error(
        `Insufficient healthy nodes: need at least ${K_THRESHOLD}, got ${healthyNodes.length}`,
      );
    }

    const { chunkMetas, shareMetas } = await distributionService.distributePayloadAndShares(
      fileId,
      encryptionResult.encryptedPayload,
      encryptionResult.keyShares,
      healthyNodes,
    );

    // ── Step 4: Persist distribution metadata ──────────────────────
    fileRepository.saveChunks(fileId, chunkMetas);
    fileRepository.saveShares(fileId, shareMetas);

    logger.info(
      {
        fileId,
        filename,
        sharesDistributed: shareMetas.length,
        chunksDistributed: chunkMetas.length,
      },
      'Upload pipeline finished — file distributed successfully',
    );

    return {
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      message: 'File distributed successfully',
      nShares: N_SHARES,
      kThreshold: K_THRESHOLD,
      sharesDistributed: shareMetas.length,
      chunksDistributed: chunkMetas.length,
    };
  }
}

export const fileOrchestrator = new FileOrchestrator();
