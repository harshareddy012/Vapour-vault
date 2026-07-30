import { Request, Response, NextFunction } from 'express';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('ErrorHandler');

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  logger.error({ error: err.message, stack: err.stack, path: req.path }, 'Unhandled error in request');
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}
