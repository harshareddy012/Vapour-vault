import { StorageNodeInfo } from '@dfs-sss/shared-types';

export class NodeRepository {
  private nodes: Map<string, StorageNodeInfo> = new Map();
  private simulatedOfflineNodes: Set<string> = new Set();

  constructor() {
    // Register 5 default storage nodes (Node 1 to Node 5)
    for (let i = 1; i <= 5; i++) {
      const id = `node-${i}`;
      const port = 5000 + i;
      this.nodes.set(id, {
        id,
        name: `Storage Node ${i}`,
        host: 'http://localhost',
        port,
        status: 'ACTIVE',
        capacityBytes: 10 * 1024 * 1024 * 1024, // 10 GB
        usedBytes: 0,
        lastPing: new Date().toISOString(),
        isHealthy: true,
      });
    }
  }

  getAllNodes(): StorageNodeInfo[] {
    return Array.from(this.nodes.values()).map((node) => ({
      ...node,
      isHealthy: node.status === 'ACTIVE' && !this.simulatedOfflineNodes.has(node.id),
    }));
  }

  getHealthyNodes(): StorageNodeInfo[] {
    return this.getAllNodes().filter((n) => n.isHealthy);
  }

  getNodeById(id: string): StorageNodeInfo | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;
    return {
      ...node,
      isHealthy: node.status === 'ACTIVE' && !this.simulatedOfflineNodes.has(node.id),
    };
  }

  updateNodeStatus(id: string, isHealthy: boolean, usedBytes?: number): void {
    const node = this.nodes.get(id);
    if (node) {
      node.status = isHealthy ? 'ACTIVE' : 'INACTIVE';
      node.lastPing = new Date().toISOString();
      if (usedBytes !== undefined) node.usedBytes = usedBytes;
    }
  }

  // Simulation controls
  setNodeSimulatedStatus(id: string, isOnline: boolean): void {
    if (isOnline) {
      this.simulatedOfflineNodes.delete(id);
    } else {
      this.simulatedOfflineNodes.add(id);
    }
  }

  getSimulatedOfflineNodes(): string[] {
    return Array.from(this.simulatedOfflineNodes);
  }
}

export const nodeRepository = new NodeRepository();
