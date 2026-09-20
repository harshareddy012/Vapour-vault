import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@dfs-sss/config';
import { JwtPayload } from '@dfs-sss/shared-types';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('AuthMiddleware');

function isJwtPayload(payload: string | jwt.JwtPayload): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.userId === 'string' &&
    typeof payload.email === 'string'
  );
}

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    res.status(401).json({ error: 'Missing JWT token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (!isJwtPayload(decoded)) {
      logger.warn({ path: req.path }, 'Rejected JWT with invalid payload');
      res.status(401).json({ error: 'Invalid JWT token.' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    logger.warn({ error: error.message, path: req.path }, 'JWT verification failed');
    res.status(401).json({ error: 'Invalid or expired JWT token.' });
  }
}
