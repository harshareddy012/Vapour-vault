import { nodeRepository } from '../../repositories/nodeRepository.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('HealthMonitor');

export class HealthMonitor {
  private timer: NodeJS.Timeout | null = null;

  startPolling(intervalMs: number = 10000): void {
    if (this.timer) return;
    logger.info({ intervalMs }, 'Starting Storage Node Health Monitor polling');
    this.timer = setInterval(() => this.checkAllNodes(), intervalMs);
  }

  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkAllNodes(): Promise<void> {
    const nodes = nodeRepository.getAllNodes();
    for (const node of nodes) {
      const startTime = Date.now();
      try {
        const resp = await fetch(`${node.host}:${node.port}/health`, { signal: AbortSignal.timeout(3000) });
        const latency = Date.now() - startTime;
        const isHealthy = resp.ok;
        nodeRepository.updateNodeStatus(node.id, isHealthy);
        logger.debug({ nodeId: node.id, latencyMs: latency, isHealthy }, 'Node health check update');
      } catch {
        nodeRepository.updateNodeStatus(node.id, false);
        logger.debug({ nodeId: node.id, isHealthy: false }, 'Node health check failed');
      }
    }
  }
}

export const healthMonitor = new HealthMonitor();
