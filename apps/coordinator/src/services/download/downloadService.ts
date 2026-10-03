import { combineShares, decryptAES } from '@dfs-sss/crypto-utils';
import { fileRepository } from '../../repositories/fileRepository.js';
import { nodeRepository } from '../../repositories/nodeRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';
import { SecretShare } from '@dfs-sss/shared-types';

const logger = createServiceLogger('DownloadService');

/**
 * Number of shares required to reconstruct the AES key.
 * Must match the K threshold used during upload (K=3, N=5).
 */
const K_THRESHOLD = 3;

/**
 * Total number of key shares distributed across storage nodes.
 * Shares are stored as chunkIds: share-0, share-1, ..., share-(N_SHARES-1).
 */
const N_SHARES = 5;

/**
 * The chunkId used when storing the encrypted file payload on node-1.
 */
const CIPHERTEXT_CHUNK_ID = 'ciphertext';

/**
 * Port of the primary storage node that holds the ciphertext.
 */
const PRIMARY_NODE_ID = 'node-1';

interface DownloadResult {
  data: Buffer;
  filename: string;
  mimeType: string;
  sharesRetrieved: number;
}

/**
 * DownloadService
 *
 * Implements the full reconstruction pipeline:
 *   1. Fetch ≥ K key shares from storage nodes via GET /retrieve
 *   2. Reconstruct the AES-256-GCM key using Shamir's Secret Sharing
 *   3. Fetch the encrypted ciphertext from node-1
 *   4. Decrypt the ciphertext to recover the original file
 *   5. Return the plaintext buffer with filename and MIME type
 *
 * Design notes:
 *   - Share chunkIds are 0-indexed: share-0 through share-4
 *   - Each share resides on the node whose index matches the share index
 *     (share-0 → node-1, share-1 → node-2, …, share-4 → node-5)
 *   - Ciphertext is fetched separately from node-1
 *   - Requests are sequential (no parallel fetch, no retries per spec)
 */
export class DownloadService {
  /**
   * Orchestrates the full download and reconstruction flow for a given fileId.
   *
   * @throws Error if fewer than K valid shares are available
   * @throws Error if the ciphertext cannot be fetched
   * @throws Error if decryption fails (wrong key or corrupt data)
   */
  async downloadFile(fileId: string): Promise<DownloadResult> {
    logger.info({ fileId }, 'Download pipeline started');

    // ── Step 1: Resolve file metadata (filename, mimeType, iv, authTag) ──────
    const fileMeta = fileRepository.getFile(fileId);
    if (!fileMeta) {
      throw new Error(`File metadata not found for fileId: ${fileId}. Was the file uploaded in this session?`);
    }

    // ── Step 2: Collect ≥ K key shares from storage nodes ────────────────────
    const collectedShares = await this.fetchShares(fileId);

    if (collectedShares.length < K_THRESHOLD) {
      logger.error(
        { fileId, collected: collectedShares.length, required: K_THRESHOLD },
        'Insufficient shares for key reconstruction',
      );
      throw new Error(
        `Insufficient shares: collected ${collectedShares.length} but need at least ${K_THRESHOLD}.`,
      );
    }

    // ── Step 3: Reconstruct the AES key from collected shares ─────────────────
    logger.info(
      { fileId, sharesUsed: collectedShares.length, kThreshold: K_THRESHOLD },
      'Reconstructing AES key from shares',
    );

    const reconstructedKey = combineShares(collectedShares);

    logger.info({ fileId, keyBytes: reconstructedKey.length }, 'AES key reconstructed successfully');

    // ── Step 4: Fetch the encrypted ciphertext from node-1 ───────────────────
    const ciphertext = await this.fetchCiphertext(fileId);

    // ── Step 5: Decrypt the payload ──────────────────────────────────────────
    logger.info({ fileId, ciphertextBytes: ciphertext.length }, 'Decrypting file payload');

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

    logger.info({ fileId, plaintextBytes: plaintext.length }, 'File decryption successful');

    return {
      data: plaintext,
      filename: fileMeta.filename,
      mimeType: fileMeta.mimeType,
      sharesRetrieved: collectedShares.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Iterates over all N share slots (share-0 … share-(N-1)), fetching each
   * from its corresponding storage node until K valid shares are collected.
   *
   * Share-to-node mapping mirrors the upload distribution strategy:
   *   share-i  →  node-(i+1)  (1-indexed node IDs)
   *
   * Stops as soon as K shares are in hand to minimise latency.
   */
  private async fetchShares(fileId: string): Promise<SecretShare[]> {
    const collectedShares: SecretShare[] = [];

    for (let shareIdx = 0; shareIdx < N_SHARES; shareIdx++) {
      if (collectedShares.length >= K_THRESHOLD) break;

      const chunkId = `share-${shareIdx}`;
      const nodeId = `node-${shareIdx + 1}`;
      const node = nodeRepository.getNodeById(nodeId);

      if (!node || !node.isHealthy) {
        logger.warn({ fileId, chunkId, nodeId }, 'Storage node unavailable — skipping share');
        continue;
      }

      const url = `${node.host}:${node.port}/retrieve?fileId=${encodeURIComponent(fileId)}&chunkId=${encodeURIComponent(chunkId)}`;
      logger.info({ fileId, chunkId, nodeId, url }, 'Attempting to fetch share');

      try {
        const resp = await fetch(url);

        if (!resp.ok) {
          logger.warn(
            { fileId, chunkId, nodeId, status: resp.status },
            'Share fetch returned non-OK status',
          );
          continue;
        }

        const json = (await resp.json()) as { data?: string };
        if (!json.data) {
          logger.warn({ fileId, chunkId, nodeId }, 'Share response missing data field');
          continue;
        }

        // The share was stored as JSON({ index, share, checksumSha256 })
        // then base64-encoded via Buffer.from(JSON.stringify(share)).
        const shareObj = JSON.parse(Buffer.from(json.data, 'base64').toString('utf-8')) as SecretShare;

        collectedShares.push(shareObj);

        logger.info(
          { fileId, chunkId, nodeId, shareIndex: shareObj.index },
          'Share retrieved successfully',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn({ fileId, chunkId, nodeId, error: message }, 'Error fetching share from node');
      }
    }

    return collectedShares;
  }

  /**
   * Fetches the encrypted ciphertext from node-1 using chunkId = "ciphertext".
   *
   * @throws Error if node-1 is unavailable or the fetch fails
   */
  private async fetchCiphertext(fileId: string): Promise<Buffer> {
    const node = nodeRepository.getNodeById(PRIMARY_NODE_ID);

    if (!node || !node.isHealthy) {
      throw new Error(`Primary node (${PRIMARY_NODE_ID}) is unavailable — cannot retrieve ciphertext.`);
    }

    const url = `${node.host}:${node.port}/retrieve?fileId=${encodeURIComponent(fileId)}&chunkId=${encodeURIComponent(CIPHERTEXT_CHUNK_ID)}`;
    logger.info({ fileId, chunkId: CIPHERTEXT_CHUNK_ID, nodeId: PRIMARY_NODE_ID, url }, 'Fetching ciphertext from primary node');

    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error(
        `Failed to retrieve ciphertext from node-1: HTTP ${resp.status}`,
      );
    }

    const json = (await resp.json()) as { data?: string };
    if (!json.data) {
      throw new Error('Ciphertext response from node-1 is missing the data field.');
    }

    const ciphertext = Buffer.from(json.data, 'base64');
    logger.info({ fileId, bytes: ciphertext.length }, 'Ciphertext retrieved successfully');

    return ciphertext;
  }
}

export const downloadService = new DownloadService();
