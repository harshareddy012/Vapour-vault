import { Request, Response } from 'express';
import { nodeRepository } from '../repositories/nodeRepository.js';

export class SimulatorController {
  getSimulatorState(req: Request, res: Response): void {
    const nodes = nodeRepository.getAllNodes();
    const state: Record<string, boolean> = {};
    nodes.forEach((n) => {
      state[n.id] = n.isHealthy;
    });
    res.json({ nodeStates: state, offlineNodes: nodeRepository.getSimulatedOfflineNodes() });
  }

  toggleNodeState(req: Request, res: Response): void {
    const { nodeId } = req.params;
    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
      res.status(400).json({ error: 'isOnline boolean is required.' });
      return;
    }
    nodeRepository.setNodeSimulatedStatus(nodeId, isOnline);
    res.json({
      success: true,
      nodeId,
      isOnline,
      message: `Node ${nodeId} is now simulated as ${isOnline ? 'ONLINE' : 'OFFLINE'}.`,
    });
  }
}

export const simulatorController = new SimulatorController();
