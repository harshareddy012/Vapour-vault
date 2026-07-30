import { Router } from 'express';
import { simulatorController } from '../controllers/simulatorController.js';

export const simulatorRoutes = Router();

simulatorRoutes.get('/state', (req, res) => simulatorController.getSimulatorState(req, res));
simulatorRoutes.post('/toggle/:nodeId', (req, res) => simulatorController.toggleNodeState(req, res));
