import { Router } from 'express';
import { nodeController } from '../controllers/nodeController.js';

export const nodeRoutes = Router();

nodeRoutes.get('/', (req, res) => nodeController.getNodes(req, res));
