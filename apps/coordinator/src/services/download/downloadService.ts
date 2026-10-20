import {
  calculateSHA256,
  combineShares,
  decodeErasure,
  decryptAES,
  ErasureShard,
} from '@dfs-sss/crypto-utils';
import { fileRepository } from '../../repositories/fileRepository.js';
import { nodeRepository } from '../../repositories/nodeRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';
import { SecretShare } from '@dfs-sss/shared-types';

const logger = createServiceLogger('DownloadService');

export interface DownloadResult {
  data: Buffer;
  filename: string;
  mimeType: string;
  sharesRetrieved: number;
  shardsRetrieved: number;
}

/**
 * DownloadService
 *
 * Implements fault-tolerant reconstruction pipeline:
 *   1. Resolve file metadata (filename, mimeType, iv, authTag, cipherSizeBytes, checksum)
 *   2. Collect >= K key shares from healthy storage nodes via GET /retrieve
 *   3. Reconstruct AES-256 key via Shamir Secret Sharing Lagrange interpolation
 *   4. Collect >= K erasure-coded data shards from healthy storage nodes via GET /retrieve
 *   5. Reconstruct exact ciphertext via systematic Reed-Solomon decoding
 *   6. Decrypt ciphertext via AES-256-GCM verifying authTag and plaintext checksum
 *   7. Return original plaintext bytes
 */
