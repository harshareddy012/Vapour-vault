import { StorageNodeInfo } from '@dfs-sss/shared-types';
import { nodeRepository } from '../../repositories/nodeRepository.js';

export class RoundRobinScheduler {
  private currentIndex = 0;

  selectHealthyNodes(count: number): StorageNodeInfo[] {
    const healthyNodes = nodeRepository.getHealthyNodes();
    if (healthyNodes.length < count) {
      throw new Error(`Insufficient healthy storage nodes available. Required: ${count}, Available: ${healthyNodes.length}`);
    }

    const selected: StorageNodeInfo[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (this.currentIndex + i) % healthyNodes.length;
      selected.push(healthyNodes[idx]);
    }
    this.currentIndex = (this.currentIndex + count) % healthyNodes.length;
    return selected;
  }
}

export const roundRobinScheduler = new RoundRobinScheduler();
