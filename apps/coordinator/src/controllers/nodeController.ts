import { Request, Response } from 'express';
import { nodeRepository } from '../repositories/nodeRepository.js';

export class NodeController {
  getNodes(req: Request, res: Response): void {
    const nodes = nodeRepository.getAllNodes();
    const healthyCount = nodes.filter((n) => n.isHealthy).length;
    res.json({
      nodes,
      total: nodes.length,
      healthyCount,
      unhealthyCount: nodes.length - healthyCount,
    });
  }
}

export const nodeController = new NodeController();