export class DownloadService {
  async downloadFile(fileId: string): Promise<DownloadResult> {
    logger.info({ fileId }, 'Download and reconstruction pipeline started');

    // ── Step 1: Resolve file metadata ─────────────────────────────────────────
    const fileMeta = await fileRepository.getFile(fileId);
    if (!fileMeta) {
      throw new Error(`File metadata not found for fileId: ${fileId}. Was the file uploaded in this session?`);
    }

    const kThreshold = fileMeta.kThreshold ?? 3;
    if (typeof kThreshold !== 'number' || !Number.isInteger(kThreshold) || kThreshold < 1) {
      throw new Error(`Invalid key-share threshold in metadata for fileId: ${fileId}`);
    }

    // ── Step 2: Collect >= K key shares from storage nodes ────────────────────
    const collectedShares = await this.fetchShares(fileId, kThreshold);

    if (collectedShares.length < kThreshold) {
      logger.error(
        { fileId, collected: collectedShares.length, required: kThreshold },
        'Insufficient key shares for key reconstruction',
      );
      throw new Error(
        `Insufficient shares: collected ${collectedShares.length} but need at least ${kThreshold}.`,
      );
    }

    // ── Step 3: Reconstruct AES key from collected shares ─────────────────────
    logger.info(
      { fileId, sharesUsed: collectedShares.length, kThreshold },
      'Reconstructing AES key from Shamir shares',
    );

    const reconstructedKey = combineShares(collectedShares);
    logger.info({ fileId, keyBytes: reconstructedKey.length }, 'AES key reconstructed successfully');

    // ── Step 4: Collect >= K erasure-coded data shards from storage nodes ─────
    const collectedShards = await this.fetchDataShards(fileId, kThreshold);

    if (collectedShards.length < kThreshold) {
      logger.error(
        { fileId, collected: collectedShards.length, required: kThreshold },
        'Insufficient data shards for ciphertext reconstruction',
      );
      throw new Error(
        `Insufficient data shards: collected ${collectedShards.length} but need at least ${kThreshold}.`,
      );
    }

    // ── Step 5: Reconstruct ciphertext from collected data shards ─────────────
    const cipherSizeBytes = fileMeta.cipherSizeBytes ?? fileMeta.sizeBytes;
    logger.info(
      { fileId, shardsUsed: collectedShards.length, targetCipherSizeBytes: cipherSizeBytes },
      'Reconstructing ciphertext via erasure decoding',
    );

    const ciphertext = decodeErasure(collectedShards, cipherSizeBytes, kThreshold);
    logger.info({ fileId, cipherBytes: ciphertext.length }, 'Ciphertext reconstructed successfully');

    // ── Step 6: Decrypt payload via AES-256-GCM ───────────────────────────────
    let plaintext: Buffer;
    try {
      const iv = Buffer.from(fileMeta.iv, 'hex');
      const authTag = Buffer.from(fileMeta.authTag, 'hex');

      // decryptAES verifies the GCM auth tag — any tampering throws here.
      plaintext = decryptAES(ciphertext, reconstructedKey, iv, authTag);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown decryption error';
      logger.error({ fileId, error: message }, 'Decryption failed');
      throw new Error(`Decryption failed: ${message}`);
    }

    // Verify plaintext integrity if checksum was stored
    if (fileMeta.checksumSha256) {
      const actualPlaintextChecksum = calculateSHA256(plaintext);
      if (actualPlaintextChecksum !== fileMeta.checksumSha256) {
        throw new Error(`Plaintext checksum mismatch for fileId: ${fileId}`);
      }
    }

    logger.info({ fileId, plaintextBytes: plaintext.length }, 'File reconstruction and decryption successful');

    return {
      data: plaintext,
      filename: fileMeta.filename,
      mimeType: fileMeta.mimeType,
      sharesRetrieved: collectedShares.length,
      shardsRetrieved: collectedShards.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetches key shares from available healthy storage nodes according to recorded metadata.
   */
  private async fetchShares(fileId: string, kThreshold: number): Promise<SecretShare[]> {
    const collectedShares: SecretShare[] = [];
    const seenIndices = new Set<number>();
    const shareMetas = await fileRepository.getShares(fileId);

    for (const shareMeta of shareMetas) {
      if (collectedShares.length >= kThreshold) break;

      const chunkId = `share-${shareMeta.shareIndex}`;
      const node = nodeRepository.getNodeById(shareMeta.storageNodeId);

      if (!node || !node.isHealthy) {
        logger.warn({ fileId, chunkId, nodeId: shareMeta.storageNodeId }, 'Storage node unavailable — skipping share');
        continue;
      }

      const url = `${node.host}:${node.port}/retrieve?fileId=${encodeURIComponent(fileId)}&chunkId=${encodeURIComponent(chunkId)}`;
      logger.info({ fileId, chunkId, nodeId: node.id, url }, 'Attempting to fetch share');

      try {
        const resp = await fetch(url);

        if (!resp.ok) {
          logger.warn(
            { fileId, chunkId, nodeId: node.id, status: resp.status },
            'Share fetch returned non-OK status',
          );
          continue;
        }

        const json = (await resp.json()) as { data?: string };
        if (!json.data) {
          logger.warn({ fileId, chunkId, nodeId: node.id }, 'Share response missing data field');
          continue;
        }

        const shareBytes = Buffer.from(json.data, 'base64');
        if (calculateSHA256(shareBytes) !== shareMeta.checksumSha256) {
          logger.warn({ fileId, chunkId, nodeId: node.id }, 'Retrieved share checksum mismatch');
          continue;
        }

        const shareObj = JSON.parse(shareBytes.toString('utf-8')) as SecretShare;
        if (
          !Number.isInteger(shareObj.index) ||
          shareObj.index !== shareMeta.shareIndex ||
          typeof shareObj.share !== 'string' ||
          !/^(?:[0-9a-f]{2})+$/i.test(shareObj.share) ||
          seenIndices.has(shareObj.index)
        ) {
          logger.warn({ fileId, chunkId, nodeId: node.id }, 'Retrieved share has invalid or duplicate metadata');
          continue;
        }

        collectedShares.push(shareObj);
        seenIndices.add(shareObj.index);

        logger.info(
          { fileId, chunkId, nodeId: node.id, shareIndex: shareObj.index },
          'Share retrieved successfully',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn({ fileId, chunkId, nodeId: node.id, error: message }, 'Error fetching share from node');
      }
    }

    return collectedShares;
  }

  /**
   * Fetches erasure-coded data shards from available healthy storage nodes according to recorded metadata.
   */
  private async fetchDataShards(fileId: string, kThreshold: number): Promise<ErasureShard[]> {
    const collectedShards: ErasureShard[] = [];
    const seenIndices = new Set<number>();
    const chunkMetas = await fileRepository.getChunks(fileId);

    for (const chunkMeta of chunkMetas) {
      if (collectedShards.length >= kThreshold) break;

      const node = nodeRepository.getNodeById(chunkMeta.storageNodeId);

      if (!node || !node.isHealthy) {
        logger.warn(
          { fileId, chunkId: chunkMeta.storageKey, nodeId: chunkMeta.storageNodeId },
          'Storage node unavailable — skipping data shard',
        );
        continue;
      }

      const url = `${node.host}:${node.port}/retrieve?fileId=${encodeURIComponent(fileId)}&chunkId=${encodeURIComponent(chunkMeta.storageKey)}`;
      logger.info(
        { fileId, chunkId: chunkMeta.storageKey, nodeId: node.id, url },
        'Attempting to fetch data shard',
      );

      try {
        const resp = await fetch(url);

        if (!resp.ok) {
          logger.warn(
            { fileId, chunkId: chunkMeta.storageKey, nodeId: node.id, status: resp.status },
            'Data shard fetch returned non-OK status',
          );
          continue;
        }

        const json = (await resp.json()) as { data?: string };
        if (!json.data) {
          logger.warn(
            { fileId, chunkId: chunkMeta.storageKey, nodeId: node.id },
            'Data shard response missing data field',
          );
          continue;
        }

        const shardBytes = Buffer.from(json.data, 'base64');
        if (calculateSHA256(shardBytes) !== chunkMeta.checksumSha256) {
          logger.warn(
            { fileId, chunkId: chunkMeta.storageKey, nodeId: node.id },
            'Retrieved data shard checksum mismatch',
          );
          continue;
        }

        if (seenIndices.has(chunkMeta.chunkIndex)) {
          continue;
        }

        collectedShards.push({
          index: chunkMeta.chunkIndex,
          data: shardBytes,
        });
        seenIndices.add(chunkMeta.chunkIndex);

        logger.info(
          { fileId, chunkId: chunkMeta.storageKey, nodeId: node.id, shardIndex: chunkMeta.chunkIndex },
          'Data shard retrieved successfully',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn(
          { fileId, chunkId: chunkMeta.storageKey, nodeId: node.id, error: message },
          'Error fetching data shard from node',
        );
      }
    }

    return collectedShards;
  }
}

export const downloadService = new DownloadService();
