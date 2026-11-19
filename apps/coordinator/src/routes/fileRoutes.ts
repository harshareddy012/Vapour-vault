import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { fileController } from '../controllers/fileController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { uploadValidationMiddleware } from '../middleware/uploadValidationMiddleware.js';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max limit

/** Wraps an async route handler so rejected promises are forwarded to Express error middleware. */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const fileRoutes = Router();

fileRoutes.use(authenticateJwt);

fileRoutes.post('/upload', upload.single('file'), uploadValidationMiddleware, asyncHandler((req, res, _next) => fileController.uploadFile(req, res)));
fileRoutes.get('/', asyncHandler((req, res, _next) => fileController.listFiles(req, res)));
fileRoutes.get('/:id', asyncHandler((req, res, _next) => fileController.getFileMetadata(req, res)));
fileRoutes.get('/:id/download', asyncHandler((req, res, _next) => fileController.downloadFile(req, res)));
