import { Request, Response } from 'express';
import { authService } from '../services/auth/authService.js';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('AuthController');

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      this.handleAuthError(error, res, 'Registration request failed');
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      this.handleAuthError(error, res, 'Login request failed');
    }
  }

  private handleAuthError(error: any, res: Response, message: string): void {
    const status = error.status || 500;

    if (status >= 500) {
      logger.error({ error: error.message }, message);
    } else {
      logger.warn({ status, error: error.message }, message);
    }

    res.status(status).json({ error: error.message || 'Authentication request failed.' });
  }
}

export const authController = new AuthController();
