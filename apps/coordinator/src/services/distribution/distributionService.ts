import { SecretShare, StorageNodeInfo, EncryptedChunkMeta, ShareMetadata } from '@dfs-sss/shared-types';
import { calculateSHA256 } from '@dfs-sss/crypto-utils';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('DistributionService');

export class DistributionService {
  /**
   * Distributes encrypted payload chunk and K-of-N secret key shares to healthy nodes.
   */
  async distributePayloadAndShares(
    fileId: string,
    encryptedPayload: Buffer,
    keyShares: SecretShare[],
    nodes: StorageNodeInfo[]
  ): Promise<{ chunkMetas: EncryptedChunkMeta[]; shareMetas: ShareMetadata[] }> {
    const chunkMetas: EncryptedChunkMeta[] = [];
    const shareMetas: ShareMetadata[] = [];

    // Store encrypted payload chunk on primary node
    const primaryNode = nodes[0];
    const chunkKey = `chunk_0.enc`;
    const payloadBase64 = encryptedPayload.toString('base64');
    const chunkChecksum = calculateSHA256(encryptedPayload);

    try {
      const resp = await fetch(`${primaryNode.host}:${primaryNode.port}/chunks/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, chunkKey, dataBase64: payloadBase64 }),
      });
      if (!resp.ok) throw new Error(`Node ${primaryNode.name} returned status ${resp.status}`);
      
      chunkMetas.push({
        id: `chunk-${fileId}-0`,
        fileId,
        chunkIndex: 0,
        storageNodeId: primaryNode.id,
        storageKey: chunkKey,
        checksumSha256: chunkChecksum,
        sizeBytes: encryptedPayload.length,
      });
    } catch (err: any) {
      logger.error({ error: err.message, node: primaryNode.name }, 'Failed to distribute payload chunk');
      throw err;
    }

    // Distribute key shares across all N nodes
    for (let i = 0; i < keyShares.length; i++) {
      const share = keyShares[i];
      const targetNode = nodes[i % nodes.length];
      const shareKey = `share_${share.index}.sss`;
      const shareData = Buffer.from(JSON.stringify(share));
      const shareChecksum = calculateSHA256(shareData);

      try {
        const resp = await fetch(`${targetNode.host}:${targetNode.port}/chunks/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, chunkKey: shareKey, dataBase64: shareData.toString('base64') }),
        });
        if (!resp.ok) throw new Error(`Node ${targetNode.name} returned status ${resp.status}`);

        shareMetas.push({
          id: `share-${fileId}-${share.index}`,
          fileId,
          shareIndex: share.index,
          storageNodeId: targetNode.id,
          checksumSha256: shareChecksum,
        });
      } catch (err: any) {
        logger.warn({ error: err.message, node: targetNode.name, shareIndex: share.index }, 'Failed to store share on node');
      }
    }

    return { chunkMetas, shareMetas };
  }
}

export const distributionService = new DistributionService();
