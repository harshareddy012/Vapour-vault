import { randomUUID } from 'crypto';
import { calculateSHA256 } from '@dfs-sss/crypto-utils';
import { FileMetadata, UploadFileResponse } from '@dfs-sss/shared-types';
import { encryptionService } from '../encryption/encryptionService.js';
import { roundRobinScheduler } from '../health/roundRobinScheduler.js';
import { distributionService } from '../distribution/distributionService.js';
import { fileRepository } from '../../repositories/fileRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('UploadService');

export class UploadService {
  async processUpload(
    filename: string,
    mimeType: string,
    fileBuffer: Buffer,
    kThreshold: number = 3,
    nShares: number = 5
  ): Promise<UploadFileResponse> {
    const fileId = `file-${randomUUID()}`;
    const checksumSha256 = calculateSHA256(fileBuffer);

    logger.info({ fileId, filename, sizeBytes: fileBuffer.length, kThreshold, nShares }, 'Processing file upload');

    // Step 1: Encrypt file payload using AES-256-GCM & split ONLY the AES key
    const encryptionResult = encryptionService.processUploadEncryption(fileBuffer, kThreshold, nShares);

    // Step 2: Select N healthy storage nodes via Round Robin Scheduler
    const targetNodes = roundRobinScheduler.selectHealthyNodes(nShares);

    // Step 3: Distribute encrypted payload chunk and key shares across nodes
    const { chunkMetas, shareMetas } = await distributionService.distributePayloadAndShares(
      fileId,
      encryptionResult.encryptedPayload,
      encryptionResult.keyShares,
      targetNodes
    );

    // Step 4: Persist file metadata
    const fileMeta: FileMetadata = {
      id: fileId,
      filename,
      mimeType,
      sizeBytes: fileBuffer.length,
      encryptionAlgo: 'AES-256-GCM',
      authTag: encryptionResult.authTag,
      iv: encryptionResult.iv,
      kThreshold,
      nShares,
      createdAt: new Date().toISOString(),
      checksumSha256,
    };

    fileRepository.saveFile(fileMeta);
    fileRepository.saveChunks(fileId, chunkMetas);
    fileRepository.saveShares(fileId, shareMetas);

    logger.info({ fileId, filename, sharesDistributed: shareMetas.length }, 'File upload processing completed');

    return {
      fileId,
      filename,
      kThreshold,
      nShares,
      sharesDistributed: shareMetas.length,
      chunksDistributed: chunkMetas.length,
      checksumSha256,
      message: `File uploaded successfully. AES-256 key split into ${shareMetas.length} shares across storage cluster.`,
    };
  }
}

export const uploadService = new UploadService();
