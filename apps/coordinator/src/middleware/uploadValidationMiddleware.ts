import { Request, Response, NextFunction } from 'express';
import { createServiceLogger } from '@dfs-sss/logger';

const logger = createServiceLogger('UploadValidationMiddleware');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function uploadValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    logger.warn({ path: req.path }, 'Upload validation failed: missing file');
    res.status(400).json({ error: 'No file uploaded in form payload.' });
    return;
  }

  if (!req.file.buffer || req.file.buffer.length === 0) {
    logger.warn({ path: req.path, filename: req.file.originalname }, 'Upload validation failed: empty file payload');
    res.status(400).json({ error: 'Uploaded file cannot be empty.' });
    return;
  }

  if (req.file.size > MAX_FILE_SIZE || req.file.buffer.length > MAX_FILE_SIZE) {
    logger.warn(
      { path: req.path, filename: req.file.originalname, size: req.file.size },
      'Upload validation failed: file size exceeds limit'
    );
    res.status(400).json({ error: 'Uploaded file exceeds maximum allowed size (100MB).' });
    return;
  }

  next();
}
