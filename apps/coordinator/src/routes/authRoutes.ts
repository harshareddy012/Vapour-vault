import { Router } from 'express';
import { authController } from '../controllers/authController.js';

export const authRoutes = Router();

authRoutes.post('/register', (req, res) => authController.register(req, res));
authRoutes.post('/login', (req, res) => authController.login(req, res));
