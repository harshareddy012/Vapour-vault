import { randomUUID } from 'crypto';
import { UploadFileResponse } from '@dfs-sss/shared-types';
import { calculateSHA256, encodeErasure } from '@dfs-sss/crypto-utils';
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
 *   1. UploadService       → create and persist the FileRecord
 *   2. EncryptionService   → AES-256-GCM encrypt + SSS key split (K-of-N)
 *   3. Erasure Coding      → encode ciphertext into 5 shards (3-of-5 threshold)
 *   4. DistributionService → send 1 data shard and 1 key share per storage node
 *   5. FileRepository      → persist placement metadata to database
 */
export class FileOrchestrator {
  /**
   * Full upload pipeline:
   *   generate fileId
   *   → persist FileRecord
   *   → AES-256-GCM encrypt fileBuffer
   *   → SSS split AES key into 5 shares
   *   → erasure encode ciphertext into 5 shards
   *   → distribute 1 shard + 1 share to each storage node
   *   → persist chunk/share/file metadata to database
   *   → return success response
   */
  async handleUpload(
    filename: string,
    mimeType: string,
    fileBuffer: Buffer,
    ownerId: string,
  ): Promise<UploadFileResponse> {
    const fileId = `file-${randomUUID()}`;
    const plaintextChecksum = calculateSHA256(fileBuffer);

    logger.info(
      { fileId, filename, sizeBytes: fileBuffer.length, ownerId, checksumSha256: plaintextChecksum },
      'Upload pipeline started',
    );

    // ── Step 1: Persist FileRecord (status: UPLOADED) ──────────────
    const fileRecord = await uploadService.createFileRecord(
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

    // ── Step 3: Erasure code ciphertext into 5 shards (3-of-5 recovery) ──
    const dataShards = encodeErasure(
      encryptionResult.encryptedPayload,
      K_THRESHOLD,
      N_SHARES,
    );

    logger.info(
      {
        fileId,
        shardsCount: dataShards.length,
        shardSizeBytes: dataShards[0].data.length,
      },
      'Ciphertext erasure encoding complete',
    );

    // ── Step 4: Distribute data shards and key shares to storage nodes ──
    const healthyNodes = nodeRepository.getHealthyNodes();
    if (healthyNodes.length < K_THRESHOLD) {
      throw new Error(
        `Insufficient healthy nodes: need at least ${K_THRESHOLD}, got ${healthyNodes.length}`,
      );
    }

    const { chunkMetas, shareMetas } = await distributionService.distributePayloadAndShares(
      fileId,
      dataShards,
      encryptionResult.keyShares,
      healthyNodes,
      K_THRESHOLD,
    );

    // ── Step 5: Persist distribution metadata to database ──────────
    await fileRepository.saveChunks(fileId, chunkMetas);
    await fileRepository.saveShares(fileId, shareMetas);

    // Persist FileMetadata so the download pipeline can retrieve iv, authTag,
    // and cipherSizeBytes for reconstruction.
    await fileRepository.saveFile({
      id: fileId,
      filename,
      mimeType,
      sizeBytes: fileBuffer.length,
      cipherSizeBytes: encryptionResult.encryptedPayload.length,
      encryptionAlgo: 'AES-256-GCM',
      iv: encryptionResult.iv,
      authTag: encryptionResult.authTag,
      createdAt: fileRecord.createdAt,
      kThreshold: K_THRESHOLD,
      nShares: N_SHARES,
      checksumSha256: plaintextChecksum,
      ownerId,
      status: 'DISTRIBUTED',
    });

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
      checksumSha256: plaintextChecksum,
    };
  }
}

export const fileOrchestrator = new FileOrchestrator();
