import { SecretShare, StorageNodeInfo, EncryptedChunkMeta, ShareMetadata } from '@dfs-sss/shared-types';
import { calculateSHA256, ErasureShard } from '@dfs-sss/crypto-utils';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('DistributionService');

export class DistributionService {
  /**
   * Distributes erasure-coded data shards and Shamir key shares across independent storage nodes.
   *
   * Policy:
   *   - Exactly 1 data shard per storage node (under chunkId: `shard-${shard.index}`)
   *   - Exactly 1 key share per storage node (under chunkId: `share-${share.index}`)
   *   - Requires at least `minRequired` (default 3) successful writes for both data shards and key shares.
   */
  async distributePayloadAndShares(
    fileId: string,
    dataShards: ErasureShard[],
    keyShares: SecretShare[],
    nodes: StorageNodeInfo[],
    minRequired: number = 3,
  ): Promise<{ chunkMetas: EncryptedChunkMeta[]; shareMetas: ShareMetadata[] }> {
    if (!nodes || nodes.length === 0) {
      throw new Error('No storage nodes available for distribution');
    }

    if (nodes.length < minRequired) {
      throw new Error(
        `Insufficient healthy nodes for distribution: need at least ${minRequired}, got ${nodes.length}`,
      );
    }

    const chunkMetas: EncryptedChunkMeta[] = [];
    const shareMetas: ShareMetadata[] = [];

    // Distribute data shards (1 shard per node)
    for (let i = 0; i < dataShards.length; i++) {
      const shard = dataShards[i];
      const targetNode = nodes[i % nodes.length];
      const chunkId = `shard-${shard.index}`;
      const payloadBase64 = shard.data.toString('base64');
      const chunkChecksum = calculateSHA256(shard.data);

      try {
        const resp = await fetch(`${targetNode.host}:${targetNode.port}/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, chunkId, data: payloadBase64 }),
        });

        if (!resp.ok) {
          throw new Error(`Node ${targetNode.name} returned status ${resp.status}`);
        }

        chunkMetas.push({
          id: `chunk-${fileId}-${shard.index}`,
          fileId,
          chunkIndex: shard.index,
          storageNodeId: targetNode.id,
          storageKey: chunkId,
          checksumSha256: chunkChecksum,
          sizeBytes: shard.data.length,
        });

        logger.debug(
          { fileId, chunkId, nodeId: targetNode.id, shardIndex: shard.index },
          'Stored erasure-coded data shard',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn(
          { fileId, chunkId, nodeId: targetNode.id, error: message },
          'Failed to store data shard on node',
        );
      }
    }

    // Distribute key shares (1 share per node)
    for (let i = 0; i < keyShares.length; i++) {
      const share = keyShares[i];
      const targetNode = nodes[i % nodes.length];
      const shareChunkId = `share-${share.index}`;
      const shareData = Buffer.from(JSON.stringify(share));
      const shareChecksum = calculateSHA256(shareData);

      try {
        const resp = await fetch(`${targetNode.host}:${targetNode.port}/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, chunkId: shareChunkId, data: shareData.toString('base64') }),
        });

        if (!resp.ok) {
          throw new Error(`Node ${targetNode.name} returned status ${resp.status}`);
        }

        shareMetas.push({
          id: `share-${fileId}-${share.index}`,
          fileId,
          shareIndex: share.index,
          storageNodeId: targetNode.id,
          checksumSha256: shareChecksum,
        });

        logger.debug(
          { fileId, shareChunkId, nodeId: targetNode.id, shareIndex: share.index },
          'Stored Shamir key share',
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn(
          { fileId, shareChunkId, nodeId: targetNode.id, error: message },
          'Failed to store key share on node',
        );
      }
    }

    // Verify recovery threshold was met for both data shards and key shares
    if (chunkMetas.length < minRequired) {
      const msg = `Failed to store required number of data shards: stored ${chunkMetas.length}/${minRequired}`;
      logger.error({ fileId, stored: chunkMetas.length, required: minRequired }, msg);
      throw new Error(msg);
    }

    if (shareMetas.length < minRequired) {
      const msg = `Failed to store required number of key shares: stored ${shareMetas.length}/${minRequired}`;
      logger.error({ fileId, stored: shareMetas.length, required: minRequired }, msg);
      throw new Error(msg);
    }

    return { chunkMetas, shareMetas };
  }
}

export const distributionService = new DistributionService();
