import { SecretShare, ShareMetadata, EncryptedChunkMeta } from '@dfs-sss/shared-types';
import { fileRepository } from '../../repositories/fileRepository.js';
import { nodeRepository } from '../../repositories/nodeRepository.js';
import { encryptionService } from '../encryption/encryptionService.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('ReconstructionService');

export class ReconstructionService {
  /**
   * Reconstructs and decrypts a file using K shares from healthy nodes.
   */
  async reconstructFile(fileId: string): Promise<{ filename: string; mimeType: string; data: Buffer; sharesRetrieved: number }> {
    const fileMeta = fileRepository.getFile(fileId);
    if (!fileMeta) throw new Error(`File ${fileId} not found in metadata registry.`);

    const chunkMetas = fileRepository.getChunks(fileId);
    const shareMetas = fileRepository.getShares(fileId);

    if (chunkMetas.length === 0) throw new Error(`No storage chunk mappings found for file ${fileId}.`);

    // 1. Fetch encrypted payload chunk from available healthy node
    let encryptedPayload: Buffer | null = null;
    for (const chunkMeta of chunkMetas) {
      const node = nodeRepository.getNodeById(chunkMeta.storageNodeId);
      if (!node || !node.isHealthy) continue;

      try {
        const resp = await fetch(`${node.host}:${node.port}/chunks/retrieve/${fileId}/${chunkMeta.storageKey}`);
        if (resp.ok) {
          const json = await resp.json() as any;
          encryptedPayload = Buffer.from(json.dataBase64, 'base64');
          break;
        }
      } catch (err: any) {
        logger.warn({ error: err.message, node: node.name }, 'Could not retrieve payload chunk from node');
      }
    }

    if (!encryptedPayload) {
      throw new Error(`Failed to retrieve encrypted file payload from storage cluster.`);
    }

    // 2. Query healthy nodes to collect at least K secret key shares
    const kThreshold = fileMeta.kThreshold;
    if (!kThreshold) {
      throw new Error(`File ${fileId} has no SSS threshold configured. Key splitting may not have been performed.`);
    }

    const collectedShares: SecretShare[] = [];
    for (const shareMeta of shareMetas) {
      const node = nodeRepository.getNodeById(shareMeta.storageNodeId);
      // Skip if node is inactive or simulated offline
      if (!node || !node.isHealthy) {
        logger.info({ node: node?.name || shareMeta.storageNodeId }, 'Skipping offline node share retrieval');
        continue;
      }

      const shareKey = `share_${shareMeta.shareIndex}.sss`;
      try {
        const resp = await fetch(`${node.host}:${node.port}/chunks/retrieve/${fileId}/${shareKey}`);
        if (resp.ok) {
          const json = await resp.json() as any;
          const shareObj = JSON.parse(Buffer.from(json.dataBase64, 'base64').toString('utf-8')) as SecretShare;
          collectedShares.push(shareObj);
          logger.info({ node: node.name, shareIndex: shareObj.index }, 'Retrieved valid key share');
        }
      } catch (err: any) {
        logger.warn({ error: err.message, node: node.name }, 'Failed share retrieval from storage node');
      }

      if (collectedShares.length >= kThreshold) {
        break; // Reached K threshold!
      }
    }

    if (collectedShares.length < kThreshold) {
      throw new Error(`Insufficient shares available: ${collectedShares.length}/${kThreshold} required to reconstruct file.`);
    }

    // 3. Reconstruct AES key via Lagrange Interpolation & decrypt payload
    const decryptedData = encryptionService.reconstructAndDecryptPayload(
      encryptedPayload,
      collectedShares,
      fileMeta.iv,
      fileMeta.authTag
    );

    return {
      filename: fileMeta.filename,
      mimeType: fileMeta.mimeType,
      data: decryptedData,
      sharesRetrieved: collectedShares.length,
    };
  }
}

export const reconstructionService = new ReconstructionService();
